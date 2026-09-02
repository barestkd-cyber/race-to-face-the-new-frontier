/**
 * Scavenging and site exploration.
 *
 * A site is a short node-based mini-expedition. The whole map is never shown up
 * front: nodes are revealed progressively through line of sight, Perception,
 * Evaluation, skills, sensors, prior intel and equipment. When multiple routes
 * are known, the player chooses directly.
 */

import { ENCOUNTER_INDEX, SITE_ARCHETYPES } from '../content';
import type { SiteArchetype } from '../content/contentTypes';
import { assessDanger, bestAssessor, type RiskAssessment } from './assess';
import { performCheck, selectParticipants, type CheckContext } from './check';
import { addItem, partyToolBonus } from './inventory';
import { pushLog } from './log';
import type { Rng } from './rng';
import { streamRng } from './rng';
import { activeParty, advanceTime, applyStress } from './sim';
import { SCAVENGE, XP } from './tuning';
import { applyRawWound } from './wounds';
import type {
  Character,
  ExpeditionState,
  GameState,
  LocationState,
  ScavengeSite,
  SiteNode,
  SiteNodeKind,
} from './types';

// ---------------------------------------------------------------------------
// Site generation
// ---------------------------------------------------------------------------

const NODE_LABELS: Record<SiteNodeKind, string> = {
  entrance: 'Entrance',
  storage: 'Storage',
  corridor: 'Corridor',
  machinery: 'Machinery',
  office: 'Office',
  habitation: 'Habitation',
  medical: 'Medical',
  lockedRoom: 'Locked Room',
  hiddenBranch: 'Hidden Branch',
  hazardZone: 'Hazard Zone',
  exit: 'Way Out',
};

/** Which skill a node kind naturally asks for. */
const NODE_CHECKS: Partial<Record<SiteNodeKind, { skill: SiteCheckSkill; description: string }>> = {
  lockedRoom: { skill: 'lockpicking', description: 'The door is locked and the mechanism is intact.' },
  machinery: {
    skill: 'mechanicalEngineering',
    description: 'Getting anything out of here means working around live plant.',
  },
  hazardZone: { skill: 'exploration', description: 'Getting through this safely takes care.' },
  office: { skill: 'computers', description: 'The records are still on the terminal, if it can be woken.' },
  medical: {
    skill: 'medicalDiagnostics',
    description: 'Knowing which of this is still good takes a trained eye.',
  },
  hiddenBranch: { skill: 'scavenging', description: 'Whatever is back here was hidden on purpose.' },
};

type SiteCheckSkill =
  | 'lockpicking'
  | 'mechanicalEngineering'
  | 'exploration'
  | 'computers'
  | 'medicalDiagnostics'
  | 'scavenging';

let siteCounter = 0;
let nodeCounter = 0;

function pickArchetype(location: LocationState, rng: Rng): SiteArchetype | null {
  const candidates = SITE_ARCHETYPES.filter(
    (a) =>
      a.locationKinds.includes(location.kind) &&
      location.danger >= a.danger[0] - 20 &&
      location.danger <= a.danger[1] + 25,
  );
  const pool = candidates.length > 0
    ? candidates
    : SITE_ARCHETYPES.filter((a) => a.locationKinds.includes(location.kind));
  if (pool.length === 0) return null;
  return rng.pick(pool);
}

function buildName(archetype: SiteArchetype, rng: Rng): string {
  return archetype.name
    .replace('{adj}', archetype.nameAdjectives?.length ? rng.pick(archetype.nameAdjectives) : 'Old')
    .replace('{noun}', archetype.nameNouns?.length ? rng.pick(archetype.nameNouns) : 'Site');
}

function makeNode(
  archetype: SiteArchetype,
  kind: SiteNodeKind,
  danger: number,
  rng: Rng,
): SiteNode {
  nodeCounter += 1;
  const flavor = archetype.nodeFlavor[kind];
  const check = NODE_CHECKS[kind];

  const node: SiteNode = {
    id: `nd_${nodeCounter.toString(36)}_${rng.int(0, 0xffff).toString(36)}`,
    kind,
    label: NODE_LABELS[kind],
    description: flavor && flavor.length > 0 ? rng.pick(flavor) : 'Another part of the site.',
    links: [],
    revealed: false,
    cleared: false,
    hidden: false,
    hours: rng.float(SCAVENGE.nodeHours[0], SCAVENGE.nodeHours[1]),
    danger,
  };

  if (check && rng.chance(0.72)) {
    node.check = { skill: check.skill, description: check.description };
    if (kind === 'hazardZone') node.check.criticalRisk = true;
  }

  // Hazards belong to hazard zones and, less often, anywhere dangerous.
  if (archetype.hazards.length > 0 && (kind === 'hazardZone' || rng.percent(danger * 0.35))) {
    const hazard = rng.pick(archetype.hazards);
    node.hazard = {
      severityScore: rng.int(hazard.severity[0], hazard.severity[1]),
      damageType: hazard.damageType,
      label: hazard.label,
    };
    if (node.check) node.check.skill = hazard.avoidSkill as SiteCheckSkill;
  }

  // Loot.
  const rolls = kind === 'storage' ? rng.int(2, 4) : rng.int(0, 2);
  if (rolls > 0 && archetype.lootTable.length > 0) {
    node.loot = [];
    for (let i = 0; i < rolls; i++) {
      const entry = rng.weighted(
        archetype.lootTable.map((l) => ({ value: l, weight: l.weight })),
      );
      node.loot.push({
        itemId: entry.itemId,
        qty: rng.int(entry.qty[0], entry.qty[1]),
        condition: entry.condition ? rng.int(entry.condition[0], entry.condition[1]) : 100,
      });
    }
  }

  if (rng.percent(20 + danger * 0.2)) {
    const [lo, hi] = archetype.creditRange;
    node.lootCredits = Math.round(rng.int(lo, hi) / 3);
  }

  if (archetype.encounterIds.length > 0 && rng.chance(danger * SCAVENGE.encounterChanceScale)) {
    const encounter = pickEncounterForDanger(archetype.encounterIds, danger, rng);
    if (encounter) node.encounter = encounter;
  }

  return node;
}

/**
 * Only spawn an encounter the site is actually dangerous enough to justify.
 * Without this a quiet homeworld basement can roll armed claim jumpers, which
 * reads as the game cheating rather than as a risk the player accepted.
 */
function pickEncounterForDanger(
  encounterIds: string[],
  danger: number,
  rng: Rng,
): string | null {
  const candidates = encounterIds
    .map((id) => ({ id, template: ENCOUNTER_INDEX.get(id) }))
    .filter((entry): entry is { id: string; template: NonNullable<typeof entry.template> } =>
      Boolean(entry.template),
    );
  if (candidates.length === 0) return null;

  // A site can field anything whose band it reaches, with a little headroom so
  // the top end of a site's range still bites.
  const eligible = candidates.filter((c) => c.template.danger[0] <= danger + 12);
  if (eligible.length === 0) {
    // Nothing is mild enough — take the gentlest option rather than the worst.
    return candidates.reduce((best, c) =>
      c.template.danger[0] < best.template.danger[0] ? c : best,
    ).id;
  }

  // Prefer encounters centred near this site's danger.
  return rng.weighted(
    eligible.map((c) => {
      const centre = (c.template.danger[0] + c.template.danger[1]) / 2;
      const distance = Math.abs(centre - danger);
      return { value: c.id, weight: 1 / (1 + distance / 18) };
    }),
  );
}

export function generateSite(
  seed: string,
  location: LocationState,
  index: number,
): ScavengeSite | null {
  const rng = streamRng(seed, 'site', location.id, index);
  const archetype = pickArchetype(location, rng);
  if (!archetype) return null;

  const special = archetype.special === true || rng.chance(SCAVENGE.specialSiteChance);
  const [lo, hi] = special ? SCAVENGE.specialNodeRange : SCAVENGE.normalNodeRange;
  const bodyCount = rng.int(lo, hi);

  const danger = Math.round(
    Math.max(0, Math.min(100, rng.int(archetype.danger[0], archetype.danger[1]) * 0.7 + location.danger * 0.3)),
  );

  const entrance = makeNode(archetype, 'entrance', Math.round(danger * 0.4), rng);
  entrance.revealed = true;
  entrance.cleared = true;
  entrance.description = 'The way in. From here you can see two directions, maybe three.';
  delete entrance.check;
  delete entrance.hazard;
  delete entrance.loot;
  delete entrance.lootCredits;
  delete entrance.encounter;

  const exit = makeNode(archetype, 'exit', 0, rng);
  exit.description = 'A way back out to the ship.';
  delete exit.check;
  delete exit.hazard;
  delete exit.loot;
  delete exit.lootCredits;
  delete exit.encounter;

  // Body nodes in layers, so the site branches instead of being a corridor.
  const layers: SiteNode[][] = [];
  let remaining = bodyCount;
  while (remaining > 0) {
    const width = Math.min(remaining, rng.weighted([
      { value: 1, weight: 46 },
      { value: 2, weight: 42 },
      { value: 3, weight: 12 },
    ]));
    const layer: SiteNode[] = [];
    for (let i = 0; i < width; i++) {
      const kind = rng.pick(archetype.nodeKinds);
      const node = makeNode(archetype, kind, danger, rng);
      node.hidden = rng.chance(SCAVENGE.hiddenNodeChance);
      layer.push(node);
    }
    layers.push(layer);
    remaining -= width;
  }

  // Link entrance -> layer 0 -> ... -> exit.
  const allLayers = [[entrance], ...layers, [exit]];
  for (let i = 0; i < allLayers.length - 1; i++) {
    for (const node of allLayers[i]!) {
      node.links = allLayers[i + 1]!.map((n) => n.id);
    }
  }

  // At least one route through must not be hidden, or the site can dead-end.
  for (const layer of layers) {
    if (layer.every((n) => n.hidden)) layer[0]!.hidden = false;
  }

  siteCounter += 1;
  const nodes = allLayers.flat();

  return {
    id: `site_${siteCounter.toString(36)}_${rng.int(0, 0xffff).toString(36)}`,
    locationId: location.id,
    archetype: archetype.id,
    name: buildName(archetype, rng),
    description: archetype.description,
    danger,
    nodes,
    entranceId: entrance.id,
    exitId: exit.id,
    exhausted: false,
    intel: 0,
  };
}

/** Generate the sites a location offers, once, and cache them on the location. */
export function ensureSites(state: GameState, location: LocationState): ScavengeSite[] {
  if (location.siteIds.length > 0) {
    return location.siteIds.map((id) => state.sites[id]).filter((s): s is ScavengeSite => Boolean(s));
  }
  if (!location.actions.includes('scavenge')) return [];

  const rng = streamRng(state.seed, 'sitecount', location.id);
  const count = rng.int(2, location.condition === 'abandoned' ? 5 : 3);
  const sites: ScavengeSite[] = [];

  for (let i = 0; i < count; i++) {
    const site = generateSite(state.seed, location, i);
    if (!site) continue;
    state.sites[site.id] = site;
    location.siteIds.push(site.id);
    sites.push(site);
  }
  return sites;
}

// ---------------------------------------------------------------------------
// Pre-entry assessment
// ---------------------------------------------------------------------------

export interface SiteBriefing {
  site: ScavengeSite;
  risk: RiskAssessment;
  knownNodes: number;
  totalNodes: number;
  note: string;
}

export function briefSite(state: GameState, site: ScavengeSite): SiteBriefing {
  const assessor = bestAssessor(activeParty(state));
  const risk = assessDanger(site.danger, {
    assessor,
    relevantSkill: 'scavenging',
    intel: site.intel,
  });

  const known = site.nodes.filter((n) => n.revealed).length;

  return {
    site,
    risk,
    knownNodes: known,
    totalNodes: site.nodes.length,
    note:
      site.intel > 0
        ? 'Prior intel narrows down what is in there.'
        : 'No prior information. You will find out inside.',
  };
}

// ---------------------------------------------------------------------------
// Running an expedition
// ---------------------------------------------------------------------------

export function beginExpedition(
  state: GameState,
  siteId: string,
  partyIds: string[],
  leaderId: string,
  rng: Rng,
): { ok: boolean; reason?: string } {
  const site = state.sites[siteId];
  if (!site) return { ok: false, reason: 'That site is not available.' };
  if (state.expedition) return { ok: false, reason: 'A party is already deployed.' };
  if (partyIds.length === 0) return { ok: false, reason: 'Select at least one crew member.' };

  const entrance = site.nodes.find((n) => n.id === site.entranceId);
  if (!entrance) return { ok: false, reason: 'That site has no way in.' };

  state.expedition = {
    siteId,
    partyIds,
    leaderId,
    currentNodeId: entrance.id,
    visited: [entrance.id],
    carried: [],
    carriedCredits: 0,
    startedAtHours: state.hours,
  };
  state.phase = 'expedition';
  state.screen = 'expedition';

  entrance.revealed = true;
  revealFrom(state, site, entrance, rng);

  pushLog(state, 'mission', `Entered ${site.name}.`);
  return { ok: true };
}

/**
 * Reveal what can be seen from a node. Obvious routes are free; hidden ones
 * need a discovery check helped by Perception, sensors, intel and equipment.
 */
function revealFrom(state: GameState, site: ScavengeSite, from: SiteNode, rng: Rng): string[] {
  const lines: string[] = [];
  const party = expeditionParty(state);
  if (party.length === 0) return lines;

  for (const linkId of from.links) {
    const node = site.nodes.find((n) => n.id === linkId);
    if (!node || node.revealed) continue;

    if (!node.hidden) {
      node.revealed = true;
      continue;
    }

    const toolHelp = partyToolBonus(party, 'scavenging', state.ship);
    const check = performCheck(
      {
        skill: 'exploration',
        secondarySkill: 'scavenging',
        attributes: ['perception', 'evaluation'],
        modifiers: [
          { label: 'Prior intel', value: site.intel * SCAVENGE.intelBonusPerLevel },
          ...(toolHelp > 0 ? [{ label: 'Equipment', value: toolHelp }] : []),
        ],
        participantIds: selectParticipants(party, 'exploration', 'individual'),
        label: 'Search for another way through',
      },
      checkContext(state),
      rng,
    );

    if (check.outcome === 'success' || check.outcome === 'exceptional') {
      node.revealed = true;
      lines.push(`You find something that was not obvious: ${node.label.toLowerCase()}.`);
    }
  }

  return lines;
}

function checkContext(state: GameState): CheckContext {
  return { characters: state.characters, morale: state.morale, hours: state.hours };
}

export function expeditionParty(state: GameState): Character[] {
  if (!state.expedition) return [];
  return state.expedition.partyIds
    .map((id) => state.characters[id])
    .filter((c): c is Character => Boolean(c) && c.alive);
}

export function availableRoutes(state: GameState): SiteNode[] {
  const expedition = state.expedition;
  if (!expedition) return [];
  const site = state.sites[expedition.siteId];
  if (!site) return [];
  const current = site.nodes.find((n) => n.id === expedition.currentNodeId);
  if (!current) return [];

  return current.links
    .map((id) => site.nodes.find((n) => n.id === id))
    .filter((n): n is SiteNode => n !== undefined && n.revealed);
}

export interface NodeResolution {
  lines: string[];
  combatStarted: boolean;
  died: Character[];
}

/** Move to a revealed node and resolve whatever is there. */
export function enterNode(state: GameState, nodeId: string, rng: Rng): NodeResolution {
  const lines: string[] = [];
  const died: Character[] = [];
  const expedition = state.expedition;
  if (!expedition) return { lines, combatStarted: false, died };

  const site = state.sites[expedition.siteId];
  const node = site?.nodes.find((n) => n.id === nodeId);
  if (!site || !node) return { lines, combatStarted: false, died };

  expedition.currentNodeId = node.id;
  if (!expedition.visited.includes(node.id)) expedition.visited.push(node.id);

  const advance = advanceTime(state, node.hours, rng);
  lines.push(...advance.lines);
  died.push(...advance.deaths);

  lines.push(node.description);

  const party = expeditionParty(state);
  if (party.length === 0) {
    return { lines, combatStarted: false, died };
  }

  let check;
  let passed = true;

  if (node.check) {
    const toolHelp = partyToolBonus(party, node.check.skill, state.ship);
    check = performCheck(
      {
        skill: node.check.skill,
        secondarySkill: node.check.secondarySkill,
        modifiers: [
          ...(node.check.modifiers ?? []),
          ...(toolHelp > 0 ? [{ label: 'Equipment', value: toolHelp }] : []),
        ],
        criticalRisk: node.check.criticalRisk,
        participantIds: selectParticipants(party, node.check.skill, 'duo'),
        leaderId: expedition.leaderId,
        label: node.check.description,
      },
      checkContext(state),
      rng,
    );

    passed = check.outcome === 'success' || check.outcome === 'exceptional';

    if (state.debug.enabled) {
      state.debug.records.push({
        id: `dbg_node_${state.debug.records.length}`,
        hours: state.hours,
        label: `Site node: ${node.label}`,
        detail: { check, node: node.kind },
      });
    }

    if (!passed && check.outcome === 'partial') {
      lines.push('You get through, but it costs you time and nerve.');
      const extra = advanceTime(state, node.hours * 0.5, rng);
      lines.push(...extra.lines);
      for (const member of party) applyStress(member, 4);
      passed = true;
    } else if (!passed) {
      lines.push('That does not go the way you wanted.');
    }
  }

  // Hazards land on failure, and sometimes on a critical failure regardless.
  if (node.hazard && (!passed || check?.outcome === 'criticalFailure')) {
    const victim = rng.pick(party);
    lines.push(`${victim.name} runs into ${node.hazard.label}.`);
    const result = applyRawWound(victim, node.hazard.severityScore, node.hazard.damageType, rng);
    lines.push(...result.lines);
    if (result.killed) died.push(victim);
    for (const member of party) applyStress(member, 6);
  }

  // Loot only comes out if you actually got in.
  if (passed && !node.cleared) {
    if (node.loot) {
      for (const entry of node.loot) {
        expedition.carried.push({ ...entry });
        lines.push(`Recovered ${entry.qty} × ${entry.itemId.replace(/_/g, ' ')}.`);
      }
    }
    if (node.lootCredits) {
      expedition.carriedCredits += node.lootCredits;
      lines.push(`Found ${node.lootCredits} credits.`);
    }
    if (check?.outcome === 'exceptional') {
      const bonus = Math.round(site.danger * 2);
      expedition.carriedCredits += bonus;
      lines.push(`Clean work — you find ${bonus} more than you expected.`);
    }
  }

  node.cleared = true;

  lines.push(...revealFrom(state, site, node, rng));

  if (node.encounter && passed) {
    state.pendingCombat = node.encounter;
    return { lines, combatStarted: true, died };
  }

  return { lines, combatStarted: false, died };
}

/** Leave the site, banking everything carried. */
export function exitExpedition(state: GameState, rng: Rng): string[] {
  const lines: string[] = [];
  const expedition = state.expedition;
  if (!expedition) return lines;

  const site = state.sites[expedition.siteId];
  const container = state.ship && !state.ship.destroyed ? state.ship.cargo : null;

  for (const entry of expedition.carried) {
    const target = container ?? expeditionParty(state)[0]?.backpack;
    if (!target) continue;
    addItem(target, entry.itemId, entry.qty, entry.condition ?? 100, rng);
  }
  if (expedition.carriedCredits > 0) {
    state.resources.credits += expedition.carriedCredits;
    lines.push(`Banked ${expedition.carriedCredits} credits.`);
  }

  if (site) {
    const cleared = site.nodes.filter((n) => n.cleared).length;
    if (cleared >= site.nodes.length - 1) {
      site.exhausted = true;
      lines.push(`${site.name} has nothing left worth the trip.`);
    }
    site.intel = Math.min(3, site.intel + 1);
    state.crewXp += XP.perSiteCleared;
    pushLog(state, 'mission', `Left ${site.name} with ${expedition.carried.length} finds.`);
  }

  // Travel back and decompress.
  const back = advanceTime(state, 1.5, rng);
  lines.push(...back.lines);

  state.expedition = null;
  state.phase = state.currentLocationId ? 'atLocation' : 'enroute';
  state.screen = state.currentPlaceId ? 'place' : 'cockpit';

  return lines;
}

/** Abort without banking — used when the party is wiped or forced out. */
export function abandonExpedition(state: GameState): void {
  state.expedition = null;
  state.phase = state.currentLocationId ? 'atLocation' : 'enroute';
  state.screen = state.currentPlaceId ? 'place' : 'cockpit';
}

export function siteProgress(state: GameState): { cleared: number; known: number; total: number } {
  const expedition = state.expedition;
  if (!expedition) return { cleared: 0, known: 0, total: 0 };
  const site = state.sites[expedition.siteId];
  if (!site) return { cleared: 0, known: 0, total: 0 };
  return {
    cleared: site.nodes.filter((n) => n.cleared).length,
    known: site.nodes.filter((n) => n.revealed).length,
    total: site.nodes.length,
  };
}

export function currentNode(state: GameState): SiteNode | null {
  const expedition = state.expedition;
  if (!expedition) return null;
  const site = state.sites[expedition.siteId];
  return site?.nodes.find((n) => n.id === expedition.currentNodeId) ?? null;
}

export function canExitHere(state: GameState): boolean {
  const node = currentNode(state);
  const expedition = state.expedition;
  if (!node || !expedition) return false;
  const site = state.sites[expedition.siteId];
  if (!site) return false;
  // You can always turn back from the entrance, or leave via the exit.
  return node.id === site.exitId || node.id === site.entranceId;
}

export { NODE_LABELS };
export type { ExpeditionState };

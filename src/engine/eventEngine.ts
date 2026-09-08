/**
 * Event selection and resolution.
 *
 * Routine events auto-resolve into the log. Meaningful events interrupt.
 * Only meaningful decisions should stop the player.
 */

import { EVENTS_BY_SCOPE, EVENT_INDEX } from '../content';
import { generateRecruit } from './character';
import { performCheck, selectParticipants, type CheckContext, type Participation } from './check';
import { addItem } from './inventory';
import { pushLog } from './log';
import type { Rng } from './rng';
import { damageSystem, hasQuirk, QUIRK_TEXT, revealQuirk, shipRef } from './ship';
import {
  activeParty,
  advanceTime,
  applyCrewStress,
  clampMorale,
  clampStress,
  crewMembers,
} from './sim';
import { reactTo, relationshipDelta } from './personality';
import { tagsForChoice } from './tags';
import { EVENTS, MORALE, SHIPS } from './tuning';
import { applyRawWound } from './wounds';
import { SHIP_TRIMS } from './types';
import type {
  ActiveEvent,
  Character,
  CheckOutcome,
  CheckResult,
  EventChoice,
  EventEffect,
  EventScope,
  GameEventDef,
  GameState,
  LocationState,
} from './types';

// ---------------------------------------------------------------------------
// Token substitution
// ---------------------------------------------------------------------------

export function buildTokens(state: GameState, actor?: Character): Record<string, string> {
  const location = state.currentLocationId ? state.locations[state.currentLocationId] : undefined;
  const captain = state.characters[state.captainId];
  const crew = crewMembers(state);

  return {
    location: location?.name ?? 'open space',
    captain: captain ? captain.name : 'the captain',
    ship: state.ship && !state.ship.destroyed ? state.ship.name : 'the ship',
    // Event prose says "{theShip} is carrying" where a sentence needs an
    // article; {ship} stays the bare name for "aboard {ship}".
    theShip: shipRef(state.ship),
    actor: actor ? actor.name : crew[0]?.name ?? 'someone',
    crew: crew.length > 1 ? 'the crew' : 'you',
  };
}

export function applyTokens(text: string, tokens: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (match, key: string) => tokens[key] ?? match);
}

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

export interface SelectOptions {
  /** Only consider routine events, or only meaningful ones. */
  routine?: boolean;
  danger?: number;
  location?: LocationState;
  /** Ids to exclude from this draw. */
  exclude?: string[];
}

function meetsConditions(
  event: GameEventDef,
  state: GameState,
  options: SelectOptions,
): boolean {
  const cond = event.conditions;
  const danger = options.danger ?? options.location?.danger ?? 0;

  if (options.routine !== undefined && Boolean(event.routine) !== options.routine) return false;
  if (options.exclude?.includes(event.id)) return false;

  // Once-only events never come back.
  if (cond?.once && state.firedOnce.includes(event.id)) return false;

  // Suppress anything seen very recently so a leg does not repeat itself.
  const lastSeen = state.recentEvents[event.id];
  if (lastSeen !== undefined && state.hours - lastSeen < EVENTS.repeatSuppressionHours) {
    return false;
  }

  if (!cond) return true;

  if (cond.minDanger !== undefined && danger < cond.minDanger) return false;
  if (cond.maxDanger !== undefined && danger > cond.maxDanger) return false;
  if (cond.minCrew !== undefined && crewMembers(state).length < cond.minCrew) return false;
  if (cond.requiresShip && (!state.ship || state.ship.destroyed)) return false;
  if (cond.locationKinds && options.location && !cond.locationKinds.includes(options.location.kind)) {
    return false;
  }
  if (cond.flag && !state.flags[cond.flag]) return false;
  if (cond.notFlag && state.flags[cond.notFlag]) return false;

  // Some events only make sense on a hull that actually has the thing. A ship
  // with no hidden compartment can never be the ship where one turns up.
  if (cond.shipQuirk) {
    const quirk = state.ship?.quirks.find((q) => q.id === cond.shipQuirk!.id);
    if (!quirk) return false;
    if (cond.shipQuirk.revealed !== undefined && quirk.revealed !== cond.shipQuirk.revealed) {
      return false;
    }
  }

  return true;
}

export function selectEvent(
  state: GameState,
  scopes: EventScope[],
  rng: Rng,
  options: SelectOptions = {},
): GameEventDef | null {
  const pool: GameEventDef[] = [];
  const seen = new Set<string>();

  for (const scope of scopes) {
    for (const event of EVENTS_BY_SCOPE[scope] ?? []) {
      if (seen.has(event.id)) continue;
      seen.add(event.id);
      if (meetsConditions(event, state, options)) pool.push(event);
    }
  }

  if (pool.length === 0) {
    // Fall back to ignoring repeat suppression rather than showing nothing.
    for (const scope of scopes) {
      for (const event of EVENTS_BY_SCOPE[scope] ?? []) {
        if (seen.has(`relaxed:${event.id}`)) continue;
        seen.add(`relaxed:${event.id}`);
        const relaxed = { ...state, recentEvents: {} } as GameState;
        if (meetsConditions(event, relaxed, options)) pool.push(event);
      }
    }
  }

  if (pool.length === 0) return null;
  return rng.weighted(
    pool.map((e) => ({ value: e, weight: Math.max(1, e.weight * appetiteFor(state, e)) })),
  );
}

/**
 * How attractive this particular ship makes a particular kind of trouble.
 *
 * A visibly valuable hull is worth the fuel to somebody, and a hull that looks
 * like nothing is not. This nudges the odds; it never makes a good ship a
 * punishment, and it touches nothing except who comes looking.
 */
function appetiteFor(state: GameState, event: GameEventDef): number {
  const ship = state.ship;
  if (!ship || ship.destroyed) return 1;
  const predatory = event.scope.includes('hostile') || (event.tags ?? []).includes('pirates');
  if (!predatory) return 1;

  // Trim is what a passing crew can actually see from a distance.
  const shine = SHIP_TRIMS.indexOf(ship.trim) - 2; // -2 makeshift .. +2 luxury
  // The illegal darkening treatment is exactly what it is for.
  const dark = hasQuirk(ship, 'stealthTint') ? -1.5 : 0;
  return Math.max(0.6, Math.min(1.6, 1 + (shine + dark) * 0.15));
}

/** Scopes appropriate to where the player currently is. */
export function scopesForLocation(location: LocationState | undefined): EventScope[] {
  if (!location) return ['travel', 'technical', 'social'];
  switch (location.kind) {
    case 'homeworld':
      return ['homeworld', 'social', 'medical'];
    case 'moon':
      return ['moon', 'social', 'technical'];
    case 'tradeStation':
    case 'transitStation':
      return ['station', 'social', 'medical'];
    case 'inhabitedPlanet':
      return ['planet', 'social', 'medical'];
    case 'travelWorld':
      return ['station', 'social'];
    case 'temporary':
      return ['travel', 'hostile'];
  }
}

// ---------------------------------------------------------------------------
// Starting an event
// ---------------------------------------------------------------------------

export function beginEvent(
  state: GameState,
  def: GameEventDef,
  source: EventScope,
  actor?: Character,
): ActiveEvent {
  const tokens = buildTokens(state, actor);
  const active: ActiveEvent = { def, tokens, source };
  state.activeEvent = active;
  state.recentEvents[def.id] = state.hours;
  if (def.conditions?.once && !state.firedOnce.includes(def.id)) {
    state.firedOnce.push(def.id);
  }
  return active;
}

export function dismissEvent(state: GameState): void {
  state.activeEvent = null;
}

// ---------------------------------------------------------------------------
// Choice availability
// ---------------------------------------------------------------------------

export interface ChoiceAvailability {
  choice: EventChoice;
  available: boolean;
  reason?: string;
}

export function choiceAvailability(state: GameState, choice: EventChoice): ChoiceAvailability {
  const req = choice.requires;
  if (!req) return { choice, available: true };

  const res = state.resources;
  if (req.minCredits !== undefined && res.credits < req.minCredits) {
    return { choice, available: false, reason: `Needs ${req.minCredits} credits` };
  }
  if (req.minFood !== undefined && res.food < req.minFood) {
    return { choice, available: false, reason: `Needs ${req.minFood} days of food` };
  }
  if (req.minMedicine !== undefined && res.medicine < req.minMedicine) {
    return { choice, available: false, reason: `Needs ${req.minMedicine} medicine` };
  }
  if (req.minRepairParts !== undefined && res.repairParts < req.minRepairParts) {
    return { choice, available: false, reason: `Needs ${req.minRepairParts} repair parts` };
  }
  if (req.minFuel !== undefined && res.fuel < req.minFuel) {
    return { choice, available: false, reason: `Needs ${req.minFuel} fuel` };
  }
  if (req.minCrew !== undefined && crewMembers(state).length < req.minCrew) {
    return { choice, available: false, reason: `Needs ${req.minCrew} crew` };
  }
  if (req.skill) {
    const best = Math.max(0, ...activeParty(state).map((c) => c.skills[req.skill!.skill] ?? 0));
    if (best < req.skill.min) {
      return { choice, available: false, reason: `Needs ${req.skill.skill} ${req.skill.min}` };
    }
  }
  if (req.flag && !state.flags[req.flag]) {
    return { choice, available: false, reason: 'Not available yet' };
  }

  return { choice, available: true };
}

export function availableChoices(state: GameState, def: GameEventDef): ChoiceAvailability[] {
  return def.choices.map((choice) => choiceAvailability(state, choice));
}

// ---------------------------------------------------------------------------
// Effects
// ---------------------------------------------------------------------------

export interface EffectResult {
  lines: string[];
  deaths: Character[];
}

function adjustResource(state: GameState, key: keyof GameState['resources'], delta: number, lines: string[], label: string): void {
  if (!delta) return;
  const before = state.resources[key];
  let next = before + delta;
  if (key === 'fuel') next = Math.min(next, state.resources.fuelCapacity);
  next = Math.max(0, next);
  state.resources[key] = key === 'credits' || key === 'repairParts'
    ? Math.round(next)
    : next;
  const actual = state.resources[key] - before;
  if (Math.abs(actual) >= 0.5 || key === 'credits') {
    lines.push(`${actual > 0 ? '+' : ''}${Math.round(actual)} ${label}`);
  }
}

export function applyEffects(
  state: GameState,
  effects: EventEffect,
  rng: Rng,
  actor?: Character,
): EffectResult {
  const lines: string[] = [];
  const deaths: Character[] = [];

  // Time passes first — the choice takes as long as it takes.
  if (effects.hours && effects.hours > 0) {
    const advance = advanceTime(state, effects.hours, rng);
    lines.push(...advance.lines);
    deaths.push(...advance.deaths);
  }

  adjustResource(state, 'fuel', effects.fuel ?? 0, lines, 'fuel');
  adjustResource(state, 'food', effects.food ?? 0, lines, 'days of food');
  adjustResource(state, 'medicine', effects.medicine ?? 0, lines, 'medicine');
  adjustResource(state, 'repairParts', effects.repairParts ?? 0, lines, 'repair parts');
  adjustResource(state, 'credits', effects.credits ?? 0, lines, 'credits');
  // Data cores are not a survival resource — they are objects. Authored events
  // that award them now put actual data cores in the hold, where they can be
  // sold, carried, or handed over like anything else.
  if (effects.dataCores && effects.dataCores > 0) {
    const container = state.ship && !state.ship.destroyed ? state.ship.cargo : null;
    const target = container ?? activeParty(state)[0]?.gear;
    if (target) {
      addItem(target, 'data_core', effects.dataCores, 100, rng);
      lines.push(
        effects.dataCores === 1
          ? 'A data core, into the hold.'
          : `${effects.dataCores} data cores, into the hold.`,
      );
    }
  }

  if (effects.morale) {
    state.morale = clampMorale(state.morale + effects.morale);
    lines.push(`${effects.morale > 0 ? '+' : ''}${effects.morale} crew morale`);
  }

  if (effects.crewStress) {
    applyCrewStress(state, effects.crewStress);
    lines.push(
      effects.crewStress > 0 ? 'The crew is shaken.' : 'The crew steadies a little.',
    );
  }

  if (state.ship && !state.ship.destroyed) {
    if (effects.hull) {
      damageSystem(state.ship, 'hull', effects.hull);
      lines.push(`${effects.hull > 0 ? '+' : ''}${effects.hull} hull condition`);
    }
    if (effects.systems) {
      for (const [kind, delta] of Object.entries(effects.systems)) {
        if (!delta) continue;
        const failure = damageSystem(state.ship, kind as never, delta as number);
        lines.push(`${(delta as number) > 0 ? '+' : ''}${delta} ${kind} condition`);
        if (failure) lines.push(failure);
      }
    }
  }

  if (effects.items) {
    for (const entry of effects.items) {
      const target = state.ship && !state.ship.destroyed ? state.ship.cargo : (actor ?? crewMembers(state)[0])?.gear;
      if (!target) continue;
      addItem(target, entry.itemId, entry.qty, entry.condition ?? 100, rng);
      lines.push(`+${entry.qty} ${entry.itemId.replace(/_/g, ' ')}`);
    }
  }

  if (effects.wound) {
    const party = activeParty(state);
    const victim = actor && party.includes(actor) ? actor : party[rng.int(0, Math.max(0, party.length - 1))];
    if (victim) {
      const result = applyRawWound(victim, effects.wound.severityScore, effects.wound.damageType, rng);
      lines.push(...result.lines);
      if (result.killed) deaths.push(victim);
    }
  }

  // A hidden feature was built into the hull. Finding it changes what you
  // know, never what is there.
  if (effects.revealQuirk && revealQuirk(state.ship, effects.revealQuirk)) {
    lines.push(QUIRK_TEXT[effects.revealQuirk]);
    pushLog(state, 'system', `Something about ${state.ship?.name} that was not on the plans.`);
  }

  if (effects.recruit) {
    const location = state.currentLocationId ? state.locations[state.currentLocationId] : undefined;
    const venue = location?.recruitVenues[0] ?? 'bar';
    const recruit = generateRecruit(rng, venue, {
      crisis: location?.kind === 'homeworld' && state.homeworld.infrastructure < 60,
    });
    recruit.aboard = true;
    state.characters[recruit.id] = recruit;
    state.crewIds.push(recruit.id);
    state.morale = clampMorale(state.morale + MORALE.crewRecruitBonus);
    lines.push(`${recruit.name} ${recruit.surname} joins the crew.`);
  }

  if (effects.loseCrew) {
    const candidates = crewMembers(state).filter((c) => !c.isPlayer);
    if (candidates.length > 0) {
      const lost = rng.pick(candidates);
      lost.alive = false;
      lost.departedReason = 'Lost during an incident';
      state.crewIds = state.crewIds.filter((id) => id !== lost.id);
      state.morale = clampMorale(state.morale - MORALE.crewDeathPenalty);
      deaths.push(lost);
      lines.push(`${lost.name} ${lost.surname} is gone.`);
    }
  }

  if (effects.personalXp && actor) {
    actor.personalXp += effects.personalXp;
    lines.push(`+${effects.personalXp} personal XP for ${actor.name}`);
  }
  if (effects.crewXp) {
    state.crewXp += effects.crewXp;
    lines.push(`+${effects.crewXp} crew XP`);
  }

  if (effects.flag) {
    state.flags[effects.flag.key] = effects.flag.value;
  }

  if (effects.combat) {
    state.pendingCombat = effects.combat;
  }

  if (effects.log) {
    pushLog(state, 'event', effects.log);
  }

  // Deaths from a wound applied here still need to leave the roster.
  for (const dead of deaths) {
    state.crewIds = state.crewIds.filter((id) => id !== dead.id);
  }

  // Keep the ship's fuel tank honest after any capacity change.
  if (state.ship && !state.ship.destroyed) {
    state.resources.fuelCapacity = SHIPS.fuelCapacity[state.ship.shipClass];
    state.resources.fuel = Math.min(state.resources.fuel, state.resources.fuelCapacity);
  }

  return { lines, deaths };
}

// ---------------------------------------------------------------------------
// Resolving a choice
// ---------------------------------------------------------------------------

/** Nearest defined outcome branch, so content need not write all five. */
const OUTCOME_FALLBACK: Record<CheckOutcome, CheckOutcome[]> = {
  exceptional: ['exceptional', 'success', 'partial', 'failure', 'criticalFailure'],
  success: ['success', 'exceptional', 'partial', 'failure', 'criticalFailure'],
  partial: ['partial', 'success', 'failure', 'exceptional', 'criticalFailure'],
  failure: ['failure', 'partial', 'criticalFailure', 'success', 'exceptional'],
  criticalFailure: ['criticalFailure', 'failure', 'partial', 'success', 'exceptional'],
};

export function resolveChoice(
  state: GameState,
  choiceId: string,
  rng: Rng,
): ActiveEvent | null {
  const active = state.activeEvent;
  if (!active) return null;

  const choice = active.def.choices.find((c) => c.id === choiceId);
  if (!choice) return null;

  const lines: string[] = [];
  let resolvedCheck: CheckResult | undefined;

  // Immediate effects apply regardless of how the check lands.
  if (choice.effects) {
    const result = applyEffects(state, choice.effects, rng, state.characters[state.playerId]);
    lines.push(...result.lines);
  }

  let text = choice.result?.text ?? '';

  if (choice.check) {
    const party = activeParty(state);
    const participation: Participation = choice.check.participation;
    const participantIds = selectParticipants(party, choice.check.skill, participation);
    const captain = state.characters[state.captainId];

    const context: CheckContext = {
      characters: state.characters,
      morale: state.morale,
      hours: state.hours,
    };

    resolvedCheck = performCheck(
      {
        skill: choice.check.skill,
        attributes: choice.check.attributes,
        secondarySkill: choice.check.secondarySkill,
        modifiers: choice.check.modifiers,
        criticalRisk: choice.check.criticalRisk,
        participantIds,
        leaderId: participantIds.length >= 2 && captain ? captain.id : undefined,
        label: choice.label,
      },
      context,
      rng,
    );

    recordCheckDebug(state, resolvedCheck.label, resolvedCheck);

    const branch = pickBranch(choice, resolvedCheck.outcome);
    if (branch) {
      text = branch.text;
      const actorId = resolvedCheck.participantIds[0];
      const actor = actorId ? state.characters[actorId] : undefined;
      const result = applyEffects(state, branch.effects, rng, actor);
      lines.push(...result.lines);
    }
  } else if (choice.result) {
    const result = applyEffects(state, choice.result.effects, rng, state.characters[state.playerId]);
    lines.push(...result.lines);
  }

  // What the crew make of what was just decided.
  //
  // The tags come off what the choice actually does, so every authored event
  // in the game reaches personality without naming a trait anywhere in
  // content. The captain carries the decision; everybody aboard reacts to it,
  // and the ones whose values it touched adjust how they feel about the person
  // who made it.
  const tags = tagsForChoice(choice);
  const captain = state.characters[state.captainId];
  const crisis = Boolean(state.combat);
  const aboard = crewMembers(state);

  // Everybody reacts as themselves. Two people can watch the same decision and
  // feel opposite things about it, because they are different people — the
  // shared morale figure is the average of what the room actually felt, not a
  // reading taken off the captain and applied to everyone.
  let moraleSum = 0;
  for (const member of aboard) {
    const felt = reactTo(member, tags, { crisis });
    member.stress = clampStress(member.stress + felt.stress);
    moraleSum += felt.morale;

    if (captain && member.id !== captain.id) {
      // And how they feel about the person who decided it.
      const rel = member.relationships[captain.id];
      if (rel) {
        const { delta } = relationshipDelta(member, tags, { crisis });
        if (delta !== 0) rel.value = Math.max(-100, Math.min(100, rel.value + delta));
      }
    }
  }
  if (aboard.length > 0) {
    state.morale = clampMorale(state.morale + moraleSum / aboard.length / 2);
  }

  // The captain carries the decision, so a conflict of theirs is worth saying.
  if (captain && captain.alive) {
    const felt = reactTo(captain, tags, { crisis });
    if (felt.conflicted.length > 0 && felt.stress > 0) {
      lines.push(`That sat badly with ${captain.name}.`);
    }
  }

  active.resolution = {
    choiceId,
    text: applyTokens(text, active.tokens),
    check: resolvedCheck,
    effectSummary: lines,
  };

  pushLog(state, 'event', `${active.def.title}: ${applyTokens(text, active.tokens)}`);

  return active;
}

function pickBranch(choice: EventChoice, outcome: CheckOutcome) {
  if (!choice.outcomes) return choice.result;
  for (const candidate of OUTCOME_FALLBACK[outcome]) {
    const branch = choice.outcomes[candidate];
    if (branch) return branch;
  }
  return choice.result;
}

// ---------------------------------------------------------------------------
// Routine auto-resolution
// ---------------------------------------------------------------------------

/**
 * Resolve a routine event without stopping the player. Picks the first
 * available choice — routine events are written with one obvious action — and
 * writes the outcome straight to the log.
 */
export function autoResolveRoutine(
  state: GameState,
  def: GameEventDef,
  rng: Rng,
): string | null {
  const options = availableChoices(state, def).filter((c) => c.available);
  if (options.length === 0) return null;

  const choice = options[0]!.choice;
  const tokens = buildTokens(state);

  let text = choice.result?.text ?? '';
  let effects: EventEffect | undefined = choice.result?.effects;

  if (choice.check) {
    const party = activeParty(state);
    const participantIds = selectParticipants(party, choice.check.skill, choice.check.participation);
    const result = performCheck(
      {
        skill: choice.check.skill,
        attributes: choice.check.attributes,
        secondarySkill: choice.check.secondarySkill,
        modifiers: choice.check.modifiers,
        participantIds,
        label: choice.label,
      },
      { characters: state.characters, morale: state.morale, hours: state.hours },
      rng,
    );
    const branch = pickBranch(choice, result.outcome);
    if (branch) {
      text = branch.text;
      effects = branch.effects;
    }
  }

  if (choice.effects) applyEffects(state, choice.effects, rng);
  if (effects) applyEffects(state, effects, rng);

  state.recentEvents[def.id] = state.hours;
  if (def.conditions?.once && !state.firedOnce.includes(def.id)) {
    state.firedOnce.push(def.id);
  }

  const line = applyTokens(text || def.title, tokens);
  pushLog(state, 'event', line);
  return line;
}

// ---------------------------------------------------------------------------
// Debug plumbing
// ---------------------------------------------------------------------------

export function recordCheckDebug(state: GameState, label: string, result: unknown): void {
  if (!state.debug.enabled) return;
  state.debug.records.push({
    id: `dbg_${state.debug.records.length}`,
    hours: state.hours,
    label,
    detail: result as Record<string, unknown>,
  });
}

export function eventById(id: string): GameEventDef | undefined {
  return EVENT_INDEX.get(id);
}

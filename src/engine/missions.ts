/**
 * Missions.
 *
 * Solo: exactly one participant, and it cannot be used to bypass a Group
 * Mission. Group: capacity 2-5, minimum 2, the player brings anywhere from 2 up
 * to the cap. Crew: the base ship itself is involved.
 *
 * Only one player-controlled away party exists at a time.
 */

import { performCheck, selectParticipants, type CheckContext } from './check';
import { addItem } from './inventory';
import { pushLog } from './log';
import type { Rng } from './rng';
import { ensureSites } from './scavenge';
import { advanceTime, applyStress, crewMembers } from './sim';
import { MISSIONS, XP } from './tuning';
import { applyRawWound } from './wounds';
import type {
  Character,
  GameState,
  LocationState,
  MissionDef,
  MissionKind,
  SkillKey,
} from './types';

// ---------------------------------------------------------------------------
// Mission templates
// ---------------------------------------------------------------------------

interface MissionTemplate {
  kind: MissionKind;
  title: string;
  description: string;
  skill: SkillKey;
  secondary?: SkillKey;
  hours: [number, number];
  dangerScale: number;
  payScale: number;
  weight: number;
  /** Group templates draw a capacity from this range. */
  capacity?: [number, number];
  /** Set when the mission is a site expedition rather than an abstract job. */
  usesSite?: boolean;
}

const TEMPLATES: MissionTemplate[] = [
  {
    kind: 'solo',
    title: 'Courier Run',
    description: 'Carry a sealed package across the district. One person, no questions, no escort.',
    skill: 'stealth',
    secondary: 'exploration',
    hours: [3, 7],
    dangerScale: 0.6,
    payScale: 0.7,
    weight: 14,
  },
  {
    kind: 'solo',
    title: 'Systems Consult',
    description: 'Somebody needs a second opinion on a failing installation, and needs it quietly.',
    skill: 'electricalEngineering',
    secondary: 'computers',
    hours: [4, 9],
    dangerScale: 0.3,
    payScale: 0.85,
    weight: 12,
  },
  {
    kind: 'solo',
    title: 'Locate a Person',
    description: 'A family wants somebody found. They will pay for a name and an address, not a rescue.',
    skill: 'persuasion',
    secondary: 'exploration',
    hours: [5, 12],
    dangerScale: 0.5,
    payScale: 0.8,
    weight: 10,
  },
  {
    kind: 'group',
    title: 'Salvage Contract',
    description: 'A site nobody has worked yet, with a buyer already lined up for whatever comes out.',
    skill: 'scavenging',
    secondary: 'mechanicalEngineering',
    hours: [6, 16],
    dangerScale: 1,
    payScale: 1.2,
    weight: 20,
    capacity: [2, 5],
    usesSite: true,
  },
  {
    kind: 'group',
    title: 'Recovery Job',
    description: 'Something specific has to come back out of somewhere unpleasant. Bring people.',
    skill: 'exploration',
    secondary: 'firstAid',
    hours: [8, 20],
    dangerScale: 1.15,
    payScale: 1.3,
    weight: 16,
    capacity: [2, 4],
    usesSite: true,
  },
  {
    kind: 'group',
    title: 'Escort Detail',
    description: 'Walk a shipment from one side of a bad district to the other. Two of you minimum.',
    skill: 'firearms',
    secondary: 'closeQuarters',
    hours: [5, 11],
    dangerScale: 1.3,
    payScale: 1.25,
    weight: 13,
    capacity: [2, 4],
  },
  {
    kind: 'group',
    title: 'Repair Crew Wanted',
    description: 'A structure that needs more hands than the owner has. Physical, dirty, well paid.',
    skill: 'mechanicalEngineering',
    secondary: 'electricalEngineering',
    hours: [10, 26],
    dangerScale: 0.7,
    payScale: 1.1,
    weight: 15,
    capacity: [2, 5],
  },
  {
    kind: 'group',
    title: 'Medical Detail',
    description: 'A clinic is over capacity and will pay for anyone who can actually treat people.',
    skill: 'firstAid',
    secondary: 'medicalDiagnostics',
    hours: [8, 18],
    dangerScale: 0.5,
    payScale: 1,
    weight: 12,
    capacity: [2, 3],
  },
  {
    kind: 'crew',
    title: 'Cargo Charter',
    description: 'A full hold, a fixed destination, and a shipper who wants it moved this week.',
    skill: 'piloting',
    secondary: 'navigation',
    hours: [12, 30],
    dangerScale: 0.8,
    payScale: 1.5,
    weight: 10,
  },
  {
    kind: 'crew',
    title: 'Tow and Recover',
    description: 'A disabled vessel needs bringing in. It takes the whole ship and most of a day.',
    skill: 'piloting',
    secondary: 'mechanicalEngineering',
    hours: [10, 24],
    dangerScale: 1.1,
    payScale: 1.45,
    weight: 8,
  },
];

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

let missionCounter = 0;

export function generateMissions(
  state: GameState,
  location: LocationState,
  rng: Rng,
): MissionDef[] {
  if (!location.actions.includes('missions') && !location.actions.includes('findWork')) {
    return [];
  }

  const count = rng.int(MISSIONS.offerCount[0], MISSIONS.offerCount[1]);
  const missions: MissionDef[] = [];
  const sites = ensureSites(state, location).filter((s) => !s.exhausted);

  for (let i = 0; i < count; i++) {
    const template = rng.weighted(TEMPLATES.map((t) => ({ value: t, weight: t.weight })));

    // A site mission needs a site to point at.
    if (template.usesSite && sites.length === 0) continue;

    missionCounter += 1;
    const danger = Math.round(
      Math.max(3, Math.min(100, location.danger * template.dangerScale * rng.float(0.75, 1.3))),
    );
    const hours = rng.float(template.hours[0], template.hours[1]);
    const pay = Math.round(
      (60 + danger * 8 + hours * 9) * template.payScale * rng.float(0.8, 1.25),
    );

    const mission: MissionDef = {
      id: `msn_${missionCounter.toString(36)}_${rng.int(0, 0xffff).toString(36)}`,
      kind: template.kind,
      title: template.title,
      description: template.description,
      locationId: location.id,
      capacity:
        template.kind === 'solo'
          ? MISSIONS.soloPartySize
          : template.kind === 'crew'
            ? MISSIONS.groupMaxCapacity
            : rng.int(template.capacity![0], template.capacity![1]),
      estimatedHours: hours,
      danger,
      rewardCredits: pay,
      expiresAtHours: state.hours + rng.int(MISSIONS.expiryHours[0], MISSIONS.expiryHours[1]),
    };

    if (template.usesSite) {
      mission.siteId = rng.pick(sites).id;
    }

    missions.push(mission);
  }

  return missions;
}

/** Refresh the offer board for the current location. */
export function refreshMissions(state: GameState, rng: Rng): void {
  const location = state.currentLocationId ? state.locations[state.currentLocationId] : undefined;
  if (!location) return;

  // Drop anything expired or belonging elsewhere and not accepted.
  state.missions = state.missions.filter(
    (m) =>
      m.accepted ||
      ((m.expiresAtHours === undefined || m.expiresAtHours > state.hours) &&
        m.locationId === location.id),
  );

  const here = state.missions.filter((m) => m.locationId === location.id && !m.accepted);
  if (here.length === 0) {
    state.missions.push(...generateMissions(state, location, rng));
  }
}

// ---------------------------------------------------------------------------
// Party rules
// ---------------------------------------------------------------------------

export interface PartyRules {
  min: number;
  max: number;
  label: string;
}

export function partyRules(mission: MissionDef, crewCount: number): PartyRules {
  switch (mission.kind) {
    case 'solo':
      return { min: 1, max: 1, label: 'Exactly one person.' };
    case 'group': {
      const cap = Math.min(mission.capacity, MISSIONS.groupMaxCapacity, crewCount);
      return {
        min: MISSIONS.groupMin,
        max: Math.max(MISSIONS.groupMin, cap),
        label: `Between ${MISSIONS.groupMin} and ${Math.max(MISSIONS.groupMin, cap)} people.`,
      };
    }
    case 'crew':
      return { min: 1, max: crewCount, label: 'The whole ship is involved.' };
  }
}

export function validateParty(
  mission: MissionDef,
  selectedIds: string[],
  crewCount: number,
): { ok: boolean; reason?: string } {
  const rules = partyRules(mission, crewCount);
  if (selectedIds.length < rules.min) {
    return { ok: false, reason: `Needs at least ${rules.min}.` };
  }
  if (selectedIds.length > rules.max) {
    return { ok: false, reason: `No more than ${rules.max}.` };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Resolution for abstract (non-site) missions
// ---------------------------------------------------------------------------

export interface MissionResult {
  lines: string[];
  success: boolean;
  died: Character[];
}

function templateFor(mission: MissionDef): MissionTemplate {
  return TEMPLATES.find((t) => t.title === mission.title) ?? TEMPLATES[0]!;
}

/**
 * Run an abstract job to completion in one resolution. Site missions go through
 * the expedition system instead.
 */
export function resolveMission(
  state: GameState,
  mission: MissionDef,
  partyIds: string[],
  leaderId: string | null,
  rng: Rng,
): MissionResult {
  const lines: string[] = [];
  const died: Character[] = [];
  const template = templateFor(mission);

  const party = partyIds
    .map((id) => state.characters[id])
    .filter((c): c is Character => Boolean(c) && c.alive);

  if (party.length === 0) {
    return { lines: ['Nobody available to go.'], success: false, died };
  }

  const advance = advanceTime(state, mission.estimatedHours, rng);
  lines.push(...advance.lines);
  died.push(...advance.deaths);

  const context: CheckContext = {
    characters: state.characters,
    morale: state.morale,
    hours: state.hours,
  };

  const check = performCheck(
    {
      skill: template.skill,
      secondarySkill: template.secondary,
      modifiers: [{ label: 'Job difficulty', value: -Math.round(mission.danger / 6) }],
      participantIds: partyIds.length > 0 ? partyIds : selectParticipants(party, template.skill, 'group'),
      leaderId: partyIds.length >= 2 ? (leaderId ?? undefined) : undefined,
      label: mission.title,
    },
    context,
    rng,
  );

  if (state.debug.enabled) {
    state.debug.records.push({
      id: `dbg_mission_${state.debug.records.length}`,
      hours: state.hours,
      label: `Mission: ${mission.title}`,
      detail: { check, mission },
    });
  }

  let payout = 0;
  let success = false;

  switch (check.outcome) {
    case 'exceptional':
      payout = Math.round(mission.rewardCredits * 1.4);
      success = true;
      lines.push('The job goes better than the terms called for. The client notices.');
      break;
    case 'success':
      payout = mission.rewardCredits;
      success = true;
      lines.push('The job is done and paid as agreed.');
      break;
    case 'partial':
      payout = Math.round(mission.rewardCredits * 0.55);
      success = true;
      lines.push('It gets done, late and imperfectly. You are paid accordingly.');
      for (const member of party) applyStress(member, 6);
      break;
    case 'failure':
      payout = 0;
      lines.push('The job falls through. Nobody is paying for this.');
      for (const member of party) applyStress(member, 9);
      break;
    case 'criticalFailure': {
      payout = 0;
      lines.push('It goes badly wrong.');
      const victim = rng.pick(party);
      const wound = applyRawWound(
        victim,
        Math.round(28 + mission.danger * 0.5),
        rng.pick(['blunt', 'pierce', 'slash'] as const),
        rng,
      );
      lines.push(...wound.lines);
      if (wound.killed) died.push(victim);
      for (const member of party) applyStress(member, 14);
      break;
    }
  }

  if (payout > 0) {
    state.resources.credits += payout;
    lines.push(`Paid ${payout} credits.`);
  }

  if (success) {
    state.crewXp += XP.perMissionCompleted;
    for (const member of party) member.personalXp += 4;
    if (mission.rewardItems) {
      const container = state.ship && !state.ship.destroyed ? state.ship.cargo : party[0]!.backpack;
      for (const reward of mission.rewardItems) {
        addItem(container, reward.itemId, reward.qty, 100, rng);
      }
    }
  }

  state.missions = state.missions.filter((m) => m.id !== mission.id);
  pushLog(state, 'mission', `${mission.title}: ${success ? 'completed' : 'failed'}.`);

  return { lines, success, died };
}

export function acceptMission(state: GameState, missionId: string): MissionDef | null {
  const mission = state.missions.find((m) => m.id === missionId);
  if (!mission) return null;
  mission.accepted = true;
  pushLog(state, 'mission', `Accepted: ${mission.title}.`);
  return mission;
}

export function abandonMission(state: GameState, missionId: string): void {
  const mission = state.missions.find((m) => m.id === missionId);
  if (!mission) return;
  state.missions = state.missions.filter((m) => m.id !== missionId);
  state.morale = Math.max(0, state.morale - 3);
  pushLog(state, 'mission', `Abandoned: ${mission.title}.`);
}

export function missionsHere(state: GameState): MissionDef[] {
  const here = state.currentLocationId;
  if (!here) return [];
  return state.missions.filter(
    (m) =>
      m.locationId === here &&
      (m.expiresAtHours === undefined || m.expiresAtHours > state.hours),
  );
}

/** Crew missions need enough people left aboard to actually fly the ship. */
export function canRunMission(state: GameState, mission: MissionDef): { ok: boolean; reason?: string } {
  const crew = crewMembers(state);
  if (state.expedition) return { ok: false, reason: 'A party is already deployed.' };
  if (mission.kind === 'crew' && (!state.ship || state.ship.destroyed)) {
    return { ok: false, reason: 'This needs the ship.' };
  }
  const rules = partyRules(mission, crew.length);
  if (crew.length < rules.min) {
    return { ok: false, reason: `Needs at least ${rules.min} able crew.` };
  }
  return { ok: true };
}

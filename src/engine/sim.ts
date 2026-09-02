/**
 * The passage of time.
 *
 * Everything that happens *because hours went by* lives here: food, hunger,
 * wounds, stress, exhaustion, morale drift, the homeworld clock. This module
 * never selects or fires events — that would make time and content circular.
 */

import { bestAt } from './check';
import type { Rng } from './rng';
import { hasRoom, overcrowding, quartersQuality, roomsOfKind } from './ship';
import { FOOD, MORALE, REST, STRESS } from './tuning';
import { tickWounds } from './wounds';
import { advanceHomeworldClock } from './world';
import type { Character, GameState, ShipQuality } from './types';

// ---------------------------------------------------------------------------
// Crew queries
// ---------------------------------------------------------------------------

export function crewMembers(state: GameState): Character[] {
  return state.crewIds
    .map((id) => state.characters[id])
    .filter((c): c is Character => Boolean(c) && c.alive);
}

export function allCharacters(state: GameState): Character[] {
  return Object.values(state.characters);
}

export function livingCrewCount(state: GameState): number {
  return crewMembers(state).length;
}

/**
 * Drop anyone who died outside the time-advance path — combat and hazards mark
 * a character dead in place, and the roster has to follow or the crew count
 * silently disagrees with who is actually alive.
 */
export function pruneDeadCrew(state: GameState): Character[] {
  const dead = state.crewIds
    .map((id) => state.characters[id])
    .filter((c): c is Character => Boolean(c) && !c.alive);
  if (dead.length === 0) return [];
  state.crewIds = state.crewIds.filter((id) => state.characters[id]?.alive === true);
  if (state.expedition) {
    state.expedition.partyIds = state.expedition.partyIds.filter(
      (id) => state.characters[id]?.alive === true,
    );
  }
  return dead;
}

/** The away party if one is deployed, otherwise everyone aboard. */
export function activeParty(state: GameState): Character[] {
  if (state.expedition) {
    return state.expedition.partyIds
      .map((id) => state.characters[id])
      .filter((c): c is Character => Boolean(c) && c.alive);
  }
  return crewMembers(state);
}

/** Crew left aboard while a party is away. */
export function shipboardCrew(state: GameState): Character[] {
  const away = new Set(state.expedition?.partyIds ?? []);
  return crewMembers(state).filter((c) => !away.has(c.id));
}

// ---------------------------------------------------------------------------
// Food
// ---------------------------------------------------------------------------

/** Crew-days consumed per day, after the best cook stretches the rations. */
export function foodConsumptionPerDay(state: GameState): number {
  const crew = crewMembers(state);
  if (crew.length === 0) return 0;

  const cook = bestAt(crew, 'cooking');
  const cookSkill = cook ? cook.skills.cooking : 0;
  const galleyBonus = state.ship && hasRoom(state.ship, 'galley') ? 0.06 : 0;
  const efficiency = 1 - Math.min(FOOD.maxCookingEfficiency, (cookSkill / 100) * FOOD.maxCookingEfficiency + galleyBonus);

  return crew.length * FOOD.perCrewPerDay * efficiency;
}

/** Hydroponics slowly offsets consumption. */
export function foodProductionPerDay(state: GameState): number {
  if (!state.ship || state.ship.destroyed) return 0;
  const bays = roomsOfKind(state.ship, 'hydroponics').filter((r) => r.condition > 20);
  return bays.reduce((sum, r) => sum + 0.25 * (r.condition / 100), 0);
}

// ---------------------------------------------------------------------------
// The main tick
// ---------------------------------------------------------------------------

export interface AdvanceOptions {
  /** True while the crew is deliberately resting. */
  resting?: boolean;
  /** Suppress the homeworld clock, e.g. during a menu-driven sequence. */
  freezeClock?: boolean;
}

export interface AdvanceResult {
  lines: string[];
  deaths: Character[];
  /** True if the homeworld reached its terminal state during this tick. */
  homeworldEnded: boolean;
}

export function advanceTime(
  state: GameState,
  hours: number,
  rng: Rng,
  options: AdvanceOptions = {},
): AdvanceResult {
  const lines: string[] = [];
  const deaths: Character[] = [];
  if (hours <= 0) return { lines, deaths, homeworldEnded: false };

  const days = hours / 24;
  const crew = crewMembers(state);
  const resting = options.resting ?? false;

  state.hours += hours;

  // --- Food -------------------------------------------------------------
  const consumption = foodConsumptionPerDay(state) * days;
  const production = foodProductionPerDay(state) * days;
  const net = consumption - production;

  if (net > 0) {
    const available = Math.min(state.resources.food, net);
    state.resources.food = Math.max(0, state.resources.food - net);
    const shortfallDays = (net - available) / Math.max(1, crew.length);

    if (shortfallDays > 0) {
      for (const member of crew) {
        member.hungerDays += shortfallDays;
      }
      // A grace period before hunger starts doing real damage.
      const biting = crew.filter((c) => c.hungerDays > FOOD.hungerGraceDays);
      if (biting.length > 0) {
        state.morale = clampMorale(state.morale + FOOD.moralePerDayStarving * shortfallDays);
        for (const member of biting) {
          member.stress = clampStress(member.stress + FOOD.stressPerDayStarving * shortfallDays);
          member.health = Math.max(
            1,
            member.health + FOOD.healthPerDayStarving * shortfallDays,
          );
        }
        lines.push(
          biting.length === crew.length
            ? 'The crew is going hungry.'
            : `${biting.length} of the crew are going hungry.`,
        );
      }
    }
  } else {
    state.resources.food = Math.max(0, state.resources.food - net);
  }

  // Eating again clears the hunger debt.
  if (state.resources.food > 0) {
    for (const member of crew) {
      if (member.hungerDays > 0) member.hungerDays = Math.max(0, member.hungerDays - days * 2);
    }
  }

  const fed = state.resources.food > 0 || crew.every((c) => c.hungerDays <= FOOD.hungerGraceDays);

  // --- Rest and stress ---------------------------------------------------
  const quarters = quartersQuality(state.ship);
  const facilityRecovery = computeFacilityRecovery(state);

  for (const member of crew) {
    if (resting) {
      member.rested = Math.min(100, member.rested + REST.restedPerHour * hours);
      member.stress = clampStress(
        member.stress - (STRESS.restRecoveryPerHour + facilityRecovery) * hours,
      );
    } else {
      member.rested = Math.max(0, member.rested - REST.restedLossPerHour * hours);
      member.stress = clampStress(member.stress - STRESS.passiveRecoveryPerHour * hours);
    }
  }

  // --- Overcrowding ------------------------------------------------------
  if (state.ship && !state.ship.destroyed) {
    const over = overcrowding(state.ship, crew.length);
    if (over > 0) {
      for (const member of crew) {
        member.stress = clampStress(
          member.stress + over * (1.5 / 24) * hours,
        );
      }
      if (days >= 0.5) {
        state.morale = clampMorale(state.morale - over * (MORALE.driftPerDay * 0.5) * days);
      }
    }
  }

  // --- Wounds ------------------------------------------------------------
  for (const member of crew) {
    const result = tickWounds(
      member,
      {
        hours,
        fed,
        resting,
        quartersQuality: quarters as ShipQuality | undefined,
      },
      rng,
    );
    lines.push(...result.lines);
    if (result.died) deaths.push(member);
  }

  // Non-crew characters (family, contacts) still heal and age, more slowly.
  for (const character of allCharacters(state)) {
    if (character.aboard || !character.alive) continue;
    tickWounds(character, { hours, fed: true, resting: false }, rng);
  }

  // --- Deaths ------------------------------------------------------------
  for (const dead of deaths) {
    state.crewIds = state.crewIds.filter((id) => id !== dead.id);
    state.morale = clampMorale(state.morale - MORALE.crewDeathPenalty);
    for (const survivor of crewMembers(state)) {
      const rel = survivor.relationships[dead.id];
      const grief = rel ? STRESS.fromCrewDeath * (0.5 + rel.value / 200) : STRESS.fromCrewDeath * 0.5;
      survivor.stress = clampStress(survivor.stress + grief);
    }
    lines.push(`${dead.name} ${dead.surname} is dead. ${dead.departedReason ?? ''}`.trim());
  }

  // --- Morale drift ------------------------------------------------------
  const drift = MORALE.driftPerDay * days;
  if (state.morale > MORALE.neutralPoint) {
    state.morale = Math.max(MORALE.neutralPoint, state.morale - drift);
  } else if (state.morale < MORALE.neutralPoint) {
    state.morale = Math.min(MORALE.neutralPoint, state.morale + drift);
  }

  // --- Homeworld clock ---------------------------------------------------
  let homeworldEnded = false;
  if (!options.freezeClock && !state.homeworld.ended) {
    advanceHomeworldClock(state.homeworld, hours);
    if (state.hours / 24 >= state.homeworld.terminalDay) {
      state.homeworld.ended = true;
      homeworldEnded = true;
    }
  }

  return { lines, deaths, homeworldEnded };
}

function computeFacilityRecovery(state: GameState): number {
  if (!state.ship || state.ship.destroyed) return 0;
  let total = 0;
  for (const [kind, rate] of Object.entries(STRESS.facilityRecoveryPerHour)) {
    const rooms = roomsOfKind(state.ship, kind as never).filter((r) => r.condition > 25);
    if (rooms.length > 0) total += rate;
  }
  return total;
}

// ---------------------------------------------------------------------------
// Clamps
// ---------------------------------------------------------------------------

export function clampMorale(value: number): number {
  return Math.max(MORALE.min, Math.min(MORALE.max, value));
}

export function clampStress(value: number): number {
  return Math.max(STRESS.min, Math.min(STRESS.max, value));
}

export function moraleBand(morale: number): { label: string; key: string } {
  for (const band of MORALE.bands) {
    if (morale >= band.min) return { label: band.label, key: band.key };
  }
  return { label: 'Breaking', key: 'breaking' };
}

// ---------------------------------------------------------------------------
// Stress application with Will mitigation
// ---------------------------------------------------------------------------

/** Composure and Discipline reduce how much stress actually lands. */
export function applyStress(character: Character, amount: number): void {
  if (amount <= 0) {
    character.stress = clampStress(character.stress + amount);
    return;
  }
  const will = (character.attributes.composure + character.attributes.discipline) / 2;
  const reduction = Math.min(0.6, will * STRESS.willReductionPerPoint);
  character.stress = clampStress(character.stress + amount * (1 - reduction));
}

export function applyCrewStress(state: GameState, amount: number): void {
  for (const member of crewMembers(state)) applyStress(member, amount);
}

// ---------------------------------------------------------------------------
// Resource helpers
// ---------------------------------------------------------------------------

export function daysOfFoodRemaining(state: GameState): number {
  const perDay = foodConsumptionPerDay(state) - foodProductionPerDay(state);
  if (perDay <= 0) return Infinity;
  return state.resources.food / perDay;
}

export function isStarving(state: GameState): boolean {
  return state.resources.food <= 0 && crewMembers(state).some((c) => c.hungerDays > FOOD.hungerGraceDays);
}

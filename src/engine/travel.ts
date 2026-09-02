/**
 * Travel.
 *
 * When a leg begins, the broad event structure for that leg is generated from
 * duration, regional danger, ship condition, crew condition and the seed. There
 * is no visible fixed event interval, and variance between legs is substantial.
 * Routine events auto-resolve into the log; meaningful events interrupt.
 */

import { autoResolveRoutine, beginEvent, selectEvent } from './eventEngine';
import { pushLog } from './log';
import { ensurePlaces } from './places';
import type { Rng } from './rng';
import { fuelPerHour, isFlyable } from './ship';
import { advanceTime, applyCrewStress, crewMembers } from './sim';
import { TIME, TRAVEL } from './tuning';
import { generateMarket, shouldRestock } from './economy';
import { isFinalLeg } from './world';
import type { GameState, LocationId, TravelLegEvent, TravelState } from './types';

// ---------------------------------------------------------------------------
// Leg planning
// ---------------------------------------------------------------------------

export interface LegEstimate {
  hours: number;
  days: number;
  fuelCost: number;
  fuelPerHour: number;
  danger: number;
  affordable: boolean;
}

/** What the destination panel shows before the player commits. */
export function estimateLeg(
  state: GameState,
  toId: LocationId,
): LegEstimate | null {
  const to = state.locations[toId];
  const from = state.currentLocationId ? state.locations[state.currentLocationId] : undefined;
  if (!to) return null;

  const crew = crewMembers(state);
  const perHour = fuelPerHour(state.ship, crew);

  // Distance is the route separation, with a floor so nothing is instant.
  const routeDelta = from ? Math.abs(to.routeIndex - from.routeIndex) : 0;
  const lateralDelta = from ? Math.abs(to.lateral - from.lateral) * 0.12 : 0;
  const baseDays = Math.max(to.travelDaysFromPrev, routeDelta * 6 + lateralDelta);

  const hours = baseDays * TRAVEL.hoursPerRouteDay;
  const fuelCost = perHour * hours;

  return {
    hours,
    days: baseDays,
    fuelCost,
    fuelPerHour: perHour,
    danger: to.danger,
    affordable: state.resources.fuel >= fuelCost * 0.85,
  };
}

/**
 * Generate the event structure for a leg. Longer and more dangerous legs
 * generally create more opportunities, but the variance is deliberately wide.
 */
function planLegEvents(totalHours: number, danger: number, rng: Rng): TravelLegEvent[] {
  const days = totalHours / 24;
  const variance = rng.float(TRAVEL.eventDensityVariance[0], TRAVEL.eventDensityVariance[1]);

  const meaningfulRate = TRAVEL.meaningfulEventsPerDay + danger * TRAVEL.dangerEventScale;
  const meaningfulCount = Math.max(
    0,
    Math.round(days * meaningfulRate * variance + (rng.next() - 0.5)),
  );
  const routineCount = Math.max(
    0,
    Math.round(days * TRAVEL.routineEventsPerDay * rng.float(0.6, 1.5)),
  );

  const events: TravelLegEvent[] = [];
  const meaningfulTimes: number[] = [];

  for (let i = 0; i < meaningfulCount; i++) {
    let attempt = 0;
    let at = 0;
    do {
      at = rng.float(totalHours * 0.06, totalHours * 0.96);
      attempt++;
    } while (
      attempt < 14 &&
      meaningfulTimes.some((t) => Math.abs(t - at) < TRAVEL.minMeaningfulGapHours)
    );
    if (meaningfulTimes.some((t) => Math.abs(t - at) < TRAVEL.minMeaningfulGapHours)) continue;
    meaningfulTimes.push(at);
    events.push({ atHours: at, eventId: '', interrupt: true, fired: false });
  }

  for (let i = 0; i < routineCount; i++) {
    events.push({
      atHours: rng.float(0, totalHours * 0.98),
      eventId: '',
      interrupt: false,
      fired: false,
    });
  }

  return events.sort((a, b) => a.atHours - b.atHours);
}

export function beginTravel(
  state: GameState,
  toId: LocationId,
  rng: Rng,
): { ok: boolean; reason?: string } {
  const from = state.currentLocationId;
  const to = state.locations[toId];
  if (!from || !to) return { ok: false, reason: 'No destination selected.' };
  if (!state.ship || state.ship.destroyed) return { ok: false, reason: 'You have no ship.' };
  if (!isFlyable(state.ship)) {
    return { ok: false, reason: 'The ship cannot fly in this condition.' };
  }

  const estimate = estimateLeg(state, toId);
  if (!estimate) return { ok: false, reason: 'That course cannot be plotted.' };

  const finalLeg = isFinalLeg(from, toId);
  const danger = finalLeg ? Math.max(to.danger, 45) : to.danger;

  const travel: TravelState = {
    fromId: from,
    toId,
    totalHours: estimate.hours,
    elapsedHours: 0,
    fuelPerHour: estimate.fuelPerHour,
    events: planLegEvents(estimate.hours, danger, rng),
    paused: false,
    speed: state.speed,
    danger,
  };

  state.travel = travel;
  state.phase = 'enroute';
  state.currentLocationId = null;
  // Under way means aboard, by definition.
  state.currentPlaceId = null;
  state.screen = 'cockpit';

  pushLog(
    state,
    'travel',
    `Left ${state.locations[from]?.name ?? 'orbit'} for ${to.name}. Estimated ${(estimate.hours / 24).toFixed(1)} days.`,
  );

  if (state.locations[from]) state.locations[from]!.visited = true;

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Stepping
// ---------------------------------------------------------------------------

export interface TravelStep {
  /** Set when a meaningful event has interrupted travel. */
  interrupted: boolean;
  arrived: boolean;
  lines: string[];
}

export function stepTravel(state: GameState, hours: number, rng: Rng): TravelStep {
  const travel = state.travel;
  const lines: string[] = [];
  if (!travel || travel.paused) return { interrupted: false, arrived: false, lines };

  const remaining = travel.totalHours - travel.elapsedHours;
  let step = Math.min(hours, remaining);
  if (step <= 0) return finishTravel(state, rng);

  // --- Fuel -------------------------------------------------------------
  const needed = travel.fuelPerHour * step;
  if (state.resources.fuel >= needed) {
    state.resources.fuel = Math.max(0, state.resources.fuel - needed);
  } else {
    // Out of fuel. The leg still completes, but on emergency drift: three times
    // as long, and hard on everyone aboard.
    const affordableHours = travel.fuelPerHour > 0 ? state.resources.fuel / travel.fuelPerHour : 0;
    state.resources.fuel = 0;
    if (!state.flags['drifting']) {
      state.flags['drifting'] = true;
      pushLog(
        state,
        'warning',
        'Fuel exhausted. The ship is on ballistic drift — this is going to take a great deal longer.',
      );
      lines.push('Fuel exhausted. The ship is drifting.');
      // Stretch the remaining leg.
      travel.totalHours = travel.elapsedHours + (travel.totalHours - travel.elapsedHours) * 3;
      for (const event of travel.events) {
        if (!event.fired && event.atHours > travel.elapsedHours) {
          event.atHours = travel.elapsedHours + (event.atHours - travel.elapsedHours) * 3;
        }
      }
    }
    step = Math.max(step, affordableHours);
    applyCrewStress(state, 0.35 * step);
  }

  // --- Time -------------------------------------------------------------
  travel.elapsedHours += step;
  const advance = advanceTime(state, step, rng);
  lines.push(...advance.lines);

  if (advance.homeworldEnded) {
    lines.push(handleHomeworldEnd(state));
  }

  // Everyone on board is dead — the run is over.
  if (crewMembers(state).length === 0) {
    state.ending = {
      kind: 'death',
      text: 'The ship arrives on schedule with nobody left alive to bring it in.',
    };
    state.phase = 'dead';
    state.screen = 'gameOver';
    return { interrupted: false, arrived: false, lines };
  }

  // --- Events -----------------------------------------------------------
  for (const legEvent of travel.events) {
    if (legEvent.fired || legEvent.atHours > travel.elapsedHours) continue;
    legEvent.fired = true;

    const def = selectEvent(state, ['travel', 'technical', 'social', 'medical', 'hostile'], rng, {
      routine: !legEvent.interrupt,
      danger: travel.danger,
    });
    if (!def) continue;
    legEvent.eventId = def.id;

    if (legEvent.interrupt) {
      travel.paused = true;
      beginEvent(state, def, 'travel');
      state.screen = 'event';
      return { interrupted: true, arrived: false, lines };
    }

    const line = autoResolveRoutine(state, def, rng);
    if (line) lines.push(line);
  }

  if (travel.elapsedHours >= travel.totalHours) {
    const finish = finishTravel(state, rng);
    return { interrupted: false, arrived: finish.arrived, lines: [...lines, ...finish.lines] };
  }

  return { interrupted: false, arrived: false, lines };
}

function finishTravel(state: GameState, rng: Rng): TravelStep {
  const travel = state.travel;
  if (!travel) return { interrupted: false, arrived: false, lines: [] };

  const lines: string[] = [];
  const destination = state.locations[travel.toId];
  state.travel = null;
  delete state.flags['drifting'];

  if (!destination) {
    state.phase = 'atLocation';
    return { interrupted: false, arrived: true, lines };
  }

  arriveAt(state, destination.id, rng);
  lines.push(`Arrived at ${destination.name}.`);

  return { interrupted: false, arrived: true, lines };
}

export function arriveAt(state: GameState, locationId: LocationId, rng: Rng): void {
  const location = state.locations[locationId];
  if (!location) return;

  const firstVisit = !location.visited;
  state.currentLocationId = locationId;
  location.visited = true;
  location.discovered = true;
  state.phase = location.kind === 'homeworld' ? 'homeworld' : 'atLocation';
  state.screen = 'cockpit';

  // You arrive aboard, on whatever pad or berth the ship is now sitting on.
  // The place has to exist before the player can step off into it.
  ensurePlaces(state, location);
  state.currentPlaceId = null;

  // Reveal the next node on the main route.
  const index = state.routeIds.indexOf(locationId);
  if (index >= 0 && index + 1 < state.routeIds.length) {
    const next = state.locations[state.routeIds[index + 1]!];
    if (next) next.discovered = true;
  }

  // Markets drift while you are away.
  if (location.market && shouldRestock(location.market, state.hours)) {
    location.market = generateMarket(location, rng, state.hours);
  } else if (!location.market && location.condition !== 'abandoned') {
    location.market = generateMarket(location, rng, state.hours);
  }

  pushLog(state, 'travel', `Docked at ${location.name}.`);

  if (firstVisit) {
    pushLog(state, 'milestone', `First arrival: ${location.name}. ${location.subtitle}`);
    state.crewXp += 15;
  }

  if (locationId === 'loc_travel_world') {
    state.phase = 'complete';
    state.screen = 'travelCenter';
    state.ending = {
      kind: 'victory',
      text: 'You reached the New Frontier.',
    };
    pushLog(state, 'milestone', 'Reached the Travel Center. The opening escape is over.');
  }
}

// ---------------------------------------------------------------------------
// Pause / resume
// ---------------------------------------------------------------------------

export function resumeTravel(state: GameState): void {
  if (state.travel) {
    state.travel.paused = false;
    state.screen = 'cockpit';
  }
}

export function pauseTravel(state: GameState): void {
  if (state.travel) state.travel.paused = true;
}

export function setSpeed(state: GameState, speed: GameState['speed']): void {
  state.speed = speed;
  if (state.travel) state.travel.speed = speed;
}

/** In-game hours to advance per real second at the current speed. */
export function hoursPerRealSecond(state: GameState): number {
  return TIME.speedHoursPerSecond[state.speed];
}

// ---------------------------------------------------------------------------
// Homeworld terminal state
// ---------------------------------------------------------------------------

export function handleHomeworldEnd(state: GameState): string {
  const homeworld = state.locations['loc_homeworld'];
  if (homeworld) {
    homeworld.condition = 'abandoned';
    homeworld.actions = ['depart'];
    homeworld.description =
      'There is nothing to go back to. The atmospheric processors are gone and the crust is still moving.';
    homeworld.market = undefined;
    homeworld.recruitVenues = [];
    homeworld.populationTier = 0;
  }

  // Anyone still on the surface is lost.
  const lost: string[] = [];
  for (const character of Object.values(state.characters)) {
    if (character.aboard || !character.alive) continue;
    if (state.homeworld.familyIds.includes(character.id)) {
      character.alive = false;
      character.departedReason = 'Lost with the Homeworld';
      lost.push(`${character.name} ${character.surname}`);
    }
  }

  const message =
    lost.length > 0
      ? `The Homeworld is gone. Lost with it: ${lost.join(', ')}.`
      : 'The Homeworld is gone.';

  pushLog(state, 'milestone', message);

  // Grief lands on anyone who left family behind.
  for (const member of crewMembers(state)) {
    const lostKin = state.homeworld.familyIds.filter(
      (id) => member.relationships[id] && !state.homeworld.rescuedFamilyIds.includes(id),
    );
    if (lostKin.length > 0) applyCrewStress(state, 0);
    for (const _ of lostKin) {
      member.stress = Math.min(100, member.stress + 14);
    }
  }

  return message;
}

/** Travel progress 0..1 for the cockpit display. */
export function travelProgress(state: GameState): number {
  if (!state.travel || state.travel.totalHours <= 0) return 0;
  return Math.max(0, Math.min(1, state.travel.elapsedHours / state.travel.totalHours));
}

/**
 * Headless campaign driver.
 *
 * Plays a whole run with no UI. Used by the test suite to prove the systems
 * survive contact with each other, and available from the debug screen as a
 * playtest harness for balance questions ("how often does the clock beat you?").
 */

import { destroyShip } from './captain';
import {
  availableActions,
  characterFor,
  dismissCombat,
  performAction,
  startCombat,
  tickCombat,
} from './combat';
import { availableChoices, beginEvent, dismissEvent, resolveChoice, scopesForLocation, selectEvent } from './eventEngine';
import { generateProtagonistDraft } from './character';
import { createGame } from './newGame';
import {
  performRepair,
  performTreatment,
  repairTargets,
  rest,
  resupply,
  socialise,
  treatmentOptions,
} from './actions';
import { offerBerth, persuade, searchForRecruits } from './recruit';
import { Rng, streamRng } from './rng';
import {
  availableRoutes,
  beginExpedition,
  canExitHere,
  ensureSites,
  enterNode,
  exitExpedition,
} from './scavenge';
import { crewMembers, daysOfFoodRemaining, pruneDeadCrew, shipboardCrew } from './sim';
import { estimateFuel } from './ship';
import { beginTravel, estimateLeg, stepTravel } from './travel';
import { runAutonomousShip } from './captain';
import { reachableFrom } from './world';
import type { EventChoice, GameState, LocationState } from './types';

/**
 * `explore` grinds every location, `rush` beelines for the frontier ignoring
 * upkeep, and `balanced` plays the way a competent player actually does:
 * treat wounds, keep the tanks full, hire a fourth pair of hands, then push on.
 */
export type SimStrategy = 'explore' | 'rush' | 'balanced';

export interface SimulateOptions {
  maxSteps?: number;
  strategy?: SimStrategy;
  /** Take the base ship away mid-run to exercise the shipless path. */
  forceShipLoss?: boolean;
  /** Collect a readable transcript. Off by default because it is large. */
  trace?: boolean;
}

export interface SimulateResult {
  seed: string;
  outcome: 'victory' | 'death' | 'stalled' | 'homeworldLost';
  hours: number;
  days: number;
  steps: number;
  survivingCrew: number;
  locationsVisited: number;
  eventsResolved: number;
  fightsFought: number;
  sitesEntered: number;
  recruited: number;
  shipLost: boolean;
  terminalDay: number;
  errors: string[];
  trace: string[];
  finalState: GameState;
}

export function simulateRun(seed: string, options: SimulateOptions = {}): SimulateResult {
  const maxSteps = options.maxSteps ?? 4000;
  const strategy = options.strategy ?? 'explore';
  const errors: string[] = [];
  const trace: string[] = [];

  const rng = new Rng(`${seed}:sim`);
  const draft = generateProtagonistDraft(streamRng(seed, 'protagonist'));
  const state = createGame(seed, draft.character);

  let steps = 0;
  let eventsResolved = 0;
  let fightsFought = 0;
  let sitesEntered = 0;
  let recruited = 0;
  let shipLost = false;
  const startingCrew = state.crewIds.length;

  const note = (line: string): void => {
    if (options.trace) trace.push(`[${Math.round(state.hours)}h] ${line}`);
  };

  const guard = <T>(label: string, fn: () => T): T | undefined => {
    try {
      return fn();
    } catch (error) {
      errors.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
      return undefined;
    }
  };

  let lastHours = -1;
  let stuckFor = 0;

  while (steps < maxSteps) {
    steps++;

    pruneDeadCrew(state);
    if (state.ending) break;
    if (state.crewIds.length === 0) break;

    // A location action that consumes no time must not be repeatable forever.
    if (state.hours === lastHours) {
      stuckFor++;
      if (stuckFor > 4) {
        const advanced = guard('unstick', () => rest(state, 8, rng));
        if (!advanced || state.hours === lastHours) {
          errors.push(`stalled at ${state.hours.toFixed(1)}h with no way to advance time`);
          break;
        }
        stuckFor = 0;
      }
    } else {
      stuckFor = 0;
      lastHours = state.hours;
    }

    // --- Pending combat -------------------------------------------------
    if (state.pendingCombat && !state.combat) {
      const encounterId = state.pendingCombat;
      state.pendingCombat = null;
      guard('startCombat', () => {
        const combat = startCombat(state, encounterId, rng, 'cockpit');
        if (combat) {
          fightsFought++;
          note(`combat: ${combat.title}`);
          tickCombat(state, rng);
        }
      });
      continue;
    }

    // --- Combat ---------------------------------------------------------
    if (state.combat) {
      const combat = state.combat;
      if (combat.resolution) {
        guard('dismissCombat', () => dismissCombat(state));
        continue;
      }
      if (!combat.activeId) {
        const ready = guard('tickCombat', () => tickCombat(state, rng));
        if (!ready && !state.combat?.resolution) {
          // Nothing can act — bail rather than spin.
          guard('forceEndCombat', () => dismissCombat(state));
        }
        continue;
      }
      const active = combat.combatants.find((c) => c.id === combat.activeId);
      if (!active) {
        combat.activeId = null;
        continue;
      }
      guard('combatAction', () => {
        const options2 = availableActions(state, active).filter((a) => a.available);
        if (options2.length === 0) {
          combat.activeId = null;
          return;
        }

        // Approximate a competent player: break off when badly hurt, use cover
        // when hurt, otherwise take the strongest available attack. Measuring
        // the campaign against suicidal tactics would tell us nothing.
        const character = characterFor(state, active);
        const healthFraction = character ? character.health / character.maxHealth : 1;

        const escape = options2.find((a) => a.kind === 'escape');
        const cover = options2.find((a) => a.kind === 'cover');
        const aid = options2.find((a) => a.kind === 'firstAid');
        const attacks = options2.filter((a) => a.kind === 'attack' || a.kind === 'strike');

        let choice = attacks[0] ?? options2[0]!;
        if (attacks.length > 0) {
          // Prefer the heaviest attack available at this range.
          choice = attacks.reduce((best, a) =>
            (a.attackIndex ?? 0) < (best.attackIndex ?? 0) ? a : best,
          );
        }

        if (escape && healthFraction < 0.3) choice = escape;
        else if (aid && rng.chance(0.5)) choice = aid;
        else if (cover && !active.inCover && healthFraction < 0.6 && rng.chance(0.6)) choice = cover;

        performAction(state, active.id, choice, choice.targetId, rng);
      });
      continue;
    }

    // --- Events ---------------------------------------------------------
    if (state.activeEvent) {
      const event = state.activeEvent;
      if (event.resolution) {
        guard('dismissEvent', () => {
          dismissEvent(state);
          if (state.travel) state.travel.paused = false;
        });
        continue;
      }
      guard('resolveEvent', () => {
        const choices = availableChoices(state, event.def).filter((c) => c.available);
        if (choices.length === 0) {
          dismissEvent(state);
          if (state.travel) state.travel.paused = false;
          return;
        }
        const choice = chooseEventOption(state, choices.map((c) => c.choice), rng);
        resolveChoice(state, choice.id, rng);
        eventsResolved++;
        note(`event: ${event.def.title} -> ${choice.label}`);
      });
      continue;
    }

    // --- Expedition -----------------------------------------------------
    if (state.expedition) {
      const routes = guard('availableRoutes', () => availableRoutes(state)) ?? [];
      const unvisited = routes.filter((n) => !state.expedition!.visited.includes(n.id));

      if (unvisited.length > 0 && rng.chance(0.8)) {
        const target = rng.pick(unvisited);
        guard('enterNode', () => {
          const before = state.hours;
          enterNode(state, target.id, rng);
          const elapsed = state.hours - before;
          if (elapsed > 0) runAutonomousShip(state, elapsed, rng);
        });
      } else if (canExitHere(state) || routes.length === 0) {
        guard('exitExpedition', () => exitExpedition(state, rng));
      } else {
        // Walk back toward the way out.
        const target = rng.pick(routes);
        guard('backtrack', () => enterNode(state, target.id, rng));
      }
      continue;
    }

    // --- Travel ---------------------------------------------------------
    if (state.travel) {
      const before = state.hours;
      const step = guard('stepTravel', () => stepTravel(state, 6, rng));
      if (state.expedition) {
        const elapsed = state.hours - before;
        if (elapsed > 0) guard('autonomous', () => runAutonomousShip(state, elapsed, rng));
      }
      if (step && !step.interrupted && !step.arrived && state.hours === before) {
        errors.push('travel made no progress');
        break;
      }
      continue;
    }

    // --- Ship loss injection --------------------------------------------
    if (options.forceShipLoss && !shipLost && state.hours > 40 && state.ship && !state.ship.destroyed) {
      guard('destroyShip', () => {
        // Take the ship while a party is ashore, which is the case the rule is for.
        const aboard = shipboardCrew(state).filter((c) => !c.isPlayer);
        destroyShip(state, aboard);
        shipLost = true;
        note('ship destroyed');
      });
      continue;
    }

    // --- At a location --------------------------------------------------
    const location = state.currentLocationId ? state.locations[state.currentLocationId] : undefined;
    if (!location) {
      errors.push('no location and no travel');
      break;
    }

    const action = chooseLocationAction(state, location, strategy, rng);

    switch (action) {
      case 'resupply': {
        // A real player tops up before a long leg; the sim has to as well or
        // it only ever tests starvation.
        guard('resupply', () => {
          const crew = Math.max(1, crewMembers(state).length);
          const foodDays = daysOfFoodRemaining(state);
          if (foodDays < 14) {
            resupply(state, 'food', Math.ceil(crew * 14 - state.resources.food), rng);
          }
          const fuel = estimateFuel(state.ship, crewMembers(state), state.resources.fuel);
          if (fuel.hoursRemaining < 24 * 14) {
            const wanted = Math.round(state.resources.fuelCapacity - state.resources.fuel);
            if (wanted > 0) resupply(state, 'fuel', wanted, rng);
          }
          if (state.resources.medicine < 6) resupply(state, 'medicine', 6, rng);
          if (state.resources.repairParts < 40) resupply(state, 'repairParts', 40, rng);
        });
        break;
      }
      case 'depart': {
        const destinations = reachableFrom(state.currentLocationId, state.locations, state.routeIds);
        const target = pickDestination(state, destinations, strategy, rng);
        if (!target) {
          // Nowhere to go — pass time so the clock still runs.
          guard('idle', () => rest(state, 8, rng));
          break;
        }
        const result = guard('beginTravel', () => beginTravel(state, target.id, rng));
        if (result && !result.ok) {
          // Cannot fly — try to fix the problem rather than spinning.
          const targets = repairTargets(state);
          if (targets.length > 0 && state.resources.repairParts > 10) {
            guard('repair', () => performRepair(state, targets[0]!, 10, false, rng));
          } else {
            guard('idle', () => rest(state, 8, rng));
          }
        }
        break;
      }
      case 'scavenge': {
        guard('scavenge', () => {
          const sites = ensureSites(state, location).filter((s) => !s.exhausted);
          if (sites.length === 0) {
            rest(state, 4, rng);
            return;
          }
          const crew = crewMembers(state);
          if (crew.length === 0) return;
          const party = crew.slice(0, Math.min(3, crew.length)).map((c) => c.id);
          const result = beginExpedition(state, rng.pick(sites).id, party, party[0]!, rng);
          if (result.ok) sitesEntered++;
        });
        break;
      }
      case 'recruit': {
        guard('recruit', () => {
          if (location.recruitVenues.length === 0) return;
          const venue = rng.pick(location.recruitVenues);
          const search = searchForRecruits(state, venue, rng);
          for (const candidate of search.candidates) {
            persuade(state, candidate, rng);
            persuade(state, candidate, rng);
            const offer = offerBerth(state, candidate, rng);
            if (offer.joined) recruited++;
          }
          state.recruitment = null;
        });
        break;
      }
      case 'rest': {
        guard('rest', () => rest(state, 8, rng));
        break;
      }
      case 'repair': {
        guard('repair', () => {
          const targets = repairTargets(state);
          if (targets.length === 0 || state.resources.repairParts < 8) return;
          performRepair(state, targets[0]!, 8, false, rng);
        });
        break;
      }
      case 'medical': {
        guard('medical', () => {
          const options2 = treatmentOptions(state).filter((o) => o.canAttempt);
          if (options2.length === 0) return;
          performTreatment(state, options2[0]!, rng);
        });
        break;
      }
      case 'social': {
        guard('social', () => socialise(state, rng));
        break;
      }
      case 'event':
      default: {
        guard('locationEvent', () => {
          const def = selectEvent(state, scopesForLocation(location), rng, {
            location,
            danger: location.danger,
          });
          if (!def) {
            rest(state, 4, rng);
            return;
          }
          beginEvent(state, def, def.scope[0] ?? 'homeworld');
        });
        break;
      }
    }
  }

  const visited = Object.values(state.locations).filter((l) => l.visited).length;
  const survivingCrew = crewMembers(state).length;

  let outcome: SimulateResult['outcome'] = 'stalled';
  if (state.ending?.kind === 'victory') outcome = 'victory';
  else if (state.ending?.kind === 'death' || survivingCrew === 0) outcome = 'death';
  else if (state.homeworld.ended && visited <= 1) outcome = 'homeworldLost';

  return {
    seed,
    outcome,
    hours: state.hours,
    days: state.hours / 24,
    steps,
    survivingCrew,
    locationsVisited: visited,
    eventsResolved,
    fightsFought,
    sitesEntered,
    recruited: recruited + Math.max(0, state.crewIds.length - startingCrew),
    shipLost: shipLost || Boolean(state.ship?.destroyed),
    terminalDay: state.homeworld.terminalDay,
    errors,
    trace,
    finalState: state,
  };
}

// ---------------------------------------------------------------------------
// Decision helpers
// ---------------------------------------------------------------------------

/**
 * Pick an event option the way a player does: read what the crew can actually
 * do, weigh the downside, and do not walk into a check nobody can pass.
 *
 * Choosing at random instead makes the simulation eat every reckless branch in
 * the content and reports the game as far deadlier than it plays.
 */
function chooseEventOption(state: GameState, choices: EventChoice[], rng: Rng): EventChoice {
  const party = crewMembers(state);

  const scored = choices.map((choice) => {
    let score = 10;

    // Competence at the check being asked for.
    if (choice.check) {
      const best = Math.max(0, ...party.map((c) => c.skills[choice.check!.skill] ?? 0));
      score += best * 0.28;
      if (best <= 0) score -= 14;
      if (choice.check.criticalRisk) score -= 8;
    } else {
      // A choice with no check is a known quantity.
      score += 6;
    }

    // Downside across every branch this choice can reach.
    const branches = [
      choice.effects,
      choice.result?.effects,
      ...Object.values(choice.outcomes ?? {}).map((b) => b?.effects),
    ].filter((e): e is NonNullable<typeof e> => Boolean(e));

    for (const effect of branches) {
      if (effect.wound) score -= effect.wound.severityScore / 6;
      if (effect.loseCrew) score -= 25;
      if (effect.combat) score -= 6;
      score += (effect.credits ?? 0) / 250;
      score += (effect.food ?? 0) / 6;
      score += (effect.medicine ?? 0) / 4;
      score += (effect.morale ?? 0) / 5;
      score -= (effect.crewStress ?? 0) / 10;
    }

    // A crew already in trouble should not be gambling.
    const hurt = party.filter((c) => c.wounds.some((w) => !w.treated)).length;
    if (hurt > 0 && branches.some((e) => e.wound || e.combat)) score -= hurt * 5;

    return { value: choice, weight: Math.max(0.35, score) };
  });

  return rng.weighted(scored);
}

type SimAction =
  | 'depart'
  | 'scavenge'
  | 'recruit'
  | 'rest'
  | 'repair'
  | 'medical'
  | 'social'
  | 'resupply'
  | 'event';

function chooseLocationAction(
  state: GameState,
  location: LocationState,
  strategy: SimStrategy,
  rng: Rng,
): SimAction {
  const crew = crewMembers(state);
  const hurt = crew.some((c) => c.wounds.some((w) => !w.treated));
  const bleeding = crew.some((c) => c.wounds.some((w) => !w.treated && w.bleeding > 0.3));
  const tired = crew.some((c) => c.rested < 30);

  // Only reach for treatment when somebody aboard can actually perform it —
  // otherwise there is nothing to do about the bleeding but carry on.
  const canTreat = treatmentOptions(state).some((o) => o.canAttempt);

  // Bleeding outranks everything. A player who ignores it is not playing badly,
  // they are dying, and the sim should not model that as a normal strategy.
  if (bleeding && canTreat) return 'medical';

  // Supplies come before anything else — running the tanks dry is not a
  // strategy, it is a failure to plan.
  const lowSupplies =
    daysOfFoodRemaining(state) < 10 ||
    estimateFuel(state.ship, crew, state.resources.fuel).hoursRemaining < 24 * 10;
  if (lowSupplies && location.market && state.resources.credits > 60) return 'resupply';

  if (strategy === 'rush') {
    if (hurt && canTreat) return 'medical';
    return 'depart';
  }

  if (strategy === 'balanced') {
    if (hurt && canTreat) return 'medical';
    if (tired) return 'rest';
    if (lowSupplies && location.market && state.resources.credits > 60) return 'resupply';
    // A crew of two cannot absorb a single bad encounter, so hire before going on.
    if (crew.length < 4 && location.recruitVenues.length > 0 && rng.chance(0.55)) {
      return 'recruit';
    }
    // Fund the trip when there is somewhere to earn and money is short.
    if (state.resources.credits < 400 && location.actions.includes('scavenge') && rng.chance(0.5)) {
      return 'scavenge';
    }
    return 'depart';
  }

  const weights: { value: SimAction; weight: number }[] = [
    { value: 'depart', weight: 22 },
    { value: 'event', weight: 30 },
    { value: 'rest', weight: tired ? 22 : 6 },
    { value: 'medical', weight: hurt && canTreat ? 20 : 0 },
    { value: 'social', weight: 8 },
  ];

  // Every option below has to be genuinely performable. An action that cannot
  // run consumes no time, and the sim would otherwise pick it forever.
  const hasSites =
    location.actions.includes('scavenge') &&
    // Sites are generated lazily, so an ungenerated location still counts.
    (location.siteIds.length === 0 ||
      location.siteIds.some((id) => state.sites[id] && !state.sites[id]!.exhausted));
  if (hasSites) weights.push({ value: 'scavenge', weight: 18 });

  if (location.actions.includes('recruit') && location.recruitVenues.length > 0 && crew.length < 5) {
    weights.push({ value: 'recruit', weight: 14 });
  }
  if (
    location.actions.includes('repair') &&
    state.resources.repairParts > 20 &&
    repairTargets(state).length > 0
  ) {
    weights.push({ value: 'repair', weight: 10 });
  }
  if (location.market && state.resources.credits > 200 && lowSupplies) {
    weights.push({ value: 'resupply', weight: 10 });
  }

  return rng.weighted(weights);
}

function pickDestination(
  state: GameState,
  destinations: LocationState[],
  strategy: SimStrategy,
  rng: Rng,
): LocationState | null {
  const affordable = destinations.filter((d) => {
    const estimate = estimateLeg(state, d.id);
    return estimate !== null && estimate.affordable;
  });

  const pool = affordable.length > 0 ? affordable : destinations;
  if (pool.length === 0) return null;

  // Always prefer moving outward; the whole run is a race away from home.
  const current = state.currentLocationId ? state.locations[state.currentLocationId] : undefined;
  const outward = pool.filter((d) => !current || d.routeIndex > current.routeIndex);

  if (strategy === 'rush' || strategy === 'balanced') {
    const onRoute = outward.filter((d) => d.onMainRoute);
    if (onRoute.length > 0) {
      return onRoute.reduce((best, d) => (d.routeIndex < best.routeIndex ? d : best));
    }
    return outward[0] ?? pool[0]!;
  }

  if (outward.length > 0 && rng.chance(0.72)) return rng.pick(outward);
  return rng.pick(pool);
}

// ---------------------------------------------------------------------------
// Batch runs — used by the debug screen for balance questions
// ---------------------------------------------------------------------------

export interface BatchSummary {
  runs: number;
  victories: number;
  deaths: number;
  stalled: number;
  averageDays: number;
  averageCrewSurviving: number;
  averageEvents: number;
  averageFights: number;
  shipsLost: number;
  errors: string[];
}

export function simulateBatch(count: number, options: SimulateOptions = {}): BatchSummary {
  const results: SimulateResult[] = [];
  const errors: string[] = [];

  for (let i = 0; i < count; i++) {
    const result = simulateRun(`BATCH-${Date.now().toString(36)}-${i}`, options);
    results.push(result);
    errors.push(...result.errors);
  }

  const average = (fn: (r: SimulateResult) => number): number =>
    results.length === 0 ? 0 : results.reduce((sum, r) => sum + fn(r), 0) / results.length;

  return {
    runs: results.length,
    victories: results.filter((r) => r.outcome === 'victory').length,
    deaths: results.filter((r) => r.outcome === 'death').length,
    stalled: results.filter((r) => r.outcome === 'stalled').length,
    averageDays: average((r) => r.days),
    averageCrewSurviving: average((r) => r.survivingCrew),
    averageEvents: average((r) => r.eventsResolved),
    averageFights: average((r) => r.fightsFought),
    shipsLost: results.filter((r) => r.shipLost).length,
    errors: [...new Set(errors)].slice(0, 20),
  };
}

/**
 * What matters right now.
 *
 * The cockpit used to show seventeen numbers of equal weight and let the player
 * work out which of them was a problem. The numbers are still there for anyone
 * who wants them — but the first thing the screen says is what the numbers
 * mean, in sentences, and only when they mean something.
 *
 * Nothing here changes state. It reads the simulation and speaks.
 */

import { untreatedWoundCount } from './actions';
import { hasDevelopmentToSpend } from './development';
import { missionsHere } from './missions';
import { flightReadiness } from './ship';
import { estimateFuel, safeCrewCapacity } from './ship';
import { crewMembers, daysOfFoodRemaining, isStarving } from './sim';
import { CHECK } from './tuning';
import { estimateTerminalDay } from './world';
import type { GameState } from './types';

/** Where a situation line can send the player. The cockpit maps these to taps. */
export type SituationGo =
  | 'ship'
  | 'crew'
  | 'inventory'
  | 'medical'
  | 'rest'
  | 'outside'
  | 'map'
  | 'expedition';

export interface SituationLine {
  id: string;
  tone: 'bad' | 'warn' | 'ok';
  /** Two or three words, for the eye. */
  label: string;
  /** The whole point, as a sentence. */
  text: string;
  action?: { label: string; go: SituationGo };
}

/** How many days of food are worth mentioning. Display only. */
const FOOD_WARN_DAYS = 6;
/** Fuel range below this many days is worth mentioning. Display only. */
const FUEL_WARN_DAYS = 3;

export function situationReport(state: GameState): SituationLine[] {
  const lines: SituationLine[] = [];
  const crew = crewMembers(state);
  const location = state.currentLocationId ? state.locations[state.currentLocationId] : undefined;
  const underway = Boolean(state.travel);
  const aboard = !state.currentPlaceId;

  // -- The clock the whole opening is about -------------------------------
  const inHomeRegion =
    !state.homeworld.ended && (location?.kind === 'homeworld' || location?.kind === 'moon');
  if (inHomeRegion) {
    const clock = estimateTerminalDay(state.homeworld, state.hours);
    lines.push({
      id: 'homeworld',
      tone: clock.urgency === 'calm' ? 'ok' : clock.urgency === 'pressing' ? 'warn' : 'bad',
      label: 'This world',
      text: `${clock.text} You are on day ${clock.elapsedDays + 1}.`,
    });
  }

  // -- People first ------------------------------------------------------
  if (state.expedition) {
    lines.push({
      id: 'party-out',
      tone: 'warn',
      label: 'Party out',
      text: 'You have people at a site right now. The ship runs without them until they are back.',
      action: { label: 'Go to the party', go: 'expedition' },
    });
  }

  const wounded = untreatedWoundCount(state);
  if (wounded > 0) {
    lines.push({
      id: 'wounded',
      tone: 'bad',
      label: 'Untreated',
      text:
        wounded === 1
          ? 'Somebody is carrying an untreated wound. Left alone it closes slowly and badly.'
          : `${wounded} untreated wounds aboard. Left alone they close slowly and badly.`,
      action: { label: 'Treat them', go: 'medical' },
    });
  }

  const tired = crew.filter((c) => c.rested < CHECK.exhaustionFloor);
  if (tired.length > 0) {
    const who =
      tired.length === 1
        ? `${tired[0]!.name} is exhausted`
        : `${tired.length} of your people are exhausted`;
    lines.push({
      id: 'exhausted',
      tone: 'warn',
      label: 'Exhausted',
      text: `${who}. Everything they attempt is worse until they sleep.`,
      action: aboard ? { label: 'Stand down and rest', go: 'rest' } : undefined,
    });
  }

  // -- The ship ----------------------------------------------------------
  const flight = flightReadiness(state.ship);
  if (flight.tone !== 'ok') {
    lines.push({
      id: 'ship',
      tone: flight.tone,
      label: flight.canFly ? 'Ship' : 'Grounded',
      text: `${flight.headline} ${flight.detail}`,
      action: { label: 'Look at the ship', go: 'ship' },
    });
  }

  // -- Stores ------------------------------------------------------------
  if (isStarving(state)) {
    lines.push({
      id: 'starving',
      tone: 'bad',
      label: 'No food',
      text: 'The stores are empty and people are going hungry. This gets ugly fast.',
    });
  } else {
    const foodDays = daysOfFoodRemaining(state);
    if (Number.isFinite(foodDays) && foodDays < FOOD_WARN_DAYS) {
      lines.push({
        id: 'food',
        tone: foodDays < 2 ? 'bad' : 'warn',
        label: 'Food',
        text: `Roughly ${Math.max(0, Math.floor(foodDays))} days of food aboard at the current headcount.`,
      });
    }
  }

  if (!underway && state.ship) {
    const fuel = estimateFuel(state.ship, crew, state.resources.fuel);
    if (fuel.daysRemaining < FUEL_WARN_DAYS) {
      lines.push({
        id: 'fuel',
        tone: fuel.daysRemaining < 1 ? 'bad' : 'warn',
        label: 'Fuel',
        text: `The tanks are good for about ${fuel.daysRemaining.toFixed(1)} days of burn. Most legs cost more than that.`,
      });
    }
  }

  // -- Growth is news, not a to-do list ----------------------------------
  const improved = crew.filter((c) => hasDevelopmentToSpend(state, c));
  if (improved.length > 0) {
    const who =
      improved.length === 1
        ? `${improved[0]!.name} has learned enough to get better at something`
        : `${improved.length} of your people have learned enough to get better`;
    lines.push({
      id: 'development',
      tone: 'ok',
      label: 'Experience',
      text: `${who}. One decision each — the direction, not the arithmetic.`,
      action: { label: 'Open the crew', go: 'crew' },
    });
  }

  // -- Opportunity, not just alarm ---------------------------------------
  if (!underway && state.ship && !state.ship.destroyed) {
    const capacity = safeCrewCapacity(state.ship);
    if (crew.length === 1 && capacity > 1) {
      lines.push({
        id: 'alone',
        tone: 'warn',
        label: 'Alone',
          text: `You are one person with ${capacity} berths. Nobody out there is coming to find you.`,
      });
    }
  }

  if (!underway && location) {
    const posted = missionsHere(state).length;
    if (posted > 0 && crew.length > 0) {
      lines.push({
        id: 'work',
        tone: 'ok',
        label: 'Work',
        text: `${posted} job${posted === 1 ? '' : 's'} posted on this world right now.`,
      });
    }
  }

  // -- Nothing wrong is itself worth saying ------------------------------
  if (lines.every((l) => l.tone === 'ok')) {
    lines.push({
      id: 'quiet',
      tone: 'ok',
      label: 'Quiet',
      text: underway
        ? 'The ship is flying itself. Nothing aboard needs you.'
        : 'Nothing aboard needs you. The only thing still moving is the clock.',
    });
  }

  return lines;
}

/** The single most pressing line, for anywhere with room for one. */
export function headlineSituation(state: GameState): SituationLine | null {
  const lines = situationReport(state);
  return (
    lines.find((l) => l.tone === 'bad') ?? lines.find((l) => l.tone === 'warn') ?? lines[0] ?? null
  );
}

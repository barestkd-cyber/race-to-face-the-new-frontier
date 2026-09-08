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
import { SYSTEM_LABELS } from './ship';
import { hasDevelopmentToSpend } from './development';
import { missionsHere } from './missions';
import { flightReadiness } from './ship';
import { estimateFuel } from './ship';
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
  /**
   * The same thing in a clause, for the cockpit, which has room for a line and
   * not a paragraph. Everywhere with room reads `text`.
   */
  short: string;
  action?: { label: string; go: SituationGo };
}

/** How many days of food are worth mentioning. Display only. */
const FOOD_WARN_DAYS = 6;
/** Hull below this stops being a gauge and becomes a thing to answer. */
const HULL_ALARM = 25;
/** Morale below this is the crew telling you something. */
const MORALE_ALARM = 30;
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
      short: `Collapse forecast: ${clock.range}`,
    });
  }

  // -- People first ------------------------------------------------------
  if (state.expedition) {
    lines.push({
      id: 'party-out',
      tone: 'warn',
      label: 'Party out',
      text: 'You have people at a site right now. The ship runs without them until they are back.',
      short: 'A party is deployed',
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
      short: wounded === 1 ? 'One untreated wound' : `${wounded} untreated wounds`,
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
      short: tired.length === 1 ? `${tired[0]!.name} is exhausted` : `${tired.length} exhausted`,
      action: aboard ? { label: 'Stand down and rest', go: 'rest' } : undefined,
    });
  }

  // -- The ship ----------------------------------------------------------
  const flight = flightReadiness(state.ship);
  if (flight.tone !== 'ok') {
    const worst = flight.worst;
    const system = worst ? SYSTEM_LABELS[worst.kind].toUpperCase() : 'SHIP';
    lines.push({
      id: 'ship',
      tone: flight.tone,
      label: flight.canFly ? system : `${system} OFFLINE`,
      text: `${flight.headline} ${flight.detail}`,
      short: flight.canFly
        ? `${worst ? `${Math.round(worst.condition)}% · ` : ''}still flyable`
        : 'Cannot depart',
      action: { label: 'Work on ship', go: 'ship' },
    });
  }

  // Hull and morale are not permanent gauges on the cockpit. They speak only
  // when they have crossed into something the player has to answer.
  if (state.ship && !state.ship.destroyed) {
    const hull = state.ship.systems.hull;
    if (hull.installed && hull.condition < HULL_ALARM) {
      lines.push({
        id: 'hull',
        tone: 'bad',
        label: 'Hull breach',
        text: `The hull is at ${Math.round(hull.condition)}% and will not take another hard hit.`,
        short: 'Repair required',
        action: { label: 'Work on ship', go: 'ship' },
      });
    }
  }

  if (state.morale < MORALE_ALARM) {
    lines.push({
      id: 'morale',
      tone: state.morale < MORALE_ALARM / 2 ? 'bad' : 'warn',
      label: 'Morale breaking',
      text: 'The crew are close to done. People start leaving, or worse, from here.',
      short: 'People will start leaving',
      action: { label: 'Open the crew', go: 'crew' },
    });
  }

  // -- Stores ------------------------------------------------------------
  if (isStarving(state)) {
    lines.push({
      id: 'starving',
      tone: 'bad',
      label: 'No food',
      text: 'The stores are empty and people are going hungry. This gets ugly fast.',
      short: 'The stores are empty',
    });
  } else {
    const foodDays = daysOfFoodRemaining(state);
    if (Number.isFinite(foodDays) && foodDays < FOOD_WARN_DAYS) {
      lines.push({
        id: 'food',
        tone: foodDays < 2 ? 'bad' : 'warn',
        label: 'Food',
        text: `Roughly ${Math.max(0, Math.floor(foodDays))} days of food aboard at the current headcount.`,
        short: `${Math.max(0, Math.floor(foodDays))} days aboard`,
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
        short: `${fuel.daysRemaining.toFixed(1)} days of burn — most legs cost more`,
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
      short:
        improved.length === 1
          ? `${improved[0]!.name} can get better at something`
          : `${improved.length} can get better at something`,
      action: { label: 'Open the crew', go: 'crew' },
    });
  }

  if (!underway && location) {
    const posted = missionsHere(state).length;
    if (posted > 0 && crew.length > 0) {
      lines.push({
        id: 'work',
        tone: 'ok',
        label: 'Work',
        text: `${posted} job${posted === 1 ? '' : 's'} posted on this world right now.`,
        short: `${posted} job${posted === 1 ? '' : 's'} posted here`,
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
      short: underway ? 'The ship is flying itself' : 'Only the clock is moving',
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

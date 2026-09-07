/**
 * Physical access.
 *
 * The rule this module exists to enforce, in one sentence:
 *
 *   Information can be global. Actions cannot.
 *
 * Knowing your engine is failing from the other side of the city is fine — that
 * is what instruments and comms are for. Reaching through the same screen to
 * repair it, or to pull a rifle out of a hold you are nowhere near, is not.
 *
 * Every screen asks the same questions here rather than inventing its own
 * checks, so the answer stays consistent and there is one place to change it.
 */

import { currentPlace, shipPlace } from './places';
import type { GameState } from './types';

export interface Access {
  ok: boolean;
  /** Why not, phrased for the player, when ok is false. */
  reason?: string;
}

const YES: Access = { ok: true };

/**
 * Are you close enough to the ship to put your hands on it?
 *
 * True when aboard (including under way), and when standing on the pad or berth
 * the ship is actually sitting on. Anywhere else on the world is not.
 */
export function atShip(state: GameState): boolean {
  if (!state.ship || state.ship.destroyed) return false;
  // Aboard: null place means you are inside the hull.
  if (state.currentPlaceId === null) return true;
  const parked = shipPlace(state);
  return Boolean(parked && parked.id === state.currentPlaceId);
}

/** A short phrase naming where the ship is, for refusal messages. */
export function shipWhereabouts(state: GameState): string {
  if (!state.ship || state.ship.destroyed) return 'You have no ship.';
  if (state.travel) return 'The ship is under way.';
  const parked = shipPlace(state);
  return parked ? `The ship is at ${parked.name}.` : 'The ship is elsewhere.';
}

/**
 * Can the player physically handle cargo right now?
 *
 * The hold is a room on a ship. You have to be at the ship to open it.
 */
export function canAccessHold(state: GameState): Access {
  if (!state.ship || state.ship.destroyed) {
    return { ok: false, reason: 'There is no hold — you have no ship.' };
  }
  if (state.expedition) {
    return { ok: false, reason: 'Your party is out. Whatever is in the hold stays there.' };
  }
  if (!atShip(state)) {
    return { ok: false, reason: `You are not at the ship. ${shipWhereabouts(state)}` };
  }
  return YES;
}

/**
 * Can the crew do repair work themselves?
 *
 * Same rule as the hold, plus somebody has to be free to hold the spanner.
 */
export function canWorkOnShip(state: GameState): Access {
  if (!state.ship || state.ship.destroyed) {
    return { ok: false, reason: 'There is no ship to work on.' };
  }
  if (state.expedition) {
    return { ok: false, reason: 'Your party is away. This waits until they are back.' };
  }
  if (!atShip(state)) {
    return { ok: false, reason: `You are not at the ship. ${shipWhereabouts(state)}` };
  }
  return YES;
}

/**
 * Can a yard be paid to do the work?
 *
 * Two things have to be true at once, and they are easy to confuse: the ship
 * must be somewhere that has a yard, and you must be there to arrange it.
 */
export function canUseRepairYard(state: GameState): Access {
  const base = canWorkOnShip(state);
  if (!base.ok) return base;

  const location = state.currentLocationId ? state.locations[state.currentLocationId] : undefined;
  if (!location?.actions.includes('repair')) {
    return { ok: false, reason: 'Nowhere here does repair work for hire.' };
  }
  return YES;
}

/**
 * Can gear be handed out from ship stores?
 *
 * Auto-equip is convenient, and convenience is exactly how a rule like this
 * gets quietly broken — a party halfway across a city should not suddenly be
 * wearing armour that is sitting in a cargo bay.
 */
export function canEquipFromHold(state: GameState): Access {
  return canAccessHold(state);
}

/**
 * Where the player physically is, in one short phrase, for screen subtitles.
 */
export function locationSummary(state: GameState): string {
  if (state.expedition) {
    const site = state.sites[state.expedition.siteId];
    return site ? `Deployed — ${site.name}` : 'Deployed';
  }
  if (state.travel) return 'Aboard, under way';
  const here = currentPlace(state);
  if (!here) return 'Aboard';
  return here.shipHere ? `${here.name} — at the ship` : here.name;
}

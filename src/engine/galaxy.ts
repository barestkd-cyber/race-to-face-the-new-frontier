/**
 * The galaxy beyond the Meridian system.
 *
 * Earth exists in every seed. It and the Human Homeworld in the Meridian
 * system are the only two major human population worlds anyone knows about,
 * and neither civilisation knows the other is there. Earth is somewhat further
 * along at serious space travel, which is why humans met outside the Meridian
 * system are usually Earth-origin.
 *
 * Where Earth is varies by seed. V1 plays out entirely inside the Meridian
 * system, so nothing here can be flown to yet — the position is generated,
 * persisted, and stays hidden unless one particular life event has already
 * handed the captain the map.
 */

import { streamRng } from './rng';
import { generateShip } from './ship';
import { GALAXY } from './tuning';
import type { GalaxyState, Ship } from './types';

/**
 * Deterministic from the master seed, like everything else. The total system
 * count is decided up front; individual systems generate from their own
 * derived seed when something actually reaches them.
 */
export function generateGalaxy(seed: string): GalaxyState {
  const rng = streamRng(seed, 'galaxy');
  const systemCount = rng.int(GALAXY.systemCount[0], GALAXY.systemCount[1]);

  // Earth's own system id is stable, so its detail can be generated later from
  // hash(masterSeed + systemId) without ever being stored.
  const earthIndex = rng.int(1, systemCount);

  return {
    systemCount,
    earth: {
      systemId: `sys_${earthIndex.toString(36)}`,
      distanceLy: rng.int(GALAXY.earthDistanceLy[0], GALAXY.earthDistanceLy[1]),
      bearing: rng.int(0, 359),
      // Nobody in the Meridian system knows. That is the setting.
      known: false,
    },
  };
}

/**
 * The grandfather's garage.
 *
 * Class and Trim are guaranteed by the authored hook — Medium or Large,
 * Premium or Luxury. Everything else about the hull is rolled the way any
 * other ship is, so two captains with the same life event still inherit
 * different ships.
 */
export function generateGarageShip(seed: string, taken: Set<string>): Ship {
  const rng = streamRng(seed, 'earth', 'garage');
  return generateShip(rng, {
    shipClass: rng.chance(0.55) ? 'medium' : 'large',
    trim: rng.chance(0.7) ? 'premium' : 'luxury',
    taken,
  });
}

/** How Earth's position reads once somebody knows it. */
export function describeEarth(galaxy: GalaxyState): string {
  const { earth } = galaxy;
  if (!earth.known) return 'Nobody here has heard of it.';
  return `${earth.distanceLy} light years out, bearing ${earth.bearing}°.`;
}

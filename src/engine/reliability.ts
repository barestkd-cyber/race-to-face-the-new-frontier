/**
 * Core-system reliability.
 *
 * Trim is capability. Condition is reliability. They are never multiplied
 * together, and Condition never quietly shaves a percentage off a check —
 * instead, a worn system fails *sometimes*, out loud, at a moment when it was
 * being leaned on.
 *
 * That moment is the whole rule. Nothing in here rolls in the background.
 * Launch, a hard burn, combat, heavy power draw, a demanding procedure — those
 * are stress points, and only a stress point asks whether the ship holds.
 */

import { pushLog } from './log';
import type { Rng } from './rng';
import { rollSystemFailure, SYSTEM_LABELS, updateDegradedStates, hasQuirk } from './ship';
import type { GameState, ShipSystemKind } from './types';

/** The moments that actually ask a ship for something. */
export type StressPoint =
  | 'launch'
  | 'hardBurn'
  | 'combat'
  | 'heavyPower'
  | 'procedure'
  | 'hazard';

/** Which systems are under load at each kind of moment. */
const SYSTEMS_AT_RISK: Record<StressPoint, ShipSystemKind[]> = {
  launch: ['engines', 'power'],
  hardBurn: ['engines', 'hull'],
  combat: ['hull', 'shields', 'power'],
  heavyPower: ['power', 'lifeSupport'],
  procedure: ['power', 'lifeSupport'],
  hazard: ['hull', 'sensors', 'lifeSupport'],
};

/** What it looks like when it goes, said as a thing that happened. */
const FAILURE_TEXT: Record<ShipSystemKind, string> = {
  engines:
    'The engines cut out mid-burn. Silence, then the reboot cycle, then a long wait to see whether they come back.',
  power: 'Power drops across half the ship. Emergency lighting, and everything unfinished.',
  lifeSupport: 'Life support faults. The air goes wrong before any alarm says so.',
  hull: 'Something in the hull gives with a sound nobody wants to hear twice.',
  sensors: 'The sensors drop out. You are flying on what you can see through the glass.',
  shields: 'The shields fail and do not come back up.',
};

/** The stall this one model is famous for. It is not the same as a failure. */
const STALL_TEXT =
  'The drive stalls — the way this model always stalls. Cooldown, reboot, and the long few seconds where nobody says anything.';

export interface ReliabilityResult {
  /** Systems that actually failed. Usually empty. */
  failed: ShipSystemKind[];
  lines: string[];
}

/**
 * Ask whether the ship holds. Call this at a stress point and nowhere else.
 *
 * A failure knocks the system down and names itself. It never returns a
 * multiplier, because there is no multiplier: the ship either did the thing or
 * it broke doing it.
 */
export function checkReliability(
  state: GameState,
  point: StressPoint,
  rng: Rng,
): ReliabilityResult {
  const ship = state.ship;
  const result: ReliabilityResult = { failed: [], lines: [] };
  if (!ship || ship.destroyed) return result;

  for (const kind of SYSTEMS_AT_RISK[point]) {
    const system = ship.systems[kind];
    if (!system.installed) continue;
    if (!rollSystemFailure(ship, kind, rng)) continue;

    result.failed.push(kind);
    result.lines.push(FAILURE_TEXT[kind]);
    // A failure costs condition on the way through, so a ship that is failing
    // gets worse rather than sitting at the same number forever.
    system.condition = Math.max(0, system.condition - rng.int(1, 5));
    pushLog(state, 'warning', `${SYSTEM_LABELS[kind]} failed under load.`);
  }

  // The authored notorious model. Separate from a real failure: it stalls, it
  // reboots, and it usually carries on — which is exactly why people argue
  // about whether it matters.
  if (
    (point === 'launch' || point === 'hardBurn') &&
    hasQuirk(ship, 'engineStall') &&
    rng.chance(0.16)
  ) {
    result.lines.push(STALL_TEXT);
    pushLog(state, 'system', `${ship.model} stalled again.`);
  }

  updateDegradedStates(ship);
  return result;
}

/**
 * Ships: generation, rooms, systems, and everything derived from them.
 *
 * Fuel is stored as physical units. Travel-hour estimates are always derived
 * from fuel quantity, ship mass, engine quality, condition, and crew skill —
 * never stored.
 */

import { bestAt } from './check';
import { generateShipName } from './character';
import type { Rng } from './rng';
import { FUEL, SHIPS } from './tuning';
import {
  SHIP_QUALITIES,
  SHIP_SYSTEM_KINDS,
  type Character,
  type RoomKind,
  type Ship,
  type ShipQuality,
  type ShipRoom,
  type ShipSize,
  type ShipSystem,
  type ShipSystemKind,
} from './types';

// ---------------------------------------------------------------------------
// Quality ladder helpers
// ---------------------------------------------------------------------------

export function qualityIndex(quality: ShipQuality): number {
  return SHIP_QUALITIES.indexOf(quality);
}

export function qualityFromIndex(index: number): ShipQuality {
  return SHIP_QUALITIES[Math.max(0, Math.min(SHIP_QUALITIES.length - 1, index))]!;
}

/** Shift a quality up or down the ladder, clamped at both ends. */
export function shiftQuality(quality: ShipQuality, steps: number): ShipQuality {
  return qualityFromIndex(qualityIndex(quality) + steps);
}

// ---------------------------------------------------------------------------
// Room definitions
// ---------------------------------------------------------------------------

export const ROOM_LABELS: Record<RoomKind, string> = {
  cockpit: 'Cockpit',
  quarters: 'Quarters',
  engineBay: 'Engine Bay',
  cargoBay: 'Cargo Bay',
  medBay: 'Med Bay',
  medicalWard: 'Medical Ward',
  engineeringBay: 'Engineering Bay',
  systemsLab: 'Systems Lab',
  armory: 'Armory',
  galley: 'Galley',
  recreation: 'Recreation',
  gym: 'Gym / Training',
  study: 'Study / Classroom',
  researchLab: 'Research Lab',
  brig: 'Brig',
  quarantine: 'Quarantine',
  hydroponics: 'Hydroponics',
  therapy: 'Therapy / Recovery',
  hangar: 'Hangar',
};

export const ROOM_DESCRIPTIONS: Record<RoomKind, string> = {
  cockpit: 'Flight controls, navigation, and the forward windshield.',
  quarters: 'Bunks and personal space. Sets how many people can live aboard.',
  engineBay: 'Drive assembly and power routing. Loud, hot, essential.',
  cargoBay: 'Bulk storage for trade goods and anything too large to carry.',
  medBay: 'Basic clinical space. Improves treatment checks.',
  medicalWard: 'Proper beds and monitoring for people who cannot be patched and sent back to work.',
  engineeringBay: 'Workbenches and spares. Makes repairs faster and cheaper.',
  systemsLab: 'Diagnostics and electronics work.',
  armory: 'Secure weapon storage and maintenance.',
  galley: 'Cooking space. Stretches rations further.',
  recreation: 'Somewhere to not be at work. Bleeds off stress.',
  gym: 'Training space for keeping condition up.',
  study: 'Quiet space for teaching and learning.',
  researchLab: 'Analysis equipment for samples and salvage.',
  brig: 'A door that locks from the outside.',
  quarantine: 'Isolation for anything contagious.',
  hydroponics: 'Growing racks. Slowly offsets food consumption.',
  therapy: 'Recovery space that helps people put themselves back together.',
  hangar: 'Bay for a small craft, drones, or EVA work.',
};

/** Room kinds that may be rolled as flex rooms, with relative weights. */
const FLEX_ROOM_WEIGHTS: { kind: RoomKind; weight: number }[] = [
  { kind: 'cargoBay', weight: 22 },
  { kind: 'medBay', weight: 16 },
  { kind: 'galley', weight: 14 },
  { kind: 'engineeringBay', weight: 13 },
  { kind: 'quarters', weight: 11 },
  { kind: 'armory', weight: 8 },
  { kind: 'recreation', weight: 7 },
  { kind: 'systemsLab', weight: 6 },
  { kind: 'hydroponics', weight: 5 },
  { kind: 'gym', weight: 4 },
  { kind: 'study', weight: 3 },
  { kind: 'researchLab', weight: 2 },
  { kind: 'therapy', weight: 2 },
  { kind: 'quarantine', weight: 2 },
  { kind: 'medicalWard', weight: 2 },
  { kind: 'brig', weight: 1 },
];

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

let roomCounter = 0;

function makeRoom(kind: RoomKind, quality: ShipQuality, rng: Rng): ShipRoom {
  roomCounter += 1;
  const [condLo, condHi] = SHIPS.startingConditionRange;
  // Quality is coherent; condition is allowed to be chaotic.
  const potentialBump = rng.chance(0.3) ? 1 : 0;
  return {
    id: `room_${roomCounter.toString(36)}_${rng.int(0, 0xffff).toString(36)}`,
    kind,
    quality,
    qualityPotential: shiftQuality(quality, potentialBump),
    condition: rng.int(condLo, condHi),
  };
}

/** Room quality clusters around the ship's overall quality. */
function rollRoomQuality(shipQuality: ShipQuality, rng: Rng): ShipQuality {
  const shift = rng.weighted([
    { value: -2, weight: 4 },
    { value: -1, weight: 22 },
    { value: 0, weight: 48 },
    { value: 1, weight: 21 },
    { value: 2, weight: 5 },
  ]);
  return shiftQuality(shipQuality, shift);
}

export function generateShipRooms(size: ShipSize, quality: ShipQuality, rng: Rng): ShipRoom[] {
  const rooms: ShipRoom[] = [];

  for (const kind of SHIPS.mandatoryRooms) {
    rooms.push(makeRoom(kind, rollRoomQuality(quality, rng), rng));
  }

  let flexCount: number;
  if (size === 'compact') {
    flexCount = 0;
  } else if (size === 'small') {
    flexCount = rng.int(SHIPS.smallFlexRooms[0], SHIPS.smallFlexRooms[1]);
  } else {
    const [lo, hi] = SHIPS.roomCounts[size];
    flexCount = Math.max(0, rng.int(lo, hi) - SHIPS.mandatoryRooms.length);
  }

  const weights = FLEX_ROOM_WEIGHTS.filter(
    (entry) => size !== 'compact' && size !== 'small' ? true : entry.kind !== 'hangar',
  );

  for (let i = 0; i < flexCount; i++) {
    const kind = rng.weighted(weights.map((w) => ({ value: w.kind, weight: w.weight })));
    rooms.push(makeRoom(kind, rollRoomQuality(quality, rng), rng));
  }

  return rooms;
}

export function generateShipSystems(
  quality: ShipQuality,
  rng: Rng,
): Record<ShipSystemKind, ShipSystem> {
  const systems = {} as Record<ShipSystemKind, ShipSystem>;
  const [condLo, condHi] = SHIPS.startingConditionRange;

  for (const kind of SHIP_SYSTEM_KINDS) {
    const systemQuality = rollRoomQuality(quality, rng);
    // Shields and, on the worst hulls, sensors may simply not be fitted.
    let installed = true;
    if (kind === 'shields') {
      installed = rng.percent(28 + qualityIndex(quality) * 14);
    } else if (kind === 'sensors') {
      installed = rng.percent(72 + qualityIndex(quality) * 7);
    }

    systems[kind] = {
      kind,
      quality: systemQuality,
      condition: installed ? rng.int(condLo, condHi) : 0,
      installed,
    };
  }

  return systems;
}

export interface GenerateShipOptions {
  size?: ShipSize;
  quality?: ShipQuality;
  name?: string;
}

export function generateShip(rng: Rng, options: GenerateShipOptions = {}): Ship {
  const size =
    options.size ??
    rng.weighted<ShipSize>([
      { value: 'compact', weight: SHIPS.startingSizeWeights.compact },
      { value: 'small', weight: SHIPS.startingSizeWeights.small },
    ]);

  const qualityTable =
    SHIPS.startingQualityWeights[size === 'compact' ? 'compact' : 'small'];
  const quality =
    options.quality ??
    rng.weighted<ShipQuality>(
      SHIP_QUALITIES.map((q) => ({ value: q, weight: qualityTable[q] ?? 0 })),
    );

  const rooms = generateShipRooms(size, quality, rng);
  const systems = generateShipSystems(quality, rng);

  const ship: Ship = {
    id: `ship_${rng.int(0, 0xffffff).toString(36)}`,
    name: options.name ?? generateShipName(rng),
    size,
    quality,
    rooms,
    systems,
    weapons: [],
    cargo: [],
    quartersCapacity: 0,
    lifeSupportCapacity: 0,
    hullVariant: rng.int(0, 5),
    destroyed: false,
  };

  recomputeShipCapacities(ship);
  return ship;
}

// ---------------------------------------------------------------------------
// Derived capacities
// ---------------------------------------------------------------------------

export function recomputeShipCapacities(ship: Ship): void {
  ship.quartersCapacity = ship.rooms
    .filter((r) => r.kind === 'quarters')
    .reduce((sum, r) => sum + SHIPS.quartersCapacity[r.quality], 0);

  const ls = ship.systems.lifeSupport;
  ship.lifeSupportCapacity = ls.installed ? SHIPS.lifeSupportCapacity[ls.quality] : 1;
}

/** Safe crew capacity is the lower of Quarters capacity and Life Support capacity. */
export function safeCrewCapacity(ship: Ship): number {
  return Math.min(ship.quartersCapacity, ship.lifeSupportCapacity);
}

export function overcrowding(ship: Ship, crewCount: number): number {
  return Math.max(0, crewCount - safeCrewCapacity(ship));
}

export function roomsOfKind(ship: Ship, kind: RoomKind): ShipRoom[] {
  return ship.rooms.filter((r) => r.kind === kind);
}

export function hasRoom(ship: Ship, kind: RoomKind): boolean {
  return ship.rooms.some((r) => r.kind === kind);
}

/** Best working example of a room kind, or null if none is fitted or usable. */
export function bestRoom(ship: Ship, kind: RoomKind): ShipRoom | null {
  const candidates = roomsOfKind(ship, kind).filter((r) => r.condition > 15);
  if (candidates.length === 0) return null;
  return candidates.reduce((best, r) =>
    qualityIndex(r.quality) > qualityIndex(best.quality) ? r : best,
  );
}

/** Medical facility quality, preferring a Medical Ward over a Med Bay. */
export function medicalFacility(ship: Ship | null): ShipRoom | null {
  if (!ship || ship.destroyed) return null;
  return bestRoom(ship, 'medicalWard') ?? bestRoom(ship, 'medBay');
}

export function quartersQuality(ship: Ship | null): ShipQuality | undefined {
  if (!ship || ship.destroyed) return undefined;
  return bestRoom(ship, 'quarters')?.quality;
}

// ---------------------------------------------------------------------------
// Fuel and travel derivation
// ---------------------------------------------------------------------------

export interface FuelEstimate {
  unitsPerHour: number;
  hoursRemaining: number;
  jumpsRemaining: number;
  /** Credits of fuel burned per travel hour at Normal pricing. */
  creditsPerHour: number;
}

/**
 * Fuel burn per travel hour. Mass, engine quality, engine condition and the
 * best pilot/navigator aboard all matter.
 */
export function fuelPerHour(ship: Ship | null, crew: Character[]): number {
  if (!ship || ship.destroyed) return 0;

  const engines = ship.systems.engines;
  const mass = SHIPS.massFactor[ship.size];
  const efficiency = SHIPS.engineEfficiency[engines.quality];
  const conditionPenalty =
    1 + FUEL.conditionPenaltySpan * (1 - Math.max(0, Math.min(100, engines.condition)) / 100);

  const pilot = bestAt(crew, 'piloting');
  const navigator = bestAt(crew, 'navigation');
  const bestSkill = Math.max(
    pilot ? pilot.skills.piloting : 0,
    navigator ? navigator.skills.navigation : 0,
  );
  const skillBonus = (bestSkill / 100) * FUEL.maxSkillEfficiencyBonus;

  return FUEL.baseUnitsPerHour * mass * efficiency * conditionPenalty * (1 - skillBonus);
}

export function estimateFuel(
  ship: Ship | null,
  crew: Character[],
  fuelUnits: number,
): FuelEstimate {
  const unitsPerHour = fuelPerHour(ship, crew);
  const hoursRemaining = unitsPerHour > 0 ? fuelUnits / unitsPerHour : 0;
  return {
    unitsPerHour,
    hoursRemaining,
    // A "jump" is a display unit of half a day's burn, so the cockpit readout
    // lands in the tens rather than the hundreds.
    jumpsRemaining: Math.floor(hoursRemaining / FUEL.hoursPerJump),
    creditsPerHour: unitsPerHour * FUEL.creditsPerUnit,
  };
}

/** Fuel needed for a leg of `days` days, given the current ship and crew. */
export function fuelCostForLeg(ship: Ship | null, crew: Character[], days: number): number {
  return fuelPerHour(ship, crew) * days * 24;
}

// ---------------------------------------------------------------------------
// Condition and damage
// ---------------------------------------------------------------------------

export function hullCondition(ship: Ship | null): number {
  if (!ship) return 0;
  return ship.systems.hull.condition;
}

export function powerCondition(ship: Ship | null): number {
  if (!ship) return 0;
  const power = ship.systems.power;
  return power.installed ? power.condition : 0;
}

export function shipConditionLabel(condition: number): string {
  if (condition >= 90) return 'Pristine';
  if (condition >= 75) return 'Good';
  if (condition >= 55) return 'Worn';
  if (condition >= 35) return 'Poor';
  if (condition >= 15) return 'Failing';
  return 'Critical';
}

export function damageSystem(ship: Ship, kind: ShipSystemKind, amount: number): string | null {
  const system = ship.systems[kind];
  if (!system.installed) return null;
  const before = system.condition;
  system.condition = Math.max(0, Math.min(100, system.condition + amount));
  if (amount < 0 && before > 0 && system.condition === 0) {
    return `${SYSTEM_LABELS[kind]} has failed completely.`;
  }
  return null;
}

export const SYSTEM_LABELS: Record<ShipSystemKind, string> = {
  engines: 'Engines',
  power: 'Power',
  lifeSupport: 'Life Support',
  hull: 'Hull',
  sensors: 'Sensors',
  shields: 'Shields',
};

export const SYSTEM_DESCRIPTIONS: Record<ShipSystemKind, string> = {
  engines: 'Drive output. Sets fuel burn and travel speed.',
  power: 'Generation and distribution. Everything else depends on it.',
  lifeSupport: 'Air, water, heat. Sets safe crew capacity.',
  hull: 'Structural integrity and pressure containment.',
  sensors: 'Detection and assessment quality at range.',
  shields: 'Deflection. Optional, and often the first thing sold.',
};

/** Ship is unflyable when it cannot hold air or cannot move. */
export function isFlyable(ship: Ship | null): boolean {
  if (!ship || ship.destroyed) return false;
  return (
    ship.systems.engines.condition > 5 &&
    ship.systems.hull.condition > 5 &&
    ship.systems.lifeSupport.condition > 5
  );
}

/** Sensor quality feeds destination assessment on the cockpit map. */
export function sensorIntel(ship: Ship | null): number {
  if (!ship || ship.destroyed) return 0;
  const sensors = ship.systems.sensors;
  if (!sensors.installed) return 0;
  const qualityScore = qualityIndex(sensors.quality) / 4;
  const conditionScore = sensors.condition / 100;
  return qualityScore * conditionScore * 3;
}

/** Whether this ship can carry a Compact mission vessel in a hangar. */
export function canCarryMissionVessel(ship: Ship | null): boolean {
  if (!ship) return false;
  const order: ShipSize[] = ['compact', 'small', 'medium', 'large', 'massive', 'capital'];
  const minIndex = order.indexOf(SHIPS.hangarMissionVesselMinSize);
  return order.indexOf(ship.size) >= minIndex && hasRoom(ship, 'hangar');
}

/** Total functional room count, used for size descriptions in the UI. */
export function functionalRoomCount(ship: Ship): number {
  return ship.rooms.filter((r) => r.condition > 10).length;
}

export function describeShip(ship: Ship): string {
  const rooms = functionalRoomCount(ship);
  return `${ship.size[0]!.toUpperCase()}${ship.size.slice(1)}-class, ${rooms} functional room${rooms === 1 ? '' : 's'}`;
}

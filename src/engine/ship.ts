/**
 * Ships: generation, rooms, systems, and everything derived from them.
 *
 * Two facts about a hull are permanent and cannot be bought around:
 *
 *   Class — how many rooms it will ever hold.
 *   Trim  — what those rooms and systems can do at their best.
 *
 * Condition is a third thing entirely. It belongs to core systems, it means
 * reliability, and it is never multiplied against Trim. A Luxury hull in poor
 * condition is a very capable ship that keeps breaking; a Makeshift hull in
 * perfect condition is a limited ship that always starts.
 *
 * Fuel is stored as physical units. Travel-hour estimates are always derived
 * from fuel quantity, mass, engine efficiency, condition, and crew skill —
 * never stored.
 */

import { bestAt } from './check';
import type { Rng } from './rng';
import { FUEL, SHIPS } from './tuning';
import {
  SHIP_CLASSES,
  SHIP_TRIMS,
  SHIP_TRIM_LABELS,
  SHIP_CLASS_LABELS,
  SHIP_SYSTEM_KINDS,
  type Character,
  type RoomKind,
  type Ship,
  type ShipClass,
  type ShipQuirkId,
  type ShipRoom,
  type ShipSystem,
  type ShipSystemKind,
  type ShipTrim,
} from './types';
import {
  SHIP_MANUFACTURERS,
  SHIP_MODELS,
  SHIP_NAMES_STANDALONE,
  SHIP_NAME_ADJECTIVES,
  SHIP_NAME_NOUNS,
} from '../content/shipNames';

// ---------------------------------------------------------------------------
// Trim
// ---------------------------------------------------------------------------

export function trimIndex(trim: ShipTrim): number {
  return SHIP_TRIMS.indexOf(trim);
}

/** What this hull's rooms and systems can do at their best, 60..100. */
export function trimCeiling(trim: ShipTrim): number {
  return SHIPS.trimCeiling[trim];
}

export function classIndex(shipClass: ShipClass): number {
  return SHIP_CLASSES.indexOf(shipClass);
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
  engineeringBay: 'Workbenches and spares. Several people can work a repair at once.',
  systemsLab: 'Diagnostics and electronics work.',
  armory: 'Secure weapon storage and maintenance.',
  galley: 'Cooking space. Stretches rations further.',
  recreation: 'Somewhere to not be at work. Bleeds off stress, and makes a long leg bearable.',
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
// Vessel names
// ---------------------------------------------------------------------------

/**
 * One vessel name, from the curated pools.
 *
 * Roughly 70% authored standalone, 30% adjective and noun, and about one in
 * ten of either carries a series number. "The" goes on where it sounds like a
 * name rather than a label. The same full name is never issued twice in one
 * universe, but the same base name may very rarely come back with a different
 * number — which is the whole point of the suffix.
 */
export function generateVesselName(rng: Rng, taken: Set<string> = new Set()): string {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    let base: string;
    let definite: boolean;

    if (rng.chance(0.7)) {
      const entry = rng.pick(SHIP_NAMES_STANDALONE);
      base = entry.name;
      // The library writes one name with its article and leaves the rest bare.
      // Either way it stays a coin-toss whether this particular hull wears it.
      definite = entry.definite || rng.chance(0.25);
    } else {
      base = `${rng.pick(SHIP_NAME_ADJECTIVES)} ${rng.pick(SHIP_NAME_NOUNS)}`;
      definite = rng.chance(0.55);
    }

    const suffix = rng.chance(0.1) ? ` ${rng.int(1, 4)}` : '';
    const full = `${definite ? 'The ' : ''}${base}${suffix}`;
    if (!taken.has(full)) {
      taken.add(full);
      return full;
    }
  }

  // Every shape of that name is spoken for. Number it rather than repeat it.
  let n = 2;
  const entry = rng.pick(SHIP_NAMES_STANDALONE);
  while (taken.has(`${entry.name} ${n}`) && n < 99) n += 1;
  const fallback = `${entry.name} ${n}`;
  taken.add(fallback);
  return fallback;
}

/** Every vessel name already spoken for in this universe. */
export function takenShipNames(ships: (Ship | null | undefined)[]): Set<string> {
  const taken = new Set<string>();
  for (const ship of ships) if (ship) taken.add(ship.name);
  return taken;
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

let roomCounter = 0;

function makeRoom(kind: RoomKind, rng: Rng): ShipRoom {
  roomCounter += 1;
  return {
    id: `room_${roomCounter.toString(36)}_${rng.int(0, 0xffff).toString(36)}`,
    kind,
  };
}

export function generateShipRooms(shipClass: ShipClass, count: number, rng: Rng): ShipRoom[] {
  const rooms: ShipRoom[] = [];

  for (const kind of SHIPS.mandatoryRooms) {
    rooms.push(makeRoom(kind, rng));
  }

  const flexCount = Math.max(0, count - SHIPS.mandatoryRooms.length);
  const weights = FLEX_ROOM_WEIGHTS.filter((entry) =>
    shipClass === 'compact' || shipClass === 'small' ? entry.kind !== 'hangar' : true,
  );

  for (let i = 0; i < flexCount; i++) {
    const kind = rng.weighted(weights.map((w) => ({ value: w.kind, weight: w.weight })));
    rooms.push(makeRoom(kind, rng));
  }

  return rooms;
}

export function generateShipSystems(
  trim: ShipTrim,
  rng: Rng,
): Record<ShipSystemKind, ShipSystem> {
  const systems = {} as Record<ShipSystemKind, ShipSystem>;
  const [condLo, condHi] = SHIPS.startingConditionRange;

  for (const kind of SHIP_SYSTEM_KINDS) {
    // Shields and, on the worst hulls, sensors may simply not be fitted.
    let installed = true;
    if (kind === 'shields') {
      installed = rng.percent(28 + trimIndex(trim) * 14);
    } else if (kind === 'sensors') {
      installed = rng.percent(72 + trimIndex(trim) * 7);
    }

    systems[kind] = {
      kind,
      condition: installed ? rng.int(condLo, condHi) : 0,
      installed,
    };
  }

  return systems;
}

/**
 * The permanent oddities. Each is rolled once, here, and lives with the hull.
 * None of them opens a modification system: they exist because a ship with a
 * story is worth more at the table than a ship with a parts list.
 */
function rollQuirks(ship: Ship, model: string, rng: Rng): void {
  const add = (id: ShipQuirkId, revealed = true) => ship.quirks.push({ id, revealed });
  const chance = SHIPS.quirkChance;

  if (rng.chance(chance.alignmentPull)) add('alignmentPull');
  // Only a few were ever built, and the ones that survive are on old hulls
  // nobody thought worth stripping.
  if (ship.trim === 'makeshift' && rng.chance(chance.hyperbaricChamber)) add('hyperbaricChamber');
  // Built into the hull, unfound. An event reveals it; nothing creates it.
  if (rng.chance(chance.hiddenCompartment)) add('hiddenCompartment', false);
  if (rng.chance(chance.stealthTint)) add('stealthTint');
  if (rng.chance(chance.overdrive)) add('overdrive');
  if (rng.chance(chance.lemon)) add('lemon');
  // Somewhere to put it, and somebody who left it there.
  if (ship.rooms.some((r) => r.kind === 'cargoBay' || r.kind === 'hangar') && rng.chance(chance.scooter)) {
    add('scooter');
  }

  const modelEntry = SHIP_MODELS.find((m) => m.name === model);
  if (modelEntry?.notoriousFor === 'engineStall') add('engineStall');
}

export interface GenerateShipOptions {
  shipClass?: ShipClass;
  trim?: ShipTrim;
  name?: string;
  /** Names already in use in this universe, so nothing repeats. */
  taken?: Set<string>;
  /** Force a room count, used by authored ships. */
  rooms?: number;
}

export function generateShip(rng: Rng, options: GenerateShipOptions = {}): Ship {
  const shipClass =
    options.shipClass ??
    rng.weighted<ShipClass>([
      { value: 'compact', weight: SHIPS.startingClassWeights.compact },
      { value: 'small', weight: SHIPS.startingClassWeights.small },
    ]);

  const trimTable = SHIPS.startingTrimWeights[shipClass === 'compact' ? 'compact' : 'small'];
  const trim =
    options.trim ??
    rng.weighted<ShipTrim>(SHIP_TRIMS.map((t) => ({ value: t, weight: trimTable[t] ?? 0 })));

  // Class fixes the range. maxRooms is permanent and lives inside it; the
  // rooms actually fitted are somewhere at or below that.
  const [classLo, classHi] = SHIPS.roomCounts[shipClass];
  const maxRooms = options.rooms ?? rng.int(classLo, classHi);
  const currentRooms =
    shipClass === 'compact'
      ? maxRooms
      : shipClass === 'small'
        ? Math.min(maxRooms, SHIPS.mandatoryRooms.length + rng.int(SHIPS.smallFlexRooms[0], SHIPS.smallFlexRooms[1]))
        : rng.int(Math.max(classLo, Math.ceil(maxRooms * 0.7)), maxRooms);

  const rooms = generateShipRooms(shipClass, Math.min(currentRooms, maxRooms), rng);
  const systems = generateShipSystems(trim, rng);

  const manufacturer = rng.weighted(
    SHIP_MANUFACTURERS.map((m) => ({ value: m.name, weight: m.weight })),
  );
  const model = rng.weighted(SHIP_MODELS.map((m) => ({ value: m.name, weight: m.weight })));

  const ship: Ship = {
    id: `ship_${rng.int(0, 0xffffff).toString(36)}`,
    name: options.name ?? generateVesselName(rng, options.taken),
    manufacturer,
    model,
    shipClass,
    trim,
    rooms,
    maxRooms: Math.max(maxRooms, rooms.length),
    systems,
    weapons: [],
    cargo: [],
    quartersCapacity: 0,
    quirks: [],
    hullVariant: rng.int(0, 5),
    destroyed: false,
  };

  rollQuirks(ship, model, rng);
  recomputeShipCapacities(ship);
  updateDegradedStates(ship);
  return ship;
}

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

export function roomsOfKind(ship: Ship, kind: RoomKind): ShipRoom[] {
  return ship.rooms.filter((r) => r.kind === kind);
}

export function hasRoom(ship: Ship, kind: RoomKind): boolean {
  return ship.rooms.some((r) => r.kind === kind);
}

/** A fitted room of this kind, or null. Rooms have no quality to compare. */
export function bestRoom(ship: Ship, kind: RoomKind): ShipRoom | null {
  return roomsOfKind(ship, kind)[0] ?? null;
}

/** Free room capacity. A hull can be filled, never enlarged. */
export function freeRoomSlots(ship: Ship): number {
  return Math.max(0, ship.maxRooms - ship.rooms.length);
}

export function canAddRoom(ship: Ship): boolean {
  return !ship.destroyed && freeRoomSlots(ship) > 0;
}

/**
 * Fit another room. Adding a room never changes Class and never raises
 * maxRooms — when the hull is full, that is the end of it.
 */
export function addRoom(ship: Ship, kind: RoomKind, rng: Rng): ShipRoom | null {
  if (!canAddRoom(ship)) return null;
  const room = makeRoom(kind, rng);
  ship.rooms.push(room);
  recomputeShipCapacities(ship);
  return room;
}

/** Convert a fitted room into something else. Room count does not move. */
export function convertRoom(ship: Ship, roomId: string, kind: RoomKind): boolean {
  const room = ship.rooms.find((r) => r.id === roomId);
  if (!room) return false;
  // The three mandatory rooms are what makes it a ship rather than a shed.
  if (SHIPS.mandatoryRooms.includes(room.kind as (typeof SHIPS.mandatoryRooms)[number])) {
    const remaining = roomsOfKind(ship, room.kind).length;
    if (remaining <= 1) return false;
  }
  room.kind = kind;
  recomputeShipCapacities(ship);
  return true;
}

/** Medical space, preferring a Medical Ward over a Med Bay. */
export function medicalFacility(ship: Ship | null): ShipRoom | null {
  if (!ship || ship.destroyed) return null;
  return bestRoom(ship, 'medicalWard') ?? bestRoom(ship, 'medBay');
}

/** The Trim that governs rest quality, when there are bunks at all. */
export function quartersTrim(ship: Ship | null): ShipTrim | undefined {
  if (!ship || ship.destroyed) return undefined;
  return hasRoom(ship, 'quarters') ? ship.trim : undefined;
}

// ---------------------------------------------------------------------------
// Capacity
// ---------------------------------------------------------------------------

/**
 * Capacity is Capacity. It comes from fitted Quarters and Trim, and from
 * nothing else — there is no second, quieter number underneath it.
 */
export function recomputeShipCapacities(ship: Ship): void {
  ship.quartersCapacity =
    roomsOfKind(ship, 'quarters').length * SHIPS.quartersCapacity[ship.trim];
}

export function crewCapacity(ship: Ship): number {
  return ship.quartersCapacity;
}

export function overcrowding(ship: Ship, crewCount: number): number {
  return Math.max(0, crewCount - crewCapacity(ship));
}

// ---------------------------------------------------------------------------
// Condition — reliability, not capability
// ---------------------------------------------------------------------------

export function conditionBand(condition: number): (typeof SHIPS.conditionBands)[number] {
  const value = Math.max(0, Math.min(100, condition));
  for (const band of SHIPS.conditionBands) {
    if (value >= band.min) return band;
  }
  return SHIPS.conditionBands[SHIPS.conditionBands.length - 1]!;
}

export function shipConditionLabel(condition: number): string {
  return conditionBand(condition).label;
}

/**
 * How likely this system is to fail when it is genuinely leaned on. Nothing
 * calls this except at a real stress point — a launch, a hard burn, combat, a
 * demanding procedure. There are no background nuisance rolls.
 */
export function failureChance(ship: Ship, kind: ShipSystemKind): number {
  const system = ship.systems[kind];
  if (!system.installed) return 0;
  const { safeAbove, maxFailureChance, lemonMultiplier } = SHIPS.reliability;
  if (system.condition >= safeAbove) return 0;
  const shortfall = (safeAbove - system.condition) / safeAbove;
  const lemon = ship.quirks.some((q) => q.id === 'lemon') ? lemonMultiplier : 1;
  return Math.min(0.9, shortfall * maxFailureChance * lemon);
}

/** Roll one system against a moment of real stress. True means it failed. */
export function rollSystemFailure(ship: Ship, kind: ShipSystemKind, rng: Rng): boolean {
  const chance = failureChance(ship, kind);
  return chance > 0 && rng.chance(chance);
}

/**
 * Keep the fault flags honest.
 *
 * A fault is a capability this system has actually lost, named out loud rather
 * than quietly shaved off a multiplier. It is deliberately not the same thing
 * as the Condition band called "Degraded": the band describes wear, the fault
 * names a consequence, and a system can sit in the Degraded band without
 * having lost anything yet.
 */
export function updateDegradedStates(ship: Ship): void {
  for (const system of Object.values(ship.systems)) {
    const faulted = system.installed && system.condition < SHIPS.reliability.faultedBelow;
    if (faulted) system.faulted = true;
    else delete system.faulted;
  }
}

/** The faults, in the words the player should see. */
export function degradedNotes(ship: Ship | null): string[] {
  if (!ship || ship.destroyed) return [];
  const notes: string[] = [];
  for (const kind of SHIP_SYSTEM_KINDS) {
    const system = ship.systems[kind];
    if (!system.installed || !system.faulted) continue;
    notes.push(FAULT_TEXT[kind]);
  }
  return notes;
}

const FAULT_TEXT: Record<ShipSystemKind, string> = {
  engines: 'ENGINE FAULT — no full-thrust burn until this is repaired.',
  power: 'POWER FAULT — heavy draw can interrupt whatever is running.',
  lifeSupport: 'LIFE SUPPORT FAULT — the air goes bad on a long leg.',
  hull: 'HULL FAULT — she will not take another hard hit well.',
  sensors: 'SENSOR FAULT — readings cannot be trusted at range.',
  shields: 'SHIELD FAULT — deflection cannot be counted on.',
};

export function damageSystem(ship: Ship, kind: ShipSystemKind, amount: number): string | null {
  const system = ship.systems[kind];
  if (!system.installed) return null;
  const before = system.condition;
  system.condition = Math.max(0, Math.min(100, system.condition + amount));
  updateDegradedStates(ship);
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
  lifeSupport: 'Air, water, heat. When it fails it is an emergency, not a smaller crew.',
  hull: 'Structural integrity and pressure containment.',
  sensors: 'Detection and assessment quality at range.',
  shields: 'Deflection. Optional, and often the first thing sold.',
};

// ---------------------------------------------------------------------------
// Quirks
// ---------------------------------------------------------------------------

export function hasQuirk(ship: Ship | null, id: ShipQuirkId, requireRevealed = true): boolean {
  if (!ship) return false;
  const quirk = ship.quirks.find((q) => q.id === id);
  if (!quirk) return false;
  return requireRevealed ? quirk.revealed : true;
}

/** Turn a hidden feature into a known one. Returns false if there is none. */
export function revealQuirk(ship: Ship | null, id: ShipQuirkId): boolean {
  if (!ship) return false;
  const quirk = ship.quirks.find((q) => q.id === id);
  if (!quirk || quirk.revealed) return false;
  quirk.revealed = true;
  return true;
}

export const QUIRK_TEXT: Record<ShipQuirkId, string> = {
  alignmentPull:
    'She pulls very slightly to one side. Nobody has ever managed to fully trim it out.',
  hyperbaricChamber:
    'A prototype hyperbaric chamber, built by somebody far ahead of their time. Almost none survive.',
  hiddenCompartment: 'There is a compartment in here that is not on any plan.',
  engineStall: 'This model stalls. It cools, it reboots, and it usually comes back up.',
  stealthTint: 'The hull carries an illegal darkening treatment. Hard to see. Cuts both ways.',
  overdrive: 'Somebody has been at the drive. She is very fast, and the hull knows it.',
  lemon: 'Something on this hull is always broken. It is never the same something.',
  scooter: 'There is a scooter aboard. Nobody knows whose it was.',
};

// ---------------------------------------------------------------------------
// Fuel and travel derivation
// ---------------------------------------------------------------------------

export interface FuelEstimate {
  unitsPerHour: number;
  hoursRemaining: number;
  /** Days of travel the tanks buy at the current burn rate. */
  daysRemaining: number;
  /** Credits of fuel burned per travel hour at Normal pricing. */
  creditsPerHour: number;
}

/**
 * Fuel burn per travel hour. Mass, Trim, engine condition and the best
 * pilot/navigator aboard all matter — and a hull that pulls to one side burns
 * a little more forever, because somebody is always correcting it.
 */
export function fuelPerHour(ship: Ship | null, crew: Character[]): number {
  if (!ship || ship.destroyed) return 0;

  const engines = ship.systems.engines;
  const mass = SHIPS.massFactor[ship.shipClass];
  const efficiency = SHIPS.engineEfficiency[ship.trim];
  const conditionPenalty =
    1 + FUEL.conditionPenaltySpan * (1 - Math.max(0, Math.min(100, engines.condition)) / 100);

  const pilot = bestAt(crew, 'piloting');
  const navigator = bestAt(crew, 'navigation');
  const bestSkill = Math.max(
    pilot ? pilot.skills.piloting : 0,
    navigator ? navigator.skills.navigation : 0,
  );
  const skillBonus = (bestSkill / 100) * FUEL.maxSkillEfficiencyBonus;
  const pull = hasQuirk(ship, 'alignmentPull') ? 1 + SHIPS.alignmentPull.fuelPenalty : 1;

  return FUEL.baseUnitsPerHour * mass * efficiency * conditionPenalty * (1 - skillBonus) * pull;
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
    // lands in the tens rather than the hundreds.
    daysRemaining: hoursRemaining / 24,
    creditsPerHour: unitsPerHour * FUEL.creditsPerUnit,
  };
}

/** Fuel needed for a leg of `days` days, given the current ship and crew. */
export function fuelCostForLeg(ship: Ship | null, crew: Character[], days: number): number {
  return fuelPerHour(ship, crew) * days * 24;
}

/** Piloting is harder on a hull that will not fly straight. */
export function pilotingModifier(ship: Ship | null): number {
  return hasQuirk(ship, 'alignmentPull') ? SHIPS.alignmentPull.pilotingPenalty : 0;
}

// ---------------------------------------------------------------------------
// Condition readouts
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

/** Ship is unflyable when it cannot hold air or cannot move. */
export function isFlyable(ship: Ship | null): boolean {
  if (!ship || ship.destroyed) return false;
  return (
    ship.systems.engines.condition > 5 &&
    ship.systems.hull.condition > 5 &&
    ship.systems.lifeSupport.condition > 5
  );
}

/**
 * Sensor quality feeds destination assessment on the cockpit map. Trim sets
 * what the array could do; condition sets whether it is doing it today.
 */
export function sensorIntel(ship: Ship | null): number {
  if (!ship || ship.destroyed) return 0;
  const sensors = ship.systems.sensors;
  if (!sensors.installed) return 0;
  const ceiling = trimCeiling(ship.trim) / 100;
  const conditionScore = sensors.condition / 100;
  return ceiling * conditionScore * 3;
}

/** Whether this ship can carry a Compact mission vessel in a hangar. */
export function canCarryMissionVessel(ship: Ship | null): boolean {
  if (!ship) return false;
  const minIndex = classIndex(SHIPS.hangarMissionVesselMinClass);
  return classIndex(ship.shipClass) >= minIndex && hasRoom(ship, 'hangar');
}

/** Rooms fitted. There is no room condition, so every fitted room works. */
export function functionalRoomCount(ship: Ship): number {
  return ship.rooms.length;
}

export function describeShip(ship: Ship): string {
  return `${SHIP_CLASS_LABELS[ship.shipClass]}-class, ${ship.rooms.length}/${ship.maxRooms} rooms`;
}

/** Manufacturer, model and vessel name, said the way a dock hand would. */
export function shipFullName(ship: Ship): string {
  return `${ship.name} — ${ship.manufacturer} ${ship.model}`;
}

/**
 * The ship's name inside a sentence, with an article only where the name does
 * not already carry one. "The Wobbly Sprocket" keeps its own; "Wayfarer"
 * borrows one. Nothing should ever read "the The Crosswind".
 */
export function shipRef(ship: Ship | null | undefined): string {
  if (!ship) return 'the ship';
  return /^the /i.test(ship.name) ? ship.name : `the ${ship.name}`;
}

/**
 * What kind of ship this reads as, from what was actually fitted. Used on the
 * reveal, where "Small General-Purpose Vessel" tells the player more than a
 * table of rooms would.
 */
export function shipArchetype(ship: Ship): string {
  const label = SHIP_CLASS_LABELS[ship.shipClass];
  const has = (kind: RoomKind) => ship.rooms.some((r) => r.kind === kind);

  let role = 'General-Purpose Vessel';
  if (has('hangar')) role = 'Tender';
  else if (has('researchLab') || has('systemsLab')) role = 'Survey Vessel';
  else if (has('medicalWard') || has('medBay')) role = 'Medical Tender';
  else if (has('hydroponics')) role = 'Long-Range Hauler';
  else if (has('cargoBay')) role = 'Light Freighter';
  else if (has('armory')) role = 'Escort';

  return `${label} ${role}`;
}

/** Single condition figure across the core systems, for an at-a-glance read. */
export function overallCondition(ship: Ship): number {
  const parts: number[] = [];
  for (const system of Object.values(ship.systems)) {
    if (system.installed) parts.push(system.condition);
  }
  if (parts.length === 0) return 0;
  return parts.reduce((sum, v) => sum + v, 0) / parts.length;
}

/**
 * A couple of things worth saying out loud about this hull. Deliberately
 * short: the reveal is a moment, not an inventory. A known quirk outranks a
 * room, because it is the thing you will still be talking about later.
 */
export function notableFacts(ship: Ship): string[] {
  const facts: string[] = [];

  for (const quirk of ship.quirks) {
    if (!quirk.revealed) continue;
    if (quirk.id === 'engineStall' || quirk.id === 'lemon') continue;
    facts.push(QUIRK_TEXT[quirk.id]);
  }

  const extras = ship.rooms.filter(
    (r) => !SHIPS.mandatoryRooms.includes(r.kind as (typeof SHIPS.mandatoryRooms)[number]),
  );
  if (extras.length > 0 && facts.length < 2) {
    facts.push(`${ROOM_LABELS[extras[0]!.kind]} fitted`);
  }

  const missing = SHIP_SYSTEM_KINDS.filter((k) => !ship.systems[k].installed);
  if (missing.length > 0 && facts.length < 3) {
    facts.push(`No ${missing.map((k) => SYSTEM_LABELS[k].toLowerCase()).join(' or ')}`);
  }

  const worst = Object.values(ship.systems)
    .filter((s) => s.installed)
    .sort((a, b) => a.condition - b.condition)[0];
  if (worst && worst.condition < 45 && facts.length < 3) {
    facts.push(`${SYSTEM_LABELS[worst.kind]} in poor condition`);
  }

  if (facts.length < 2) {
    facts.push(`${SHIP_TRIM_LABELS[ship.trim]} throughout`);
  }

  return facts.slice(0, 3);
}

// ---------------------------------------------------------------------------
// Flight readiness — one answer to "can I safely fly?"
// ---------------------------------------------------------------------------

/**
 * The cockpit, the Ship screen and the Set Course button used to give three
 * different answers to the same question. They all ask this now.
 *
 * `canFly` is exactly `isFlyable` — the permission never moves. Everything
 * else is language for what the condition actually means.
 */
export interface FlightReadiness {
  canFly: boolean;
  tone: 'ok' | 'warn' | 'bad';
  /** One line, in words, safe to show as a headline. */
  headline: string;
  /** What that means for the next leg. */
  detail: string;
  /** The system driving the verdict, if any. */
  worst: ShipSystem | null;
}

/**
 * Where the verdict changes. These sit on the condition bands on purpose: if
 * the headline said "showing their age" while the row underneath said
 * "Critical", we would be back to two answers for one question.
 */
const CALLS_FOR_WORK_AT = 60; // Degraded and below
const BREAKDOWN_RISK_AT = 40; // Critical and below

/** Systems named as a person would name them, so the sentences read straight. */
const SYSTEM_SUBJECT: Record<ShipSystemKind, { noun: string; verb: string }> = {
  engines: { noun: 'The engines', verb: 'are' },
  power: { noun: 'Power generation', verb: 'is' },
  lifeSupport: { noun: 'Life support', verb: 'is' },
  hull: { noun: 'The hull', verb: 'is' },
  sensors: { noun: 'The sensors', verb: 'are' },
  shields: { noun: 'The shields', verb: 'are' },
};

export function worstSystem(ship: Ship | null): ShipSystem | null {
  if (!ship) return null;
  const installed = Object.values(ship.systems).filter((s) => s.installed);
  if (installed.length === 0) return null;
  return installed.reduce((worst, s) => (s.condition < worst.condition ? s : worst));
}

export function flightReadiness(ship: Ship | null): FlightReadiness {
  if (!ship || ship.destroyed) {
    return {
      canFly: false,
      tone: 'bad',
      headline: 'You have no ship.',
      detail: 'Nothing here is going anywhere.',
      worst: null,
    };
  }

  const worst = worstSystem(ship);
  const subject = worst ? SYSTEM_SUBJECT[worst.kind] : { noun: 'Something aboard', verb: 'is' };

  if (!isFlyable(ship)) {
    // Which of the three flight-critical systems is actually the blocker.
    const blocker = (['engines', 'hull', 'lifeSupport'] as ShipSystemKind[])
      .map((kind) => ship.systems[kind])
      .filter((s) => s.condition <= 5)
      .sort((a, b) => a.condition - b.condition)[0];
    const blockerSubject = blocker ? SYSTEM_SUBJECT[blocker.kind] : subject;
    return {
      canFly: false,
      tone: 'bad',
      headline: `${blockerSubject.noun} ${blockerSubject.verb} past the point of use.`,
      detail: 'She cannot fly until that is repaired. Parts and hours, or the yard and money.',
      worst: blocker ?? worst,
    };
  }

  // From here the headline is always the condition word the rest of the game
  // uses for that system, so no two screens can describe it differently.
  if (worst && worst.condition < CALLS_FOR_WORK_AT) {
    const label = shipConditionLabel(worst.condition).toLowerCase();
    return {
      canFly: true,
      tone: 'warn',
      headline: `${subject.noun} ${subject.verb} ${label}.`,
      detail:
        worst.condition < BREAKDOWN_RISK_AT
          ? 'She will fly. Expect her to break down somewhere with nobody around.'
          : 'Nothing is stopping you leaving, but it is not getting better on its own.',
      worst,
    };
  }

  return {
    canFly: true,
    tone: 'ok',
    headline: 'She is ready to fly.',
    detail: worst
      ? `${subject.noun} ${subject.verb} ${shipConditionLabel(worst.condition).toLowerCase()}, and nothing aboard is worse than that.`
      : 'Nothing aboard is asking for attention.',
    worst,
  };
}

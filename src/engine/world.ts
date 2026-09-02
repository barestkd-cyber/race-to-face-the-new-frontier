/**
 * World and route generation.
 *
 * Core route rule: the destination is known, the journey is not. The seven
 * major locations are fixed; their state, economy, danger, layout, and the
 * legs between them all vary by seed.
 */

import { streamRng, type Rng } from './rng';
import { generateMarket } from './economy';
import { HOMEWORLD_CLOCK, TRAVEL } from './tuning';
import type {
  HomeworldState,
  LocationActionKind,
  LocationCondition,
  LocationId,
  LocationKind,
  LocationState,
  RecruitVenue,
} from './types';

// ---------------------------------------------------------------------------
// Name pools
// ---------------------------------------------------------------------------

const MOON_NAMES = [
  'Vesper',
  'Dusk',
  'Kell',
  'Ashgate',
  'Tally',
  'Brine',
  'Corrin',
  'Halden',
  'Motte',
  'Serrow',
  'Pallas',
  'Ivry',
  'Fennow',
  'Braid',
];

const STATION_NAMES = [
  'Longhold',
  'Waypoint Ferris',
  'Cassow Junction',
  'The Spindle',
  'Marrowgate',
  'Ashen Reach',
  'Quill Station',
  'Tabor Ring',
  'Harrow Dock',
  'Meridian Nine',
];

const TRANSIT_NAMES = [
  'Coriolis Gate',
  'Hollowmark',
  'The Bright Crossing',
  'Sable Junction',
  'Ninefold Station',
  'Threshold Prime',
  'Anvil Ring',
];

const PLANET_NAMES = [
  'Teluun',
  'Ashwater',
  'Meren',
  'Sovaal',
  'Tidemark',
  'Yelen',
  'Ossara',
  'Halewater',
];

const SPECIES_NAMES = [
  'Ilthar',
  'Vesk',
  'Sorren',
  'Amuli',
  'Kethen',
  'Naori',
  'Tirreth',
];

const TRAVEL_WORLD_NAMES = [
  'Cordovan',
  'New Ashford',
  'Halloway',
  'Terrance Landing',
  'Bright Harbour',
  'Sundermere',
];

const MOON_TERRAIN = [
  'frozen craters',
  'ice shelves',
  'volcanic fields',
  'geothermal zones',
  'mineral plateaus',
  'canyon networks',
  'chemical flats',
  'dust highlands',
  'enclosed production regions',
  'industrial surface complexes',
];

const MOON_ROLES = [
  'metallic mining',
  'rare minerals',
  'water/ice harvesting',
  'fuel/volatile extraction',
  'chemical production',
  'greenhouse agriculture',
  'industrial manufacturing',
  'resource processing',
];

/** Roles that pair well — the two moons should complement, not duplicate. */
const ROLE_COMPLEMENTS: Record<string, string[]> = {
  'metallic mining': ['greenhouse agriculture', 'chemical production', 'water/ice harvesting'],
  'rare minerals': ['industrial manufacturing', 'greenhouse agriculture', 'water/ice harvesting'],
  'water/ice harvesting': ['metallic mining', 'industrial manufacturing', 'rare minerals'],
  'fuel/volatile extraction': ['greenhouse agriculture', 'resource processing', 'metallic mining'],
  'chemical production': ['metallic mining', 'water/ice harvesting', 'greenhouse agriculture'],
  'greenhouse agriculture': ['metallic mining', 'rare minerals', 'fuel/volatile extraction'],
  'industrial manufacturing': ['rare minerals', 'water/ice harvesting', 'metallic mining'],
  'resource processing': ['fuel/volatile extraction', 'metallic mining', 'greenhouse agriculture'],
};

// ---------------------------------------------------------------------------
// Homeworld clock
// ---------------------------------------------------------------------------

/** V1 LOCKED: hidden terminal day rolled from the tapered 7..49 band table. */
export function rollTerminalDay(rng: Rng): number {
  const band = rng.weighted(
    HOMEWORLD_CLOCK.bands.map((b) => ({ value: b, weight: b.weight })),
  );
  return rng.int(band.min, band.max);
}

export function createHomeworldState(rng: Rng): HomeworldState {
  return {
    terminalDay: rollTerminalDay(rng),
    dominantThreat: rng.chance(0.5) ? 'atmospheric' : 'mantle',
    infrastructure: 100,
    forecastQuality: 0,
    ended: false,
    departed: false,
    familyIds: [],
    rescuedFamilyIds: [],
  };
}

/**
 * The displayed estimate. Never the exact hidden day; the window tightens with
 * forecast quality but always contains the truth, because ordinary weak
 * assessment should be imprecise rather than confidently wrong.
 */
export interface ClockEstimate {
  low: number;
  high: number;
  text: string;
  /** Days already elapsed. */
  elapsedDays: number;
  urgency: 'calm' | 'pressing' | 'urgent' | 'critical';
}

export function estimateTerminalDay(
  homeworld: HomeworldState,
  currentHours: number,
): ClockEstimate {
  const elapsedDays = Math.floor(currentHours / 24);
  const quality = Math.max(
    0,
    Math.min(HOMEWORLD_CLOCK.maxForecastQuality, homeworld.forecastQuality),
  );
  const halfWidth = HOMEWORLD_CLOCK.estimateHalfWidthByQuality[quality]!;

  let low = Math.max(elapsedDays, homeworld.terminalDay - halfWidth);
  let high = Math.min(HOMEWORLD_CLOCK.maxDay + 4, homeworld.terminalDay + halfWidth);

  // Keep the window honest: it must contain the true day.
  low = Math.min(low, homeworld.terminalDay);
  high = Math.max(high, homeworld.terminalDay);

  const remaining = homeworld.terminalDay - elapsedDays;
  const urgency: ClockEstimate['urgency'] =
    remaining <= 4 ? 'critical' : remaining <= 10 ? 'urgent' : remaining <= 20 ? 'pressing' : 'calm';

  const text =
    quality === 0
      ? 'Forecasts disagree. Somewhere between weeks and days.'
      : `Terminal window estimated: day ${low}–${high}`;

  return { low, high, text, elapsedDays, urgency };
}

export function advanceHomeworldClock(homeworld: HomeworldState, hours: number): void {
  const days = hours / 24;
  homeworld.infrastructure = Math.max(
    0,
    homeworld.infrastructure - HOMEWORLD_CLOCK.infrastructureDecayPerDay * days,
  );
}

export function homeworldHasEnded(homeworld: HomeworldState, hours: number): boolean {
  return hours / 24 >= homeworld.terminalDay;
}

// ---------------------------------------------------------------------------
// Location construction
// ---------------------------------------------------------------------------

const CONDITION_WEIGHTS: Record<LocationKind, { value: LocationCondition; weight: number }[]> = {
  homeworld: [
    { value: 'strained', weight: 55 },
    { value: 'rationing', weight: 30 },
    { value: 'damaged', weight: 15 },
  ],
  moon: [
    { value: 'normal', weight: 30 },
    { value: 'strained', weight: 30 },
    { value: 'rationing', weight: 18 },
    { value: 'damaged', weight: 12 },
    { value: 'partiallyEvacuated', weight: 10 },
  ],
  tradeStation: [
    { value: 'prosperous', weight: 14 },
    { value: 'normal', weight: 32 },
    { value: 'strained', weight: 22 },
    { value: 'rationing', weight: 13 },
    { value: 'damaged', weight: 10 },
    { value: 'partiallyEvacuated', weight: 6 },
    { value: 'abandoned', weight: 3 },
  ],
  inhabitedPlanet: [
    { value: 'prosperous', weight: 26 },
    { value: 'normal', weight: 42 },
    { value: 'strained', weight: 20 },
    { value: 'damaged', weight: 12 },
  ],
  transitStation: [
    { value: 'prosperous', weight: 30 },
    { value: 'normal', weight: 44 },
    { value: 'strained', weight: 18 },
    { value: 'damaged', weight: 8 },
  ],
  travelWorld: [
    { value: 'prosperous', weight: 40 },
    { value: 'normal', weight: 45 },
    { value: 'strained', weight: 15 },
  ],
  temporary: [
    { value: 'abandoned', weight: 60 },
    { value: 'damaged', weight: 40 },
  ],
};

export const CONDITION_LABELS: Record<LocationCondition, string> = {
  prosperous: 'Prosperous',
  normal: 'Normal',
  strained: 'Strained',
  rationing: 'Rationing',
  damaged: 'Damaged',
  partiallyEvacuated: 'Partially Evacuated',
  abandoned: 'Abandoned',
};

const BASE_ACTIONS: Record<LocationKind, LocationActionKind[]> = {
  homeworld: [
    'trade',
    'recruit',
    'findWork',
    'missions',
    'scavenge',
    'repair',
    'medical',
    'social',
    'rest',
    'depart',
  ],
  moon: ['trade', 'recruit', 'findWork', 'missions', 'scavenge', 'repair', 'rest', 'depart'],
  tradeStation: ['trade', 'recruit', 'findWork', 'missions', 'repair', 'medical', 'rest', 'depart'],
  inhabitedPlanet: [
    'trade',
    'recruit',
    'findWork',
    'missions',
    'scavenge',
    'medical',
    'social',
    'rest',
    'depart',
  ],
  transitStation: [
    'trade',
    'recruit',
    'findWork',
    'missions',
    'repair',
    'medical',
    'social',
    'rest',
    'depart',
  ],
  travelWorld: ['trade', 'recruit', 'findWork', 'missions', 'repair', 'medical', 'social', 'rest'],
  temporary: ['scavenge', 'missions', 'depart'],
};

const VENUES_BY_KIND: Record<LocationKind, RecruitVenue[]> = {
  homeworld: ['bar', 'clinic', 'refugeeArea', 'freightYard', 'shelter', 'university', 'securityOffice'],
  moon: ['workerCamp', 'mine', 'bar', 'freightYard', 'clinic'],
  tradeStation: ['bar', 'freightYard', 'securityOffice', 'clinic'],
  inhabitedPlanet: ['bar', 'clinic', 'refugeeArea', 'university', 'shelter'],
  transitStation: [
    'bar',
    'freightYard',
    'securityOffice',
    'clinic',
    'university',
    'refugeeArea',
    'shelter',
  ],
  travelWorld: ['bar', 'freightYard', 'securityOffice', 'university', 'shelter'],
  temporary: [],
};

/** Abandoned places stop being service hubs and become exploration sites. */
function actionsForLocation(kind: LocationKind, condition: LocationCondition): LocationActionKind[] {
  if (condition === 'abandoned') {
    return ['scavenge', 'missions', 'rest', 'depart'];
  }
  const base = [...BASE_ACTIONS[kind]];
  if (condition === 'partiallyEvacuated') {
    return base.filter((a) => a !== 'findWork');
  }
  return base;
}

// ---------------------------------------------------------------------------
// Route generation
// ---------------------------------------------------------------------------

export interface GeneratedWorld {
  locations: Record<LocationId, LocationState>;
  routeIds: LocationId[];
  homeworldId: LocationId;
  moonIds: [LocationId, LocationId];
  travelWorldId: LocationId;
  homeworld: HomeworldState;
}

export function generateWorld(seed: string): GeneratedWorld {
  const locations: Record<LocationId, LocationState> = {};

  const homeworld = createHomeworldState(streamRng(seed, 'homeworld', 'clock'));

  // --- Homeworld -----------------------------------------------------------
  const hwRng = streamRng(seed, 'location', 'homeworld');
  const hwCondition = hwRng.weighted(CONDITION_WEIGHTS.homeworld);
  const homeworldLoc: LocationState = {
    id: 'loc_homeworld',
    kind: 'homeworld',
    name: 'Homeworld',
    subtitle: 'Dying — two clocks, neither of them public',
    description:
      'Still governed, still functioning, and running out of time. The air processing that made the place liveable is failing faster than its replacements can be built, and the crust underneath has started moving. People are queuing, not looting. Not yet.',
    condition: hwCondition,
    routeIndex: 0,
    lateral: 0,
    travelDaysFromPrev: 0,
    discovered: true,
    visited: true,
    actions: actionsForLocation('homeworld', hwCondition),
    facts: [
      'Evacuation lift capacity is the binding constraint, not willingness to leave.',
      'The government is still paying people to do dangerous work.',
      'Private sales are getting more desperate by the day.',
    ],
    siteIds: [],
    danger: hwRng.int(12, 30),
    onMainRoute: true,
    populationTier: 4,
    recruitVenues: VENUES_BY_KIND.homeworld,
  };
  homeworldLoc.market = generateMarket(homeworldLoc, hwRng, 0);
  locations[homeworldLoc.id] = homeworldLoc;

  // --- Moons ---------------------------------------------------------------
  const moonRng = streamRng(seed, 'location', 'moons');
  const moonNames = moonRng.pickMany(MOON_NAMES, 2);
  const roleA = moonRng.pick(MOON_ROLES);
  const complements = ROLE_COMPLEMENTS[roleA] ?? MOON_ROLES;
  const roleB = moonRng.pick(complements.filter((r) => r !== roleA));

  const moonIds: LocationId[] = [];
  [
    { name: moonNames[0]!, role: roleA, lateral: -1 },
    { name: moonNames[1]!, role: roleB, lateral: 1 },
  ].forEach((spec, index) => {
    const rng = streamRng(seed, 'location', 'moon', index);
    const condition = rng.weighted(CONDITION_WEIGHTS.moon);
    const terrain = rng.pick(MOON_TERRAIN);
    const id = `loc_moon_${index}`;
    const loc: LocationState = {
      id,
      kind: 'moon',
      name: `${spec.name} Moon`,
      subtitle: `${spec.role.replace(/\b\w/g, (c) => c.toUpperCase())} colony`,
      description: `A working moon of ${terrain}. It exists to feed the Homeworld — ${spec.role} on rotating shifts, freight home every few days. The rotations have started arriving late.`,
      condition,
      // Kept tight against the Homeworld so the opening cluster reads as one
      // region rather than crowding the first station on the outward path.
      routeIndex: 0.07,
      lateral: spec.lateral,
      travelDaysFromPrev: rng.float(0.8, 2.2),
      discovered: true,
      visited: false,
      actions: actionsForLocation('moon', condition),
      facts: [
        `Primary output: ${spec.role}.`,
        `Surface: ${terrain}.`,
        condition === 'partiallyEvacuated'
          ? 'Half the workforce has already refused to come back.'
          : 'Worker rotations are still running, for now.',
      ],
      economyRole: spec.role,
      terrain,
      siteIds: [],
      danger: rng.int(22, 52),
      onMainRoute: false,
      populationTier: rng.int(1, 3),
      recruitVenues: VENUES_BY_KIND.moon,
    };
    loc.market = generateMarket(loc, rng, 0);
    locations[id] = loc;
    moonIds.push(id);
  });

  // --- Main outward chain --------------------------------------------------
  const chain: {
    id: LocationId;
    kind: LocationKind;
    name: string;
    subtitle: string;
    description: string;
    days: [number, number];
    danger: [number, number];
    tier: number;
  }[] = [];

  const stnRng = streamRng(seed, 'location', 'tradeStation');
  const stationName = stnRng.pick(STATION_NAMES);
  chain.push({
    id: 'loc_trade_station',
    kind: 'tradeStation',
    name: stationName,
    subtitle: 'Outer trade station',
    description:
      'A small commodity station bolted onto the edge of a much larger economy. It matters to the Homeworld mostly because outsiders occasionally buy what the moons dig up.',
    days: [3, 6],
    danger: [20, 48],
    tier: 2,
  });

  const plnRng = streamRng(seed, 'location', 'planet');
  const planetName = plnRng.pick(PLANET_NAMES);
  const speciesName = plnRng.pick(SPECIES_NAMES);
  chain.push({
    id: 'loc_planet',
    kind: 'inhabitedPlanet',
    name: planetName,
    subtitle: `Home of the ${speciesName}`,
    description: `An ocean world with scattered habitable island chains. The ${speciesName} live here — not as travellers you meet in a dock bar, but as a civilisation at home, with its own arrangements you are expected to learn.`,
    days: [4, 8],
    danger: [15, 40],
    tier: 3,
  });

  const trsRng = streamRng(seed, 'location', 'transitStation');
  const transitName = trsRng.pick(TRANSIT_NAMES);
  chain.push({
    id: 'loc_transit_station',
    kind: 'transitStation',
    name: transitName,
    subtitle: 'Main transit station',
    description:
      'The first genuinely important hub on the route. Repair yards, real medical facilities, a market with depth, and more crews looking for a berth than there are berths. The last reliable resupply before the long leg.',
    days: [5, 9],
    danger: [18, 42],
    tier: 4,
  });

  const twRng = streamRng(seed, 'location', 'travelWorld');
  const travelWorldName = twRng.pick(TRAVEL_WORLD_NAMES);
  chain.push({
    id: 'loc_travel_world',
    kind: 'travelWorld',
    name: travelWorldName,
    subtitle: 'The New Frontier — Travel Center',
    description:
      'A rough but developed frontier world built around its Travel Center. Reaching it means the escape worked and the wider universe is finally reachable. It does not mean anyone is safe.',
    days: TRAVEL.finalLegDays,
    danger: [30, 62],
    tier: 4,
  });

  const routeIds: LocationId[] = [homeworldLoc.id];

  chain.forEach((spec, index) => {
    const rng = streamRng(seed, 'location', spec.id);
    const condition = rng.weighted(CONDITION_WEIGHTS[spec.kind]);
    const loc: LocationState = {
      id: spec.id,
      kind: spec.kind,
      name: spec.name,
      subtitle: spec.subtitle,
      description: spec.description,
      condition,
      routeIndex: (index + 1) / chain.length,
      lateral: 0,
      travelDaysFromPrev: rng.float(spec.days[0], spec.days[1]),
      discovered: index === 0,
      visited: false,
      actions: actionsForLocation(spec.kind, condition),
      facts: buildFacts(spec.kind, condition, rng),
      siteIds: [],
      danger: rng.int(spec.danger[0], spec.danger[1]),
      onMainRoute: true,
      populationTier: condition === 'abandoned' ? 0 : spec.tier,
      recruitVenues: condition === 'abandoned' ? [] : VENUES_BY_KIND[spec.kind],
    };
    if (condition !== 'abandoned') {
      loc.market = generateMarket(loc, rng, 0);
    }
    locations[loc.id] = loc;
    routeIds.push(loc.id);
  });

  return {
    locations,
    routeIds,
    homeworldId: homeworldLoc.id,
    moonIds: [moonIds[0]!, moonIds[1]!],
    travelWorldId: 'loc_travel_world',
    homeworld,
  };
}

function buildFacts(kind: LocationKind, condition: LocationCondition, rng: Rng): string[] {
  const facts: string[] = [];
  facts.push(`Condition: ${CONDITION_LABELS[condition]}.`);

  if (condition === 'abandoned') {
    facts.push('No services. Whatever is still here has to be taken, not bought.');
    facts.push('It has not been picked completely clean. Somebody left in a hurry.');
    return facts;
  }
  if (condition === 'rationing') facts.push('Supplies are controlled. Prices reflect it.');
  if (condition === 'damaged') facts.push('Sections are sealed off and repairs are backed up.');
  if (condition === 'partiallyEvacuated') facts.push('Half the berths are empty and nobody is filling them.');
  if (condition === 'prosperous') facts.push('Business as usual, which by now is unusual.');

  switch (kind) {
    case 'tradeStation':
      facts.push(rng.pick([
        'Fuel is the one thing they never run out of.',
        'The stationmaster charges for docking by the hour.',
        'Most traffic here is automated freight.',
      ]));
      break;
    case 'inhabitedPlanet':
      facts.push(rng.pick([
        'Off-world ships dock at the outer atolls, not the inhabited chains.',
        'Local etiquette matters more than local law.',
        'Fresh food is genuinely cheap here for the first time in weeks.',
      ]));
      break;
    case 'transitStation':
      facts.push(rng.pick([
        'The repair yards have a waiting list.',
        'Security is real here, and so is the paperwork.',
        'Every bar on the ring has crews looking for a berth.',
      ]));
      break;
    case 'travelWorld':
      facts.push('The Travel Center handles everything outbound. This is where the map stops being a line.');
      break;
    default:
      break;
  }
  return facts;
}

// ---------------------------------------------------------------------------
// Temporary nodes — the random signals that appear beside the main route
// ---------------------------------------------------------------------------

const TEMP_NODE_TYPES: {
  kind: string;
  name: string;
  subtitle: string;
  description: string;
  danger: [number, number];
  weight: number;
}[] = [
  {
    kind: 'distress',
    name: 'Distress Signal',
    subtitle: 'Automated repeat, no voice',
    description: 'A distress beacon on a loop. Either somebody is still alive out there, or the beacon outlived them.',
    danger: [25, 60],
    weight: 26,
  },
  {
    kind: 'wreck',
    name: 'Abandoned Wreck',
    subtitle: 'Cold hull, no transponder',
    description: 'A dead ship holding position on nothing. Cold, dark, and not squawking an identity.',
    danger: [35, 72],
    weight: 24,
  },
  {
    kind: 'unknown',
    name: 'Unknown Signal',
    subtitle: 'Unclassified',
    description: 'Something is transmitting on a band nothing should be using out here.',
    danger: [40, 88],
    weight: 16,
  },
  {
    kind: 'derelict',
    name: 'Derelict Platform',
    subtitle: 'Long abandoned',
    description: 'An old orbital platform nobody has bothered to strip. That is usually a reason, not an oversight.',
    danger: [30, 66],
    weight: 18,
  },
  {
    kind: 'trader',
    name: 'Passing Trader',
    subtitle: 'Hailing on open channel',
    description: 'An independent hauler, happy to deal, in no hurry to explain where they have been.',
    danger: [5, 22],
    weight: 16,
  },
];

let tempCounter = 0;

export function generateTemporaryNode(
  rng: Rng,
  routeIndex: number,
  currentHours: number,
  baseDanger: number,
): LocationState {
  const spec = rng.weighted(TEMP_NODE_TYPES.map((t) => ({ value: t, weight: t.weight })));
  tempCounter += 1;
  const id = `loc_temp_${tempCounter.toString(36)}_${rng.int(0, 0xffff).toString(36)}`;

  const danger = Math.round(
    Math.max(0, Math.min(100, rng.int(spec.danger[0], spec.danger[1]) * 0.6 + baseDanger * 0.4)),
  );

  const loc: LocationState = {
    id,
    kind: 'temporary',
    name: spec.name,
    subtitle: spec.subtitle,
    description: spec.description,
    condition: spec.kind === 'trader' ? 'normal' : 'abandoned',
    routeIndex,
    lateral: rng.chance(0.5) ? -0.55 : 0.55,
    travelDaysFromPrev: rng.float(0.3, 1.4),
    discovered: true,
    visited: false,
    actions: spec.kind === 'trader' ? ['trade', 'depart'] : ['scavenge', 'depart'],
    facts: ['No reliable information. Whatever is known has to be found out in person.'],
    siteIds: [],
    danger,
    expiresAtHours: currentHours + rng.int(30, 110),
    onMainRoute: false,
    populationTier: spec.kind === 'trader' ? 1 : 0,
    recruitVenues: [],
  };

  if (spec.kind === 'trader') {
    loc.market = generateMarket(loc, rng, currentHours);
  }

  return loc;
}

// ---------------------------------------------------------------------------
// Route queries
// ---------------------------------------------------------------------------

/** Where the player can legally set course from a given location. */
export function reachableFrom(
  locationId: LocationId | null,
  locations: Record<LocationId, LocationState>,
  routeIds: LocationId[],
): LocationState[] {
  const all = Object.values(locations);
  if (!locationId) return [];

  const current = locations[locationId];
  if (!current) return [];

  const results: LocationState[] = [];

  // Lateral moons are reachable from the homeworld and from each other.
  const inHomeRegion =
    current.kind === 'homeworld' || current.kind === 'moon' || current.routeIndex < 0.2;

  for (const loc of all) {
    if (loc.id === locationId) continue;
    if (loc.expiresAtHours !== undefined) {
      // Temporary nodes are only reachable while they exist and are nearby.
      if (Math.abs(loc.routeIndex - current.routeIndex) < 0.34) results.push(loc);
      continue;
    }
    if (loc.kind === 'moon') {
      if (inHomeRegion) results.push(loc);
      continue;
    }
    if (loc.kind === 'homeworld') {
      if (inHomeRegion) results.push(loc);
      continue;
    }
    // Main route: the next node outward, and the one you just came from.
    const currentIndex = routeIds.indexOf(current.onMainRoute ? current.id : nearestMainRoute(current, locations, routeIds));
    const targetIndex = routeIds.indexOf(loc.id);
    if (targetIndex === -1) continue;
    if (targetIndex === currentIndex + 1 || targetIndex === currentIndex - 1) {
      results.push(loc);
    }
  }

  return results.sort((a, b) => a.routeIndex - b.routeIndex || a.lateral - b.lateral);
}

function nearestMainRoute(
  from: LocationState,
  locations: Record<LocationId, LocationState>,
  routeIds: LocationId[],
): LocationId {
  let best = routeIds[0]!;
  let bestDelta = Infinity;
  for (const id of routeIds) {
    const loc = locations[id];
    if (!loc) continue;
    const delta = Math.abs(loc.routeIndex - from.routeIndex);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = id;
    }
  }
  return best;
}

export function isFinalLeg(fromId: LocationId, toId: LocationId): boolean {
  return fromId === 'loc_transit_station' && toId === 'loc_travel_world';
}

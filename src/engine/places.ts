/**
 * Places: the world you walk around in once you have landed.
 *
 * A Location is somewhere you fly to. A Place is somewhere you walk to. Every
 * service in the game hangs off a Place, so the player reaches a merchant by
 * going to the market rather than by opening a Trade menu — and can only offer
 * someone passage by standing where that person actually is.
 *
 * Places form a shallow tree. Top-level districts belong to a location; venues
 * inside them point at their district.
 */

import { pushLog } from './log';
import { streamRng, type Rng } from './rng';
import { advanceTime } from './sim';
import { LOCAL } from './tuning';
import type {
  Character,
  GameState,
  LocationActionKind,
  LocationId,
  LocationState,
  Place,
  PlaceId,
  PlaceKind,
  RecruitVenue,
} from './types';

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

interface VenueTemplate {
  key: string;
  name: string;
  kind: PlaceKind;
  subtitle: string;
  description: string;
  actions: LocationActionKind[];
  recruitVenue?: RecruitVenue;
  danger?: number;
}

interface DistrictTemplate {
  key: string;
  name: string;
  kind: PlaceKind;
  subtitle: string;
  description: string;
  actions?: LocationActionKind[];
  venues: VenueTemplate[];
  /** Where the ship sits when landed here. */
  shipHere?: boolean;
  danger?: number;
}

const HOMEWORLD_DISTRICTS: DistrictTemplate[] = [
  {
    key: 'home',
    name: 'Home Property',
    kind: 'homeProperty',
    subtitle: 'Where you grew up',
    description:
      'A strip of dry ground behind the house, a maintenance apron somebody poured decades ago, and the ship standing on it. From here you can see the settlement lights and, past them, the processing towers that are not keeping up.',
    shipHere: true,
    danger: 4,
    venues: [
      {
        key: 'house',
        name: 'The House',
        kind: 'house',
        subtitle: 'Still standing, still yours',
        description:
          'Low rooms, worn floors, and more of your life in them than you can carry. Somebody may be here.',
        actions: ['social', 'rest'],
      },
    ],
  },
  {
    key: 'central',
    name: 'Central City',
    kind: 'district',
    subtitle: 'Administration, markets, crowds',
    description:
      'The old core. Queues outside every office, notices pasted over older notices, and traffic that still mostly moves.',
    danger: 14,
    venues: [
      {
        key: 'market',
        name: 'Market District',
        kind: 'market',
        subtitle: 'Stalls, brokers, and rising prices',
        description:
          'Everything is available and everything costs more than it did last week. The traders know exactly why.',
        actions: ['trade'],
      },
      {
        key: 'medical',
        name: 'Medical Center',
        kind: 'clinic',
        subtitle: 'Over capacity for months',
        description:
          'Triage in the lobby, wards on the upper floors, and staff who have stopped pretending they will all be evacuated.',
        actions: ['medical', 'recruit'],
        recruitVenue: 'clinic',
      },
      {
        key: 'shelter',
        name: 'Public Shelter',
        kind: 'shelter',
        subtitle: 'People with nowhere else',
        description:
          'Cots in rows under a roof meant for something else. Everyone here is waiting for a number to be called.',
        actions: ['recruit', 'social'],
        recruitVenue: 'shelter',
      },
      {
        key: 'transit',
        name: 'Transit Hub',
        kind: 'transitHub',
        subtitle: 'Boards, brokers, and rumour',
        description:
          'Departure boards nobody trusts, a wall of paid notices, and people who make a living knowing things.',
        actions: ['findWork', 'missions', 'askForecast'],
      },
    ],
  },
  {
    key: 'spaceport',
    name: 'Spaceport',
    kind: 'district',
    subtitle: 'The only way off the ground',
    description:
      'Pads, gantries, and a permanent queue. Lift capacity is the thing everyone is short of, and everyone knows it.',
    danger: 18,
    venues: [
      {
        key: 'fuel',
        name: 'Fuel Depot',
        kind: 'fuelDepot',
        subtitle: 'Tanks and a pricing board',
        description: 'Bowsers, hoses, and a number on the board that goes up more often than down.',
        actions: ['trade'],
      },
      {
        key: 'yard',
        name: 'Repair Yard',
        kind: 'repairYard',
        subtitle: 'Backed up for weeks',
        description:
          'Cradles full of other people’s problems. They will take your money and your place in the queue.',
        actions: ['repair'],
      },
      {
        key: 'freight',
        name: 'Freight Office',
        kind: 'freightOffice',
        subtitle: 'Charters and contracts',
        description:
          'A counter, a terminal, and a clerk who will happily put cargo in your hold if you are going that way anyway.',
        actions: ['findWork', 'missions'],
      },
      {
        key: 'concourse',
        name: 'Passenger Concourse',
        kind: 'concourse',
        subtitle: 'People trying to leave',
        description:
          'Families sitting on their luggage. Some of them have skills. All of them have a reason to be useful to somebody with a ship.',
        actions: ['recruit', 'social'],
        recruitVenue: 'refugeeArea',
      },
    ],
  },
  {
    key: 'industrial',
    name: 'Industrial District',
    kind: 'district',
    subtitle: 'Works, yards, and shift housing',
    description:
      'Plant that has been running flat out for two years and maintenance that has not. Half of it is still on shift.',
    danger: 26,
    venues: [
      {
        key: 'camp',
        name: 'Worker Camp',
        kind: 'workerCamp',
        subtitle: 'Rotating shifts, thinning crews',
        description:
          'Bunkhouses, a canteen, and people coming off shift who have started asking what the point is.',
        actions: ['recruit', 'findWork'],
        recruitVenue: 'workerCamp',
      },
      {
        key: 'salvage',
        name: 'Salvage Yard',
        kind: 'salvageYard',
        subtitle: 'Parts, mostly honest',
        description:
          'Rows of stripped hulls and a proprietor who can find almost anything given an hour and a reason.',
        actions: ['trade', 'scavenge'],
      },
      {
        key: 'works',
        name: 'The Shuttered Works',
        kind: 'wilds',
        subtitle: 'Closed, not emptied',
        description:
          'A plant that shut mid-shift when the contracts stopped. The gate is chained. The fence is not.',
        actions: ['scavenge'],
        danger: 38,
      },
    ],
  },
  {
    key: 'residential',
    name: 'Residential District',
    kind: 'district',
    subtitle: 'Blocks, and the people still in them',
    description:
      'Terraces and towers where most of the planet actually lives. Quieter every week as the lists get called.',
    danger: 10,
    venues: [
      {
        key: 'blocks',
        name: 'The Blocks',
        kind: 'house',
        subtitle: 'Neighbours, notices, and closed doors',
        description:
          'Stairwells, shared yards, and a noticeboard covered in handwritten appeals for help and for passage.',
        actions: ['social'],
      },
      {
        key: 'clinic',
        name: 'District Clinic',
        kind: 'clinic',
        subtitle: 'Small, local, still open',
        description: 'Two rooms and a nurse who knows everyone by name.',
        actions: ['medical'],
      },
      {
        key: 'corner',
        name: 'Corner Market',
        kind: 'market',
        subtitle: 'Whatever came in this week',
        description: 'Shelves that used to be full. Prices written in marker and changed daily.',
        actions: ['trade'],
      },
    ],
  },
  {
    key: 'outer',
    name: 'Outer Settlements',
    kind: 'district',
    subtitle: 'Past the perimeter',
    description:
      'Scattered holdings and old workings an hour out from the city. Fewer rules, fewer services, fewer questions.',
    danger: 32,
    venues: [
      {
        key: 'settlement',
        name: 'Perimeter Settlement',
        kind: 'outpost',
        subtitle: 'Self-sufficient and suspicious',
        description:
          'A few hundred people who were doing fine before any of this and intend to keep doing fine.',
        actions: ['trade', 'recruit'],
        recruitVenue: 'refugeeArea',
      },
      {
        key: 'workings',
        name: 'Old Workings',
        kind: 'wilds',
        subtitle: 'Abandoned before you were born',
        description: 'Cut faces, collapsed adits, and equipment nobody bothered to recover.',
        actions: ['scavenge'],
        danger: 44,
      },
    ],
  },
];

/** Districts for everywhere that is not the homeworld, keyed by location kind. */
const GENERIC_DISTRICTS: Record<string, DistrictTemplate[]> = {
  moon: [
    {
      key: 'field',
      name: 'Landing Field',
      kind: 'shipYard',
      subtitle: 'Pad, mast, and a pressurised walkway',
      description:
        'A scraped apron with tie-downs and a covered walk to the colony proper. Your ship is on it.',
      shipHere: true,
      venues: [],
    },
    {
      key: 'habitat',
      name: 'Worker Habitat',
      kind: 'workerCamp',
      subtitle: 'Bunks, canteen, shift boards',
      description:
        'Where the rotation lives. The board by the door lists departures that keep being postponed.',
      actions: ['recruit', 'findWork', 'social', 'rest'],
      venues: [],
    },
    {
      key: 'works',
      name: 'Extraction Works',
      kind: 'salvageYard',
      subtitle: 'The reason the colony exists',
      description: 'Processing lines, spoil heaps, and machinery run past its service interval.',
      actions: ['trade', 'scavenge', 'repair'],
      venues: [],
    },
    {
      key: 'office',
      name: 'Colony Office',
      kind: 'government',
      subtitle: 'Whoever is still in charge',
      description: 'One administrator, one terminal, and a great deal of unresolved paperwork.',
      actions: ['missions', 'findWork'],
      venues: [],
    },
  ],
  tradeStation: [
    {
      key: 'ring',
      name: 'Docking Ring',
      kind: 'dock',
      subtitle: 'Berths and handling',
      description: 'Your ship is clamped here, alongside whoever else is passing through.',
      shipHere: true,
      venues: [],
    },
    {
      key: 'concourse',
      name: 'Market Concourse',
      kind: 'market',
      subtitle: 'Commodities and chandlery',
      description: 'A curved hall of stalls and bonded lockers. Everything has a listed price.',
      actions: ['trade'],
      venues: [],
    },
    {
      key: 'bar',
      name: 'The Berth Bar',
      kind: 'bar',
      subtitle: 'Crews between berths',
      description: 'Low ceiling, cheap drink, and people looking for a way onward.',
      actions: ['recruit', 'social', 'rest'],
      venues: [],
    },
    {
      key: 'services',
      name: 'Station Services',
      kind: 'repairYard',
      subtitle: 'Repairs, medical, work',
      description: 'A shared deck for anything the station will do for money.',
      actions: ['repair', 'medical', 'findWork', 'missions'],
      venues: [],
    },
  ],
  transitStation: [
    {
      key: 'ring',
      name: 'Docking Ring',
      kind: 'dock',
      subtitle: 'Berths, handling, customs',
      description: 'Traffic in both directions and a berth fee by the hour. Your ship is here.',
      shipHere: true,
      venues: [],
    },
    {
      key: 'market',
      name: 'Grand Concourse',
      kind: 'market',
      subtitle: 'The deepest market on the route',
      description:
        'Several species, several currencies, and stock you have not seen since the homeworld was working.',
      actions: ['trade'],
      venues: [],
    },
    {
      key: 'yards',
      name: 'Repair Yards',
      kind: 'repairYard',
      subtitle: 'Proper facilities, proper prices',
      description: 'Cradles, gantries, and engineers who do this every day. There is a waiting list.',
      actions: ['repair'],
      venues: [],
    },
    {
      key: 'infirmary',
      name: 'Station Infirmary',
      kind: 'clinic',
      subtitle: 'Real medicine',
      description: 'Clean, staffed, and expensive. The best treatment available before the long leg.',
      actions: ['medical'],
      venues: [],
    },
    {
      key: 'bar',
      name: 'Crew Quarter',
      kind: 'bar',
      subtitle: 'Bars, berths, and hiring',
      description:
        'More crews looking for a ship than there are ships. Some of them are worth talking to.',
      actions: ['recruit', 'social', 'rest'],
      venues: [],
    },
    {
      key: 'office',
      name: 'Freight Exchange',
      kind: 'freightOffice',
      subtitle: 'Charters and contracts',
      description: 'Cargo going everywhere, and brokers who will tell you which of it is a trap.',
      actions: ['findWork', 'missions'],
      venues: [],
    },
  ],
  inhabitedPlanet: [
    {
      key: 'atoll',
      name: 'Landing Atoll',
      kind: 'shipYard',
      subtitle: 'Outer chain, off-world berths',
      description:
        'Visiting ships set down out here, away from the inhabited chains. Yours is on the apron.',
      shipHere: true,
      venues: [],
    },
    {
      key: 'wharf',
      name: 'Trade Wharf',
      kind: 'market',
      subtitle: 'Where off-worlders are dealt with',
      description: 'Long low buildings on stilts, and an etiquette to the bargaining you are expected to learn.',
      actions: ['trade'],
      venues: [],
    },
    {
      key: 'hall',
      name: "Healers' Hall",
      kind: 'clinic',
      subtitle: 'Local medicine, applied carefully',
      description: 'Cool rooms and practitioners who will treat you, having first satisfied themselves about you.',
      actions: ['medical'],
      venues: [],
    },
    {
      key: 'ground',
      name: 'Meeting Ground',
      kind: 'concourse',
      subtitle: 'Where things are decided',
      description:
        'An open terrace above the water where disputes are heard, work is arranged, and outsiders are assessed.',
      actions: ['social', 'recruit', 'findWork', 'missions'],
      venues: [],
    },
    {
      key: 'chains',
      name: 'Outer Chains',
      kind: 'wilds',
      subtitle: 'Ruins and drowned structures',
      description: 'Tidal ruins and storm-wrecked stations across the shallow shelf.',
      actions: ['scavenge'],
      venues: [],
    },
  ],
  travelWorld: [
    {
      key: 'center',
      name: 'Travel Center',
      kind: 'transitHub',
      subtitle: 'The way onward',
      description:
        'The reason the city is here. Outbound berths to places that were rumours a month ago.',
      shipHere: true,
      actions: ['trade', 'repair', 'medical', 'recruit', 'findWork', 'missions', 'rest'],
      venues: [],
    },
  ],
  temporary: [
    {
      key: 'approach',
      name: 'Approach',
      kind: 'dock',
      subtitle: 'Holding alongside',
      description: 'Station-keeping next to whatever this is. The ship stays hot.',
      shipHere: true,
      actions: ['scavenge'],
      venues: [],
    },
  ],
};

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

/**
 * Build the places for a location. A district or venue is only created if the
 * location itself supports what it offers, so an abandoned station does not
 * grow a market.
 */
export function generatePlacesForLocation(seed: string, location: LocationState): Place[] {
  const rng = streamRng(seed, 'places', location.id);
  const templates =
    location.kind === 'homeworld'
      ? HOMEWORLD_DISTRICTS
      : (GENERIC_DISTRICTS[location.kind] ?? GENERIC_DISTRICTS.temporary!);

  const allowed = new Set(location.actions);
  const places: Place[] = [];

  for (const district of templates) {
    const districtActions = (district.actions ?? []).filter(
      (a) => allowed.has(a) || district.shipHere,
    );
    const venues = district.venues.filter(
      (v) => v.actions.some((a) => allowed.has(a)) || district.shipHere,
    );

    // Drop a district that has nothing left to offer, unless the ship is on it.
    if (!district.shipHere && districtActions.length === 0 && venues.length === 0) continue;

    const districtId = `plc_${location.id}_${district.key}`;
    places.push({
      id: districtId,
      locationId: location.id,
      name: district.name,
      kind: district.kind,
      subtitle: district.subtitle,
      description: district.description,
      actions: districtActions,
      travelHours: district.shipHere
        ? 0
        : rng.float(LOCAL.districtHours[0], LOCAL.districtHours[1]),
      discovered: true,
      visited: Boolean(district.shipHere),
      siteIds: [],
      danger: district.danger ?? Math.round(location.danger * 0.6),
      shipHere: district.shipHere,
    });

    for (const venue of venues) {
      places.push({
        id: `${districtId}_${venue.key}`,
        locationId: location.id,
        parentId: districtId,
        name: venue.name,
        kind: venue.kind,
        subtitle: venue.subtitle,
        description: venue.description,
        actions: venue.actions.filter((a) => allowed.has(a)),
        // Walking into your own house from the pad behind it is not a journey.
        travelHours: district.shipHere
          ? 0.08
          : rng.float(LOCAL.venueHours[0], LOCAL.venueHours[1]),
        discovered: true,
        visited: false,
        recruitVenue: venue.recruitVenue,
        siteIds: [],
        danger: venue.danger ?? Math.round(location.danger * 0.7),
      });
    }
  }

  return places;
}

/** Generate a location's places the first time the player needs them. */
export function ensurePlaces(state: GameState, location: LocationState): Place[] {
  const existing = Object.values(state.places).filter((p) => p.locationId === location.id);
  if (existing.length > 0) return existing;

  const generated = generatePlacesForLocation(state.seed, location);
  for (const place of generated) state.places[place.id] = place;
  return generated;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function currentPlace(state: GameState): Place | null {
  return state.currentPlaceId ? (state.places[state.currentPlaceId] ?? null) : null;
}

/** Top-level districts of a location. */
export function districtsAt(state: GameState, locationId: LocationId): Place[] {
  return Object.values(state.places)
    .filter((p) => p.locationId === locationId && !p.parentId)
    .sort((a, b) => a.travelHours - b.travelHours);
}

export function childPlaces(state: GameState, parentId: PlaceId): Place[] {
  return Object.values(state.places).filter((p) => p.parentId === parentId);
}

/** Where the ship is parked at the current location, if anywhere. */
export function shipPlace(state: GameState): Place | null {
  if (!state.currentLocationId) return null;
  return (
    Object.values(state.places).find(
      (p) => p.locationId === state.currentLocationId && p.shipHere,
    ) ?? null
  );
}

/** Non-crew characters physically standing in a place. */
export function peopleAt(state: GameState, placeId: PlaceId): Character[] {
  return Object.values(state.characters).filter(
    (c) => c.alive && !c.aboard && c.placeId === placeId,
  );
}

/** Everywhere the player can walk to from where they are standing. */
export function reachablePlaces(state: GameState): Place[] {
  if (!state.currentLocationId) return [];
  const here = currentPlace(state);

  // Aboard, or standing in a district: the districts, plus this district's venues.
  if (!here) return districtsAt(state, state.currentLocationId);

  if (!here.parentId) {
    return [
      ...childPlaces(state, here.id),
      ...districtsAt(state, here.locationId).filter((p) => p.id !== here.id),
    ];
  }

  // Standing in a venue: its siblings, and back out to the district.
  const parent = state.places[here.parentId];
  return [
    ...(parent ? [parent] : []),
    ...childPlaces(state, here.parentId).filter((p) => p.id !== here.id),
  ];
}

// ---------------------------------------------------------------------------
// Movement
// ---------------------------------------------------------------------------

export interface MoveResult {
  ok: boolean;
  lines: string[];
  reason?: string;
}

/** Walk to a place. Costs time; time is the currency this game actually spends. */
export function walkTo(state: GameState, placeId: PlaceId, rng: Rng): MoveResult {
  const target = state.places[placeId];
  if (!target) return { ok: false, lines: [], reason: 'You do not know how to get there.' };
  if (target.locationId !== state.currentLocationId) {
    return { ok: false, lines: [], reason: 'That is not on this world.' };
  }
  if (state.expedition) {
    return { ok: false, lines: [], reason: 'A party is still deployed.' };
  }

  const from = currentPlace(state);
  // Crossing districts costs the full walk; moving inside one is quicker.
  const sameDistrict =
    from && (from.id === target.parentId || from.parentId === target.id || from.parentId === target.parentId);
  const hours = sameDistrict
    ? Math.max(0.15, target.travelHours * 0.6)
    : Math.max(0.25, target.travelHours);

  const advance = advanceTime(state, hours, rng);

  state.currentPlaceId = target.id;
  target.visited = true;
  target.discovered = true;
  for (const child of childPlaces(state, target.id)) child.discovered = true;

  const lines = [...advance.lines];
  pushLog(state, 'travel', `Went to ${target.name}.`);
  return { ok: true, lines };
}

/** Walk back and board the ship. */
export function boardShip(state: GameState, rng: Rng): MoveResult {
  if (state.expedition) {
    return { ok: false, lines: [], reason: 'A party is still deployed.' };
  }
  const here = currentPlace(state);
  const hours = here?.shipHere ? 0.1 : LOCAL.returnToShipHours;
  const advance = advanceTime(state, hours, rng);
  state.currentPlaceId = null;
  pushLog(state, 'travel', 'Returned to the ship.');
  return { ok: true, lines: advance.lines };
}

/** Step off the ship onto whatever it is parked on. */
export function disembark(state: GameState, rng: Rng): MoveResult {
  const parked = shipPlace(state);
  if (!parked) return { ok: false, lines: [], reason: 'There is nowhere to step out to.' };
  const advance = advanceTime(state, 0.1, rng);
  state.currentPlaceId = parked.id;
  parked.visited = true;
  for (const child of childPlaces(state, parked.id)) child.discovered = true;
  return { ok: true, lines: advance.lines };
}

// ---------------------------------------------------------------------------
// Populating the world with people
// ---------------------------------------------------------------------------

/** Place kinds where it is plausible to find somebody standing around. */
const PEOPLED_KINDS: PlaceKind[] = [
  'house',
  'shelter',
  'workerCamp',
  'concourse',
  'outpost',
  'clinic',
  'market',
];

/**
 * Put known people somewhere real. Family are scattered across the homeworld —
 * one may be at the house, another on shift, another in a public shelter — so
 * reaching them is a journey rather than a menu selection.
 */
export function placeKnownCharacters(state: GameState, rng: Rng): void {
  const pool = Object.values(state.places).filter(
    (p) => p.locationId === 'loc_homeworld' && PEOPLED_KINDS.includes(p.kind),
  );
  if (pool.length === 0) return;

  const house = pool.find((p) => p.kind === 'house' && p.parentId?.endsWith('_home'));
  const family = state.homeworld.familyIds
    .map((id) => state.characters[id])
    .filter((c): c is Character => Boolean(c) && !c.aboard);

  family.forEach((person, index) => {
    // At least one relative is at the house, so the opening has somewhere
    // obvious to go and the player learns the pattern on someone they know.
    const place = index === 0 && house ? house : rng.pick(pool);
    person.placeId = place.id;
    person.placeKnown = index === 0 ? true : rng.chance(0.65);
    person.availability = rng.weighted([
      { value: 'available' as const, weight: 70 },
      { value: 'working' as const, weight: 25 },
      { value: 'unreachable' as const, weight: 5 },
    ]);
  });
}

/** Reveal where somebody is, once the player has asked the right people. */
export function revealPersonLocation(state: GameState, characterId: string): string | null {
  const person = state.characters[characterId];
  if (!person || person.placeKnown) return null;
  person.placeKnown = true;
  const place = person.placeId ? state.places[person.placeId] : undefined;
  return place ? `${person.name} is at ${place.name}.` : null;
}

export const PLACE_KIND_LABELS: Record<PlaceKind, string> = {
  homeProperty: 'Home',
  house: 'Residence',
  shipYard: 'Landing Area',
  district: 'District',
  market: 'Market',
  clinic: 'Medical',
  shelter: 'Shelter',
  workerCamp: 'Worker Camp',
  salvageYard: 'Salvage',
  freightOffice: 'Freight',
  repairYard: 'Repair',
  fuelDepot: 'Fuel',
  shipMarket: 'Ship Market',
  transitHub: 'Transit',
  bar: 'Bar',
  government: 'Administration',
  lodging: 'Lodging',
  dock: 'Dock',
  concourse: 'Concourse',
  outpost: 'Settlement',
  wilds: 'Unsecured',
};

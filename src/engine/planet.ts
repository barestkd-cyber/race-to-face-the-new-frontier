/**
 * Worlds: one primary biome, zero to three environmental modifiers, and — very
 * occasionally — something authored on top.
 *
 * The generator is deliberately shallow. A hundred biomes across three hundred
 * modifiers is enough that the same biome plays differently every seed without
 * anyone writing a thousand worlds by hand, and none of it introduces a new
 * universal stat: modifiers feed the Skills, Attributes, time, hazards and
 * events that already exist, or they are description.
 *
 * The authored special worlds are exceptions, not a second generator. Ghost
 * Planet is the signature one and it is deliberately not rare.
 */

import { BIOMES, PLANET_MODIFIERS, type BiomeEntry, type PlanetModifierEntry } from '../content/planets';
import type { Rng } from './rng';
import { SPECIAL_WORLDS } from './tuning';
import type { LocationState, SpecialWorldId } from './types';

const BIOME_BY_ID = new Map(BIOMES.map((b) => [b.id, b]));
const MODIFIER_BY_ID = new Map(PLANET_MODIFIERS.map((m) => [m.id, m]));

export function biomeById(id: string | undefined): BiomeEntry | undefined {
  return id ? BIOME_BY_ID.get(id) : undefined;
}

export function modifierById(id: string): PlanetModifierEntry | undefined {
  return MODIFIER_BY_ID.get(id);
}

export function modifiersOf(location: LocationState): PlanetModifierEntry[] {
  return (location.modifiers ?? [])
    .map((id) => MODIFIER_BY_ID.get(id))
    .filter((m): m is PlanetModifierEntry => Boolean(m));
}

// ---------------------------------------------------------------------------
// Contradiction screening
// ---------------------------------------------------------------------------

/**
 * Pairs that cannot both be true of one world. Screened at generation rather
 * than papered over afterwards. This is a short list on purpose: rare odd
 * combinations are the point of the system, and only outright contradictions
 * are worth rejecting.
 */
const CONTRADICTIONS: [string, string][] = [
  ['low-gravity', 'high-gravity'],
  ['low-gravity', 'very-high-gravity'],
  ['very-low-gravity', 'high-gravity'],
  ['very-low-gravity', 'very-high-gravity'],
  ['high-gravity', 'very-low-gravity'],
  ['generally-warm', 'generally-cool'],
  ['frozen-poles', 'warm-poles'],
  ['water-rich-surface', 'water-poor-surface'],
  ['high-biodiversity', 'low-biodiversity'],
  ['strong-magnetosphere', 'weak-magnetosphere'],
  ['crystal-clear-air', 'strong-atmospheric-haze'],
  ['calm-climate', 'permanent-storm-belts'],
  ['minimal-seasons', 'extreme-seasonal-tilt'],
  ['high-pathogen-load', 'low-pathogen-load'],
  ['metal-rich-crust', 'metal-poor-crust'],
  ['rare-earth-abundance', 'rare-earth-scarcity'],
  ['freshwater-scarcity', 'freshwater-abundance'],
  ['minimal-tides', 'mega-tides'],
  ['minimal-tides', 'strong-tides'],
  ['fertile-soils', 'poor-soils'],
  ['docile-wildlife', 'highly-territorial-wildlife'],
  ['slow-rotation', 'rapid-rotation'],
  ['long-day-cycle', 'short-day-cycle'],
  ['long-year', 'short-year'],
  ['bright-star', 'dim-star'],
  ['very-dark-nights', 'bright-nights'],
  ['geologically-quiet', 'frequent-earthquakes'],
  ['geologically-quiet', 'megaquake-risk'],
  ['sound-carrying-atmosphere', 'sound-dampening-atmosphere'],
  ['evergreen-dominance', 'deciduous-dominance'],
  ['fast-growing-vegetation', 'slow-growing-vegetation'],
  ['rapid-food-spoilage', 'slow-food-spoilage'],
  ['rapid-erosion', 'slow-erosion'],
  ['young-surface', 'ancient-surface'],
  ['night-active-fauna', 'day-active-fauna'],
];

function contradicts(id: string, chosen: string[]): boolean {
  for (const [a, b] of CONTRADICTIONS) {
    if (id === a && chosen.includes(b)) return true;
    if (id === b && chosen.includes(a)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

export interface GeneratedWorldTraits {
  biome: string;
  modifiers: string[];
  specialWorld?: SpecialWorldId;
}

/**
 * One world's physical identity. `allowSpecial` is off for the places the
 * introductory route has already authored by hand — the Homeworld is dying of
 * two named things, and it does not need a haunting on top.
 */
export function generateWorldTraits(
  rng: Rng,
  options: { allowSpecial?: boolean; biome?: string } = {},
): GeneratedWorldTraits {
  const biome = options.biome ?? rng.pick(BIOMES).id;

  const count = rng.weighted([
    { value: 0, weight: 14 },
    { value: 1, weight: 30 },
    { value: 2, weight: 34 },
    { value: 3, weight: 22 },
  ]);

  const modifiers: string[] = [];
  let guard = 0;
  while (modifiers.length < count && guard++ < 60) {
    const candidate = rng.pick(PLANET_MODIFIERS).id;
    if (modifiers.includes(candidate)) continue;
    if (contradicts(candidate, modifiers)) continue;
    modifiers.push(candidate);
  }

  const traits: GeneratedWorldTraits = { biome, modifiers };
  if (options.allowSpecial) {
    const special = rollSpecialWorld(rng);
    if (special) traits.specialWorld = special;
  }
  return traits;
}

/**
 * At most one authored world attaches to a body. Ghost Planet is weighted to
 * sit near the middle of the band design discussed: common enough that players
 * compare notes about it, rare enough that finding one still means something.
 */
export function rollSpecialWorld(rng: Rng): SpecialWorldId | undefined {
  const table: { value: SpecialWorldId; weight: number }[] = [
    { value: 'ghostPlanet', weight: SPECIAL_WORLDS.ghostPlanetChance },
    { value: 'gravityLockdown', weight: SPECIAL_WORLDS.gravityLockdownChance },
    { value: 'underwaterCity', weight: SPECIAL_WORLDS.underwaterCityChance },
    { value: 'dirtValuing', weight: SPECIAL_WORLDS.dirtValuingChance },
    { value: 'obelisk', weight: SPECIAL_WORLDS.obeliskChance },
    { value: 'goldenDiamond', weight: SPECIAL_WORLDS.goldenDiamondChance },
  ];
  const total = table.reduce((sum, e) => sum + e.weight, 0);
  if (!rng.chance(total)) return undefined;
  return rng.weighted(table);
}

// ---------------------------------------------------------------------------
// Authored worlds
// ---------------------------------------------------------------------------

export interface SpecialWorldEntry {
  id: SpecialWorldId;
  name: string;
  /** What the crew sees on arrival. */
  description: string;
  /** The one line the cockpit shows about it. */
  note: string;
}

export const SPECIAL_WORLD_TEXT: Record<SpecialWorldId, SpecialWorldEntry> = {
  ghostPlanet: {
    id: 'ghostPlanet',
    name: 'Ghost Planet',
    description:
      'Nobody has a satisfying account of this place. Electricity does not behave. Sensors report things that are not there and miss things that are. People who spend a night on the surface come back quieter, and the ones who insist nothing happened are the ones who insist hardest.',
    note: 'Something is wrong here in a way instruments will not settle.',
  },
  gravityLockdown: {
    id: 'gravityLockdown',
    name: 'Interdicted World',
    description:
      'The government here can stop anyone leaving, and does, on a schedule nobody outside the ministry knows. Ordinary citizens plan their lives around it. Visitors find out the hard way.',
    note: 'Departure is not always in your hands here.',
  },
  underwaterCity: {
    id: 'underwaterCity',
    name: 'Submerged City',
    description:
      'The city is under the water, and it was built by people for whom that is not a hardship. Everything above the surface is a service entrance.',
    note: 'Most of this place is below you.',
  },
  dirtValuing: {
    id: 'dirtValuing',
    name: 'Soil Market',
    description:
      'They pay for dirt here. Real, ordinary soil, priced by weight and graded like ore, for reasons that made sense two centuries ago and have since become simply how things are done.',
    note: 'Soil is a serious commodity on this world.',
  },
  obelisk: {
    id: 'obelisk',
    name: 'The Obelisk',
    description:
      'A structure stands here that predates every civilisation with a name for it. Standing at the base of it, a great deal of nearby sky suddenly has labels on it.',
    note: 'There is something very old standing here.',
  },
  goldenDiamond: {
    id: 'goldenDiamond',
    name: 'Golden Diamond World',
    description:
      'The geology here is absurd and everybody knows it. The reason nobody is rich is mass: you can carry away a fortune, and you cannot carry away two.',
    note: 'The ground here is worth more than your ship.',
  },
};

/** Sensors lie on a haunted world. Nothing else does this. */
export function sensorsUnreliable(location: LocationState | undefined): boolean {
  if (!location) return false;
  if (location.specialWorld === 'ghostPlanet') return true;
  return (location.modifiers ?? []).some(
    (id) =>
      id === 'sensor-interference-zones' ||
      id === 'chaotic-magnetic-field' ||
      id === 'localized-magnetic-anomalies' ||
      id === 'radio-noise-environment',
  );
}

/**
 * The handful of modifiers that clearly imply a consequence, hand-picked the
 * same way the personality tags were: read, judged, and left alone where the
 * words do not actually mean a mechanic.
 */
export const MODIFIER_EFFECTS: Record<string, { danger?: number; note: string }> = {
  'high-pathogen-load': { danger: 6, note: 'Minor illness is a routine cost of being here.' },
  'rapid-wound-infection': { danger: 8, note: 'Open injuries have to be treated faster here.' },
  'venomous-fauna': { danger: 7, note: 'A great deal of the local wildlife is venomous.' },
  'pack-predators': { danger: 9, note: 'The predators here hunt in coordinated groups.' },
  'ambush-predators': { danger: 8, note: 'The predators here are patient and very hard to see.' },
  'highly-territorial-wildlife': { danger: 6, note: 'The wildlife wants you gone.' },
  'extremely-rugged-terrain': { danger: 4, note: 'Every overland route takes longer than it looks.' },
  'unstable-scree-slopes': { danger: 5, note: 'The ground gives way on the climbs.' },
  'frequent-sinkholes': { danger: 6, note: 'The ground here is not always ground.' },
  'megaquake-risk': { danger: 7, note: 'Rare, enormous seismic events. Everything is built for it.' },
  'supervolcano-regions': { danger: 6, note: 'There are calderas here on a scale that changes weather.' },
  'high-background-radiation': { danger: 7, note: 'Exposure adds up faster than anyone likes.' },
  'emp-storms': { danger: 6, note: 'Unshielded electronics do not last here.' },
  'localized-toxic-air-pockets': { danger: 5, note: 'Most of the air is fine. Valleys and caves are not.' },
  'neurotoxic-spores': { danger: 6, note: 'The blooms here impair coordination before anyone notices.' },
  'flash-flood-climate': { danger: 5, note: 'Dry channels become rivers in minutes.' },
  'hypercanes': { danger: 7, note: 'The storms here are on a scale that ends settlements.' },
  'calm-climate': { danger: -4, note: 'The weather here is unusually kind.' },
  'geologically-quiet': { danger: -3, note: 'The ground here has been still for a very long time.' },
  'low-pathogen-load': { danger: -4, note: 'Remarkably little here is trying to make you ill.' },
  'docile-wildlife': { danger: -4, note: 'The large animals here have no particular opinion of you.' },
  'medicinal-biodiversity': { note: 'A great many local organisms turn out to be pharmacologically useful.' },
  'gemstone-abundance': { note: 'Valuable crystalline deposits are near the surface and widespread.' },
  'metal-rich-crust': { note: 'Useful ore is abundant and shallow.' },
  'strategic-resource-hotspots': { note: 'A few regions here are worth more than the rest combined.' },
};

/** How much this world's modifiers move its danger rating. */
export function modifierDanger(location: LocationState): number {
  let total = 0;
  for (const id of location.modifiers ?? []) {
    total += MODIFIER_EFFECTS[id]?.danger ?? 0;
  }
  return total;
}

/** The lines worth saying about this world, for the location facts. */
export function worldFacts(location: LocationState): string[] {
  const facts: string[] = [];
  const biome = biomeById(location.biome);
  if (biome) facts.push(`${biome.name}. ${biome.description}`);
  for (const modifier of modifiersOf(location)) {
    const effect = MODIFIER_EFFECTS[modifier.id];
    facts.push(effect ? `${modifier.name} — ${effect.note}` : `${modifier.name} — ${modifier.description}`);
  }
  if (location.specialWorld) facts.push(SPECIAL_WORLD_TEXT[location.specialWorld].note);
  return facts;
}

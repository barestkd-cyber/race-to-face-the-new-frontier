/**
 * The captain's life, generated.
 *
 * Age, a working life out of 250, two influential events out of 500, and the
 * words those add up to. Everything is a bias on the ordinary generator, never
 * a replacement for it — a Field Medic still rolls their skills through the
 * same exposure tables everyone else does, just with the odds leaned on.
 *
 * Three rules the library is explicit about, and this module keeps:
 *
 *  - influential does not mean bad. The pool is deliberately 35% positive,
 *    35% negative and 30% mixed, and a good year can move a life as hard as a
 *    bad one;
 *  - polarity and severity are separate axes, so a positive event can be
 *    transformative and a negative one can be minor;
 *  - age gates history. Nobody is a chief engineer at nineteen, and nobody has
 *    a grandchild at twenty-two.
 */

import { DEMEANOR, type DemeanorEntry } from '../content/demeanor';
import {
  LIFE_EVENTS,
  type EventPolarity,
  type LifeEventEntry,
} from '../content/lifeEvents';
import { PROFESSIONS, PROFESSION_TEXT, type ProfessionEntry } from '../content/professions';
import type { Rng } from './rng';
import { CAPTAIN_GEN } from './tuning';
import type { AttributeKey, Character, SkillKey, TraitKey } from './types';

export type EventSeverity =
  | 'minor'
  | 'moderate'
  | 'major'
  | 'transformative'
  | 'catastrophic';

export interface RolledLifeEvent {
  id: string;
  text: string;
  polarity: EventPolarity;
  category: string;
  severity: EventSeverity;
}

export interface LifeStory {
  age: number;
  profession: ProfessionEntry;
  /** The working life, said in the voice the rest of the history uses. */
  professionText: string;
  events: RolledLifeEvent[];
  /** Credits the history leaves them holding, positive or negative. */
  creditsDelta: number;
  skillBias: Partial<Record<SkillKey, number>>;
  attributeBias: Partial<Record<AttributeKey, number>>;
}

// ---------------------------------------------------------------------------
// Age
// ---------------------------------------------------------------------------

/** A captain's age, spread across the six bands rather than clustered. */
export function rollCaptainAge(rng: Rng): number {
  const band = rng.weighted(
    CAPTAIN_GEN.ageBands.map((b) => ({ value: b, weight: b.weight })),
  );
  return rng.int(band.min, band.max);
}

// ---------------------------------------------------------------------------
// The story
// ---------------------------------------------------------------------------

function addBias<K extends string>(
  target: Partial<Record<K, number>>,
  source: Partial<Record<K, number>>,
  scale: number,
): void {
  for (const [key, value] of Object.entries(source)) {
    const k = key as K;
    target[k] = (target[k] ?? 0) + Math.round((value as number) * scale);
  }
}

/**
 * Roll a whole life. Deterministic for a given rng position, like everything
 * else in generation.
 */
export function rollLifeStory(rng: Rng, age: number): LifeStory {
  // -- The work ------------------------------------------------------------
  const plausible = PROFESSIONS.filter((p) => p.minAge <= age);
  const profession = rng.pick(plausible.length > 0 ? plausible : PROFESSIONS);
  const templates = PROFESSION_TEXT[profession.category];
  const professionText = rng
    .pick(templates)
    .replace('{p}', articled(profession.name));

  // -- What happened -------------------------------------------------------
  const eligible = LIFE_EVENTS.filter((e) => e.minAge <= age);
  const pool = eligible.length >= CAPTAIN_GEN.eventCount ? eligible : LIFE_EVENTS;
  const events: RolledLifeEvent[] = [];
  const usedCategories = new Set<string>();
  let creditsDelta = 0;

  const skillBias: Partial<Record<SkillKey, number>> = {};
  const attributeBias: Partial<Record<AttributeKey, number>> = {};

  // Two events from different areas of a life, so a captain is not defined
  // twice over by the same kind of thing.
  for (let taken = 0; taken < CAPTAIN_GEN.eventCount; taken += 1) {
    const fresh = pool.filter((e) => !usedCategories.has(e.category));
    const entry: LifeEventEntry = rng.pick(fresh.length > 0 ? fresh : pool);
    usedCategories.add(entry.category);

    const severity = rng.weighted(
      CAPTAIN_GEN.severityWeights.map((s) => ({ value: s.value, weight: s.weight })),
    ) as EventSeverity;
    const scale = CAPTAIN_GEN.severityScale[severity] ?? 1;

    addBias(skillBias, entry.skillBias, scale);
    addBias(attributeBias, entry.attributeBias, scale);
    creditsDelta += entry.money * CAPTAIN_GEN.eventCredits * scale;

    events.push({
      id: entry.id,
      text: entry.text,
      polarity: entry.polarity,
      category: entry.category,
      severity,
    });
  }

  addBias(skillBias, profession.skillBias, 1);
  addBias(attributeBias, profession.attributeBias, 1);

  return {
    age,
    profession,
    professionText,
    events,
    creditsDelta: Math.round(creditsDelta),
    skillBias,
    attributeBias,
  };
}

/** "a Field Medic" / "an Emergency Physician", lowercased for a fragment. */
function articled(name: string): string {
  const lower = name.toLowerCase();
  return /^[aeiou]/.test(lower) ? `an ${lower}` : `a ${lower}`;
}

// ---------------------------------------------------------------------------
// Demeanor — the words a person is described with
// ---------------------------------------------------------------------------

/**
 * Pick the words that describe this person.
 *
 * These are not a second personality system. Almost every word is an
 * expression of a hidden trait the character already carries, or of an
 * attribute sitting unusually high or low. The trait engine still decides
 * behaviour; this decides what the player reads.
 */
export function rollDemeanor(
  rng: Rng,
  traits: TraitKey[],
  attributes: Record<AttributeKey, number>,
): string[] {
  const wanted = rng.weighted(
    CAPTAIN_GEN.demeanorCountWeights.map((c) => ({ value: c.value, weight: c.weight })),
  );

  const traitSet = new Set<TraitKey>(traits);
  const fromTraits = DEMEANOR.filter((d) => d.expresses && traitSet.has(d.expresses));
  const fromAttributes = DEMEANOR.filter((d) => matchesAttribute(d, attributes));

  const chosen: DemeanorEntry[] = [];
  const taken = new Set<string>();
  const take = (entry: DemeanorEntry | undefined): void => {
    if (!entry || taken.has(entry.id)) return;
    // One word per group, so a temperament does not read as a thesaurus entry.
    if (chosen.some((c) => c.group === entry.group)) return;
    taken.add(entry.id);
    chosen.push(entry);
  };

  // The traits they actually have come first, each contributing at most one
  // word, so every hidden trait is visible in the description somewhere.
  for (const trait of traits) {
    const candidates = fromTraits.filter((d) => d.expresses === trait && !taken.has(d.id));
    if (candidates.length > 0) take(rng.pick(candidates));
    if (chosen.length >= wanted) break;
  }

  // Then the attributes that stand out, strongest leaning first.
  const leanings = [...fromAttributes].sort(
    (a, b) => leanStrength(b, attributes) - leanStrength(a, attributes),
  );
  for (const entry of leanings) {
    if (chosen.length >= wanted) break;
    take(entry);
  }

  // If the person is unremarkable enough that neither produced enough words,
  // fill from the groups already in play so the result still reads as one
  // person rather than a scatter.
  while (chosen.length < wanted) {
    const rest = DEMEANOR.filter(
      (d) => !taken.has(d.id) && !chosen.some((c) => c.group === d.group),
    );
    if (rest.length === 0) break;
    take(rng.pick(rest));
  }

  return chosen.slice(0, wanted).map((d) => d.label);
}

function matchesAttribute(
  entry: DemeanorEntry,
  attributes: Record<AttributeKey, number>,
): boolean {
  if (!entry.attribute || !entry.direction) return false;
  const value = attributes[entry.attribute];
  return entry.direction === 'high'
    ? value >= CAPTAIN_GEN.demeanorHigh
    : value <= CAPTAIN_GEN.demeanorLow;
}

function leanStrength(
  entry: DemeanorEntry,
  attributes: Record<AttributeKey, number>,
): number {
  if (!entry.attribute || !entry.direction) return -1;
  const value = attributes[entry.attribute];
  return entry.direction === 'high'
    ? value - CAPTAIN_GEN.demeanorHigh
    : CAPTAIN_GEN.demeanorLow - value;
}

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------

export const SEVERITY_LABELS: Record<EventSeverity, string> = {
  minor: 'Minor',
  moderate: 'Moderate',
  major: 'Major',
  transformative: 'Transformative',
  catastrophic: 'Catastrophic',
};

export const POLARITY_LABELS: Record<EventPolarity, string> = {
  positive: 'Went well',
  negative: 'Went badly',
  mixed: 'Cut both ways',
};

/** The two events a character carries, ready to show. Empty for anyone generated
 *  before this library existed, or by the ordinary recruit generator. */
export function lifeEventsOf(character: Character): RolledLifeEvent[] {
  return character.lifeEvents ?? [];
}

/**
 * What the history left in their pocket.
 *
 * Only the handful of events that are explicitly about money move this, scaled
 * by how hard the event hit. A windfall in the past is a head start and some
 * colour, never a run handed over at the door.
 */
export function startingCreditsDelta(character: Character): number {
  let total = 0;
  for (const rolled of lifeEventsOf(character)) {
    const entry = LIFE_EVENTS.find((e) => e.id === rolled.id);
    if (!entry || entry.money === 0) continue;
    const scale = CAPTAIN_GEN.severityScale[rolled.severity] ?? 1;
    total += entry.money * CAPTAIN_GEN.eventCredits * scale;
  }
  return Math.round(total);
}

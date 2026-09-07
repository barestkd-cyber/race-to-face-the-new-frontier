/**
 * Character generation.
 *
 * Order matters: coherent facet tendencies first, then attributes distributed
 * against those tendencies, then skill potential, then skills from life history
 * and exposure bands, then hidden traits. There is no Attribute Potential.
 */

import { LIFE_PATHS, NAME_TABLES } from '../content/lifepaths';
import { EARTH_FEMALE_GIVEN, EARTH_MALE_GIVEN, EARTH_SURNAMES } from '../content/names';
import type { CareerEntry, LifePathEntry } from '../content/contentTypes';
import { skillCap } from './check';
import { rollCaptainAge, rollLifeStory } from './lifeStory';
import { rollPersonality } from './personality';
import type { Rng } from './rng';
import {
  ATTRIBUTE_GEN,
  HEALTH,
  INVENTORY,
  MIN_WORKING_AGE,
  POTENTIAL_CAP,
  SKILLS_TUNING,
  SPEC,
  TRAITS_TUNING,
} from './tuning';
import {
  ATTRIBUTE_KEYS,
  FACETS,
  SKILL_KEYS,
  type AttributeKey,
  type Attributes,
  type Character,
  type CharacterId,
  type CharacterRole,
  type ExposureBand,
  type FamilyRelation,
  type FacetKey,
  type LifeHistory,
  type PotentialGrade,
  type RecruitVenue,
  type SkillKey,
  type SkillMap,
  type SkillPotentialMap,
  type TraitEffect,
} from './types';

// ---------------------------------------------------------------------------
// Bias accumulation from life history
// ---------------------------------------------------------------------------

export interface GenerationBias {
  skill: Partial<Record<SkillKey, number>>;
  attribute: Partial<Record<AttributeKey, number>>;
  trait: Partial<Record<TraitEffect, number>>;
}

function emptyBias(): GenerationBias {
  return { skill: {}, attribute: {}, trait: {} };
}

function mergeBias(target: GenerationBias, entry: LifePathEntry): void {
  for (const [k, v] of Object.entries(entry.skillBias ?? {})) {
    const key = k as SkillKey;
    target.skill[key] = (target.skill[key] ?? 0) + (v as number);
  }
  for (const [k, v] of Object.entries(entry.attributeBias ?? {})) {
    const key = k as AttributeKey;
    target.attribute[key] = (target.attribute[key] ?? 0) + (v as number);
  }
  for (const [k, v] of Object.entries(entry.traitBias ?? {})) {
    const key = k as TraitEffect;
    target.trait[key] = (target.trait[key] ?? 0) + (v as number);
  }
}

// ---------------------------------------------------------------------------
// Attributes
// ---------------------------------------------------------------------------

function rollAttributeTotal(rng: Rng): number {
  // Tapered toward the common band; extremes possible but uncommon.
  const inCommonBand = rng.percent(64);
  if (inCommonBand) {
    return rng.taperedInt(ATTRIBUTE_GEN.commonMin, ATTRIBUTE_GEN.commonMax, 3);
  }
  const low = rng.percent(50);
  return low
    ? rng.taperedInt(ATTRIBUTE_GEN.absoluteMin, ATTRIBUTE_GEN.commonMin - 1, ATTRIBUTE_GEN.taperRolls)
    : rng.taperedInt(
        ATTRIBUTE_GEN.commonMax + 1,
        ATTRIBUTE_GEN.absoluteMax,
        ATTRIBUTE_GEN.taperRolls,
      );
}

/**
 * Distribute `total` across the 18 attributes using per-facet tendencies so a
 * character reads as a coherent person rather than 18 independent rolls.
 */
export function generateAttributes(
  rng: Rng,
  bias: GenerationBias,
  totalOverride?: number,
): { attributes: Attributes; total: number; playerPoints: number } {
  const total = totalOverride ?? rollAttributeTotal(rng);

  // 90% procedurally assigned, 10% reserved for player allocation.
  const playerPoints = Math.round(total * ATTRIBUTE_GEN.playerAllocationFraction);
  const proceduralTotal = total - playerPoints;

  // Facet tendencies: each facet gets a multiplier around 1.0.
  const facetTendency = {} as Record<FacetKey, number>;
  for (const facet of Object.keys(FACETS) as FacetKey[]) {
    facetTendency[facet] = 1 + (rng.next() - 0.5) * (ATTRIBUTE_GEN.facetSpread / 4);
  }

  // Raw weights per attribute = facet tendency + jitter + life-history bias.
  const weights = {} as Record<AttributeKey, number>;
  for (const facet of Object.keys(FACETS) as FacetKey[]) {
    for (const key of FACETS[facet].attributes) {
      const jitter = (rng.next() - 0.5) * (ATTRIBUTE_GEN.attributeJitter / 4);
      const biasValue = (bias.attribute[key] ?? 0) * 0.08;
      weights[key] = Math.max(0.12, facetTendency[facet] + jitter + biasValue);
    }
  }

  const attributes = distributeToAttributes(weights, proceduralTotal, rng);
  return { attributes, total, playerPoints };
}

/** Scale weights to hit an exact total while respecting the 0..15 clamp. */
function distributeToAttributes(
  weights: Record<AttributeKey, number>,
  total: number,
  rng: Rng,
): Attributes {
  const max = ATTRIBUTE_GEN.maxPerAttribute;
  const keys = [...ATTRIBUTE_KEYS];
  const weightSum = keys.reduce((sum, k) => sum + weights[k], 0);

  const attributes = {} as Attributes;
  for (const key of keys) {
    const share = (weights[key] / weightSum) * total;
    attributes[key] = Math.max(0, Math.min(max, Math.round(share)));
  }

  // Repair rounding and clamp drift so the total lands exactly.
  let current = keys.reduce((sum, k) => sum + attributes[k], 0);
  let guard = 0;
  while (current !== total && guard < 2000) {
    guard++;
    const needUp = current < total;
    const candidates = keys.filter((k) =>
      needUp ? attributes[k] < max : attributes[k] > 0,
    );
    if (candidates.length === 0) break;
    // Bias the adjustment toward heavier-weighted attributes when adding.
    const pick = needUp
      ? rng.weighted(candidates.map((k) => ({ value: k, weight: weights[k] })))
      : rng.weighted(candidates.map((k) => ({ value: k, weight: 1 / weights[k] })));
    attributes[pick] += needUp ? 1 : -1;
    current += needUp ? 1 : -1;
  }

  return attributes;
}

export function attributeTotal(attributes: Attributes): number {
  return ATTRIBUTE_KEYS.reduce((sum, k) => sum + attributes[k], 0);
}

// ---------------------------------------------------------------------------
// Skill potential
// ---------------------------------------------------------------------------

export function generatePotential(rng: Rng, bias: GenerationBias): SkillPotentialMap {
  const grades = {} as Record<SkillKey, PotentialGrade>;
  const gw = SKILLS_TUNING.gradeWeights;

  for (const skill of SKILL_KEYS) {
    // Life-history bias nudges a skill toward a better ceiling.
    const b = bias.skill[skill] ?? 0;
    grades[skill] = rng.weighted<PotentialGrade>([
      { value: 'C', weight: Math.max(1, gw.C - b * 1.6) },
      { value: 'B', weight: gw.B + b * 0.9 },
      { value: 'A', weight: gw.A + b * 0.8 },
    ]);
  }

  // Knowledge specialization is NOT dealt here. Grades are fate; study is
  // will. Every character starts at x1.00 and marks are placed separately —
  // by the life already lived for people you meet, by the player for the
  // protagonist, one commitment at a time, along the way.
  const map = {} as SkillPotentialMap;
  for (const skill of SKILL_KEYS) {
    map[skill] = { grade: grades[skill], specialization: 1 };
  }
  return map;
}


/**
 * Where a life would have pointed its study: strong bias and high ceilings
 * first, lightly shuffled so identical careers do not clone each other.
 */
function rankSpecPreference(
  rng: Rng,
  bias: GenerationBias,
  potential: SkillPotentialMap,
): SkillKey[] {
  const ranked = [...SKILL_KEYS].sort((a, b) => {
    const g = (k: SkillKey) =>
      potential[k].grade === 'A' ? 8 : potential[k].grade === 'B' ? 4 : 0;
    return (bias.skill[b] ?? 0) + g(b) - ((bias.skill[a] ?? 0) + g(a));
  });
  return rng.shuffle(ranked.slice(0, 10)).concat(ranked.slice(10));
}

/**
 * Auto-place part of the budget for a character who already lived their
 * commitments. Seniority decides how much specialization is already earned: an old
 * professional arrives fully specialised, a young dockhand arrives with marks
 * still open — open marks the captain can later direct.
 */
export function autoPlaceSpecializations(
  rng: Rng,
  potential: SkillPotentialMap,
  bias: GenerationBias,
  age: number,
): void {
  const seniority = Math.max(0, Math.min(1, (age - SPEC.autoAgeFloor) / SPEC.autoAgeSpan));
  const depth = Math.max(
    0,
    Math.min(1, SPEC.autoBaseFraction + seniority * (1 - SPEC.autoBaseFraction) + rng.float(-0.15, 0.15)),
  );

  // A career's worth of study, expressed as rungs climbed. Six focuses fully
  // developed is 2/2/2 across the top three rungs.
  const ladder: number[] = [1.2, 1.2, 1.15, 1.15, 1.1, 1.1];
  const climbed = Math.round(ladder.length * depth);

  const preference = rankSpecPreference(rng, bias, potential);
  let placed = 0;
  for (const skill of preference) {
    if (placed >= climbed) break;
    if (potential[skill].specialization > 1) continue;
    potential[skill] = { ...potential[skill], specialization: ladder[placed]! };
    placed += 1;
  }
}

// ---------------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------------

/**
 * How much of a craft this person was ever exposed to.
 *
 * Two layers, in this order:
 *
 *   1. The population baseline for THAT skill — surgery is rare, cooking is
 *      not, and nobody is truly at zero with people.
 *   2. Their life history — career, upbringing and formative events push the
 *      bands that fit the life they actually lived.
 *
 * Potential deliberately plays no part here. How far somebody could develop a
 * craft says nothing about whether they were ever near one.
 */
function rollExposure(rng: Rng, skill: SkillKey, bias: number): ExposureBand {
  const profile =
    SKILLS_TUNING.exposureProfiles[skill] ??
    ([
      SKILLS_TUNING.exposureWeights.none,
      SKILLS_TUNING.exposureWeights.familiar,
      SKILLS_TUNING.exposureWeights.trained,
      SKILLS_TUNING.exposureWeights.professional,
      SKILLS_TUNING.exposureWeights.exceptional,
    ] as [number, number, number, number, number]);

  const b = Math.max(0, bias);
  return rng.weighted<ExposureBand>([
    { value: 'none', weight: profile[0] / (1 + b / 6) },
    { value: 'familiar', weight: profile[1] * (1 + b / 40) },
    { value: 'trained', weight: profile[2] * (1 + b / 16) },
    { value: 'professional', weight: profile[3] * (1 + b / 10) },
    { value: 'exceptional', weight: profile[4] * (1 + b / 8) },
  ]);
}

export function generateSkills(
  rng: Rng,
  potential: SkillPotentialMap,
  bias: GenerationBias,
): { skills: SkillMap; exposure: Record<SkillKey, ExposureBand> } {
  const skills = {} as SkillMap;
  const exposure = {} as Record<SkillKey, ExposureBand>;

  for (const skill of SKILL_KEYS) {
    const band = rollExposure(rng, skill, bias.skill[skill] ?? 0);
    exposure[skill] = band;
    const [lo, hi] = SKILLS_TUNING.exposureRanges[band];
    // Potential does not decide whether they were exposed — only how well the
    // exposure took. A natural sits higher inside the same band.
    const gradeLift = potential[skill].grade === 'A' ? 0.18 : potential[skill].grade === 'B' ? 0.09 : 0;
    const rolled = band === 'none' ? 0 : rng.taperedInt(lo, hi, 2);
    const value =
      rolled === 0 ? 0 : Math.round(rolled + (hi - rolled) * gradeLift);
    // Raw training is bounded by potential alone; specialization multiplies
    // performance later and never lifts this ceiling.
    const cap = POTENTIAL_CAP[potential[skill].grade];
    skills[skill] = Math.max(0, Math.min(cap, value));
  }

  return { skills, exposure };
}

/**
 * Spend free skill points automatically, favouring skills the character already
 * shows aptitude for. Used for NPCs; the protagonist allocates by hand.
 */
export function autoAllocateSkillPoints(
  character: Character,
  points: number,
  bias: GenerationBias,
  rng: Rng,
): void {
  let remaining = points;
  const ranked = [...SKILL_KEYS].sort((a, b) => {
    const aScore = character.skills[a] + (bias.skill[a] ?? 0) * 2;
    const bScore = character.skills[b] + (bias.skill[b] ?? 0) * 2;
    return bScore - aScore;
  });
  // Concentrate on the top handful so recruits read as specialists.
  const focus = ranked.slice(0, 6);
  let guard = 0;
  while (remaining > 0 && guard < 500) {
    guard++;
    const skill = rng.weighted(
      focus.map((s, i) => ({ value: s, weight: focus.length - i })),
    );
    const cap = skillCap(character, skill);
    if (character.skills[skill] >= cap) {
      if (focus.every((s) => character.skills[s] >= skillCap(character, s))) break;
      continue;
    }
    character.skills[skill] += 1;
    remaining -= 1;
  }
}

// ---------------------------------------------------------------------------
// Traits
//
// There is nothing here any more. Personality is rolled once, from the
// canonical library, by engine/personality.ts. The `traitBias` the life paths
// carry still steers it — it names behaviours now rather than a second set of
// trait keys, so a machinist's life still produces patient, stubborn people.
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// Derived values
// ---------------------------------------------------------------------------

export function deriveMaxHealth(attributes: Attributes): number {
  return Math.round(
    HEALTH.base +
      attributes.endurance * HEALTH.enduranceFactor +
      attributes.strength * HEALTH.strengthFactor,
  );
}

export function rollBackpackSlots(rng: Rng): number {
  const band = rng.weighted(
    INVENTORY.slotWeights.map((b) => ({ value: b, weight: b.weight })),
  );
  return rng.int(band.min, band.max);
}

// ---------------------------------------------------------------------------
// Life history
// ---------------------------------------------------------------------------

export interface LifeHistoryRoll {
  history: LifeHistory;
  bias: GenerationBias;
  career: CareerEntry;
}

function weightedEntry<T extends LifePathEntry>(rng: Rng, entries: T[]): T {
  return rng.weighted(entries.map((e) => ({ value: e, weight: e.weight ?? 10 })));
}

export function generateLifeHistory(rng: Rng, venue?: RecruitVenue): LifeHistoryRoll {
  const bias = emptyBias();

  const origin = weightedEntry(rng, LIFE_PATHS.origins);
  const upbringing = weightedEntry(rng, LIFE_PATHS.upbringings);

  // A recruitment venue biases which careers show up there.
  const careerPool = venue
    ? LIFE_PATHS.careers.filter((c) => c.venues?.includes(venue))
    : LIFE_PATHS.careers;
  const career = weightedEntry(
    rng,
    careerPool.length > 0 ? careerPool : LIFE_PATHS.careers,
  );

  const formative = weightedEntry(rng, LIFE_PATHS.formativeEvents);

  mergeBias(bias, origin);
  mergeBias(bias, upbringing);
  mergeBias(bias, career);
  mergeBias(bias, formative);

  const history: LifeHistory = {
    origin: origin.label,
    upbringing: upbringing.label,
    career: career.label,
    formativeEvent: formative.label,
    notes: [origin.text, upbringing.text, career.text, formative.text],
  };

  return { history, bias, career };
}

// ---------------------------------------------------------------------------
// Full character construction
// ---------------------------------------------------------------------------

let idCounter = 0;

export function nextCharacterId(prefix = 'chr'): CharacterId {
  idCounter += 1;
  return `${prefix}_${idCounter.toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/** Deterministic id for generation that must be reproducible from a seed. */
export function seededCharacterId(rng: Rng, prefix = 'chr'): CharacterId {
  return `${prefix}_${rng.int(0, 0xffffff).toString(36)}${rng.int(0, 0xffffff).toString(36)}`;
}

export interface CreateCharacterOptions {
  rng: Rng;
  isPlayer?: boolean;
  /**
   * Roll this person from the captain generation library — the wider age
   * spread, one of 250 working lives, two influential events out of 500, and
   * the words those add up to. Recruits and family keep the ordinary life-path
   * generator, which knows about recruitment venues.
   */
  captainLibrary?: boolean;
  role?: CharacterRole;
  venue?: RecruitVenue;
  ageRange?: [number, number];
  /** Free skill points spent automatically. Protagonist spends them manually. */
  freeSkillPoints?: number;
  /** Force an attribute total, used for family members and set pieces. */
  attributeTotal?: number;
  surname?: string;
  aboard?: boolean;
}

export function createCharacter(options: CreateCharacterOptions): Character {
  const { rng } = options;
  const { history, bias, career } = generateLifeHistory(rng, options.venue);

  // The captain's age is rolled first, because their whole history is gated on
  // it: no chief engineers at nineteen, no grandchildren at twenty-two.
  const libraryAge = options.captainLibrary ? rollCaptainAge(rng) : null;
  const story = libraryAge !== null ? rollLifeStory(rng, libraryAge) : null;
  if (story) {
    // The working life and the two events replace the life-path career and
    // formative event; origin and upbringing stay exactly as they were.
    mergeBias(bias, {
      id: story.profession.id,
      label: story.profession.name,
      text: story.professionText,
      skillBias: story.skillBias,
      attributeBias: story.attributeBias,
    });
    history.career = story.profession.name;
    history.formativeEvent = story.events[0]?.category ?? history.formativeEvent;
    history.notes = [history.notes[0]!, history.notes[1]!, story.professionText];
  }

  const { attributes, playerPoints } = generateAttributes(rng, bias, options.attributeTotal);
  const potential = generatePotential(rng, bias);

  // Sex first, so the name can match the person rather than being drawn from
  // one undifferentiated pool and landing wherever.
  const sex: 'male' | 'female' = rng.chance(0.5) ? 'male' : 'female';
  const given = rng.pick(sex === 'male' ? EARTH_MALE_GIVEN : EARTH_FEMALE_GIVEN);
  const surname = options.surname ?? rng.pick(EARTH_SURNAMES);
  const ageRange = options.ageRange ?? [21, 56];
  const age = libraryAge ?? rng.taperedInt(ageRange[0], ageRange[1], 2);

  // Specialization is earned, never dealt. The protagonist starts with nothing on
  // the ladder and climbs it in play; people met along the way arrive with as
  // much of a career behind them as their age justifies. Skills roll AFTER
  // placement so a lifelong surgeon can sit above the plain grade cap.
  if (!options.isPlayer) {
    autoPlaceSpecializations(rng, potential, bias, age);
  }

  const { skills } = generateSkills(rng, potential, bias);

  const maxHealth = deriveMaxHealth(attributes);

  const character: Character = {
    id: seededCharacterId(rng, options.isPlayer ? 'pc' : 'chr'),
    name: given,
    surname,
    age,
    sex,
    portraitSeed: rng.int(0, 0xffffff),
    role: options.role ?? career.role,
    attributes,
    skills,
    potential,
    traits: [],
    traitKnowledge: [],
    health: maxHealth,
    maxHealth,
    wounds: [],
    stress: rng.int(0, 22),
    rested: rng.int(62, 100),
    hungerDays: 0,
    alive: true,
    personalXp: 0,
    lifeHistory: history,
    ...(story
      ? {
          profession: story.profession.name,
          professionId: story.profession.id,
          lifeEvents: story.events,
        }
      : {}),
    relationships: {},
    equipment: {},
    backpackSlots: rollBackpackSlots(rng),
    backpack: [],
    isPlayer: options.isPlayer ?? false,
    aboard: options.aboard ?? true,
  };

  // The protagonist keeps their allocation pool for the character-gen screen;
  // everyone else has it spent for them so they arrive fully formed.
  if (!options.isPlayer) {
    spendAttributePoints(character, playerPoints, bias, rng);
    autoAllocateSkillPoints(
      character,
      options.freeSkillPoints ?? SKILLS_TUNING.recruitFreeSkillPoints,
      bias,
      rng,
    );
  }

  // Personality last, so it is rolled against the attributes this person
  // actually ends up with. A word like Hesitant should never sit on a sheet
  // that says otherwise.
  character.traits = rollPersonality(rng, character.attributes, bias.trait);
  character.traitKnowledge = character.traits.map((trait) => ({
    trait,
    known: 0 as const,
    evidence: 0,
  }));

  return character;
}

/** Spend the reserved 10% attribute allocation automatically. */
export function spendAttributePoints(
  character: Character,
  points: number,
  bias: GenerationBias,
  rng: Rng,
): void {
  let remaining = points;
  const max = ATTRIBUTE_GEN.maxPerAttribute;
  const ranked = [...ATTRIBUTE_KEYS].sort(
    (a, b) =>
      character.attributes[b] +
      (bias.attribute[b] ?? 0) * 2 -
      (character.attributes[a] + (bias.attribute[a] ?? 0) * 2),
  );
  const focus = ranked.slice(0, 7);
  let guard = 0;
  while (remaining > 0 && guard < 800) {
    guard++;
    const candidates = focus.filter((k) => character.attributes[k] < max);
    if (candidates.length === 0) break;
    const key = rng.weighted(
      candidates.map((k, i) => ({ value: k, weight: candidates.length - i })),
    );
    character.attributes[key] += 1;
    remaining -= 1;
  }
  character.maxHealth = deriveMaxHealth(character.attributes);
  character.health = character.maxHealth;
}

// ---------------------------------------------------------------------------
// Protagonist draft — the character-gen screen works on this before committing
// ---------------------------------------------------------------------------

export interface ProtagonistDraft {
  character: Character;
  bias: GenerationBias;
  attributePoints: number;
  skillPoints: number;
  /** Snapshot taken before allocation so the player can reset. */
  baseAttributes: Attributes;
  baseSkills: SkillMap;
}

export function generateProtagonistDraft(rng: Rng): ProtagonistDraft {
  // The captain is the one person rolled from the full generation library.
  const character = createCharacter({
    rng,
    isPlayer: true,
    role: 'captain',
    captainLibrary: true,
  });
  const { bias } = generateLifeHistory(rng);
  const total = attributeTotal(character.attributes);
  const attributePoints = Math.round(
    (total / (1 - ATTRIBUTE_GEN.playerAllocationFraction)) *
      ATTRIBUTE_GEN.playerAllocationFraction,
  );

  return {
    character,
    bias,
    attributePoints,
    skillPoints: SKILLS_TUNING.protagonistFreeSkillPoints,
    baseAttributes: { ...character.attributes },
    baseSkills: { ...character.skills },
  };
}

// ---------------------------------------------------------------------------
// Family and recruits
// ---------------------------------------------------------------------------

/**
 * Family, generated person by person.
 *
 * Each possible relative is asked separately: does this person exist at all?
 * That produces a family that feels like a real one — some people have three
 * siblings and no living grandparents, some have a large extended family, some
 * have almost nobody left. Nothing is a fixed roster.
 *
 * MINIMUM AGE 13. This is a survival expedition, not a place for small
 * children: anyone younger simply is not generated as a character. If younger
 * children exist in the fiction, they are narration, never a Character.
 */
export function generateFamily(rng: Rng, protagonist: Character): Character[] {
  const family: Character[] = [];
  const age = protagonist.age;

  /** One candidate relative: whether they exist, and how old they would be. */
  interface Candidate {
    relation: FamilyRelation;
    chance: number;
    ageRange: [number, number];
    /** Skipped entirely when the age arithmetic does not work. */
    plausible?: boolean;
  }

  // A child must be at least 13, so the protagonist has to be old enough to
  // plausibly have one. Below that the relation simply does not come up.
  const canHaveChild = age - 13 >= 17;
  const childAgeHigh = Math.max(13, age - 17);

  const candidates: Candidate[] = [
    // Parents — likely, but this is a world that has been killing people.
    { relation: 'mother', chance: 0.66, ageRange: [age + 19, age + 36] },
    { relation: 'father', chance: 0.6, ageRange: [age + 21, age + 40] },

    // Grandparents — progressively less likely with the protagonist's age.
    { relation: 'maternalGrandmother', chance: age < 34 ? 0.34 : 0.16, ageRange: [age + 44, age + 62] },
    { relation: 'maternalGrandfather', chance: age < 34 ? 0.26 : 0.11, ageRange: [age + 46, age + 66] },
    { relation: 'paternalGrandmother', chance: age < 34 ? 0.3 : 0.14, ageRange: [age + 44, age + 62] },
    { relation: 'paternalGrandfather', chance: age < 34 ? 0.22 : 0.09, ageRange: [age + 46, age + 66] },

    // Siblings — the first is common, each further one less so.
    { relation: 'brother', chance: 0.44, ageRange: [Math.max(13, age - 12), age + 12] },
    { relation: 'brother', chance: 0.2, ageRange: [Math.max(13, age - 14), age + 14] },
    { relation: 'brother', chance: 0.07, ageRange: [Math.max(13, age - 16), age + 16] },
    { relation: 'sister', chance: 0.44, ageRange: [Math.max(13, age - 12), age + 12] },
    { relation: 'sister', chance: 0.2, ageRange: [Math.max(13, age - 14), age + 14] },
    { relation: 'sister', chance: 0.07, ageRange: [Math.max(13, age - 16), age + 16] },

    // A partner, and children old enough to be their own person.
    { relation: 'partner', chance: 0.34, ageRange: [Math.max(19, age - 8), age + 9] },
    { relation: 'son', chance: 0.22, ageRange: [13, childAgeHigh], plausible: canHaveChild },
    { relation: 'daughter', chance: 0.22, ageRange: [13, childAgeHigh], plausible: canHaveChild },

    // Extended family — common to exist, less often close.
    { relation: 'cousin', chance: 0.4, ageRange: [Math.max(13, age - 15), age + 15] },
    { relation: 'cousin', chance: 0.24, ageRange: [Math.max(13, age - 18), age + 18] },
    { relation: 'cousin', chance: 0.12, ageRange: [Math.max(13, age - 20), age + 20] },
    { relation: 'niece', chance: 0.2, ageRange: [13, Math.max(13, age - 4)] },
    { relation: 'nephew', chance: 0.2, ageRange: [13, Math.max(13, age - 4)] },
  ];

  for (const candidate of candidates) {
    if (candidate.plausible === false) continue;
    if (!rng.chance(candidate.chance)) continue;

    const [lo, hi] = candidate.ageRange;
    if (hi < MIN_WORKING_AGE) continue;
    const ageRange: [number, number] = [Math.max(MIN_WORKING_AGE, lo), Math.max(MIN_WORKING_AGE + 1, hi)];

    // A partner rarely shares the surname; blood relatives usually do.
    const sharesName =
      candidate.relation === 'partner' ? rng.chance(0.25) : rng.chance(0.82);

    const member = createCharacter({
      rng,
      ageRange,
      surname: sharesName ? protagonist.surname : undefined,
      aboard: false,
      role: 'crew',
    });

    member.aboard = false;
    member.familyRelation = candidate.relation;

    // Closeness varies by how near the relation is — a cousin is not a sibling.
    const closeBand: [number, number] =
      candidate.relation === 'partner'
        ? [55, 95]
        : ['mother', 'father', 'son', 'daughter'].includes(candidate.relation)
          ? [40, 90]
          : ['brother', 'sister'].includes(candidate.relation)
            ? [32, 85]
            : [10, 60];

    const closeness = rng.int(closeBand[0], closeBand[1]);
    member.relationships[protagonist.id] = {
      value: closeness,
      familiarity: rng.int(60, 100),
      kind: candidate.relation === 'partner' ? 'partner' : 'family',
    };
    protagonist.relationships[member.id] = {
      value: closeness,
      familiarity: rng.int(60, 100),
      kind: candidate.relation === 'partner' ? 'partner' : 'family',
    };

    // Family are known people — their traits start partly visible.
    for (const tk of member.traitKnowledge) {
      tk.known = rng.chance(0.55) ? 2 : 1;
      tk.evidence = TRAITS_TUNING.evidenceForKnown;
    }

    family.push(member);
  }

  return family;
}

export function generateRecruit(
  rng: Rng,
  venue: RecruitVenue,
  options: { crisis?: boolean } = {},
): Character {
  const recruit = createCharacter({
    rng,
    venue,
    aboard: false,
    freeSkillPoints: SKILLS_TUNING.recruitFreeSkillPoints + (options.crisis ? 2 : 0),
  });
  recruit.aboard = false;
  return recruit;
}

// ---------------------------------------------------------------------------
// Helpers used across the engine
// ---------------------------------------------------------------------------

export function fullName(character: Character): string {
  return `${character.name} ${character.surname}`.trim();
}

export function shortName(character: Character): string {
  return character.name;
}

export function subjectPronoun(character: Character): string {
  return character.sex === 'female' ? 'she' : 'he';
}

export function objectPronoun(character: Character): string {
  return character.sex === 'female' ? 'her' : 'him';
}

export function possessivePronoun(character: Character): string {
  return character.sex === 'female' ? 'her' : 'his';
}

/** Third-person verb agreement. Kept so call sites need not care. */
export function isAre(_character: Character): string {
  return 'is';
}

/** How a character's sex reads on a sheet. */
export function sexLabel(character: Character): string {
  return character.sex === 'female' ? 'Female' : 'Male';
}

export function generateShipName(rng: Rng): string {
  return `${rng.pick(NAME_TABLES.shipPrefixes)} ${rng.pick(NAME_TABLES.shipNouns)}`;
}

// ---------------------------------------------------------------------------
// Auto-allocation
// ---------------------------------------------------------------------------

/**
 * Spend a draft's free points the way this person's life would have spent
 * them: weighted toward the background's biases and toward what they are
 * already good at. Exists so "accept the captain as dealt" is a real choice
 * and nobody is forced through 43 rows of arithmetic to start playing.
 *
 * Respects every cap the manual path respects. Mutates the draft in place.
 */
export function autoSpendDraft(draft: ProtagonistDraft, rng: Rng): void {
  const { character, bias } = draft;

  // Attributes: background pull, plus a mild preference for rounding out
  // anything dismal, the way a working adult compensates for weak spots.
  let attrBudget = draft.attributePoints - attributesSpent(draft);
  let guard = 0;
  while (attrBudget > 0 && guard++ < 200) {
    const options = ATTRIBUTE_KEYS.filter(
      (key) => character.attributes[key] < ATTRIBUTE_GEN.maxPerAttribute,
    );
    if (options.length === 0) break;
    const pick = rng.weighted(
      options.map((key) => ({
        value: key,
        weight:
          2 +
          (bias.attribute[key] ?? 0) * 2 +
          (character.attributes[key] <= 3 ? 2 : 0),
      })),
    );
    character.attributes[pick] += 1;
    attrBudget -= 1;
  }

  // Skills: double down where life already left something. Spreading one
  // point everywhere makes a character who is bad at everything.
  let skillBudget = draft.skillPoints - skillsSpent(draft);
  guard = 0;
  while (skillBudget > 0 && guard++ < 400) {
    const options = SKILL_KEYS.filter(
      (key) => character.skills[key] < skillCap(character, key),
    );
    if (options.length === 0) break;
    const pick = rng.weighted(
      options.map((key) => ({
        value: key,
        weight: 1 + (bias.skill[key] ?? 0) + character.skills[key] * 0.6,
      })),
    );
    character.skills[pick] += 1;
    skillBudget -= 1;
  }

  character.maxHealth = deriveMaxHealth(character.attributes);
  character.health = character.maxHealth;
}

function attributesSpent(draft: ProtagonistDraft): number {
  return ATTRIBUTE_KEYS.reduce(
    (sum, key) => sum + (draft.character.attributes[key] - draft.baseAttributes[key]),
    0,
  );
}

function skillsSpent(draft: ProtagonistDraft): number {
  return SKILL_KEYS.reduce(
    (sum, key) => sum + (draft.character.skills[key] - draft.baseSkills[key]),
    0,
  );
}

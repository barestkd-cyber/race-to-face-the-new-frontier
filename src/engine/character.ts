/**
 * Character generation.
 *
 * Order matters: coherent facet tendencies first, then attributes distributed
 * against those tendencies, then skill potential, then skills from life history
 * and exposure bands, then hidden traits. There is no Attribute Potential.
 */

import { LIFE_PATHS, NAME_TABLES } from '../content/lifepaths';
import type { CareerEntry, LifePathEntry } from '../content/contentTypes';
import { skillCap } from './check';
import type { Rng } from './rng';
import { ATTRIBUTE_GEN, HEALTH, INVENTORY, SKILLS_TUNING, SPEC, TRAITS_TUNING } from './tuning';
import {
  ATTRIBUTE_KEYS,
  FACETS,
  SKILL_KEYS,
  TRAIT_KEYS,
  type AttributeKey,
  type Attributes,
  type Character,
  type CharacterId,
  type CharacterRole,
  type ExposureBand,
  type FacetKey,
  type LifeHistory,
  type PotentialGrade,
  type RecruitVenue,
  type SkillKey,
  type SkillMap,
  type SkillPotentialMap,
  type TraitKey,
} from './types';

// ---------------------------------------------------------------------------
// Bias accumulation from life history
// ---------------------------------------------------------------------------

export interface GenerationBias {
  skill: Partial<Record<SkillKey, number>>;
  attribute: Partial<Record<AttributeKey, number>>;
  trait: Partial<Record<TraitKey, number>>;
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
    const key = k as TraitKey;
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

  // Knowledge specialization is NOT dealt here. Grades are fate; devotion is
  // will. Every character starts at x1.00 and marks are placed separately —
  // by the life already lived for people you meet, by the player for the
  // protagonist, one commitment at a time, along the way.
  const map = {} as SkillPotentialMap;
  for (const skill of SKILL_KEYS) {
    map[skill] = { grade: grades[skill], specialization: 1 };
  }
  return map;
}

/** The full budget of unplaced marks, strongest first. */
export function specializationBudget(): number[] {
  const budget: number[] = [];
  for (const tier of SKILLS_TUNING.specializationAllowance) {
    for (let i = 0; i < tier.count; i++) budget.push(tier.multiplier);
  }
  return budget.sort((a, b) => b - a);
}

/**
 * Where a life would have pointed its devotion: strong bias and high ceilings
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
 * commitments. Seniority decides how much of their devotion is spent: an old
 * professional arrives fully specialised, a young dockhand arrives with marks
 * still open — open marks the captain can later direct.
 */
export function autoPlaceSpecializations(
  rng: Rng,
  potential: SkillPotentialMap,
  bias: GenerationBias,
  age: number,
): { placedInto: SkillPotentialMap; remaining: number[] } {
  const budget = specializationBudget();
  const seniority = Math.max(0, Math.min(1, (age - SPEC.autoAgeFloor) / SPEC.autoAgeSpan));
  const fraction = Math.max(
    0,
    Math.min(1, SPEC.autoBaseFraction + seniority * (1 - SPEC.autoBaseFraction) + rng.float(-0.15, 0.15)),
  );
  const placeCount = Math.round(budget.length * fraction);

  const preference = rankSpecPreference(rng, bias, potential);
  let placed = 0;
  for (const skill of preference) {
    if (placed >= placeCount) break;
    if (potential[skill].specialization > 1) continue;
    potential[skill] = { ...potential[skill], specialization: budget[placed]! };
    placed += 1;
  }
  return { placedInto: potential, remaining: budget.slice(placed) };
}

// ---------------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------------

function rollExposure(rng: Rng, bias: number): ExposureBand {
  const w = SKILLS_TUNING.exposureWeights;
  const b = Math.max(0, bias);
  return rng.weighted<ExposureBand>([
    { value: 'none', weight: w.none / (1 + b / 6) },
    { value: 'familiar', weight: w.familiar * (1 + b / 40) },
    { value: 'trained', weight: w.trained * (1 + b / 16) },
    { value: 'professional', weight: w.professional * (1 + b / 10) },
    { value: 'exceptional', weight: w.exceptional * (1 + b / 8) },
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
    const band = rollExposure(rng, bias.skill[skill] ?? 0);
    exposure[skill] = band;
    const [lo, hi] = SKILLS_TUNING.exposureRanges[band];
    const value = band === 'none' ? 0 : rng.taperedInt(lo, hi, 2);
    const cap = Math.round(
      (SKILLS_TUNING.specializationRaisesCap
        ? potential[skill].specialization
        : 1) * (potential[skill].grade === 'A' ? 100 : potential[skill].grade === 'B' ? 85 : 70),
    );
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
// ---------------------------------------------------------------------------

const POSITIVE_TRAITS: TraitKey[] = [
  'loyal',
  'protective',
  'compassionate',
  'dutiful',
  'patient',
  'generous',
  'brave',
  'cooperative',
  'curious',
  'honest',
];

const NEGATIVE_TRAITS: TraitKey[] = [
  'vindictive',
  'reckless',
  'selfPreserving',
  'greedy',
  'jealous',
  'cowardly',
  'impulsive',
  'controlling',
  'suspicious',
  'alcoholic',
  'aggressive',
];

/** Traits that read either way depending on circumstance. */
const NEUTRAL_TRAITS: TraitKey[] = ['cautious', 'opportunistic', 'stubborn'];

export function generateTraits(rng: Rng, bias: GenerationBias): TraitKey[] {
  const count = rng.weighted(
    TRAITS_TUNING.countWeights.map((c) => ({ value: c.count, weight: c.weight })),
  );

  // An all-positive or all-negative set is possible but rare.
  const uniform = rng.chance(TRAITS_TUNING.uniformValenceChance);
  let pool: TraitKey[];
  if (uniform) {
    pool = rng.chance(0.5)
      ? [...POSITIVE_TRAITS, ...NEUTRAL_TRAITS]
      : [...NEGATIVE_TRAITS, ...NEUTRAL_TRAITS];
  } else {
    pool = [...TRAIT_KEYS];
  }

  const chosen: TraitKey[] = [];
  let guard = 0;
  while (chosen.length < count && guard < 200) {
    guard++;
    const candidates = pool.filter((t) => !chosen.includes(t) && !conflicts(t, chosen));
    if (candidates.length === 0) break;
    const pick = rng.weighted(
      candidates.map((t) => ({ value: t, weight: 1 + (bias.trait[t] ?? 0) * 1.5 })),
    );
    chosen.push(pick);
  }

  return chosen;
}

/** Keep obviously contradictory pairs off the same person. */
const TRAIT_CONFLICTS: [TraitKey, TraitKey][] = [
  ['brave', 'cowardly'],
  ['generous', 'greedy'],
  ['honest', 'opportunistic'],
  ['cautious', 'reckless'],
  ['cautious', 'impulsive'],
  ['patient', 'impulsive'],
  ['cooperative', 'controlling'],
  ['compassionate', 'vindictive'],
  ['loyal', 'selfPreserving'],
];

function conflicts(trait: TraitKey, chosen: TraitKey[]): boolean {
  return TRAIT_CONFLICTS.some(
    ([a, b]) => (a === trait && chosen.includes(b)) || (b === trait && chosen.includes(a)),
  );
}

export function traitValence(trait: TraitKey): 'positive' | 'negative' | 'neutral' {
  if (POSITIVE_TRAITS.includes(trait)) return 'positive';
  if (NEGATIVE_TRAITS.includes(trait)) return 'negative';
  return 'neutral';
}

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

  const { attributes, playerPoints } = generateAttributes(rng, bias, options.attributeTotal);
  const potential = generatePotential(rng, bias);

  const given = rng.pick(NAME_TABLES.given);
  const surname = options.surname ?? rng.pick(NAME_TABLES.surnames);
  const ageRange = options.ageRange ?? [21, 56];
  const age = rng.taperedInt(ageRange[0], ageRange[1], 2);

  // Devotion: dealt for the lives already lived, unspent for the one the
  // player is about to live. Skills roll AFTER placement so an NPC's craft can
  // sit above the plain grade cap the way a life of practice would put it.
  let specSlots: number[];
  if (options.isPlayer) {
    specSlots = specializationBudget();
  } else {
    specSlots = autoPlaceSpecializations(rng, potential, bias, age).remaining;
  }

  const { skills } = generateSkills(rng, potential, bias);
  const traits = generateTraits(rng, bias);

  const maxHealth = deriveMaxHealth(attributes);

  const character: Character = {
    id: seededCharacterId(rng, options.isPlayer ? 'pc' : 'chr'),
    name: given,
    surname,
    age,
    pronouns: rng.weighted([
      { value: 'she/her' as const, weight: 44 },
      { value: 'he/him' as const, weight: 44 },
      { value: 'they/them' as const, weight: 12 },
    ]),
    portraitSeed: rng.int(0, 0xffffff),
    role: options.role ?? career.role,
    attributes,
    skills,
    potential,
    traits,
    traitKnowledge: traits.map((t) => ({ trait: t, known: 0 as const, evidence: 0 })),
    health: maxHealth,
    maxHealth,
    wounds: [],
    stress: rng.int(0, 22),
    rested: rng.int(62, 100),
    hungerDays: 0,
    alive: true,
    personalXp: 0,
    lifeHistory: history,
    relationships: {},
    equipment: {},
    backpackSlots: rollBackpackSlots(rng),
    backpack: [],
    isPlayer: options.isPlayer ?? false,
    aboard: options.aboard ?? true,
    specSlots,
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
  const character = createCharacter({ rng, isPlayer: true, role: 'captain', ageRange: [23, 47] });
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

export function generateFamily(
  rng: Rng,
  protagonist: Character,
  count: number,
): Character[] {
  const family: Character[] = [];
  const kinds: { kind: 'parent' | 'sibling' | 'child' | 'partner'; weight: number }[] = [
    { kind: 'parent', weight: 26 },
    { kind: 'sibling', weight: 40 },
    { kind: 'partner', weight: 14 },
    { kind: 'child', weight: 20 },
  ];

  for (let i = 0; i < count; i++) {
    const kind = rng.weighted(kinds.map((k) => ({ value: k.kind, weight: k.weight })));
    const ageRange: [number, number] =
      kind === 'parent'
        ? [protagonist.age + 20, protagonist.age + 38]
        : kind === 'child'
          ? [1, Math.max(2, protagonist.age - 18)]
          : kind === 'partner'
            ? [Math.max(20, protagonist.age - 7), protagonist.age + 8]
            : [Math.max(16, protagonist.age - 12), protagonist.age + 12];

    const member = createCharacter({
      rng,
      ageRange,
      surname: rng.chance(0.72) ? protagonist.surname : undefined,
      aboard: false,
      role: 'crew',
    });

    member.aboard = false;

    const closeness = rng.int(28, 88);
    member.relationships[protagonist.id] = {
      value: closeness,
      familiarity: rng.int(70, 100),
      kind: 'family',
    };
    protagonist.relationships[member.id] = {
      value: closeness,
      familiarity: rng.int(70, 100),
      kind: 'family',
    };

    // Family members are known people — their traits start partly visible.
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
  return character.pronouns === 'she/her'
    ? 'she'
    : character.pronouns === 'he/him'
      ? 'he'
      : 'they';
}

export function objectPronoun(character: Character): string {
  return character.pronouns === 'she/her'
    ? 'her'
    : character.pronouns === 'he/him'
      ? 'him'
      : 'them';
}

export function possessivePronoun(character: Character): string {
  return character.pronouns === 'she/her'
    ? 'her'
    : character.pronouns === 'he/him'
      ? 'his'
      : 'their';
}

/** Third-person verb agreement — "they are" vs "she is". */
export function isAre(character: Character): string {
  return character.pronouns === 'they/them' ? 'are' : 'is';
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

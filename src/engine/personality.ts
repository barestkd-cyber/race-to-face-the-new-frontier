/**
 * Personality. The 247 canonical traits are the mechanics.
 *
 * A character owns one to seven traits and nothing else. There is no second
 * ontology underneath: a trait is not translated into a behaviour class before
 * it resolves. Each trait carries its own favoured tags, its own opposed tags,
 * its own intensity and its own rule, and this module reads those directly.
 *
 * The world emits semantic tags on choices, outcomes and actions —
 * `danger`, `protect_others`, `deception`, `spend` — and traits subscribe to
 * them. That is how 247 traits reach hundreds of events without a single event
 * id ever appearing in personality code.
 *
 * The helpers below are shared plumbing. Brave, Fearless, Steady Under Fire and
 * Protective Courage all run through `reactTo`, and all four come out
 * differently, because the data they carry is different: different intensity,
 * different opposed tags, and two of them only fire in a matching situation.
 *
 * Six channels, and no trait is assumed to use all of them: morale, stress,
 * autonomous weighting, relationships, player friction, and persistence.
 */

import {
  PERSONALITY_TRAITS,
  type PersonalityTag,
  type PersonalityTrait,
  type TraitContext,
} from '../content/personality';
import type { Rng } from './rng';
import { CAPTAIN_GEN, PERSONALITY } from './tuning';
import type { Attributes, Character, PersonalityTraitId } from './types';

const BY_ID = new Map<PersonalityTraitId, PersonalityTrait>(
  PERSONALITY_TRAITS.map((t) => [t.id, t]),
);

export function traitById(id: PersonalityTraitId): PersonalityTrait | undefined {
  return BY_ID.get(id);
}

export function traitLabel(id: PersonalityTraitId): string {
  return BY_ID.get(id)?.label ?? id;
}

/** The traits this person actually has, resolved from ids. */
export function traitsOf(character: Character): PersonalityTrait[] {
  return character.traits
    .map((id) => BY_ID.get(id))
    .filter((t): t is PersonalityTrait => Boolean(t));
}

// ---------------------------------------------------------------------------
// Rolling a personality
// ---------------------------------------------------------------------------

/** A word only lands on somebody the numbers do not contradict. */
function fits(trait: PersonalityTrait, attributes: Attributes): boolean {
  if (!trait.attribute || !trait.direction) return true;
  const value = attributes[trait.attribute];
  return trait.direction === 'high'
    ? value >= CAPTAIN_GEN.personalityHigh
    : value <= CAPTAIN_GEN.personalityLow;
}

/**
 * Roll a personality.
 *
 * `bias` is the life-history pull, expressed in the same tags the traits use:
 * a machinist's life leans toward `plan` and `craft_quality`, which makes
 * Methodical and Proud Craftsperson likelier without making them certain.
 *
 * Contradictions are made less likely, not impossible — real people are
 * inconsistent, and an interesting internal conflict is worth more than a tidy
 * filter.
 */
export function rollPersonality(
  rng: Rng,
  attributes: Attributes,
  bias: Partial<Record<PersonalityTag, number>> = {},
): PersonalityTraitId[] {
  const wanted = rng.weighted(
    CAPTAIN_GEN.personalityCountWeights.map((c) => ({ value: c.value, weight: c.weight })),
  );

  const chosen: PersonalityTrait[] = [];
  const usedGroups = new Set<string>();
  // Three words are listed in two groups each, with different rules. They are
  // two entries, but one person must not be described by the same word twice.
  const usedLabels = new Set<string>();

  for (let guard = 0; guard < 200 && chosen.length < wanted; guard += 1) {
    const pool = PERSONALITY_TRAITS.filter(
      (trait) =>
        !usedGroups.has(trait.group) &&
        !usedLabels.has(trait.label) &&
        fits(trait, attributes),
    );
    if (pool.length === 0) break;

    const pick = rng.weighted(
      pool.map((trait) => ({
        value: trait,
        weight: Math.max(
          PERSONALITY.minTraitWeight,
          PERSONALITY.baseTraitWeight + biasScore(trait, bias, chosen),
        ),
      })),
    );
    chosen.push(pick);
    usedGroups.add(pick.group);
    usedLabels.add(pick.label);
  }

  return chosen.map((t) => t.id);
}

/** Life history pulls toward some tags; chosen traits push against their opposites. */
function biasScore(
  trait: PersonalityTrait,
  bias: Partial<Record<PersonalityTag, number>>,
  chosen: PersonalityTrait[],
): number {
  let score = 0;
  for (const tag of trait.favored) score += (bias[tag] ?? 0) * PERSONALITY.biasWeight;

  // Soft, not absolute: somebody already Cautious is less likely to also be
  // Reckless, but it can still happen and it is interesting when it does.
  for (const other of chosen) {
    for (const tag of trait.favored) {
      if (other.opposed.includes(tag)) score -= PERSONALITY.contradictionPenalty;
    }
  }
  return score;
}

// ---------------------------------------------------------------------------
// Reacting to what happened
// ---------------------------------------------------------------------------

export interface ReactionContext {
  /** Active danger, right now — a fight, an ambush, a breach. */
  crisis?: boolean;
  /** The action is protecting crew, family or a dependent. */
  protecting?: boolean;
  /** The situation echoes something in this person's own history. */
  traumaEcho?: boolean;
  /** Deaths and catastrophes are not held to the ordinary aggregate cap. */
  uncapped?: boolean;
}

export interface Reaction {
  /** Positive means it agreed with them. */
  morale: number;
  /** Positive means it cost them. */
  stress: number;
  aligned: PersonalityTraitId[];
  conflicted: PersonalityTraitId[];
  /** Whether any of the reacting traits keeps hold of it. */
  lingers: boolean;
}

const NO_REACTION: Reaction = {
  morale: 0,
  stress: 0,
  aligned: [],
  conflicted: [],
  lingers: false,
};

function contextAllows(trait: PersonalityTrait, context: ReactionContext): boolean {
  if (!trait.context) return true;
  const met: Record<TraitContext, boolean> = {
    crisis: Boolean(context.crisis),
    protecting: Boolean(context.protecting),
    traumaEcho: Boolean(context.traumaEcho),
  };
  return met[trait.context];
}

function hits(tags: PersonalityTag[], against: PersonalityTag[]): boolean {
  return against.some((tag) => tags.includes(tag));
}

/**
 * What this personality makes of a tagged event.
 *
 * Every trait is asked separately and the answers are summed, so a Risk-Taker
 * who is also Protective of Dependents pulls both ways on a dangerous rescue
 * rather than resolving to whichever one is "dominant".
 */
export function reactTo(
  character: Character,
  tags: PersonalityTag[],
  context: ReactionContext = {},
): Reaction {
  if (tags.length === 0) return NO_REACTION;

  let morale = 0;
  let stress = 0;
  const aligned: PersonalityTraitId[] = [];
  const conflicted: PersonalityTraitId[] = [];
  let lingers = false;

  for (const trait of traitsOf(character)) {
    if (!contextAllows(trait, context)) continue;
    const scale = PERSONALITY.intensity[trait.intensity];

    if (hits(tags, trait.favored)) {
      morale += scale.morale;
      stress -= scale.stress;
      aligned.push(trait.id);
      if (trait.persistence) lingers = true;
    }
    if (hits(tags, trait.opposed)) {
      morale -= scale.morale;
      stress += scale.stress;
      conflicted.push(trait.id);
      if (trait.persistence) lingers = true;
    }
  }

  // One ordinary decision must not blow a seven-trait character apart.
  const cap = context.uncapped ? PERSONALITY.uncappedLimit : PERSONALITY.aggregateCap;
  return {
    morale: clamp(morale, cap),
    stress: clamp(stress, cap),
    aligned,
    conflicted,
    lingers,
  };
}

function clamp(value: number, limit: number): number {
  return Math.max(-limit, Math.min(limit, Math.round(value * 10) / 10));
}

// ---------------------------------------------------------------------------
// Choosing, when nobody is telling them what to do
// ---------------------------------------------------------------------------

/**
 * How much this personality wants an option. Positive is drawn to it.
 *
 * A bias applied before the ordinary competence and outcome scoring, never a
 * replacement for it. A Fearless character still cannot pick a lock.
 */
export function optionWeight(
  character: Character,
  tags: PersonalityTag[],
  context: ReactionContext = {},
): number {
  if (tags.length === 0) return 0;
  let weight = 0;
  for (const trait of traitsOf(character)) {
    if (!contextAllows(trait, context)) continue;
    const scale = PERSONALITY.intensity[trait.intensity];
    if (hits(tags, trait.favored)) weight += scale.weight;
    if (hits(tags, trait.opposed)) weight -= scale.weight;
  }
  return weight;
}

// ---------------------------------------------------------------------------
// Reacting to each other
// ---------------------------------------------------------------------------

/**
 * How an onlooker feels about somebody whose action carried these tags.
 *
 * Same traits, same tags, no separate relationship personality. A Loyal
 * crewmate warms to a captain who goes back for people; a Suspicious one warms
 * more slowly; a Grudge-Holding one keeps hold of the bad ones.
 */
export function relationshipDelta(
  observer: Character,
  tags: PersonalityTag[],
  context: ReactionContext = {},
): { delta: number; lingers: boolean } {
  if (tags.length === 0) return { delta: 0, lingers: false };
  let delta = 0;
  let lingers = false;
  for (const trait of traitsOf(observer)) {
    if (!contextAllows(trait, context)) continue;
    const scale = PERSONALITY.intensity[trait.intensity];
    if (hits(tags, trait.favored)) delta += scale.relationship;
    if (hits(tags, trait.opposed)) {
      delta -= scale.relationship;
      if (trait.persistence) lingers = true;
    }
  }
  // Some people hold on to a thing and some let it go. Scale the result by
  // that rather than by naming particular traits in code.
  const held = traitsOf(observer).some((t) => t.decay === 'slow' || t.persistence);
  const released = traitsOf(observer).some((t) => t.decay === 'fast');
  if (delta < 0 && held) delta *= PERSONALITY.slowDecayScale;
  if (delta < 0 && released && !held) delta *= PERSONALITY.fastDecayScale;

  return { delta: clamp(delta, PERSONALITY.relationshipCap), lingers: lingers || (delta < 0 && held) };
}

// ---------------------------------------------------------------------------
// The player's own captain
// ---------------------------------------------------------------------------

export interface Friction {
  /** Whether this is worth saying out loud. */
  material: boolean;
  aligned: boolean;
  note: string;
  reaction: Reaction;
}

/**
 * Personality never chooses for the player. It says what the choice will cost
 * the person making it, and only when the cost is material.
 */
export function frictionFor(
  character: Character,
  tags: PersonalityTag[],
  context: ReactionContext = {},
): Friction {
  const reaction = reactTo(character, tags, context);
  const weight = Math.max(Math.abs(reaction.morale), Math.abs(reaction.stress));
  const conflicted = reaction.conflicted.length > 0 && reaction.morale <= 0;

  if (weight < PERSONALITY.frictionThreshold) {
    return { material: false, aligned: !conflicted, note: '', reaction };
  }

  const names = (ids: PersonalityTraitId[]): string =>
    ids.map(traitLabel).slice(0, 2).join(' and ');

  return {
    material: true,
    aligned: !conflicted,
    note: conflicted
      ? `Cuts against ${names(reaction.conflicted)}. ${character.name} can do it, and will carry it.`
      : `${names(reaction.aligned)} all over. ${character.name} will be steadier for it.`,
    reaction,
  };
}

// ---------------------------------------------------------------------------
// The rare hard no
// ---------------------------------------------------------------------------

/**
 * Four traits, and only four, can refuse outright — and only where the tags
 * name the extreme case the rule is about. Everything else in this system is
 * "you can, and it will cost you".
 */
const REFUSALS: { trait: PersonalityTraitId; tags: PersonalityTag[]; reason: string }[] = [
  {
    trait: 'pacifistic',
    tags: ['execution', 'torture', 'gratuitous_violence'],
    reason: 'will not do that to somebody who is already beaten.',
  },
  {
    trait: 'duty-bound',
    tags: ['abandon_critical_duty'],
    reason: 'gave their word on this, and will not walk away from it.',
  },
  {
    trait: 'promise-keeping',
    tags: ['break_solemn_promise'],
    reason: 'made a promise, and this is not the kind they break.',
  },
  {
    trait: 'protective-of-dependents',
    tags: ['abandon_dependent'],
    reason: 'will not leave somebody in their care while they can still be reached.',
  },
];

export interface Refusal {
  refused: boolean;
  reason?: string;
}

/**
 * `override` is the way out — a survival case, or circumstances that materially
 * changed. The engine distinguishes "this costs them a great deal" from "this
 * person will not do it", and the second is meant to stay rare.
 */
export function refusalFor(
  character: Character,
  tags: PersonalityTag[],
  options: { override?: boolean } = {},
): Refusal {
  if (options.override) return { refused: false };
  for (const rule of REFUSALS) {
    if (!character.traits.includes(rule.trait)) continue;
    if (!hits(tags, rule.tags)) continue;
    return { refused: true, reason: `${character.name} ${rule.reason}` };
  }
  return { refused: false };
}

/** The traits that can ever refuse, for tests and for documentation. */
export function refusalTraits(): PersonalityTraitId[] {
  return REFUSALS.map((r) => r.trait);
}

// ---------------------------------------------------------------------------
// What the player can see
// ---------------------------------------------------------------------------

/**
 * Hidden is not inactive. Everything above reads `character.traits`; this reads
 * `traitKnowledge`, and visibility touches nothing else.
 */
export function knownTraits(character: Character): PersonalityTraitId[] {
  const known = new Set(
    character.traitKnowledge.filter((k) => k.known > 0).map((k) => k.trait),
  );
  return character.traits.filter((id) => known.has(id));
}

export interface Temperament {
  descriptors: string[];
  summary: string;
  tendencies: { label: string; rule: string }[];
  partial: boolean;
}

/**
 * The temperament, built from the canonical traits and nothing else.
 *
 * `full` shows everything, which is what the captain gets, because they are the
 * person the player is. Anybody else is described only by what has actually
 * been learned about them.
 */
export function temperamentOf(
  character: Character,
  options: { full?: boolean } = {},
): Temperament {
  const visible = options.full ? character.traits : knownTraits(character);
  const traits = visible
    .map((id) => BY_ID.get(id))
    .filter((t): t is PersonalityTrait => Boolean(t));

  return {
    descriptors: traits.map((t) => t.label),
    summary: summarise(character.name, traits),
    tendencies: traits.map((t) => ({ label: t.label, rule: sentence(t.rule) })),
    partial: visible.length < character.traits.length,
  };
}

/**
 * One sentence, from what the strongest traits are drawn to and what costs
 * them. Built from the same tags the simulation reads, so the description and
 * the behaviour cannot drift apart.
 */
function summarise(name: string, traits: PersonalityTrait[]): string {
  if (traits.length === 0) return `You have not spent enough time with ${name} to say.`;

  const order: Record<string, number> = { extreme: 4, strong: 3, moderate: 2, mild: 1 };
  const ranked = [...traits].sort((a, b) => (order[b.intensity] ?? 0) - (order[a.intensity] ?? 0));

  const drawn = unique(ranked.flatMap((t) => t.favored)).slice(0, 3).map(readable);
  const costs = unique(ranked.flatMap((t) => t.opposed)).slice(0, 2).map(readable);

  const first =
    drawn.length > 0 ? `${name} is drawn to ${join(drawn)}` : `${name} is hard to read`;
  const second = costs.length > 0 ? `, and pays for ${join(costs)}` : '';
  return `${first}${second}.`;
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function join(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** The matrix writes its rules as clauses; show them as sentences. */
function sentence(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Turn a tag into something a person would actually say. */
function readable(tag: PersonalityTag): string {
  return tag.replace(/_/g, ' ');
}

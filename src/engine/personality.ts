/**
 * Personality. One system, one roll, one source of truth.
 *
 * Every character — the captain, a recruit, a relative, somebody generated for
 * a set piece — rolls one to seven traits from the canonical library and
 * nothing else. There is no second temperament roll, no hidden parallel set,
 * and no separate list of words for display.
 *
 * What varies between people is only how much of it the player can see:
 *
 *   captain    every trait known from the start — you are them
 *   family     mostly known — you grew up with them
 *   strangers  unknown until you spend time with them
 *
 * The simulation consumes a trait through its `effect`, a small closed
 * vocabulary written down in content/traits.ts. That is an implementation
 * detail of the word, not a personality of its own: several words share an
 * effect because several words describe the same tendency. Roughly a third of
 * the library is tone — outlook and humour — and carries no effect, because
 * the simulation has nothing for those to change.
 */

import { PERSONALITY_TRAITS, type PersonalityTrait } from '../content/personality';
import { TRAIT_EFFECT_DEFS } from '../content/traits';
import type { Rng } from './rng';
import { CAPTAIN_GEN, TRAITS_TUNING } from './tuning';
import type {
  Attributes,
  Character,
  PersonalityTraitId,
  TraitEffect,
} from './types';

const BY_ID = new Map<PersonalityTraitId, PersonalityTrait>(
  PERSONALITY_TRAITS.map((t) => [t.id, t]),
);

export function traitById(id: PersonalityTraitId): PersonalityTrait | undefined {
  return BY_ID.get(id);
}

export function traitLabel(id: PersonalityTraitId): string {
  return BY_ID.get(id)?.label ?? id;
}

// ---------------------------------------------------------------------------
// Rolling a personality
// ---------------------------------------------------------------------------

/**
 * A word only lands on somebody it actually fits.
 *
 * Words tied to an attribute — Calm, Analytical, Hesitant — are only available
 * to people whose score genuinely leans that way, so the description and the
 * numbers never contradict each other.
 */
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
 * `bias` is the life-history pull: a machinist's life leans toward patient and
 * stubborn people, and it does that by weighting the words that carry those
 * effects. It is the same bias table the life paths always had, now pointed at
 * the one personality system instead of a second one.
 */
export function rollPersonality(
  rng: Rng,
  attributes: Attributes,
  bias: Partial<Record<TraitEffect, number>> = {},
): PersonalityTraitId[] {
  const wanted = rng.weighted(
    CAPTAIN_GEN.personalityCountWeights.map((c) => ({ value: c.value, weight: c.weight })),
  );

  // A set that reads as one person: all of a kind now and then, and never two
  // words from the same corner of a personality.
  const uniform = rng.chance(TRAITS_TUNING.uniformValenceChance);
  const wantValence: 'positive' | 'negative' | null = uniform
    ? rng.chance(0.5)
      ? 'positive'
      : 'negative'
    : null;

  const chosen: PersonalityTrait[] = [];
  const usedGroups = new Set<string>();
  const usedEffects = new Set<TraitEffect>();

  for (let guard = 0; guard < 200 && chosen.length < wanted; guard += 1) {
    const pool = PERSONALITY_TRAITS.filter((trait) => {
      if (usedGroups.has(trait.group)) return false;
      if (trait.effect && usedEffects.has(trait.effect)) return false;
      if (!fits(trait, attributes)) return false;
      if (wantValence && trait.effect) {
        return TRAIT_EFFECT_DEFS[trait.effect].valence === wantValence;
      }
      return true;
    });
    if (pool.length === 0) break;

    const pick = rng.weighted(
      pool.map((trait) => ({
        value: trait,
        // A life that pushed somebody toward patience makes patient words
        // likelier, without ever making them certain.
        weight: 10 + (trait.effect ? (bias[trait.effect] ?? 0) * 9 : 0),
      })),
    );
    chosen.push(pick);
    usedGroups.add(pick.group);
    if (pick.effect) usedEffects.add(pick.effect);
  }

  return chosen.map((t) => t.id);
}

// ---------------------------------------------------------------------------
// What the simulation reads
// ---------------------------------------------------------------------------

/** The behaviours this person's personality actually produces. */
export function effectsOf(character: Character): TraitEffect[] {
  const out: TraitEffect[] = [];
  for (const id of character.traits) {
    const effect = BY_ID.get(id)?.effect;
    if (effect && !out.includes(effect)) out.push(effect);
  }
  return out;
}

export function hasEffect(character: Character, effect: TraitEffect): boolean {
  return effectsOf(character).includes(effect);
}

/**
 * How hard this person takes losing somebody, as a multiplier on ordinary
 * grief. People who attach hard feel it hard; people who hold themselves apart
 * feel less of it, and that is not the same as being fine.
 */
export function griefMultiplier(character: Character): number {
  let scale = 1;
  for (const effect of effectsOf(character)) {
    if (effect === 'loyal' || effect === 'compassionate' || effect === 'protective') scale += 0.25;
    if (effect === 'selfPreserving') scale -= 0.2;
    if (effect === 'vindictive') scale += 0.15;
  }
  return Math.max(0.4, Math.min(2, scale));
}

/**
 * How fast somebody comes back from a bad stretch, as a multiplier on ordinary
 * stress recovery.
 */
export function recoveryMultiplier(character: Character): number {
  let scale = 1;
  for (const effect of effectsOf(character)) {
    if (effect === 'patient' || effect === 'cooperative') scale += 0.2;
    if (effect === 'suspicious' || effect === 'jealous') scale -= 0.15;
    if (effect === 'alcoholic') scale -= 0.2;
    if (effect === 'stubborn') scale += 0.1;
  }
  return Math.max(0.5, Math.min(1.8, scale));
}

// ---------------------------------------------------------------------------
// What the player sees
// ---------------------------------------------------------------------------

/** The traits this player currently knows about. */
export function knownTraits(character: Character): PersonalityTraitId[] {
  const known = new Set(
    character.traitKnowledge.filter((k) => k.known > 0).map((k) => k.trait),
  );
  return character.traits.filter((id) => known.has(id));
}

export interface Temperament {
  /** The rolled words, as labels. */
  descriptors: string[];
  /** One sentence about how this person tends to operate. */
  summary: string;
  /** What the words behind those actually do, once each. */
  tendencies: { label: string; behaviour: string }[];
  /** True when some of this person is still unread. */
  partial: boolean;
}

/**
 * A clause completing "Dmitri ___", one per behaviour, deliberately free of
 * pronouns so the sentence reads correctly for anybody.
 */
const CLAUSES: Partial<Record<TraitEffect, string>> = {
  brave: 'walks toward the thing everyone else is backing away from',
  aggressive: 'settles things directly, and sometimes too directly',
  cowardly: 'gets clear first and works out how to feel about it later',
  cautious: 'checks the way out before going in',
  selfPreserving: 'looks after their own position first',
  reckless: 'commits before the plan is finished',
  impulsive: 'acts on the first instinct and lives with it',
  patient: 'will wait out something that would break most people',
  dutiful: 'finishes what was agreed, whether or not anyone is watching',
  loyal: 'puts the people they have chosen ahead of the rules',
  protective: 'reads risk to other people faster than risk to themselves',
  compassionate: 'finds it hard to leave anybody suffering',
  generous: 'gives away more than is sensible',
  greedy: 'keeps a close eye on what things are worth',
  opportunistic: 'finds the angle other people walk past',
  honest: 'says the true thing, including when it costs them',
  curious: 'has to know how something works',
  cooperative: 'works better with other people than alone',
  stubborn: 'does not move once the decision is made',
  controlling: 'wants a hand on everything that matters',
  suspicious: 'assumes there is more to it than they were told',
  vindictive: 'keeps an account of who did what',
  jealous: 'notices what other people are given',
  alcoholic: 'drinks more than is good for them, and knows it',
};

/**
 * The temperament, built from the one rolled personality and nothing else.
 *
 * `full` shows everything, which is what the captain gets. Anybody else is
 * described only by what the player has actually learned about them.
 */
export function temperamentOf(character: Character, options: { full?: boolean } = {}): Temperament {
  const visible = options.full ? character.traits : knownTraits(character);
  const traits = visible
    .map((id) => BY_ID.get(id))
    .filter((t): t is PersonalityTrait => Boolean(t));

  const effects: TraitEffect[] = [];
  for (const trait of traits) {
    if (trait.effect && !effects.includes(trait.effect)) effects.push(trait.effect);
  }

  const clauses = effects
    .map((effect) => CLAUSES[effect])
    .filter((c): c is string => Boolean(c))
    .slice(0, 3);

  const summary =
    traits.length === 0
      ? `You have not spent enough time with ${character.name} to say.`
      : clauses.length > 0
        ? `${character.name} ${joinClauses(clauses)}.`
        : `${character.name} is easy enough company, without a strong pull in any direction.`;

  // Each line is labelled with the word this person actually has, not with the
  // internal name of the behaviour behind it. The player should never see two
  // vocabularies for one personality.
  const tendencies = traits
    .filter((trait) => trait.effect)
    .map((trait) => ({
      label: trait.label,
      behaviour: TRAIT_EFFECT_DEFS[trait.effect!].behaviour,
    }));

  return {
    descriptors: traits.map((t) => t.label),
    summary,
    tendencies,
    partial: visible.length < character.traits.length,
  };
}

function joinClauses(clauses: string[]): string {
  if (clauses.length <= 1) return clauses[0] ?? '';
  return `${clauses.slice(0, -1).join(', ')} and ${clauses[clauses.length - 1]}`;
}

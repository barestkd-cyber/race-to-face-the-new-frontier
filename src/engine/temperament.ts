/**
 * Temperament — the personality a person already has, said out loud.
 *
 * This invents nothing. It reads the two things the generator already produced:
 * the hidden trait set, and the attributes that decide how those tendencies
 * actually come out under pressure. Discipline, Composure and the rest are
 * already what the check system consults; this only puts them into words.
 *
 * Who gets to see it is a separate question, and not one this module answers.
 * A stranger's tendencies stay behind `traitKnowledge` and are learned by
 * watching them. The captain is the person the player is inhabiting, so they
 * start knowing their own.
 */

import { TRAIT_DEFS } from '../content/traits';
import type { Character, AttributeKey } from './types';

/** Attributes far enough from the middle to be worth a word. Display only. */
const HIGH = 10;
const LOW = 4;

interface Leaning {
  /** Two or three words for a chip. */
  word: string;
  /**
   * A clause that completes "Dmitri ___". Deliberately free of pronouns, so
   * the sentence reads correctly for anybody.
   */
  clause: string;
}

/** What an unusually high or low score in a personality-adjacent attribute means. */
const LEANINGS: Partial<Record<AttributeKey, { high: Leaning; low: Leaning }>> = {
  discipline: {
    high: { word: 'Disciplined', clause: 'holds to a plan once it is made' },
    low: { word: 'Loose', clause: 'drifts off a plan the moment something better turns up' },
  },
  composure: {
    high: { word: 'Unflappable', clause: 'stays level when things go wrong' },
    low: { word: 'Highly strung', clause: 'feels every setback the moment it lands' },
  },
  resilience: {
    high: { word: 'Hard to break', clause: 'takes a bad week without much of it showing' },
    low: { word: 'Easily worn', clause: 'carries a bad week around for a long time after' },
  },
  charisma: {
    high: { word: 'Magnetic', clause: 'is easy to listen to' },
    low: { word: 'Blunt', clause: 'is hard going for anyone who does not know better' },
  },
  leadership: {
    high: { word: 'Natural authority', clause: 'rarely has to give an order twice' },
    low: { word: 'No natural authority', clause: 'has to earn every order twice over' },
  },
  socialAwareness: {
    high: { word: 'Reads people', clause: 'reads a room quickly' },
    low: { word: 'Misses cues', clause: 'misses most of what a room is trying to say' },
  },
  decisionMaking: {
    high: { word: 'Decisive', clause: 'commits fast and rarely revisits it' },
    low: { word: 'Hesitant', clause: 'turns a choice over well past the point of use' },
  },
  perception: {
    high: { word: 'Watchful', clause: 'notices what other people walk straight past' },
    low: { word: 'Inattentive', clause: 'walks past a great deal without registering it' },
  },
  reasoning: {
    high: { word: 'Analytical', clause: 'takes a problem apart before touching it' },
    low: { word: 'Instinctive', clause: 'works by feel rather than by reasoning it out' },
  },
};

export interface Temperament {
  /** Short words for the eye: the traits, then the sharpest leanings. */
  descriptors: string[];
  /** One sentence about how this person tends to operate. */
  summary: string;
  /** What each trait actually does, in the authored words of the trait itself. */
  tendencies: { label: string; behaviour: string }[];
}

/** How far from the middle a score sits, for ranking which leanings to mention. */
function distance(value: number): number {
  return value >= HIGH ? value - HIGH : value <= LOW ? LOW - value : -1;
}

function joinClauses(clauses: string[]): string {
  if (clauses.length <= 1) return clauses[0] ?? '';
  return `${clauses.slice(0, -1).join(', ')} and ${clauses[clauses.length - 1]}`;
}

export function temperamentOf(character: Character): Temperament {
  // The strongest leanings first, so a person with one extreme attribute is
  // described by that rather than by whatever happens to come first in a list.
  const leanings = (Object.keys(LEANINGS) as AttributeKey[])
    .map((key) => {
      const value = character.attributes[key];
      const entry = LEANINGS[key]!;
      return {
        key,
        rank: distance(value),
        leaning: value >= HIGH ? entry.high : value <= LOW ? entry.low : null,
      };
    })
    .filter((entry): entry is { key: AttributeKey; rank: number; leaning: Leaning } =>
      Boolean(entry.leaning),
    )
    .sort((a, b) => b.rank - a.rank);

  const traits = character.traits.map((key) => TRAIT_DEFS[key]);

  const descriptors = [
    ...traits.map((def) => def.label),
    ...leanings.slice(0, 2).map((entry) => entry.leaning.word),
  ];

  const clauses = leanings.slice(0, 3).map((entry) => entry.leaning.clause);
  const summary =
    clauses.length > 0
      ? `${character.name} ${joinClauses(clauses)}.`
      : `${character.name} sits near the middle of most things — no single tendency runs the show.`;

  return {
    descriptors,
    summary,
    tendencies: traits.map((def) => ({ label: def.label, behaviour: def.behaviour })),
  };
}

/**
 * Who should do this.
 *
 * The game already knows who is best at a job — it computes it every time a
 * check runs. Making the player open five character sheets and compare
 * twenty-five skills by hand was never the decision; the decision is whether
 * to use the tired expert, the fresh amateur, or wait.
 *
 * So this module answers one question — "who, and what is wrong with them?" —
 * and every screen that needs a person asks it. Nothing here changes an
 * outcome. It reads the same numbers the resolver reads and says them out loud.
 */

import { effectiveSkill } from './check';
import { CHECK } from './tuning';
import { conditionLabel, isIncapacitated } from './wounds';
import type { Character, SkillKey } from './types';

export interface Candidate {
  character: Character;
  /** Skill as it actually performs — training times specialisation. */
  value: number;
  /** Short, plain reasons this person is not at their best. Empty is good news. */
  problems: string[];
  /** True when they cannot do it at all. */
  unavailable: boolean;
}

export interface Recommendation {
  /** The person the game would pick. Null when nobody can. */
  best: Candidate | null;
  /** Everyone considered, best first. */
  ranked: Candidate[];
  /** One line naming the pick and the catch, ready to print. */
  line: string;
  /** Nobody in the pool has any training in this at all. */
  untrained: boolean;
}

/**
 * What is currently working against somebody. These are the same conditions the
 * check applies as penalties; saying them is not a new mechanic, it is the
 * existing one made visible.
 */
export function problemsFor(character: Character): string[] {
  const problems: string[] = [];
  if (!character.alive) return ['dead'];
  if (isIncapacitated(character)) return ['out cold'];
  if (character.rested < CHECK.exhaustionFloor) problems.push('exhausted');
  if (character.stress >= CHECK.stressPenaltyFloor) problems.push('badly stressed');
  const untreated = character.wounds.filter((w) => !w.treated).length;
  if (untreated > 0) problems.push(untreated === 1 ? 'carrying a wound' : `${untreated} untreated wounds`);
  else if (character.health < character.maxHealth * 0.6) {
    problems.push(conditionLabel(character).toLowerCase());
  }
  return problems;
}

/** Rank a pool for one skill, best first, with what is wrong with each of them. */
export function recommend(
  pool: Character[],
  skill: SkillKey,
  options: { exclude?: string[]; label?: string } = {},
): Recommendation {
  const exclude = new Set(options.exclude ?? []);
  const ranked: Candidate[] = pool
    .filter((c) => !exclude.has(c.id))
    .map((c) => ({
      character: c,
      value: Math.round(effectiveSkill(c, skill)),
      problems: problemsFor(c),
      unavailable: !c.alive || isIncapacitated(c),
    }))
    .sort((a, b) => {
      if (a.unavailable !== b.unavailable) return a.unavailable ? 1 : -1;
      return b.value - a.value;
    });

  const best = ranked.find((c) => !c.unavailable) ?? null;
  const untrained = !best || best.value <= 0;
  const name = options.label ?? 'this';

  let line: string;
  if (!best) {
    line = `Nobody aboard can take ${name} on.`;
  } else if (untrained) {
    line = `Nobody has training in this. ${best.character.name} would be guessing.`;
  } else if (best.problems.length > 0) {
    line = `${best.character.name} is your best hand at this — and is ${best.problems[0]}.`;
  } else {
    line = `${best.character.name} is your best hand at this.`;
  }

  return { best, ranked, line, untrained };
}

/** "Marcus — 71" style, for a row that has already said what the skill is. */
export function candidateLabel(candidate: Candidate): string {
  const suffix = candidate.problems.length > 0 ? ` · ${candidate.problems.join(', ')}` : '';
  return `${candidate.character.name} ${candidate.character.surname} — ${candidate.value}${suffix}`;
}

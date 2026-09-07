/**
 * Study: the one thing in this game that is not dealt.
 *
 * Everything else about a person arrives rolled — attributes, potential
 * grades, the life they lived before you met them. Knowledge specialization is
 * the exception: it is bought with hours, in a room, by somebody who could have
 * been doing something else.
 *
 * A focus opens at x1.05 on a craft already practised, and climbs one rung at a
 * time. The rungs above the entry tier are capped at two apiece, so advancement
 * is a queue rather than a shopping list: to start a third focus climbing you
 * must first promote one of the two ahead of it, which frees the rung.
 */

import { skillCap } from './check';
import { pushLog } from './log';
import { hasRoom } from './ship';
import { SPEC } from './tuning';
import {
  SKILL_KEYS,
  SKILL_LABELS,
  type Character,
  type GameState,
  type SkillKey,
} from './types';

// ---------------------------------------------------------------------------
// Reading the ladder
// ---------------------------------------------------------------------------

/** The rung above this one, or null at the top. */
export function nextTier(current: number): number | null {
  const index = SPEC.tiers.indexOf(current as (typeof SPEC.tiers)[number]);
  if (index === -1) return SPEC.tiers[0]!;
  return index + 1 < SPEC.tiers.length ? SPEC.tiers[index + 1]! : null;
}

/** Every skill this person has a focus on, with its current rung. */
export function focuses(character: Character): { skill: SkillKey; tier: number }[] {
  return SKILL_KEYS.filter((k) => character.potential[k].specialization > 1)
    .map((skill) => ({ skill, tier: character.potential[skill].specialization }))
    .sort((a, b) => b.tier - a.tier);
}

/** How many focuses currently sit on a given rung. */
export function countAtTier(character: Character, tier: number): number {
  return focuses(character).filter((f) => f.tier === tier).length;
}

/** Is there room on a rung for one more? */
export function tierHasRoom(character: Character, tier: number): boolean {
  const cap = SPEC.tierCaps[tier] ?? 0;
  return countAtTier(character, tier) < cap;
}

// ---------------------------------------------------------------------------
// What can be studied, and what it would take
// ---------------------------------------------------------------------------

export interface StudyOption {
  skill: SkillKey;
  /** Rung it sits on now; 1 means no focus yet. */
  current: number;
  /** Rung it would reach. Null when nothing is available. */
  target: number | null;
  hoursNeeded: number;
  hoursDone: number;
  available: boolean;
  reason?: string;
}

/**
 * What this person could put hours into right now, and why not where they
 * cannot. A blocked option still appears — knowing the rung above is full is
 * exactly the information that makes the queue a decision.
 */
export function studyOptions(character: Character): StudyOption[] {
  const openFocuses = focuses(character).length;

  return SKILL_KEYS.map((skill) => {
    const current = character.potential[skill].specialization;
    const target = nextTier(current);
    const value = character.skills[skill] ?? 0;
    const progress = character.study?.skill === skill ? character.study.hours : 0;
    const hoursNeeded = target ? SPEC.hoursToTier[target] ?? 0 : 0;

    let available = true;
    let reason: string | undefined;

    if (!target) {
      available = false;
      reason = 'Already as far as devotion goes.';
    } else if (value < SPEC.placeMinSkill) {
      available = false;
      reason = `Needs ${SPEC.placeMinSkill} in the skill first — you cannot commit to what you have not done.`;
    } else if (current === 1 && openFocuses >= SPEC.maxFocuses) {
      available = false;
      reason = `All ${SPEC.maxFocuses} focuses are already committed elsewhere.`;
    } else if (!tierHasRoom(character, target)) {
      available = false;
      reason = `No room at ×${target.toFixed(2)} — promote one of the two already there first.`;
    }

    return {
      skill,
      current,
      target,
      hoursNeeded,
      hoursDone: progress,
      available,
      reason,
    };
  });
}

/** Hours of study per hour of clock, for this person in this place. */
export function studyRate(character: Character, atProperVenue: boolean): number {
  const [lo, hi] = SPEC.learningSpeed;
  const learning = character.attributes.learning / 15;
  const venue = atProperVenue ? SPEC.venueSpeed.world : SPEC.venueSpeed.ship;
  return (lo + (hi - lo) * learning) * venue;
}

// ---------------------------------------------------------------------------
// Assigning and progressing
// ---------------------------------------------------------------------------

export interface StudyResult {
  ok: boolean;
  message: string;
}

/** Put somebody to work on a craft. Replaces whatever they were studying. */
export function beginStudy(
  character: Character,
  skill: SkillKey,
): StudyResult {
  const option = studyOptions(character).find((o) => o.skill === skill);
  if (!option) return { ok: false, message: 'No such craft.' };
  if (!option.available) {
    return { ok: false, message: option.reason ?? 'Not right now.' };
  }

  const previous = character.study?.skill;
  // Switching subjects loses the partial work — attention is the cost.
  character.study = { skill, hours: previous === skill ? (character.study?.hours ?? 0) : 0 };

  return {
    ok: true,
    message:
      previous && previous !== skill
        ? `${character.name} sets aside ${SKILL_LABELS[previous]} and takes up ${SKILL_LABELS[skill]}.`
        : `${character.name} takes up ${SKILL_LABELS[skill]}.`,
  };
}

export function stopStudy(character: Character): StudyResult {
  if (!character.study) return { ok: false, message: 'They are not studying.' };
  const skill = character.study.skill;
  character.study = undefined;
  return { ok: true, message: `${character.name} puts ${SKILL_LABELS[skill]} down.` };
}

/** Whether a person is currently buried in something. */
export function isStudying(character: Character): boolean {
  return Boolean(character.study);
}

/**
 * Advance everybody's study by a stretch of elapsed time.
 *
 * Studying only happens where there is somewhere to do it: a Study room aboard,
 * or a proper institution planetside. Somebody deployed on an away party is not
 * reading.
 */
export function tickStudy(state: GameState, hours: number): string[] {
  const lines: string[] = [];
  if (hours <= 0) return lines;

  const ship = state.ship;
  const shipHasStudy = Boolean(ship && !ship.destroyed && hasRoom(ship, 'study'));

  // A library or university you are standing in beats the ship's own corner.
  const here = state.currentPlaceId ? state.places[state.currentPlaceId] : undefined;
  const atInstitution = here?.kind === 'library';

  if (!shipHasStudy && !atInstitution) return lines;

  const deployed = new Set(state.expedition?.partyIds ?? []);

  for (const id of state.crewIds) {
    const person = state.characters[id];
    if (!person?.alive || !person.study) continue;
    // Somebody out on a job is not getting any reading done.
    if (deployed.has(id)) continue;

    const option = studyOptions(person).find((o) => o.skill === person.study!.skill);
    if (!option?.target) continue;

    person.study.hours += hours * studyRate(person, atInstitution);

    if (person.study.hours < option.hoursNeeded) continue;

    // The rung may have filled while they were working — hold the progress
    // rather than discarding it, so the queue never punishes patience.
    if (!tierHasRoom(person, option.target)) continue;

    person.potential[option.skill] = {
      ...person.potential[option.skill],
      specialization: option.target,
    };
    person.study = undefined;

    const cap = skillCap(person, option.skill);
    const line =
      option.current === 1
        ? `${person.name} commits to ${SKILL_LABELS[option.skill]}. Ceiling now ${cap}.`
        : `${person.name} deepens ${SKILL_LABELS[option.skill]} to ×${option.target.toFixed(2)}. Ceiling now ${cap}.`;
    lines.push(line);
    pushLog(state, 'milestone', line);
  }

  return lines;
}

/** Where study can happen right now, phrased for the player. */
export function studyVenue(state: GameState): { ok: boolean; where: string } {
  const ship = state.ship;
  const here = state.currentPlaceId ? state.places[state.currentPlaceId] : undefined;
  if (here?.kind === 'library') {
    return { ok: true, where: `${here.name} — proper facilities, faster going` };
  }
  if (ship && !ship.destroyed && hasRoom(ship, 'study')) {
    return { ok: true, where: "The ship's study — slow, but it is yours" };
  }
  return {
    ok: false,
    where: 'Nowhere to study. This ship has no study, and you are not at a library.',
  };
}

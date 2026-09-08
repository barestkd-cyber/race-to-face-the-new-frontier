/**
 * Authored character hooks — rolling them, and what they cost or grant.
 *
 * Every hook here is an exception to the ordinary generator, not a layer on
 * top of it. A captain rolls this table once and normally takes nothing from
 * it; when a hook does land it is meant to be the thing the player remembers
 * about that run.
 *
 * Nothing in here creates a stat. The one hook with a hard mechanical cost —
 * the prosthetic leg — expresses it as a cap on an attribute that already
 * exists, which is exactly how design wrote it.
 */

import {
  CHARACTER_HOOKS,
  MERCENARY_PROFESSIONS,
  PREJUDICE_TARGETS,
  hookById,
} from '../content/characterHooks';
import type { Rng } from './rng';
import { HOOKS } from './tuning';
import type { Character, CharacterHookId } from './types';

/** The hooks that roll independently on their own rarity. */
const ROLLED: { id: CharacterHookId; chance: number }[] = [
  { id: 'earthMap', chance: HOOKS.earthMap },
  { id: 'aceEasterEgg', chance: HOOKS.aceEasterEgg },
  { id: 'unhoused', chance: HOOKS.unhoused },
  { id: 'valuablePossession', chance: HOOKS.valuablePossession },
  { id: 'childhoodFriend', chance: HOOKS.childhoodFriend },
  { id: 'almostDrowned', chance: HOOKS.almostDrowned },
  { id: 'prosthetic', chance: HOOKS.prosthetic },
  { id: 'fearOfGhosts', chance: HOOKS.fearOfGhosts },
  { id: 'chess', chance: HOOKS.chess },
  { id: 'famousSinger', chance: HOOKS.famousSinger },
];

export function hasHook(character: Character, id: CharacterHookId): boolean {
  return character.hooks?.includes(id) ?? false;
}

export function addHook(character: Character, id: CharacterHookId): void {
  character.hooks ??= [];
  if (!character.hooks.includes(id)) character.hooks.push(id);
}

/**
 * Roll a captain's authored hooks. At most one of the rare life hooks lands,
 * so a captain is never a pile of exceptions; the kit hook is separate because
 * it follows from the work they did rather than from luck.
 */
export function rollCaptainHooks(character: Character, rng: Rng, professionId?: string): void {
  const eligible = ROLLED.filter(({ id }) => {
    const entry = hookById(id);
    return entry ? character.age >= entry.minAge : false;
  });

  // One draw, weighted by each hook's own rarity, against the odds of drawing
  // nothing at all. Most captains come out of this with an ordinary life.
  const total = eligible.reduce((sum, e) => sum + e.chance, 0);
  if (total > 0 && rng.chance(total)) {
    const picked = rng.weighted(eligible.map((e) => ({ value: e.id, weight: e.chance })));
    addHook(character, picked);
  }

  if (professionId && MERCENARY_PROFESSIONS.has(professionId)) {
    addHook(character, 'mercenaryKit');
  }

  applyHookConsequences(character, rng);
}

/**
 * Crew and recruits can carry a hook too, far more rarely, and never the two
 * that only make sense on the protagonist.
 */
export function rollCrewHooks(character: Character, rng: Rng, professionId?: string): void {
  if (rng.chance(HOOKS.crewHookChance)) {
    const eligible = ROLLED.filter(({ id }) => {
      const entry = hookById(id);
      return entry && !entry.captainOnly && character.age >= entry.minAge;
    });
    if (eligible.length > 0) {
      addHook(
        character,
        rng.weighted(eligible.map((e) => ({ value: e.id, weight: e.chance }))),
      );
    }
  }

  // The dark one, and only on somebody who is actually good enough at it for
  // the reluctance to cost anyone anything.
  if (
    character.skills.surgery >= HOOKS.prejudicedSurgeonMinSkill &&
    rng.chance(HOOKS.prejudicedSurgeon)
  ) {
    addHook(character, 'prejudicedSurgeon');
    character.prejudiceTarget = rng.pick(PREJUDICE_TARGETS);
  }

  if (professionId && MERCENARY_PROFESSIONS.has(professionId)) {
    addHook(character, 'mercenaryKit');
  }

  applyHookConsequences(character, rng);
}

/**
 * The hooks with a direct physical consequence. Applied after the ordinary
 * generator has finished, so nothing can raise the value back afterwards.
 */
export function applyHookConsequences(character: Character, rng: Rng): void {
  if (hasHook(character, 'prosthetic')) {
    character.attributes.agility = Math.min(
      character.attributes.agility,
      HOOKS.prostheticAgilityCap,
    );
  }

  if (hasHook(character, 'aceEasterEgg')) {
    character.name = 'Han';
    character.surname = 'Dublo';
    character.skills.piloting = Math.max(
      character.skills.piloting,
      rng.int(HOOKS.aceMinimumPiloting, 99),
    );
    character.potential.piloting = { grade: 'A', specialization: 1.2 };
  }
}

/** The permanent ceiling on an attribute, where a hook has set one. */
export function attributeCap(character: Character, key: keyof Character['attributes']): number {
  if (key === 'agility' && hasHook(character, 'prosthetic')) {
    return HOOKS.prostheticAgilityCap;
  }
  return 15;
}

/**
 * How much less willing this person is to give that particular patient their
 * best. Zero for almost everybody. Never a refusal, and never applied to a
 * character the player is controlling directly.
 */
export function treatmentWillingness(healer: Character, patientGroup?: string): number {
  if (!patientGroup) return 0;
  if (!hasHook(healer, 'prejudicedSurgeon')) return 0;
  if (healer.prejudiceTarget !== patientGroup) return 0;
  return HOOKS.prejudiceWillingnessPenalty;
}

/**
 * What a hook costs somebody emotionally, on top of whatever their personality
 * already felt. Deliberately narrow: two hooks are about fear, and fear is the
 * only thing they add. Everything else in a life goes through Stress,
 * Resilience, Composure and the trait library the same as anyone's.
 */
export function hookStress(character: Character, tags: readonly string[]): number {
  let stress = 0;
  const has = (tag: string) => tags.includes(tag);

  // A haunting is genuinely worse for somebody who has always been afraid of
  // exactly this, and their Will is what decides how much worse.
  if (hasHook(character, 'fearOfGhosts') && (has('mystery') || has('uncertainty'))) {
    const will = (character.attributes.composure + character.attributes.resilience) / 2;
    stress += HOOKS.fearStress * (1 - Math.min(1, will / 18));
  }

  // They remember the part where they stopped struggling.
  if (hasHook(character, 'almostDrowned') && (has('submersion') || has('deep_water'))) {
    const will = (character.attributes.composure + character.attributes.resilience) / 2;
    stress += HOOKS.fearStress * (1 - Math.min(1, will / 20));
  }

  return stress;
}

/** The hook lines for this person, ready to show on their history. */
export function hookLines(character: Character): string[] {
  const lines: string[] = [];
  for (const id of character.hooks ?? []) {
    const entry = CHARACTER_HOOKS.find((h) => h.id === id);
    if (entry) lines.push(entry.text);
  }
  return lines;
}

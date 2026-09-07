/**
 * Semantic tags: how the world tells personality what just happened.
 *
 * Traits subscribe to tags. Nothing in personality code names an event, and
 * nothing in event content names a trait — this module is the whole of the
 * join between them.
 *
 * Most tags are derived from structure the game already has. An event choice
 * that wounds somebody is `danger` and `physical_risk`; one that pays is
 * `wealth`; one that loses a crew member is `sacrifice_crew`. That gives every
 * authored event in the game a personality reaction without hand-tagging any
 * of them.
 *
 * Content can also carry authored tags where the structure cannot tell —
 * `deception`, `mercy`, `promise` do not show up in an effects block — and
 * those are additive. The trait library names far more tags than the world
 * currently emits; the rest sit dormant, which is the intended shape.
 */

import type { PersonalityTag } from '../content/personality';
import type { EventChoice, EventEffect } from './types';

/** The tags the game actually emits today. Everything else is a dormant hook. */
export const EMITTED_TAGS: PersonalityTag[] = [
  'danger',
  'physical_risk',
  'combat',
  'violence',
  'retreat',
  'protect_others',
  'rescue',
  'abandon_others',
  'sacrifice_crew',
  'compassion',
  'aid',
  'wealth',
  'opportunity',
  'spend',
  'conserve',
  'save',
  'loot',
  'delay',
  'urgency',
  'plan',
  'verify',
  'decisive_action',
  'explore',
  'mystery',
  'socialize',
  'trust',
  'craft_quality',
  'comfort',
  'home',
  'crew',
  'family',
  'duty',
];

function push(tags: Set<PersonalityTag>, ...added: PersonalityTag[]): void {
  for (const tag of added) tags.add(tag);
}

/** Every effects block a choice can resolve into, including its branches. */
function effectsOf(choice: EventChoice): EventEffect[] {
  const effects: EventEffect[] = [];
  if (choice.effects) effects.push(choice.effects);
  if (choice.result) effects.push(choice.result.effects);
  if (choice.outcomes) {
    for (const branch of Object.values(choice.outcomes)) {
      if (branch) effects.push(branch.effects);
    }
  }
  return effects;
}

/**
 * What an event choice means, read off what it actually does.
 *
 * Authored tags on the choice are added on top, so content can say the things
 * structure cannot see.
 */
export function tagsForChoice(choice: EventChoice): PersonalityTag[] {
  const tags = new Set<PersonalityTag>(choice.tags ?? []);
  const effects = effectsOf(choice);

  for (const effect of effects) {
    if (effect.wound || effect.combat) push(tags, 'danger', 'physical_risk');
    if (effect.combat) push(tags, 'combat', 'violence');
    if (effect.loseCrew) push(tags, 'sacrifice_crew', 'abandon_others');
    if ((effect.credits ?? 0) > 0) push(tags, 'wealth', 'opportunity');
    if ((effect.credits ?? 0) < 0) push(tags, 'spend');
    if ((effect.hours ?? 0) > 6) push(tags, 'delay', 'plan');
    if ((effect.morale ?? 0) > 0) push(tags, 'crew');
    if ((effect.medicine ?? 0) < 0) push(tags, 'aid', 'compassion');
    if (effect.items && effect.items.length > 0) push(tags, 'loot');
    if ((effect.fuel ?? 0) > 0 || (effect.food ?? 0) > 0) push(tags, 'conserve', 'save');
    if (effect.recruit) push(tags, 'socialize', 'trust', 'crew');
    if (effect.systems || (effect.hull ?? 0) > 0 || (effect.repairParts ?? 0) < 0) {
      push(tags, 'craft_quality');
    }
  }

  // A check is somebody committing to do a thing rather than avoid it.
  if (choice.check) {
    push(tags, 'decisive_action');
    if (choice.check.skill === 'exploration' || choice.check.skill === 'scavenging') {
      push(tags, 'explore', 'mystery');
    }
    if (choice.check.skill === 'persuasion' || choice.check.skill === 'negotiation') {
      push(tags, 'socialize');
    }
    if (choice.check.skill === 'firstAid' || choice.check.skill === 'surgery') {
      push(tags, 'aid', 'compassion');
    }
    if (choice.check.skill === 'navigation' || choice.check.skill === 'computers') {
      push(tags, 'verify', 'plan');
    }
  }

  // A choice that does nothing at all is a choice to stand back.
  if (tags.size === 0) push(tags, 'retreat');

  return [...tags];
}

// ---------------------------------------------------------------------------
// Tags for the things that are not events
// ---------------------------------------------------------------------------

/** A fight, as it ended. */
export function tagsForCombat(resolution: string, casualties: number): PersonalityTag[] {
  const tags: PersonalityTag[] = ['combat', 'violence', 'danger', 'physical_risk'];
  if (resolution === 'fled') tags.push('retreat');
  if (resolution === 'victory' || resolution === 'droveOff') tags.push('decisive_action');
  if (casualties > 0) tags.push('abandon_others', 'sacrifice_crew');
  return tags;
}

/** Somebody died. Everybody aboard has an opinion about that. */
export const TAGS_CREW_DEATH: PersonalityTag[] = [
  'crew',
  'abandon_others',
  'sacrifice_crew',
  'loss',
];

/** Treating a wound. */
export const TAGS_TREATMENT: PersonalityTag[] = ['aid', 'compassion', 'protect_others', 'crew'];

/** Working a ruin. */
export const TAGS_SCAVENGE: PersonalityTag[] = ['explore', 'mystery', 'loot', 'danger'];

/** Buying and selling. */
export function tagsForTrade(creditsSpent: number): PersonalityTag[] {
  return creditsSpent > 0 ? ['spend', 'wealth'] : ['save', 'conserve'];
}

/** Sitting with somebody, on purpose. */
export const TAGS_SOCIALISE: PersonalityTag[] = ['socialize', 'crew', 'trust'];

/** Sleeping somewhere that is not a corridor. */
export const TAGS_REST: PersonalityTag[] = ['comfort', 'home'];

/** Going back for somebody. */
export const TAGS_RESCUE: PersonalityTag[] = ['rescue', 'protect_others', 'danger'];

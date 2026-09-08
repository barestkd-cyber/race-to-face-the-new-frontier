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

/**
 * The tags the game actually emits today. Everything else in the library is a
 * dormant hook waiting on content that does not exist yet.
 *
 * Most are derived. The authored block is the exception: honesty, deception,
 * mercy and the rest cannot be read off an effects block, so they are written
 * onto the choices that genuinely are those things and nowhere else.
 */
export const EMITTED_TAGS: PersonalityTag[] = [
  // Danger and violence
  'danger',
  'physical_risk',
  'combat',
  'violence',
  'confrontation',
  'nonviolence',
  'deescalation',
  'retreat',
  'calm',
  'gamble',
  // People
  'crew',
  'family',
  'protect_others',
  'rescue',
  'abandon_others',
  'abandon_ally',
  'sacrifice_crew',
  'separation',
  'compassion',
  'aid',
  'socialize',
  'trust',
  'cooperation',
  'solo',
  'home',
  // Command
  'authority',
  'control',
  'delegation',
  'duty',
  'recognition',
  'institution',
  'autonomy',
  'self_reliance',
  // Money and stores
  'wealth',
  'opportunity',
  'spend',
  'save',
  'conserve',
  'loot',
  // Authored on choices, because no structure implies them
  'honesty',
  'deception',
  'mercy',
  'punishment',
  'promise',
  'humiliation',
  'privacy',
  'humor',
  'accountability',
  'routine',
  // Where you are standing
  'uncertainty',
  // Work and the world
  'plan',
  'verify',
  'decisive_action',
  'explore',
  'mystery',
  'novelty',
  'craft_quality',
  'delay',
  'comfort',
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
    // Whether the ship does this together or sends one person.
    push(tags, choice.check.participation === 'individual' ? 'solo' : 'cooperation');
    // A check that can go badly wrong is a gamble, and some people love that.
    if (choice.check.criticalRisk) push(tags, 'gamble');
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
  if (resolution === 'fled') tags.push('retreat', 'deescalation', 'nonviolence');
  if (resolution === 'truce') tags.push('deescalation', 'nonviolence');
  if (resolution === 'victory' || resolution === 'droveOff') {
    tags.push('decisive_action', 'confrontation');
  }
  // Coming out of a fight with everybody standing is its own kind of steadiness.
  if (casualties === 0 && resolution !== 'defeat') tags.push('calm');
  if (casualties > 0) tags.push('abandon_ally', 'sacrifice_crew', 'separation');
  return tags;
}

/**
 * Somebody died. Everybody aboard has an opinion about that, and each of them
 * has it as themselves.
 */
export const TAGS_CREW_DEATH: PersonalityTag[] = [
  'crew',
  'abandon_others',
  'abandon_ally',
  'sacrifice_crew',
  'separation',
];

/** Treating a wound. */
export const TAGS_TREATMENT: PersonalityTag[] = ['aid', 'compassion', 'protect_others', 'crew'];

/** Working a ruin. */
export const TAGS_SCAVENGE: PersonalityTag[] = ['explore', 'mystery', 'loot', 'danger'];

/** Buying and selling. */
export function tagsForTrade(creditsSpent: number): PersonalityTag[] {
  return creditsSpent > 0 ? ['spend', 'wealth'] : ['save', 'conserve'];
}

/** Time with somebody you are related to. */
export const TAGS_FAMILY: PersonalityTag[] = ['family', 'home', 'socialize'];

/** Sitting with somebody, on purpose. */
export const TAGS_SOCIALISE: PersonalityTag[] = ['socialize', 'crew', 'trust'];

/** Sleeping somewhere that is not a corridor. */
export const TAGS_REST: PersonalityTag[] = ['comfort', 'home'];

/** Going back for somebody. */
export const TAGS_RESCUE: PersonalityTag[] = ['rescue', 'protect_others', 'danger'];

/** Somewhere nobody aboard has been before. */
export const TAGS_NEW_PLACE: PersonalityTag[] = ['novelty', 'explore'];

/**
 * What a world feels like to stand on.
 *
 * Only the authored worlds say anything here. An ordinary biome is scenery;
 * a haunting is not, and neither is a place where the government can decide
 * you are not leaving.
 */
export function tagsForWorld(location: {
  specialWorld?: string;
  modifiers?: string[];
}): PersonalityTag[] {
  const tags = new Set<PersonalityTag>();
  switch (location.specialWorld) {
    case 'ghostPlanet':
      push(tags, 'mystery', 'uncertainty', 'danger');
      break;
    case 'gravityLockdown':
      push(tags, 'institution', 'control', 'autonomy');
      break;
    case 'obelisk':
      push(tags, 'mystery', 'novelty', 'explore');
      break;
    case 'goldenDiamond':
      push(tags, 'wealth', 'opportunity');
      break;
    case 'underwaterCity':
    case 'dirtValuing':
      push(tags, 'novelty', 'explore');
      break;
    default:
      break;
  }
  return [...tags];
}

/**
 * Who is leading this away party.
 *
 * The captain going themselves is taking hold of it; sending the crew lead is
 * handing it over. Both are real to somebody.
 */
export function tagsForCommand(captainLeads: boolean): PersonalityTag[] {
  return captainLeads
    ? ['authority', 'control', 'decisive_action']
    : ['delegation', 'trust', 'autonomy'];
}

/** Fixing the ship yourself, or paying somebody who does it for a living. */
export function tagsForRepair(paidTheYard: boolean): PersonalityTag[] {
  return paidTheYard
    ? ['institution', 'spend', 'delegation']
    : ['self_reliance', 'craft_quality', 'autonomy'];
}

/** A job finished and paid for. */
export const TAGS_MISSION_DONE: PersonalityTag[] = ['recognition', 'duty', 'wealth'];

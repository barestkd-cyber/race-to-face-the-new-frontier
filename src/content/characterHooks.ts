/**
 * AUTHORED CHARACTER HOOKS — pure data, no logic.
 *
 * The 250 professions and 500 life events are the ordinary generator. These
 * are the exceptions: hand-written pieces of a life that the game recognises
 * by name and treats specially somewhere.
 *
 * A hook is a flag, never a stat. None of them adds an attribute, a skill, or
 * a bar. Each one is read by exactly the content it belongs to, and where a
 * hook has no content yet it does nothing but sit on the character sheet and
 * wait — which is the honest state for a hook whose world V1 cannot reach.
 */

import type { CharacterHookId } from '../engine/types';

export interface CharacterHookEntry {
  id: CharacterHookId;
  /** The line that appears in the character's history. */
  text: string;
  /** What it means, in one sentence, once it is known. */
  effect: string;
  /** Nobody younger than this has had time for it to be true. */
  minAge: number;
  /** True where the hook only makes sense on the protagonist. */
  captainOnly?: boolean;
}

export const CHARACTER_HOOKS: CharacterHookEntry[] = [
  {
    id: 'earthMap',
    text: 'Your grandfather went further than anyone believed him about. He came back with a route, a name for a world nobody here has heard of, and the deed to a garage on it. Everyone thought he was lying. You have the route.',
    effect: "You know exactly where Earth is, and there is a ship waiting in your grandfather's garage.",
    minAge: 20,
    captainOnly: true,
  },
  {
    id: 'mercenaryKit',
    text: 'You worked contracts. The pay was inconsistent and the kit was not — you still have the plate and the weapons you were issued, and they are better than anything you could afford now.',
    effect: 'You start with serious conventional armour and weapons. No energy gear; that was never yours.',
    minAge: 22,
  },
  {
    id: 'unhoused',
    text: 'For two years you had nowhere. You learned which doorways are watched, which are not, and how to be somewhere without anyone deciding you are there.',
    effect: 'You are hard to notice in rough, poorly governed places. Nowhere else.',
    minAge: 18,
  },
  {
    id: 'valuablePossession',
    text: 'There is one thing you kept when everything else went. It is worth more than you will admit and you have never seriously considered selling it.',
    effect: 'You own something genuinely valuable, and parting with it will cost you something that is not money.',
    minAge: 16,
  },
  {
    id: 'childhoodFriend',
    text: 'You had a best friend before any of this. They left the Homeworld years ago and you have not heard anything since, which does not mean nothing happened to them.',
    effect: 'They are out there somewhere, and the galaxy is smaller than it looks.',
    minAge: 18,
  },
  {
    id: 'almostDrowned',
    text: 'You went under once and did not come back up on your own. You remember the part where you stopped struggling.',
    effect: 'Deep water and anything that seals over your head are much harder for you than for other people.',
    minAge: 14,
  },
  {
    id: 'prosthetic',
    text: 'You lost the leg below the knee. The replacement is decent, it fits, and it is not the same.',
    effect: 'Your Agility can never rise above 12.',
    minAge: 16,
  },
  {
    id: 'fearOfGhosts',
    text: 'You do not believe in ghosts and you will not sleep in a room where somebody died. Both of those have been true your whole life.',
    effect: 'Anywhere that feels haunted is genuinely worse for you than for the person standing next to you.',
    minAge: 13,
  },
  {
    id: 'chess',
    text: 'You play chess. Not well enough for it to have been a career, well enough that people stop talking when you sit down.',
    effect: 'Occasionally, and unpredictably, this matters.',
    minAge: 14,
  },
  {
    id: 'famousSinger',
    text: 'You were, briefly and genuinely, famous for singing. It was a long time ago. People still recognise the face and cannot always place it.',
    effect: 'Doors open. So do conversations you would rather not have.',
    minAge: 24,
  },
  {
    id: 'prejudicedSurgeon',
    text: 'They are one of the best surgeons you will ever meet, and there is a group of people they will not hurry for. They have never said so out loud.',
    effect: 'They are slower and less willing to treat that group. It is not a refusal, and it is not visible until it costs somebody.',
    minAge: 30,
  },
  {
    id: 'aceEasterEgg',
    text: 'Nobody can explain how you fly the way you do. Several people have tried.',
    effect: 'You are an extraordinary pilot.',
    minAge: 24,
    captainOnly: true,
  },
];

export function hookById(id: CharacterHookId): CharacterHookEntry | undefined {
  return CHARACTER_HOOKS.find((h) => h.id === id);
}

/**
 * Professions where the memorable advantage is the kit rather than a skill
 * number. Somebody who did this work walks aboard already armoured.
 */
export const MERCENARY_PROFESSIONS = new Set([
  'security-contractor',
  'infantry-soldier',
  'gang-enforcer',
  'veteran-officer',
  'armor-crewman',
  'ordnance-specialist',
]);

/** Who the prejudiced surgeon has decided against. Groups, never individuals. */
export const PREJUDICE_TARGETS = [
  'Oruun',
  'Avaralan',
  'Tavren',
  'station-born',
  'the unhoused',
  'indentured labour',
];

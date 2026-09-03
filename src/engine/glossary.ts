/**
 * One plain sentence for every stat, so nobody spends their only allocation
 * points on words they cannot picture. These surface on tap during character
 * generation and anywhere else a bare stat name would otherwise stand alone.
 */

import type { AttributeKey, SkillKey } from './types';

export const ATTRIBUTE_INFO: Record<AttributeKey, string> = {
  strength: 'Raw force. Carrying, hauling, hitting hard, and shrugging off physical strain.',
  endurance: 'Staying power. Health, resisting fatigue and hunger, surviving what should kill you.',
  agility: 'Speed of body. Acting sooner in a fight and getting clear of things.',
  handEye: 'Aim. Steadies every shot and any fine work done at speed.',
  proprioception: 'Knowing where your body is. Balance, climbing, tight spaces, zero-g.',
  steadiness: 'Calm hands under load. Surgery, defusal, threading a ship through a gap.',
  learning: 'How fast new skills come. Cheapens nothing, but training bites deeper.',
  reasoning: 'Working things out. Diagnosing faults, solving problems you have never seen.',
  memory: 'Retention. Routes, faces, procedures, and what somebody said three weeks ago.',
  perception: 'Noticing. Spotting the hidden branch, the ambush, the loose deck plate.',
  evaluation: 'Judging what you see. How honest your odds and risk readings are.',
  decisionMaking: 'Acting coherently under pressure. Runs the ship when you are not there.',
  charisma: 'Being liked. Warms first meetings and softens hard asks.',
  leadership: 'Carrying a group. Pulls the weakest member of a team up toward the rest.',
  socialAwareness: 'Reading the room. Sensing motives, moods, and when to stop talking.',
  resilience: 'Bouncing back. Wound recovery and lasting through hardship.',
  composure: 'Nerve. Keeping your head — and your aim — when things go wrong.',
  discipline: 'Self-control. Sticking to the plan, resisting temptation and panic.',
};

export const SKILL_INFO: Record<SkillKey, string> = {
  striking: 'Hitting people — fists, elbows, whatever ends it fastest.',
  brawling: 'Grabs, holds, and staying upright when it gets messy.',
  meleeWeapons: 'Blades, clubs, axes — anything swung or thrust.',
  firearms: 'Pistols, rifles, shotguns. The most common way fights end.',
  energyWeapons: 'Lasers and plasma. Rarer, pricier, hits differently.',
  shipWeapons: 'The ship’s mounted guns, when it comes to that.',
  closeQuarters: 'Fighting in corridors and rooms — the ugly, cramped kind.',
  mechanicalEngineering: 'Engines, hulls, pumps. Keeps the ship a ship.',
  electricalEngineering: 'Power, wiring, systems. Everything the engine feeds.',
  weaponsmithing: 'Maintaining and improving weapons and armor.',
  piloting: 'Flying. Docking, landings, and not dying in a bad approach.',
  navigation: 'Plotting routes. Shorter legs, fewer surprises, less fuel.',
  firstAid: 'Stopping the bleeding. The difference between hurt and dead.',
  medicalDiagnostics: 'Knowing what is actually wrong before you treat it.',
  surgery: 'Fixing serious wounds. Somebody aboard should have this.',
  medicalResearch: 'Deeper medicine — illness, drugs, the strange cases.',
  scavenging: 'Finding what is worth taking, and getting it out intact.',
  exploration: 'Moving through dangerous ground without it killing you.',
  persuasion: 'Changing minds — recruits, guards, people who said no.',
  negotiation: 'Changing terms — prices, wages, what a deal costs you.',
  lockpicking: 'Opening what somebody locked. Doors, safes, lockers.',
  computers: 'Terminals, records, security systems, and what they hide.',
  stealth: 'Not being seen. Sometimes the whole plan.',
  explosives: 'Placing and disarming charges without becoming a story.',
  cooking: 'Real meals from stores. Feeds morale as much as bodies.',
};

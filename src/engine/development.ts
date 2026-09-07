/**
 * How a person develops.
 *
 * The advancement rules are not changed here. Costs, potential caps, the two
 * XP pools and the specialisation ladder are exactly what they were — this
 * module only decides *which* raises to buy when the player says "carry on in
 * this direction", and then buys them with the existing purchase function.
 *
 * The player makes the development decision. The game does the bookkeeping.
 *
 * The options are generated from the character, never from a preset list: what
 * they have been doing lately, what they are studying, what they are already
 * good at, and what the job they hold actually runs on.
 */

import { skillCap } from './check';
import { quoteSkillUpgrade, upgradeSkill, spendableXp } from './progression';
import { COMMAND } from './tuning';
import { focuses } from './study';
import {
  SKILL_LABELS,
  type Character,
  type CharacterRole,
  type GameState,
  type SkillKey,
} from './types';

// ---------------------------------------------------------------------------
// The diary
// ---------------------------------------------------------------------------

/** How many recent acts are remembered. A window, not a score. */
const LOG_LIMIT = 24;

/**
 * Record that somebody just did something with a skill. Called from the places
 * the engine already resolves work — a fight, a job, a site, a surgery — so it
 * costs nothing and invents nothing.
 */
export function noteSkillUse(character: Character | undefined | null, skill: SkillKey): void {
  if (!character || !character.alive) return;
  const log = character.skillLog ?? [];
  log.push(skill);
  character.skillLog = log.length > LOG_LIMIT ? log.slice(log.length - LOG_LIMIT) : log;
}

/** Same, for a whole party finishing one piece of work. */
export function notePartySkillUse(party: (Character | undefined)[], skill: SkillKey): void {
  for (const member of party) noteSkillUse(member, skill);
}

/** Skills this person has actually been using, most-used first. */
export function recentSkills(character: Character): { skill: SkillKey; count: number }[] {
  const counts = new Map<SkillKey, number>();
  for (const skill of character.skillLog ?? []) {
    counts.set(skill, (counts.get(skill) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([skill, count]) => ({ skill, count }))
    .sort((a, b) => b.count - a.count);
}

// ---------------------------------------------------------------------------
// What each job runs on
// ---------------------------------------------------------------------------

/**
 * The skills a role is expected to bring. Used only to name a plausible
 * direction — it grants nothing and gates nothing.
 */
const ROLE_SKILLS: Record<CharacterRole, SkillKey[]> = {
  captain: ['persuasion', 'negotiation', 'navigation'],
  navigator: ['navigation', 'computers', 'piloting'],
  engineer: ['mechanicalEngineering', 'electricalEngineering', 'weaponsmithing'],
  medic: ['firstAid', 'medicalDiagnostics', 'surgery'],
  gunner: ['firearms', 'shipWeapons', 'energyWeapons'],
  scavenger: ['scavenging', 'exploration', 'lockpicking'],
  pilot: ['piloting', 'navigation', 'shipWeapons'],
  technician: ['electricalEngineering', 'computers', 'mechanicalEngineering'],
  crew: ['scavenging', 'firstAid', 'firearms'],
};

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface DevelopmentOption {
  id: string;
  /** "Follow the story", "Focus on Surgery" — generated, not canned. */
  label: string;
  /** Why this option exists for this person, in their own terms. */
  reason: string;
  /** The skills the points go into, in priority order. */
  skills: SkillKey[];
}

/** Room left to train, in raw points. Specialisation deliberately does not lift this. */
function headroom(character: Character, skill: SkillKey): number {
  return skillCap(character, skill) - (character.skills[skill] ?? 0);
}

function trainable(character: Character, skills: SkillKey[]): SkillKey[] {
  const seen = new Set<SkillKey>();
  return skills.filter((skill) => {
    if (seen.has(skill)) return false;
    seen.add(skill);
    return headroom(character, skill) > 0;
  });
}

function names(skills: SkillKey[]): string {
  const labels = skills.map((s) => SKILL_LABELS[s]);
  if (labels.length <= 1) return labels[0] ?? 'nothing';
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}

/**
 * Two to four directions this particular person could plausibly go, plus the
 * always-available option of doing it by hand. Never the same list twice for
 * two different people unless they have genuinely lived the same life.
 */
export function developmentOptions(character: Character): DevelopmentOption[] {
  const options: DevelopmentOption[] = [];

  // 1. Where their actual experience has been taking them.
  const recent = trainable(
    character,
    recentSkills(character).map((r) => r.skill),
  ).slice(0, 3);
  if (recent.length > 0) {
    options.push({
      id: 'story',
      label: 'Follow the story',
      reason: `Lately ${character.name}'s hours have gone into ${names(recent)}. Keep going that way.`,
      skills: recent,
    });
  }

  // 2. What they have committed study hours to — declared intent beats history.
  const studied = trainable(character, [
    ...(character.study ? [character.study.skill] : []),
    ...focuses(character).map((f) => f.skill),
  ]).slice(0, 2);
  if (studied.length > 0) {
    options.push({
      id: 'study',
      label: `Back the study — ${SKILL_LABELS[studied[0]!]}`,
      reason: `They have put real hours into ${names(studied)}. Training catches the theory up.`,
      skills: studied,
    });
  }

  // 3. Their sharpest edge, sharpened further.
  const strongest = trainable(
    character,
    ([...Object.keys(character.skills)] as SkillKey[]).sort(
      (a, b) => (character.skills[b] ?? 0) - (character.skills[a] ?? 0),
    ),
  ).slice(0, 1);
  if (strongest.length > 0 && !options.some((o) => o.skills[0] === strongest[0])) {
    options.push({
      id: 'strength',
      label: `Lean into ${SKILL_LABELS[strongest[0]!]}`,
      reason: `It is already the best thing about them. Ceiling of ${skillCap(character, strongest[0]!)}.`,
      skills: strongest,
    });
  }

  // 4. The job they hold, if it is not already covered.
  const roleSkills = trainable(character, ROLE_SKILLS[character.role] ?? []).slice(0, 3);
  if (roleSkills.length > 0 && !options.some((o) => o.skills[0] === roleSkills[0])) {
    options.push({
      id: 'role',
      label: character.role === 'crew' ? 'General ship work' : `The ${character.role}'s work`,
      reason: `What the job actually runs on: ${names(roleSkills)}.`,
      skills: roleSkills,
    });
  }

  return options.slice(0, 4);
}

// ---------------------------------------------------------------------------
// Spending
// ---------------------------------------------------------------------------

export interface DevelopmentResult {
  ok: boolean;
  /** What was bought, ready to show. */
  lines: string[];
  spent: number;
}

/**
 * Buy as much of a direction as the pools will pay for, cheapest raise first so
 * the points go furthest, and stop the moment nothing in the plan is affordable.
 * Every purchase goes through the ordinary upgrade path, so caps, costs and the
 * personal-before-crew pool order are exactly as they always were.
 */
export function applyDevelopment(
  state: GameState,
  character: Character,
  optionId: string,
): DevelopmentResult {
  const option = developmentOptions(character).find((o) => o.id === optionId);
  if (!option) return { ok: false, lines: ['That direction is no longer open.'], spent: 0 };

  const before: Partial<Record<SkillKey, number>> = {};
  for (const skill of option.skills) before[skill] = character.skills[skill] ?? 0;

  let spent = 0;
  // Bounded hard: one raise per iteration, and never more than the pools hold.
  for (let guard = 0; guard < 200; guard += 1) {
    const affordable = option.skills
      .map((skill) => ({ skill, quote: quoteSkillUpgrade(state, character, skill) }))
      .filter((entry) => entry.quote.affordable)
      .sort((a, b) => a.quote.cost - b.quote.cost);
    if (affordable.length === 0) break;

    const pick = affordable[0]!;
    const cost = pick.quote.cost;
    const result = upgradeSkill(state, character, pick.skill);
    if (!result.ok) break;
    spent += cost;
  }

  if (spent === 0) {
    return {
      ok: false,
      lines: [`Not enough experience banked to raise ${names(option.skills)} yet.`],
      spent: 0,
    };
  }

  const gains = option.skills
    .filter((skill) => (character.skills[skill] ?? 0) > (before[skill] ?? 0))
    .map(
      (skill) =>
        `${SKILL_LABELS[skill]} ${before[skill]} → ${character.skills[skill]}`,
    );

  return {
    ok: true,
    spent,
    lines: [`${character.name} ${character.surname}: ${gains.join(' · ')}`],
  };
}

/** Whether there is enough banked to bother asking the question. */
export function hasDevelopmentToSpend(state: GameState, character: Character): boolean {
  if (spendableXp(state, character) <= 0) return false;
  return developmentOptions(character).some((option) =>
    option.skills.some((skill) => quoteSkillUpgrade(state, character, skill).affordable),
  );
}

// ---------------------------------------------------------------------------
// The simulation's half
// ---------------------------------------------------------------------------

/**
 * Crew develop themselves.
 *
 * The player develops the protagonist; the simulation develops the crew. This
 * spends a crew member's OWN experience, in the direction their work has
 * actually been taking them — it never touches the shared pool, which stays
 * the player's to spend on the captain.
 *
 * The player still steers this, by deciding who works, who studies and who
 * goes out. They just do not have to keep twenty-five skill sheets by hand.
 */
export function autoDevelop(state: GameState, character: Character): string[] {
  if (character.id === state.captainId) return [];
  if (character.personalXp < COMMAND.crewAutoDevelopMinXp) return [];

  const option = developmentOptions(character)[0];
  if (!option) return [];

  const lines: string[] = [];
  for (let guard = 0; guard < 40; guard += 1) {
    const affordable = option.skills
      .map((skill) => ({ skill, quote: quoteSkillUpgrade(state, character, skill) }))
      // Their own experience only. The crew pool belongs to the captain.
      .filter((entry) => entry.quote.affordable && entry.quote.source === 'personal')
      .sort((a, b) => a.quote.cost - b.quote.cost);
    if (affordable.length === 0) break;

    const pick = affordable[0]!;
    const before = character.skills[pick.skill] ?? 0;
    const result = upgradeSkill(state, character, pick.skill);
    if (!result.ok) break;
    lines.push(
      `${character.name} is getting better at ${SKILL_LABELS[pick.skill]} — ${before} to ${character.skills[pick.skill]}.`,
    );
  }
  return lines;
}

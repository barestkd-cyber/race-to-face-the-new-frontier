/**
 * XP and progression.
 *
 * Two pools: Personal XP belongs to one character; Crew XP may be spent on any
 * crew member. Use-based growth exists but is secondary. Potential caps always
 * apply.
 */

import { skillCap } from './check';
import { deriveMaxHealth } from './character';
import { ATTRIBUTE_GEN, SPEC, XP } from './tuning';
import { pushLog } from './log';
import { SKILL_KEYS, SKILL_LABELS, type AttributeKey, type Character, type GameState, type SkillKey } from './types';

// ---------------------------------------------------------------------------
// Costs
// ---------------------------------------------------------------------------

/** Cost to raise a skill by one point: max(1, floor(current / 10) + 1). */
export function skillUpgradeCost(current: number): number {
  return Math.max(1, Math.floor(current / XP.skillCostDivisor) + XP.skillCostOffset);
}

/** Cost to raise an attribute by one point: base + current * factor. */
export function attributeUpgradeCost(current: number): number {
  return XP.attributeCostBase + current * XP.attributeCostFactor;
}

export interface UpgradeQuote {
  cost: number;
  affordable: boolean;
  capped: boolean;
  /** Which pool would pay, preferring personal XP. */
  source: 'personal' | 'crew' | 'none';
  reason?: string;
}

export function quoteSkillUpgrade(
  state: GameState,
  character: Character,
  skill: SkillKey,
): UpgradeQuote {
  const current = character.skills[skill] ?? 0;
  const cap = skillCap(character, skill);
  const cost = skillUpgradeCost(current);

  if (current >= cap) {
    return { cost, affordable: false, capped: true, source: 'none', reason: `Capped at ${cap}` };
  }
  if (character.personalXp >= cost) {
    return { cost, affordable: true, capped: false, source: 'personal' };
  }
  if (state.crewXp >= cost) {
    return { cost, affordable: true, capped: false, source: 'crew' };
  }
  return { cost, affordable: false, capped: false, source: 'none', reason: 'Not enough XP' };
}

export function quoteAttributeUpgrade(
  state: GameState,
  character: Character,
  attribute: AttributeKey,
): UpgradeQuote {
  const current = character.attributes[attribute];
  const cost = attributeUpgradeCost(current);

  if (current >= ATTRIBUTE_GEN.maxPerAttribute) {
    return {
      cost,
      affordable: false,
      capped: true,
      source: 'none',
      reason: `Maximum is ${ATTRIBUTE_GEN.maxPerAttribute}`,
    };
  }
  if (character.personalXp >= cost) {
    return { cost, affordable: true, capped: false, source: 'personal' };
  }
  if (state.crewXp >= cost) {
    return { cost, affordable: true, capped: false, source: 'crew' };
  }
  return { cost, affordable: false, capped: false, source: 'none', reason: 'Not enough XP' };
}

// ---------------------------------------------------------------------------
// Spending
// ---------------------------------------------------------------------------

function pay(state: GameState, character: Character, quote: UpgradeQuote): boolean {
  if (!quote.affordable) return false;
  if (quote.source === 'personal') {
    character.personalXp -= quote.cost;
    return true;
  }
  if (quote.source === 'crew') {
    state.crewXp -= quote.cost;
    return true;
  }
  return false;
}

export function upgradeSkill(
  state: GameState,
  character: Character,
  skill: SkillKey,
): { ok: boolean; message: string } {
  const quote = quoteSkillUpgrade(state, character, skill);
  if (!quote.affordable) return { ok: false, message: quote.reason ?? 'Cannot raise that.' };
  if (!pay(state, character, quote)) return { ok: false, message: 'Cannot raise that.' };

  character.skills[skill] += 1;
  return {
    ok: true,
    message: `${character.name}'s ${skill} is now ${character.skills[skill]}.`,
  };
}

export function upgradeAttribute(
  state: GameState,
  character: Character,
  attribute: AttributeKey,
): { ok: boolean; message: string } {
  const quote = quoteAttributeUpgrade(state, character, attribute);
  if (!quote.affordable) return { ok: false, message: quote.reason ?? 'Cannot raise that.' };
  if (!pay(state, character, quote)) return { ok: false, message: 'Cannot raise that.' };

  character.attributes[attribute] += 1;

  // Health is derived, so Endurance and Strength changes must propagate.
  const previousMax = character.maxHealth;
  character.maxHealth = deriveMaxHealth(character.attributes);
  character.health += Math.max(0, character.maxHealth - previousMax);

  return {
    ok: true,
    message: `${character.name}'s ${attribute} is now ${character.attributes[attribute]}.`,
  };
}

// ---------------------------------------------------------------------------
// Awards
// ---------------------------------------------------------------------------

export function awardPersonal(character: Character, amount: number): void {
  character.personalXp += Math.max(0, Math.round(amount));
}

export function awardCrew(state: GameState, amount: number): void {
  state.crewXp += Math.max(0, Math.round(amount));
}

/** Total XP available to spend on one character, across both pools. */
export function spendableXp(state: GameState, character: Character): number {
  return character.personalXp + state.crewXp;
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

export function skillCapLabel(character: Character, skill: SkillKey): string {
  const potential = character.potential[skill];
  const cap = skillCap(character, skill);
  const spec = potential.specialization > 1 ? ` ×${potential.specialization.toFixed(2)}` : '';
  return `${potential.grade}${spec} → ${cap}`;
}

/** How close a character is to their ceiling in a skill, 0..1. */
export function skillProgress(character: Character, skill: SkillKey): number {
  const cap = skillCap(character, skill);
  if (cap <= 0) return 0;
  return Math.max(0, Math.min(1, character.skills[skill] / cap));
}

// ---------------------------------------------------------------------------
// Knowledge specialization — placing devotion
// ---------------------------------------------------------------------------

export interface PlaceSpecResult {
  ok: boolean;
  message: string;
}

/**
 * Commit one unplaced mark to a skill, permanently. This is the one lever of
 * growth that is pure will rather than dice: the mark raises the skill's
 * ceiling for life and can never be moved again.
 *
 * The only gate is honesty — you cannot devote yourself to a craft you have
 * not begun.
 */
export function placeSpecialization(
  state: GameState,
  character: Character,
  skill: SkillKey,
  multiplier: number,
): PlaceSpecResult {
  const slotIndex = character.specSlots.indexOf(multiplier);
  if (slotIndex === -1) {
    return { ok: false, message: 'No such mark left to place.' };
  }
  if (character.potential[skill].specialization > 1) {
    return { ok: false, message: `${character.name} is already devoted to that craft.` };
  }
  if ((character.skills[skill] ?? 0) < SPEC.placeMinSkill) {
    return {
      ok: false,
      message: `Devotion follows practice — ${SKILL_LABELS[skill]} needs to reach ${SPEC.placeMinSkill} first.`,
    };
  }

  character.specSlots.splice(slotIndex, 1);
  character.potential[skill] = {
    ...character.potential[skill],
    specialization: multiplier,
  };

  const cap = skillCap(character, skill);
  pushLog(
    state,
    'milestone',
    `${character.name} commits to ${SKILL_LABELS[skill]} — ceiling now ${cap}.`,
  );
  return {
    ok: true,
    message: `${character.name} commits to ${SKILL_LABELS[skill]}. Ceiling raised to ${cap}, for good.`,
  };
}

/** Skills a given mark could legally land on right now. */
export function placeableSkills(character: Character): SkillKey[] {
  if (character.specSlots.length === 0) return [];
  return SKILL_KEYS.filter(
    (skill) =>
      character.potential[skill].specialization === 1 &&
      (character.skills[skill] ?? 0) >= SPEC.placeMinSkill,
  );
}

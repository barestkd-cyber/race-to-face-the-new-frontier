/**
 * Universal d100 check system.
 *
 * Skill is base capability. Attributes magnify Skill. Attributes cannot
 * substitute for Skill. Roll low; five outcome bands; target clamps to 5..95.
 */

import { CHECK, MORALE, POTENTIAL_CAP, SKILLS_TUNING } from './tuning';
import type { Rng } from './rng';
import {
  SKILL_PRIMARY_ATTRIBUTES,
  type AttributeKey,
  type Character,
  type CharacterId,
  type CheckModifier,
  type CheckOutcome,
  type CheckRequest,
  type CheckResult,
  type SkillKey,
} from './types';

// ---------------------------------------------------------------------------
// Skill ceilings
// ---------------------------------------------------------------------------

/** The highest this character can ever raise this skill. */
export function skillCap(character: Character, skill: SkillKey): number {
  const potential = character.potential[skill];
  const base = POTENTIAL_CAP[potential.grade];
  if (!SKILLS_TUNING.specializationRaisesCap) return base;
  return Math.round(base * potential.specialization);
}

/**
 * Skill value as it enters a check. When specialization raises the cap it is
 * already baked into the stored value's ceiling, so nothing is added here.
 * When it does not, it becomes a proportional roll bonus instead.
 */
export function effectiveSkill(character: Character, skill: SkillKey): number {
  const raw = character.skills[skill] ?? 0;
  if (SKILLS_TUNING.specializationRaisesCap) return raw;
  return raw * character.potential[skill].specialization;
}

// ---------------------------------------------------------------------------
// Per-character condition modifiers
// ---------------------------------------------------------------------------

const PHYSICAL_ATTRIBUTES = new Set<AttributeKey>([
  'strength',
  'endurance',
  'agility',
  'handEye',
  'proprioception',
  'steadiness',
]);

/** A skill is "physical" when either primary attribute is physical or precision. */
export function isPhysicalSkill(skill: SkillKey, override?: [AttributeKey, AttributeKey]): boolean {
  const pair = override ?? SKILL_PRIMARY_ATTRIBUTES[skill];
  return PHYSICAL_ATTRIBUTES.has(pair[0]) || PHYSICAL_ATTRIBUTES.has(pair[1]);
}

/** Total wound penalty for one character, weighted down for non-physical work. */
export function woundPenalty(character: Character, physical: boolean): number {
  let total = 0;
  for (const wound of character.wounds) {
    total += CHECK.woundPenalty[wound.severity] ?? 0;
  }
  return physical ? total : total * 0.5;
}

export function stressPenalty(character: Character): number {
  const over = character.stress - CHECK.stressPenaltyFloor;
  if (over <= 0) return 0;
  return Math.min(CHECK.maxStressPenalty, over * CHECK.stressPenaltyPerPoint);
}

export function exhaustionPenalty(character: Character): number {
  const under = CHECK.exhaustionFloor - character.rested;
  if (under <= 0) return 0;
  return Math.min(CHECK.maxExhaustionPenalty, under * CHECK.exhaustionPenaltyPerPoint);
}

export function moraleModifier(morale: number): number {
  for (const band of MORALE.bands) {
    if (morale >= band.min) return MORALE.checkModifier[band.key] ?? 0;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Secondary skill contribution
// ---------------------------------------------------------------------------

export function secondarySkillBonus(value: number): number {
  for (const band of CHECK.secondarySkillBands) {
    if (value <= band.max) return band.bonus;
  }
  return CHECK.secondarySkillBands[CHECK.secondarySkillBands.length - 1]!.bonus;
}

// ---------------------------------------------------------------------------
// Multi-person aggregation
// ---------------------------------------------------------------------------

function median(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

export interface GroupSkillResult {
  average: number;
  /** How much Leadership added versus a straight average. */
  leadershipBonus: number;
  rawValues: number[];
  adjustedValues: number[];
}

/**
 * Straight average of participant skill, with Leadership pulling only the
 * single weakest participant toward the group median — and never above the
 * second-weakest. Leadership manages one weak link; it does not fix an
 * underqualified team.
 */
export function aggregateGroupSkill(
  values: number[],
  leadership: number | null,
): GroupSkillResult {
  const raw = [...values];
  if (values.length === 0) {
    return { average: 0, leadershipBonus: 0, rawValues: raw, adjustedValues: raw };
  }

  const straightAverage = values.reduce((a, b) => a + b, 0) / values.length;

  if (values.length < 2 || leadership === null) {
    return {
      average: straightAverage,
      leadershipBonus: 0,
      rawValues: raw,
      adjustedValues: [...values],
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const weakest = sorted[0]!;
  const secondWeakest = sorted[1]!;
  const mid = median(sorted);

  const closure =
    Math.max(0, Math.min(leadership, CHECK.leadershipAttributeScale)) /
    CHECK.leadershipAttributeScale;
  const gapClosure = closure * CHECK.leadershipMaxGapClosure;

  let raised = weakest + (mid - weakest) * gapClosure;
  raised = Math.min(raised, secondWeakest);
  raised = Math.max(raised, weakest);

  sorted[0] = raised;
  const adjustedAverage = sorted.reduce((a, b) => a + b, 0) / sorted.length;

  return {
    average: adjustedAverage,
    leadershipBonus: adjustedAverage - straightAverage,
    rawValues: raw,
    adjustedValues: sorted,
  };
}

// ---------------------------------------------------------------------------
// Target computation
// ---------------------------------------------------------------------------

export interface CheckContext {
  characters: Record<CharacterId, Character>;
  morale: number;
  hours: number;
}

export interface CheckComputation {
  effectiveSkill: number;
  avgAttribute: number;
  attributeMultiplier: number;
  secondaryBonus: number;
  leadershipBonus: number;
  modifiers: CheckModifier[];
  rawTarget: number;
  finalTarget: number;
  participants: Character[];
}

/** Everything about a check except the die roll — used for both rolling and assessment. */
export function computeCheck(request: CheckRequest, context: CheckContext): CheckComputation {
  const participants = request.participantIds
    .map((id) => context.characters[id])
    .filter((c): c is Character => Boolean(c) && c.alive);

  const attrPair = request.attributes ?? SKILL_PRIMARY_ATTRIBUTES[request.skill];
  const physical = isPhysicalSkill(request.skill, attrPair);

  const skillValues = participants.map((c) => effectiveSkill(c, request.skill));

  const leader = request.leaderId ? context.characters[request.leaderId] : undefined;
  const leadershipValue =
    participants.length >= 2 && leader ? leader.attributes.leadership : null;

  const group = aggregateGroupSkill(skillValues, leadershipValue);

  // Attribute multiplier uses the group's average of the two primary attributes.
  const attrAverages = participants.map(
    (c) => (c.attributes[attrPair[0]] + c.attributes[attrPair[1]]) / 2,
  );
  const avgAttribute =
    attrAverages.length > 0
      ? attrAverages.reduce((a, b) => a + b, 0) / attrAverages.length
      : 0;

  const attributeMultiplier =
    CHECK.attributeMultiplierBase +
    (avgAttribute / CHECK.attributeScale) * CHECK.attributeMultiplierSpan;

  // Secondary skill uses the best available participant, not the average —
  // one person who knows the trick is enough to help.
  let secondaryBonus = 0;
  if (request.secondarySkill) {
    const best = Math.max(
      0,
      ...participants.map((c) => effectiveSkill(c, request.secondarySkill!)),
    );
    secondaryBonus = secondarySkillBonus(best);
  }

  // Condition modifiers are averaged across participants so one hurt crew
  // member does not sink an otherwise healthy team.
  const modifiers: CheckModifier[] = [...(request.modifiers ?? [])];

  if (participants.length > 0) {
    const avgWound =
      participants.reduce((sum, c) => sum + woundPenalty(c, physical), 0) / participants.length;
    const avgStress =
      participants.reduce((sum, c) => sum + stressPenalty(c), 0) / participants.length;
    const avgExhaustion =
      participants.reduce((sum, c) => sum + exhaustionPenalty(c), 0) / participants.length;

    if (avgWound >= 0.5) modifiers.push({ label: 'Wounds', value: -Math.round(avgWound) });
    if (avgStress >= 0.5) modifiers.push({ label: 'Stress', value: -Math.round(avgStress) });
    if (avgExhaustion >= 0.5) {
      modifiers.push({ label: 'Exhaustion', value: -Math.round(avgExhaustion) });
    }
  }

  const mor = moraleModifier(context.morale);
  if (mor !== 0) modifiers.push({ label: 'Crew morale', value: mor });

  const modifierTotal = modifiers.reduce((sum, m) => sum + m.value, 0);

  const rawTarget = group.average * attributeMultiplier + secondaryBonus + modifierTotal;
  const finalTarget = Math.round(
    Math.max(CHECK.minTarget, Math.min(CHECK.maxTarget, rawTarget)),
  );

  return {
    effectiveSkill: group.average,
    avgAttribute,
    attributeMultiplier,
    secondaryBonus,
    leadershipBonus: group.leadershipBonus,
    modifiers,
    rawTarget,
    finalTarget,
    participants,
  };
}

// ---------------------------------------------------------------------------
// Outcome resolution
// ---------------------------------------------------------------------------

export interface OutcomeResolution {
  outcome: CheckOutcome;
  margin: number;
  protectedFromCritical: boolean;
}

/** Map a roll against a target onto the five outcome bands. */
export function resolveOutcome(
  roll: number,
  target: number,
  criticalRisk: boolean,
): OutcomeResolution {
  const exceptionalThreshold = Math.floor(target * CHECK.exceptionalFraction);

  if (roll <= exceptionalThreshold && exceptionalThreshold >= 1) {
    return { outcome: 'exceptional', margin: target - roll, protectedFromCritical: false };
  }
  if (roll <= target) {
    return { outcome: 'success', margin: target - roll, protectedFromCritical: false };
  }

  const margin = roll - target;

  if (margin <= CHECK.partialMaxMargin) {
    return { outcome: 'partial', margin, protectedFromCritical: false };
  }
  if (margin <= CHECK.failureMaxMargin) {
    return { outcome: 'failure', margin, protectedFromCritical: false };
  }

  // V1 low-skill protection: a novice fumbling an ordinary task fails, it does
  // not explode. Only a 96+ roll or an explicitly Critical-Risk action can.
  const lowSkill = target < CHECK.lowSkillProtectionTarget;
  if (lowSkill && !criticalRisk && roll < CHECK.lowSkillCriticalRollFloor) {
    return { outcome: 'failure', margin, protectedFromCritical: true };
  }

  return { outcome: 'criticalFailure', margin, protectedFromCritical: false };
}

// ---------------------------------------------------------------------------
// Rolling
// ---------------------------------------------------------------------------

export function performCheck(
  request: CheckRequest,
  context: CheckContext,
  rng: Rng,
): CheckResult {
  const computed = computeCheck(request, context);
  const roll = rng.d100();
  const resolution = resolveOutcome(roll, computed.finalTarget, request.criticalRisk ?? false);

  return {
    label: request.label,
    skill: request.skill,
    outcome: resolution.outcome,
    roll,
    rawTarget: computed.rawTarget,
    finalTarget: computed.finalTarget,
    effectiveSkill: computed.effectiveSkill,
    avgAttribute: computed.avgAttribute,
    attributeMultiplier: computed.attributeMultiplier,
    modifiers: computed.modifiers,
    secondaryBonus: computed.secondaryBonus,
    leadershipBonus: computed.leadershipBonus,
    margin: resolution.margin,
    participantIds: computed.participants.map((c) => c.id),
    protectedFromCritical: resolution.protectedFromCritical,
    timestampHours: context.hours,
  };
}

// ---------------------------------------------------------------------------
// Probability model — used by assessment and the debug inspector
// ---------------------------------------------------------------------------

/** Exact outcome probabilities for a given target, honouring low-skill protection. */
export function outcomeOdds(
  target: number,
  criticalRisk: boolean,
): Record<CheckOutcome, number> {
  const counts: Record<CheckOutcome, number> = {
    exceptional: 0,
    success: 0,
    partial: 0,
    failure: 0,
    criticalFailure: 0,
  };
  for (let roll = 1; roll <= 100; roll++) {
    counts[resolveOutcome(roll, target, criticalRisk).outcome] += 1;
  }
  return {
    exceptional: counts.exceptional / 100,
    success: counts.success / 100,
    partial: counts.partial / 100,
    failure: counts.failure / 100,
    criticalFailure: counts.criticalFailure / 100,
  };
}

/** Probability of at least a plain success (success or exceptional). */
export function successChance(target: number, criticalRisk = false): number {
  const odds = outcomeOdds(target, criticalRisk);
  return odds.success + odds.exceptional;
}

// ---------------------------------------------------------------------------
// Participant selection
// ---------------------------------------------------------------------------

export type Participation = 'individual' | 'duo' | 'trio' | 'group';

export const PARTICIPATION_SIZE: Record<Participation, number> = {
  individual: 1,
  duo: 2,
  trio: 3,
  group: 5,
};

/**
 * Auto-select the strongest qualified participants for a check. The player may
 * substitute manually; this is only the default.
 */
export function selectParticipants(
  pool: Character[],
  skill: SkillKey,
  participation: Participation,
): CharacterId[] {
  const eligible = pool.filter((c) => c.alive && c.health > 0);
  const wanted = Math.min(PARTICIPATION_SIZE[participation], eligible.length);
  if (wanted <= 0) return [];

  const ranked = [...eligible].sort((a, b) => {
    const aScore =
      effectiveSkill(a, skill) * 2 -
      woundPenalty(a, true) -
      stressPenalty(a) -
      exhaustionPenalty(a);
    const bScore =
      effectiveSkill(b, skill) * 2 -
      woundPenalty(b, true) -
      stressPenalty(b) -
      exhaustionPenalty(b);
    return bScore - aScore;
  });

  return ranked.slice(0, wanted).map((c) => c.id);
}

/** Best single crew member for a skill — used for derived crew capabilities. */
export function bestAt(pool: Character[], skill: SkillKey): Character | null {
  const eligible = pool.filter((c) => c.alive);
  if (eligible.length === 0) return null;
  return eligible.reduce((best, c) =>
    effectiveSkill(c, skill) > effectiveSkill(best, skill) ? c : best,
  );
}

/**
 * Whether a Skill-0 character may attempt this action at all. Specialised
 * professional tasks are simply unavailable to a novice; basic, improvised,
 * emergency, and assisted contexts are allowed.
 */
export type SkillZeroContext = 'basic' | 'improvised' | 'emergency' | 'assisted' | 'professional';

export function canAttemptAtZeroSkill(context: SkillZeroContext): boolean {
  return context !== 'professional';
}

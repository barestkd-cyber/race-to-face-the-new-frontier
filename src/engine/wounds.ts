/**
 * Wounds.
 *
 * Health is the immediate ability to keep functioning. Wounds are what
 * physically happened and what must be treated. Attack power never subtracts
 * from Health directly — it produces a Wound Severity Score, that score
 * produces a wound, and the wound affects Health and function.
 */

import type { Rng } from './rng';
import { MEDICINE, WOUNDS } from './tuning';
import {
  BODY_REGIONS,
  BODY_REGION_LABELS,
  type BodyRegion,
  type Character,
  type CheckOutcome,
  type DamageType,
  type Wound,
  type WoundSeverity,
} from './types';

// ---------------------------------------------------------------------------
// Severity scoring
// ---------------------------------------------------------------------------

export interface SeverityInput {
  /** Base attack power from the weapon profile, or the hazard's raw severity. */
  attackPower: number;
  /** Check outcome that produced the hit, if any. */
  outcome?: CheckOutcome;
  /** Situational adjustment: cover, surprise, restrained target, falling debris. */
  contextModifier?: number;
  /** Already-effective armor protection for this damage type. */
  armorProtection?: number;
  /** Target's Resilience attribute. */
  resilience: number;
  region: BodyRegion;
}

export interface SeverityBreakdown {
  attackPower: number;
  outcomeModifier: number;
  contextModifier: number;
  armorEffect: number;
  resilienceEffect: number;
  regionMultiplier: number;
  preRegionScore: number;
  score: number;
}

/** V1 PROVISIONAL formula, exposed in full for the debug inspector. */
export function computeSeverityScore(input: SeverityInput): SeverityBreakdown {
  const outcomeModifier = input.outcome ? WOUNDS.outcomeModifier[input.outcome] : 0;
  const contextModifier = input.contextModifier ?? 0;
  const armorEffect = (input.armorProtection ?? 0) * 0.55;
  const resilienceEffect = input.resilience * WOUNDS.resilienceFactor;
  const regionMultiplier = WOUNDS.regionLethality[input.region] ?? 1;

  const preRegionScore =
    input.attackPower + outcomeModifier + contextModifier - armorEffect - resilienceEffect;

  const score = preRegionScore * regionMultiplier;

  return {
    attackPower: input.attackPower,
    outcomeModifier,
    contextModifier,
    armorEffect,
    resilienceEffect,
    regionMultiplier,
    preRegionScore,
    score,
  };
}

export type SeverityResult = WoundSeverity | 'none' | 'fatal';

export function severityFromScore(score: number): SeverityResult {
  if (score <= WOUNDS.thresholds.none) return 'none';
  if (score <= WOUNDS.thresholds.minor) return 'minor';
  if (score <= WOUNDS.thresholds.serious) return 'serious';
  if (score <= WOUNDS.thresholds.critical) return 'critical';
  if (score <= WOUNDS.thresholds.mortal) return 'mortal';
  return 'fatal';
}

// ---------------------------------------------------------------------------
// Hit location
// ---------------------------------------------------------------------------

export function rollHitRegion(rng: Rng): BodyRegion {
  return rng.weighted(
    BODY_REGIONS.map((region) => ({
      value: region,
      weight: WOUNDS.regionWeights[region] ?? 1,
    })),
  );
}

// ---------------------------------------------------------------------------
// Wound descriptions
// ---------------------------------------------------------------------------

const WOUND_LABELS: Record<DamageType, Record<WoundSeverity, string[]>> = {
  slash: {
    minor: ['shallow cut', 'grazing slash', 'skin laceration'],
    serious: ['deep laceration', 'gaping cut', 'severed muscle'],
    critical: ['massive laceration', 'tendon severed', 'arterial cut'],
    mortal: ['catastrophic laceration', 'opened to the bone'],
  },
  pierce: {
    minor: ['puncture wound', 'shallow entry', 'grazing hit'],
    serious: ['through-and-through', 'deep puncture', 'penetrating wound'],
    critical: ['penetrating trauma', 'internal perforation', 'lodged fragment'],
    mortal: ['catastrophic penetration', 'perforated organ'],
  },
  blunt: {
    // Kept region-agnostic — "cracked rib to the head" is the kind of line
    // that undoes the tone in one word.
    minor: ['heavy bruising', 'deep contusion', 'blunt impact'],
    serious: ['fractured bone', 'severe contusion', 'bad break'],
    critical: ['compound fracture', 'internal bleeding', 'crushed joint'],
    mortal: ['crushing trauma', 'massive internal bleeding'],
  },
  burn: {
    minor: ['first-degree burn', 'scorching', 'singed tissue'],
    serious: ['second-degree burn', 'deep thermal burn'],
    critical: ['third-degree burn', 'charred tissue', 'thermal shock'],
    mortal: ['catastrophic burns', 'full-thickness burns'],
  },
  stun: {
    minor: ['muscle spasm', 'neural jolt', 'stunned'],
    serious: ['neural disruption', 'severe spasm'],
    critical: ['cardiac disruption', 'neural collapse'],
    mortal: ['catastrophic neural shock'],
  },
};

export function describeWound(damageType: DamageType, severity: WoundSeverity, rng: Rng): string {
  const pool = WOUND_LABELS[damageType][severity];
  return rng.pick(pool);
}

export const SEVERITY_LABELS: Record<WoundSeverity, string> = {
  minor: 'Minor',
  serious: 'Serious',
  critical: 'Critical',
  mortal: 'Mortal',
};

export const SEVERITY_ORDER: WoundSeverity[] = ['minor', 'serious', 'critical', 'mortal'];

export function severityRank(severity: WoundSeverity): number {
  return SEVERITY_ORDER.indexOf(severity);
}

// ---------------------------------------------------------------------------
// Applying a wound
// ---------------------------------------------------------------------------

let woundCounter = 0;

export interface ApplyWoundResult {
  wound: Wound | null;
  killed: boolean;
  severity: SeverityResult;
  breakdown: SeverityBreakdown;
  lines: string[];
}

export function applyWound(
  character: Character,
  input: SeverityInput,
  damageType: DamageType,
  rng: Rng,
): ApplyWoundResult {
  const breakdown = computeSeverityScore(input);
  const severity = severityFromScore(breakdown.score);
  const lines: string[] = [];

  if (severity === 'none') {
    lines.push(`${character.name} is grazed but not meaningfully hurt.`);
    return { wound: null, killed: false, severity, breakdown, lines };
  }

  if (severity === 'fatal') {
    character.health = 0;
    character.alive = false;
    character.departedReason = `Killed — ${BODY_REGION_LABELS[input.region].toLowerCase()} trauma`;
    lines.push(
      `${character.name} takes a fatal hit to the ${BODY_REGION_LABELS[input.region].toLowerCase()}.`,
    );
    return { wound: null, killed: true, severity, breakdown, lines };
  }

  // Past the tracking cap, escalate an existing injury in the same region
  // rather than adding another independent penalty.
  if (character.wounds.length >= WOUNDS.maxTrackedWounds) {
    const existing =
      character.wounds.find((w) => w.region === input.region && !w.treated) ??
      character.wounds.find((w) => !w.treated) ??
      character.wounds[0];

    if (existing) {
      const escalated = SEVERITY_ORDER[
        Math.min(SEVERITY_ORDER.length - 1, severityRank(existing.severity) + 1)
      ]!;
      existing.severity = escalated;
      existing.label = describeWound(existing.damageType, escalated, rng);
      existing.treated = false;
      existing.bleeding = Math.max(existing.bleeding, WOUNDS.bleeding[escalated]);
      existing.healHours = WOUNDS.healHours[escalated];
      if (escalated === 'mortal') existing.lethalInHours = WOUNDS.mortalDeadlineHours;

      character.health = Math.max(0, character.health - WOUNDS.healthLoss[escalated]);
      lines.push(`${character.name}'s ${existing.label} is made worse.`);

      if (character.health <= 0) {
        character.alive = false;
        character.departedReason = 'Died of wounds';
        lines.push(`${character.name} does not get back up.`);
        return { wound: existing, killed: true, severity, breakdown, lines };
      }
      return { wound: existing, killed: false, severity, breakdown, lines };
    }
  }

  woundCounter += 1;
  const wound: Wound = {
    id: `wnd_${woundCounter.toString(36)}_${rng.int(0, 0xffff).toString(36)}`,
    region: input.region,
    severity,
    damageType,
    label: describeWound(damageType, severity, rng),
    ageHours: 0,
    bleeding: WOUNDS.bleeding[severity],
    treated: false,
    infection: 0,
    healHours: WOUNDS.healHours[severity],
  };

  if (severity === 'mortal') {
    wound.lethalInHours = WOUNDS.mortalDeadlineHours;
  }

  character.wounds.push(wound);

  const healthLoss = WOUNDS.healthLoss[severity];
  character.health = Math.max(0, character.health - healthLoss);

  lines.push(
    `${character.name} takes a ${SEVERITY_LABELS[severity].toLowerCase()} ${wound.label} to the ${BODY_REGION_LABELS[input.region].toLowerCase()}.`,
  );

  if (character.health <= 0) {
    character.alive = false;
    character.departedReason = 'Died of wounds';
    lines.push(`${character.name} does not get back up.`);
    return { wound, killed: true, severity, breakdown, lines };
  }

  if (character.health <= WOUNDS.incapacitatedAt) {
    lines.push(`${character.name} is down and cannot fight.`);
  }

  return { wound, killed: false, severity, breakdown, lines };
}

/** Convenience wrapper for hazards and events that supply a raw severity score. */
export function applyRawWound(
  character: Character,
  severityScore: number,
  damageType: DamageType,
  rng: Rng,
  region?: BodyRegion,
): ApplyWoundResult {
  const hitRegion = region ?? rollHitRegion(rng);
  // A raw score is already the intended severity, so neutralise the region
  // multiplier and resilience is applied at a reduced rate.
  return applyWound(
    character,
    {
      attackPower: severityScore / (WOUNDS.regionLethality[hitRegion] ?? 1),
      resilience: character.attributes.resilience * 0.5,
      region: hitRegion,
    },
    damageType,
    rng,
  );
}

// ---------------------------------------------------------------------------
// Passage of time
// ---------------------------------------------------------------------------

export interface WoundTickResult {
  died: boolean;
  lines: string[];
}

export interface WoundTickContext {
  hours: number;
  /** Med Bay / Medical Ward quality aboard, if any. */
  medBayQuality?: 'makeshift' | 'basic' | 'solid' | 'premium' | 'luxury';
  /** Whether the crew is fed — starvation stops healing. */
  fed: boolean;
  /** Whether the character is resting. */
  resting: boolean;
  quartersQuality?: 'makeshift' | 'basic' | 'solid' | 'premium' | 'luxury';
}

export function tickWounds(
  character: Character,
  ctx: WoundTickContext,
  rng: Rng,
): WoundTickResult {
  const lines: string[] = [];
  if (!character.alive) return { died: false, lines };

  const remaining: Wound[] = [];

  for (const wound of character.wounds) {
    wound.ageHours += ctx.hours;

    const careMultiplier =
      (ctx.quartersQuality ? MEDICINE.quartersRegenMultiplier[ctx.quartersQuality] : 1) *
      (ctx.resting ? 1.6 : 1) *
      (ctx.fed ? 1 : 0.4);

    if (!wound.treated) {
      const bleed = wound.bleeding * ctx.hours;
      if (bleed > 0) character.health = Math.max(0, character.health - bleed);

      // The body clots. A mortal wound does not — its urgency is the deadline.
      if (wound.severity !== 'mortal') {
        wound.bleeding *= Math.pow(1 - WOUNDS.bleedingDecayPerHour, ctx.hours);
        if (wound.bleeding < WOUNDS.bleedingStopsBelow) wound.bleeding = 0;
      }

      // Infection climbs while the wound is open, and the body pushes back once
      // the crew is fed and off their feet.
      const open = wound.bleeding > 0 || wound.healHours > 0;
      if (open) {
        wound.infection = Math.min(
          100,
          wound.infection + WOUNDS.infectionPerHour[wound.severity] * ctx.hours,
        );
      }
      if (ctx.fed && ctx.resting) {
        wound.infection = Math.max(
          0,
          wound.infection - WOUNDS.infectionRecoveryPerHour * ctx.hours,
        );
      }

      // Sepsis drains health on a visible clock instead of re-arming bleeding
      // forever, so it can be outrun, treated, or lost to.
      if (wound.infection > 0) {
        const drain = (wound.infection / 100) * WOUNDS.infectionDamagePerHour * ctx.hours;
        character.health = Math.max(0, character.health - drain);
      }
      if (
        wound.infection >= WOUNDS.infectionSepticAt &&
        !wound.septicWarned &&
        rng.chance(0.05 * ctx.hours)
      ) {
        wound.septicWarned = true;
        lines.push(`${character.name}'s ${wound.label} has turned septic.`);
      }

      if (wound.lethalInHours !== undefined) {
        wound.lethalInHours -= ctx.hours;
        if (wound.lethalInHours <= 0) {
          character.health = 0;
          character.alive = false;
          character.departedReason = 'Died of an untreated mortal wound';
          lines.push(`${character.name} dies of an untreated ${wound.label}.`);
          remaining.push(wound);
          character.wounds = remaining;
          return { died: true, lines };
        }
      }

      // An untreated wound still closes eventually, just badly, and only once
      // it has stopped bleeding.
      if (wound.bleeding <= 0) {
        wound.healHours -= ctx.hours * careMultiplier * WOUNDS.untreatedHealMultiplier;
        if (wound.healHours <= 0 && wound.infection < WOUNDS.infectionSepticAt) {
          lines.push(`${character.name}'s ${wound.label} has closed up, badly.`);
          continue;
        }
      }
    } else {
      wound.infection = Math.max(0, wound.infection - WOUNDS.infectionRecoveryPerHour * ctx.hours);
      wound.healHours -= ctx.hours * careMultiplier;
      if (wound.healHours <= 0) {
        lines.push(`${character.name}'s ${wound.label} has healed.`);
        continue;
      }
    }

    remaining.push(wound);
  }

  character.wounds = remaining;

  if (character.health <= 0 && character.alive) {
    character.alive = false;
    character.departedReason = 'Bled out';
    lines.push(`${character.name} bleeds out.`);
    return { died: true, lines };
  }

  // Health comes back once nothing is actively bleeding. Untreated wounds slow
  // it rather than stopping it, otherwise a crew with no medic can never
  // recover from anything at all.
  const bleeding = character.wounds.some((w) => w.bleeding > 0);
  const hasUntreated = character.wounds.some((w) => !w.treated);
  if (!bleeding && ctx.fed && character.health < character.maxHealth) {
    const multiplier =
      (ctx.quartersQuality ? MEDICINE.quartersRegenMultiplier[ctx.quartersQuality] : 1) *
      (ctx.resting ? 1.8 : 1) *
      (hasUntreated ? 0.45 : 1);
    character.health = Math.min(
      character.maxHealth,
      character.health + MEDICINE.regenPerHour * ctx.hours * multiplier,
    );
  }

  return { died: false, lines };
}

// ---------------------------------------------------------------------------
// Treatment
// ---------------------------------------------------------------------------

export function requiresSurgery(wound: Wound): boolean {
  return severityRank(wound.severity) >= severityRank(MEDICINE.surgeryRequiredFrom);
}

export function medicineCostFor(wound: Wound, rng: Rng): number {
  const [lo, hi] = MEDICINE.usage[wound.severity];
  return rng.int(lo, hi);
}

export interface TreatmentResult {
  treated: boolean;
  medicineUsed: number;
  lines: string[];
}

/**
 * Apply the mechanical result of a treatment attempt. The caller performs the
 * First Aid / Surgery check and passes its outcome in.
 */
export function treatWound(
  character: Character,
  wound: Wound,
  outcome: CheckOutcome,
  medicineAvailable: number,
  rng: Rng,
): TreatmentResult {
  const lines: string[] = [];
  const cost = Math.min(medicineCostFor(wound, rng), medicineAvailable);

  switch (outcome) {
    case 'exceptional': {
      wound.treated = true;
      wound.bleeding = 0;
      wound.infection = Math.max(0, wound.infection - 40);
      wound.healHours *= 0.6;
      delete wound.lethalInHours;
      character.health = Math.min(character.maxHealth, character.health + 8);
      lines.push(`Clean work. ${character.name}'s ${wound.label} is stabilised and closing well.`);
      return { treated: true, medicineUsed: cost, lines };
    }
    case 'success': {
      wound.treated = true;
      wound.bleeding = 0;
      wound.infection = Math.max(0, wound.infection - 20);
      delete wound.lethalInHours;
      character.health = Math.min(character.maxHealth, character.health + 4);
      lines.push(`${character.name}'s ${wound.label} is stabilised.`);
      return { treated: true, medicineUsed: cost, lines };
    }
    case 'partial': {
      // Stopped the bleeding but did not fully stabilise it.
      wound.bleeding = Math.max(0, wound.bleeding * 0.35);
      wound.infection = Math.max(0, wound.infection - 8);
      if (wound.lethalInHours !== undefined) {
        wound.lethalInHours += 8;
      }
      lines.push(
        `The bleeding slows, but ${character.name}'s ${wound.label} is not properly closed.`,
      );
      return { treated: false, medicineUsed: cost, lines };
    }
    case 'failure': {
      wound.infection = Math.min(100, wound.infection + 10);
      lines.push(`The treatment does not take. ${character.name} is still in trouble.`);
      return { treated: false, medicineUsed: Math.ceil(cost * 0.5), lines };
    }
    case 'criticalFailure': {
      wound.bleeding += 0.8;
      wound.infection = Math.min(100, wound.infection + 28);
      character.health = Math.max(0, character.health - 6);
      if (wound.lethalInHours !== undefined) {
        wound.lethalInHours = Math.max(1, wound.lethalInHours - 4);
      }
      lines.push(`It goes badly. ${character.name}'s condition worsens.`);
      if (character.health <= 0) {
        character.alive = false;
        character.departedReason = 'Died during treatment';
        lines.push(`${character.name} dies on the table.`);
      }
      return { treated: false, medicineUsed: cost, lines };
    }
  }
}

// ---------------------------------------------------------------------------
// Status helpers used across UI and engine
// ---------------------------------------------------------------------------

export function isIncapacitated(character: Character): boolean {
  return character.alive && character.health <= WOUNDS.incapacitatedAt;
}

export function worstWound(character: Character): Wound | null {
  if (character.wounds.length === 0) return null;
  return character.wounds.reduce((worst, w) =>
    severityRank(w.severity) > severityRank(worst.severity) ? w : worst,
  );
}

export function healthFraction(character: Character): number {
  return character.maxHealth > 0 ? character.health / character.maxHealth : 0;
}

export function conditionLabel(character: Character): string {
  if (!character.alive) return 'Dead';
  if (isIncapacitated(character)) return 'Down';
  const frac = healthFraction(character);
  const worst = worstWound(character);
  if (worst && worst.severity === 'mortal') return 'Dying';
  if (frac > 0.9 && !worst) return 'Healthy';
  if (frac > 0.75) return 'Scuffed';
  if (frac > 0.5) return 'Hurt';
  if (frac > 0.3) return 'Badly hurt';
  return 'Critical';
}

export function untreatedWounds(character: Character): Wound[] {
  return character.wounds.filter((w) => !w.treated);
}

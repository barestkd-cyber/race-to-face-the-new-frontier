/**
 * Assessment fidelity.
 *
 * Core rule: ordinary poor assessment becomes LESS PRECISE, not confidently
 * false. A weak assessor gets fuzzy, overlapping language that still contains
 * the truth. Only an explicit distortion — overconfidence, deception, false
 * intelligence, manipulated sensors, strong personal bias — may mislead, and
 * the true value is always preserved for the debug inspector.
 */

import { outcomeOdds, successChance, computeCheck, type CheckContext } from './check';
import { ASSESSMENT } from './tuning';
import {
  SKILL_KEYS,
  SKILL_LABELS,
  type Assessment,
  type AssessmentQuality,
  type Character,
  type CheckOutcome,
  type CheckRequest,
  type SkillKey,
} from './types';

// ---------------------------------------------------------------------------
// Who is doing the assessing
// ---------------------------------------------------------------------------

export interface AssessorInput {
  /** The character reading the situation — normally the best available Evaluation. */
  assessor: Character | null;
  /** A relevant skill sharpens a specialist's read of a specialist problem. */
  relevantSkill?: SkillKey;
  /** Prior intel level 0..3. */
  intel?: number;
  /** Explicit distortion, e.g. 'The broker is lying about the cargo.' */
  distortion?: { label: string; shift: number };
}

/** Composite assessment score on roughly the 0..15 attribute scale. */
export function assessmentScore(input: AssessorInput): number {
  const { assessor } = input;
  if (!assessor) return 0;

  const evaluation = assessor.attributes.evaluation;
  const perception = assessor.attributes.perception;
  const base =
    (evaluation + perception * ASSESSMENT.perceptionWeight) / (1 + ASSESSMENT.perceptionWeight);

  const skillValue = input.relevantSkill ? (assessor.skills[input.relevantSkill] ?? 0) : 0;
  const skillBonus = (skillValue / 10) * ASSESSMENT.skillWeightPer10;
  const intelBonus = (input.intel ?? 0) * ASSESSMENT.intelBonus;

  return base + skillBonus + intelBonus;
}

export function assessmentQuality(input: AssessorInput): AssessmentQuality {
  const score = assessmentScore(input);
  let quality: AssessmentQuality = 'veryPoor';
  for (const tier of ASSESSMENT.tiers) {
    if (score >= tier.minEvaluation) quality = tier.quality;
  }
  return quality;
}

/** Pick the crew member best placed to assess something. */
export function bestAssessor(pool: Character[]): Character | null {
  const alive = pool.filter((c) => c.alive);
  if (alive.length === 0) return null;
  return alive.reduce((best, c) => {
    const score = c.attributes.evaluation * 2 + c.attributes.perception;
    const bestScore = best.attributes.evaluation * 2 + best.attributes.perception;
    return score > bestScore ? c : best;
  });
}

// ---------------------------------------------------------------------------
// Vague-but-honest phrasing
// ---------------------------------------------------------------------------

const VERY_POOR_PHRASES = ['Unknown', 'Hard to tell', 'Not enough information'];

/**
 * Poor-tier phrases deliberately overlap so none of them is a confident claim.
 * Each phrase is valid across a wide band; the bands share edges on purpose.
 */
const POOR_PHRASES: { min: number; max: number; text: string }[] = [
  { min: 0, max: 0.45, text: "Doesn't feel right" },
  { min: 0, max: 0.55, text: 'Feels risky' },
  { min: 0.25, max: 0.75, text: 'Could go either way' },
  { min: 0.45, max: 1, text: 'Feels promising' },
];

function poorPhrase(chance: number, salt: number): string {
  const candidates = POOR_PHRASES.filter((p) => chance >= p.min && chance <= p.max);
  const pool = candidates.length > 0 ? candidates : POOR_PHRASES;
  return pool[Math.abs(Math.round(salt)) % pool.length]!.text;
}

function moderatePhrase(chance: number): string {
  if (chance < 0.12) return 'Highly unlikely';
  if (chance < 0.35) return 'Unlikely';
  if (chance < 0.65) return 'Even chance — uncertain';
  if (chance < 0.88) return 'Likely';
  return 'Highly likely';
}

// ---------------------------------------------------------------------------
// Assessing a check
// ---------------------------------------------------------------------------

/**
 * Build the player-facing read on a pending check. `trueSuccessChance` is always
 * the honest value; the displayed text and ranges degrade with assessor quality.
 */
export function assessCheck(
  request: CheckRequest,
  context: CheckContext,
  input: AssessorInput,
): Assessment {
  const computed = computeCheck(request, context);
  const criticalRisk = request.criticalRisk ?? false;
  const trueChance = successChance(computed.finalTarget, criticalRisk);
  const quality = assessmentQuality(input);

  return buildAssessment(
    trueChance,
    quality,
    input,
    computed.finalTarget,
    criticalRisk,
    computed.finalTarget,
  );
}

/** Assess a bare probability without a full CheckRequest (missions, sites, deals). */
export function assessChance(
  trueChance: number,
  input: AssessorInput,
  salt = 0,
): Assessment {
  const quality = assessmentQuality(input);
  return buildAssessment(trueChance, quality, input, salt, false, null);
}

function buildAssessment(
  trueChance: number,
  quality: AssessmentQuality,
  input: AssessorInput,
  salt: number,
  criticalRisk: boolean,
  target: number | null,
): Assessment {
  const distortion = input.distortion;
  // Only an explicit distortion moves the displayed value away from the truth.
  const shown = distortion
    ? Math.max(0, Math.min(1, trueChance + distortion.shift))
    : trueChance;

  const assessment: Assessment = {
    quality,
    text: '',
    trueSuccessChance: trueChance,
  };
  if (distortion) assessment.distortion = distortion.label;

  switch (quality) {
    case 'veryPoor': {
      assessment.text = VERY_POOR_PHRASES[Math.abs(Math.round(salt)) % VERY_POOR_PHRASES.length]!;
      break;
    }
    case 'poor': {
      assessment.text = poorPhrase(shown, salt);
      break;
    }
    case 'moderate': {
      assessment.text = moderatePhrase(shown);
      break;
    }
    case 'good': {
      const half = ASSESSMENT.goodRangeHalfWidth / 100;
      // Nudge the window without ever excluding the shown value.
      const drift = ((Math.abs(Math.round(salt)) % 7) - 3) / 100;
      let low = shown - half + drift;
      let high = shown + half + drift;
      low = Math.max(0, Math.min(low, shown));
      high = Math.min(1, Math.max(high, shown));
      assessment.estimateLow = Math.round(low * 100);
      assessment.estimateHigh = Math.round(high * 100);
      assessment.text = `About ${assessment.estimateLow}–${assessment.estimateHigh}% to succeed`;
      break;
    }
    case 'excellent': {
      assessment.estimateLow = Math.round(shown * 100);
      assessment.estimateHigh = Math.round(shown * 100);
      if (target !== null) {
        assessment.outcomeOdds = outcomeOdds(target, criticalRisk);
      } else {
        assessment.outcomeOdds = approximateOdds(shown);
      }
      assessment.text = `${Math.round(shown * 100)}% to succeed`;
      break;
    }
  }

  return assessment;
}

/** Rough five-band split when we only have a success probability to work from. */
function approximateOdds(chance: number): Record<CheckOutcome, number> {
  const exceptional = chance * 0.2;
  const success = chance - exceptional;
  const remainder = 1 - chance;
  return {
    exceptional,
    success,
    partial: remainder * 0.42,
    failure: remainder * 0.43,
    criticalFailure: remainder * 0.15,
  };
}

// ---------------------------------------------------------------------------
// Risk bands — used for destinations, missions, and sites
// ---------------------------------------------------------------------------

export type RiskBand = 'low' | 'moderate' | 'high' | 'extreme';

export const RISK_LABELS: Record<RiskBand, string> = {
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
  extreme: 'Extreme',
};

const RISK_ORDER: RiskBand[] = ['low', 'moderate', 'high', 'extreme'];

export function dangerToBand(danger: number): RiskBand {
  if (danger < 25) return 'low';
  if (danger < 50) return 'moderate';
  if (danger < 75) return 'high';
  return 'extreme';
}

/** How many bands of slop a given assessment quality carries. */
const RISK_UNCERTAINTY: Record<AssessmentQuality, number> = {
  veryPoor: 2,
  poor: 1,
  moderate: 1,
  good: 0,
  excellent: 0,
};

export interface RiskAssessment {
  quality: AssessmentQuality;
  /** Displayed band, or a widened range when the assessor cannot be precise. */
  label: string;
  /** Lowest and highest band the display admits, as indices into RISK_ORDER. */
  lowIndex: number;
  highIndex: number;
  /** Bars to fill on the cockpit risk meter, 1..4, taken from the low end. */
  bars: number;
  /** True whenever the read is not precise — the UI shows "(unsure)". */
  unsure: boolean;
  /** Honest value, debug only. */
  trueDanger: number;
  trueBand: RiskBand;
  /** Short explanation of why the read is what it is. */
  note: string;
}

/**
 * Widen rather than lie. A poor assessor sees "Low–High", not a confidently
 * wrong "Low".
 */
export function assessDanger(danger: number, input: AssessorInput): RiskAssessment {
  const quality = assessmentQuality(input);
  const trueBand = dangerToBand(danger);
  const trueIndex = RISK_ORDER.indexOf(trueBand);
  const slop = RISK_UNCERTAINTY[quality];

  const lowIndex = Math.max(0, trueIndex - slop);
  const highIndex = Math.min(RISK_ORDER.length - 1, trueIndex + slop);

  const label =
    lowIndex === highIndex
      ? RISK_LABELS[RISK_ORDER[lowIndex]!]
      : `${RISK_LABELS[RISK_ORDER[lowIndex]!]}–${RISK_LABELS[RISK_ORDER[highIndex]!]}`;

  const note =
    quality === 'veryPoor'
      ? 'No usable data. Treat this as a guess.'
      : quality === 'poor'
        ? 'Scan incomplete. The estimate is rough.'
        : quality === 'moderate'
          ? 'Partial data. Reasonable but not precise.'
          : quality === 'good'
            ? 'Good data. The estimate should hold.'
            : 'Full assessment. This is what is there.';

  return {
    quality,
    label,
    lowIndex,
    highIndex,
    bars: lowIndex + 1,
    unsure: lowIndex !== highIndex,
    trueDanger: danger,
    trueBand,
    note,
  };
}

/** Data-completeness label shown on the cockpit destination panel. */
export function scanCompletenessLabel(quality: AssessmentQuality): string {
  switch (quality) {
    case 'veryPoor':
      return 'NO SCAN DATA';
    case 'poor':
      return 'SCAN INCOMPLETE';
    case 'moderate':
      return 'PARTIAL SCAN';
    case 'good':
      return 'SCAN GOOD';
    case 'excellent':
      return 'FULL SCAN';
  }
}


// ---------------------------------------------------------------------------
// Reading a stranger's competence
// ---------------------------------------------------------------------------

export interface SkillRead {
  skill: SkillKey;
  /** What the player is told. Never a bare number unless the read is good. */
  text: string;
  /** True when this is the candidate's own claim rather than your judgement. */
  selfReported: boolean;
  /** 0..1, for a bar. Deliberately coarse at low fidelity. */
  bar: number;
}

/** Band names that mean something to a person rather than a number. */
function competenceBand(value: number): string {
  if (value <= 0) return 'none';
  if (value < 20) return 'familiar';
  if (value < 45) return 'trained';
  if (value < 70) return 'professional';
  return 'exceptional';
}

/**
 * How much you can tell about a stranger's skills before they join.
 *
 * You do not get a character sheet for somebody you met an hour ago. What you
 * get is your own read on them, and how good that read is depends on your
 * Evaluation, on having talked to them, and on whatever they have shown you.
 * Once they are crew, you simply know.
 */
export function readCandidateSkills(
  candidate: Character,
  input: AssessorInput,
  options: { talked?: boolean; aboard?: boolean } = {},
): SkillRead[] {
  const ranked = SKILL_KEYS.map((skill) => ({ skill, value: candidate.skills[skill] ?? 0 }))
    .sort((a, b) => b.value - a.value);

  // Crew are known quantities — you have watched them work.
  if (options.aboard) {
    return ranked.slice(0, 5).map(({ skill, value }) => ({
      skill,
      text: String(Math.round(value)),
      selfReported: false,
      bar: value / 100,
    }));
  }

  let quality = assessmentQuality(input);
  // Sitting down with somebody is itself evidence.
  if (options.talked) {
    const order: AssessmentQuality[] = ['veryPoor', 'poor', 'moderate', 'good', 'excellent'];
    const index = order.indexOf(quality);
    quality = order[Math.min(order.length - 1, index + 1)]!;
  }

  const top = ranked.slice(0, 5);

  switch (quality) {
    case 'veryPoor':
      // You genuinely cannot tell. Saying so is more honest than a number.
      return [
        {
          skill: top[0]!.skill,
          text: 'nothing you would bet on',
          selfReported: false,
          bar: 0,
        },
      ];

    case 'poor':
      // Impressions only, and only about their strongest and weakest.
      return top.slice(0, 2).map(({ skill, value }) => ({
        skill,
        text:
          value >= 45
            ? `seems to know their way around ${SKILL_LABELS[skill].toLowerCase()}`
            : `some ${SKILL_LABELS[skill].toLowerCase()}, not much`,
        selfReported: false,
        bar: value >= 45 ? 0.6 : 0.3,
      }));

    case 'moderate':
      return top.slice(0, 4).map(({ skill, value }) => ({
        skill,
        text: competenceBand(value),
        selfReported: false,
        bar: value / 100,
      }));

    case 'good': {
      // A range you could plan around, not a certainty.
      return top.map(({ skill, value }) => {
        const spread = Math.max(6, Math.round(value * 0.18));
        const lo = Math.max(0, Math.round(value - spread));
        const hi = Math.min(100, Math.round(value + spread));
        return { skill, text: `${lo}–${hi}`, selfReported: false, bar: value / 100 };
      });
    }

    case 'excellent':
    default:
      return top.map(({ skill, value }) => ({
        skill,
        text: String(Math.round(value)),
        selfReported: !options.talked,
        bar: value / 100,
      }));
  }
}

/** One line explaining how much the read above is worth. */
export function readConfidenceNote(
  input: AssessorInput,
  options: { talked?: boolean } = {},
): string {
  const quality = assessmentQuality(input);
  switch (quality) {
    case 'veryPoor':
      return 'You cannot read this person at all. Anything you decide is a guess.';
    case 'poor':
      return options.talked
        ? 'A conversation and an impression. Nothing you would stake the crew on.'
        : 'You have barely spoken. Impressions only.';
    case 'moderate':
      return 'You can place them in broad bands. Precise numbers are beyond you.';
    case 'good':
      return 'Close enough to plan around, though not exact.';
    default:
      return 'You read people well enough that these are near enough the truth.';
  }
}

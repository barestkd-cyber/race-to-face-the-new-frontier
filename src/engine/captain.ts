/**
 * The autonomous base ship.
 *
 * When the player is away the ship stays alive in the simulation. The Captain
 * and remaining crew resolve whatever happens using Decision Making, Leadership,
 * skills, traits, relationships and stress. There are no standing-order presets,
 * and the player does not get to switch perspective back because something bad
 * happened. If the ship is destroyed while the away party survives, the campaign
 * continues.
 */

import { performCheck, selectParticipants, type CheckContext } from './check';
import { applyEffects, availableChoices, selectEvent } from './eventEngine';
import { pushLog } from './log';
import type { Rng } from './rng';
import { isFlyable } from './ship';
import { applyStress, clampMorale, shipboardCrew } from './sim';
import { AUTONOMY, EVENTS, MORALE } from './tuning';
import type {
  Character,
  CheckOutcome,
  EventChoice,
  EventEffect,
  GameState,
  TraitKey,
} from './types';

// ---------------------------------------------------------------------------
// Who is actually in charge
// ---------------------------------------------------------------------------

/**
 * The Captain if they are aboard; otherwise whoever aboard has the strongest
 * combination of Leadership and Decision Making. Somebody is always in charge.
 */
export function actingCaptain(state: GameState): Character | null {
  const aboard = shipboardCrew(state);
  if (aboard.length === 0) return null;

  const captain = aboard.find((c) => c.id === state.captainId);
  if (captain) return captain;

  return aboard.reduce((best, c) => {
    const score = c.attributes.leadership * 1.2 + c.attributes.decisionMaking;
    const bestScore = best.attributes.leadership * 1.2 + best.attributes.decisionMaking;
    return score > bestScore ? c : best;
  });
}

// ---------------------------------------------------------------------------
// Option scoring
// ---------------------------------------------------------------------------

/**
 * How strongly a character's traits pull them toward a given choice. Traits
 * bias behaviour; they do not define morality, and a "negative" trait can point
 * at the right answer.
 */
function traitAffinity(choice: EventChoice, traits: TraitKey[]): number {
  let score = 0;
  const effects = collectEffects(choice);

  const risksHarm = effects.some((e) => e.wound !== undefined || e.combat !== undefined);
  const gainsCredits = effects.some((e) => (e.credits ?? 0) > 0);
  const spendsCredits = effects.some((e) => (e.credits ?? 0) < 0);
  const costsTime = effects.some((e) => (e.hours ?? 0) > 6);
  const helpsCrew = effects.some((e) => (e.morale ?? 0) > 0 || (e.medicine ?? 0) > 0);
  const risksCrew = effects.some((e) => e.loseCrew === true);

  for (const trait of traits) {
    switch (trait) {
      case 'aggressive':
      case 'brave':
        if (risksHarm) score += 1;
        break;
      case 'cowardly':
      case 'selfPreserving':
      case 'cautious':
        if (risksHarm) score -= 1.2;
        if (risksCrew) score -= 1.5;
        break;
      case 'reckless':
      case 'impulsive':
        if (risksHarm) score += 0.8;
        if (costsTime) score -= 0.8;
        break;
      case 'greedy':
      case 'opportunistic':
        if (gainsCredits) score += 1.2;
        if (spendsCredits) score -= 1;
        break;
      case 'generous':
      case 'compassionate':
      case 'protective':
        if (helpsCrew) score += 1.2;
        if (risksCrew) score -= 1.4;
        break;
      case 'patient':
      case 'dutiful':
        if (costsTime) score += 0.7;
        break;
      case 'loyal':
        if (risksCrew) score -= 1.6;
        if (helpsCrew) score += 0.8;
        break;
      case 'curious':
        if (choice.check) score += 0.5;
        break;
      case 'stubborn':
      case 'controlling':
        if (choice.check) score += 0.3;
        break;
      default:
        break;
    }
  }

  return score;
}

function collectEffects(choice: EventChoice): EventEffect[] {
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

/** Crude expected value of a choice, from the crew's actual capability. */
function competenceScore(choice: EventChoice, crew: Character[]): number {
  if (!choice.check) return 1;
  const best = Math.max(0, ...crew.map((c) => c.skills[choice.check!.skill] ?? 0));
  // A check the crew cannot pass is a bad idea regardless of the payoff.
  return best / 50;
}

/**
 * How badly the ship needs a given resource right now, as a multiplier. A
 * captain with three days of food left values a crate of rations far more than
 * one with a full hold, which is what makes autonomous decisions read as
 * situational rather than generic.
 */
function scarcityWeight(have: number, comfortable: number): number {
  if (comfortable <= 0) return 1;
  const ratio = Math.max(0, have) / comfortable;
  return 1 + Math.max(0, 1 - ratio) * 2.5;
}

function outcomeScore(state: GameState, choice: EventChoice): number {
  const effects = collectEffects(choice);
  const res = state.resources;
  const crewCount = Math.max(1, state.crewIds.length);

  const foodWeight = scarcityWeight(res.food, crewCount * 8);
  const medicineWeight = scarcityWeight(res.medicine, 10);
  const partsWeight = scarcityWeight(res.repairParts, 80);
  const fuelWeight = scarcityWeight(res.fuel, res.fuelCapacity * 0.5);
  const creditWeight = scarcityWeight(res.credits, 900);

  let score = 0;
  for (const effect of effects) {
    score += ((effect.credits ?? 0) / 200) * creditWeight;
    score += (effect.morale ?? 0) / 6;
    score += ((effect.food ?? 0) / 5) * foodWeight;
    score += ((effect.medicine ?? 0) / 3) * medicineWeight;
    score += ((effect.repairParts ?? 0) / 40) * partsWeight;
    score += ((effect.fuel ?? 0) / 12) * fuelWeight;
    score -= (effect.crewStress ?? 0) / 8;
    score -= effect.loseCrew ? 8 : 0;
    score -= effect.wound ? effect.wound.severityScore / 25 : 0;
    score -= effect.combat ? 2.5 : 0;
    score -= (effect.hours ?? 0) / 20;
  }
  return score;
}

// ---------------------------------------------------------------------------
// The Captain's decision
// ---------------------------------------------------------------------------

export interface AutonomousDecision {
  choiceId: string;
  coherent: boolean;
  coherence: number;
  scores: { choiceId: string; total: number; competence: number; outcome: number; trait: number }[];
}

/**
 * Decision Making does not mean "picks the objectively optimal option". It
 * determines how coherently the character acts according to what they know,
 * what they value, their traits, and the circumstances.
 */
export function decideAutonomously(
  state: GameState,
  choices: EventChoice[],
  decider: Character,
  crew: Character[],
  rng: Rng,
): AutonomousDecision | null {
  if (choices.length === 0) return null;

  const leadership = crew.length > 1 ? decider.attributes.leadership : 0;
  const stressPenalty = decider.stress * AUTONOMY.stressPenaltyPerPoint;

  const coherence = Math.max(
    0.05,
    Math.min(
      0.97,
      AUTONOMY.coherenceBase +
        decider.attributes.decisionMaking * AUTONOMY.coherencePerDecisionPoint +
        (leadership * AUTONOMY.leadershipBonusPerPoint) / 100 -
        stressPenalty / 100,
    ),
  );

  const scores = choices.map((choice) => {
    const competence = competenceScore(choice, crew);
    const outcome = outcomeScore(state, choice);
    const trait = traitAffinity(choice, decider.traits);
    return {
      choiceId: choice.id,
      competence,
      outcome,
      trait,
      total: outcome * competence + (trait * AUTONOMY.traitWeight) / 10,
    };
  });

  const coherent = rng.chance(coherence);

  let chosen: string;
  if (coherent) {
    chosen = scores.reduce((best, s) => (s.total > best.total ? s : best)).choiceId;
  } else {
    // Incoherent does not mean random noise — it means traits and impulse win
    // over judgement.
    chosen = rng.weighted(
      scores.map((s) => ({
        value: s.choiceId,
        weight: Math.max(0.2, 1 + s.trait),
      })),
    );
  }

  return { choiceId: chosen, coherent, coherence, scores };
}

// ---------------------------------------------------------------------------
// Running the ship while the player is away
// ---------------------------------------------------------------------------

export interface AutonomousReport {
  lines: string[];
  shipLost: boolean;
}

/**
 * Simulate the base ship for a stretch of hours. Called whenever time passes
 * with an away party deployed.
 */
export function runAutonomousShip(
  state: GameState,
  hours: number,
  rng: Rng,
): AutonomousReport {
  const lines: string[] = [];
  if (!state.ship || state.ship.destroyed) return { lines, shipLost: false };

  const aboard = shipboardCrew(state);
  if (aboard.length === 0) return { lines, shipLost: false };

  const days = hours / 24;
  const expected = days * EVENTS.autonomousShipEventPerDay;
  const eventCount = Math.floor(expected) + (rng.chance(expected % 1) ? 1 : 0);

  const decider = actingCaptain(state);
  if (!decider) return { lines, shipLost: false };

  for (let i = 0; i < eventCount; i++) {
    const def = selectEvent(state, ['technical', 'social', 'medical'], rng, {
      danger: state.travel?.danger ?? 20,
    });
    if (!def) continue;

    const options = availableChoices(state, def).filter((c) => c.available);
    if (options.length === 0) continue;

    const decision = decideAutonomously(
      state,
      options.map((o) => o.choice),
      decider,
      aboard,
      rng,
    );
    if (!decision) continue;

    const choice = def.choices.find((c) => c.id === decision.choiceId);
    if (!choice) continue;

    if (state.debug.enabled) {
      state.debug.records.push({
        id: `dbg_auto_${state.debug.records.length}`,
        hours: state.hours,
        label: `Autonomous: ${def.title}`,
        detail: {
          decider: decider.name,
          decisionMaking: decider.attributes.decisionMaking,
          traits: decider.traits,
          ...decision,
        },
      });
    }

    // Resolve the choice the same way the player's would resolve, but with the
    // Captain's crew doing the work.
    let outcome: CheckOutcome = 'success';
    if (choice.check) {
      const participants = selectParticipants(aboard, choice.check.skill, choice.check.participation);
      const context: CheckContext = {
        characters: state.characters,
        morale: state.morale,
        hours: state.hours,
      };
      const check = performCheck(
        {
          skill: choice.check.skill,
          attributes: choice.check.attributes,
          secondarySkill: choice.check.secondarySkill,
          modifiers: choice.check.modifiers,
          criticalRisk: choice.check.criticalRisk,
          participantIds: participants,
          leaderId: participants.length >= 2 ? decider.id : undefined,
          label: `${decider.name} (autonomous): ${choice.label}`,
        },
        context,
        rng,
      );
      outcome = check.outcome;
    }

    const branch =
      choice.outcomes?.[outcome] ??
      choice.outcomes?.success ??
      choice.outcomes?.partial ??
      choice.result;

    if (choice.effects) applyEffects(state, choice.effects, rng, decider);
    if (branch) applyEffects(state, branch.effects, rng, decider);

    const report = `While you were away — ${def.title}: ${branch?.text ?? choice.label}`;
    lines.push(report);
    pushLog(state, 'crew', report);
    state.recentEvents[def.id] = state.hours;

    // A badly handled emergency can genuinely take the ship.
    if (
      (outcome === 'criticalFailure' || outcome === 'failure') &&
      !isFlyable(state.ship) &&
      rng.chance(AUTONOMY.catastrophicLossChance)
    ) {
      return { lines: [...lines, ...destroyShip(state, aboard)], shipLost: true };
    }
  }

  // Leading alone is tiring.
  applyStress(decider, AUTONOMY.leadershipBonusPerPoint * 0 + 1.5 * days);

  return { lines, shipLost: false };
}

// ---------------------------------------------------------------------------
// Losing the ship
// ---------------------------------------------------------------------------

/**
 * The ship is gone, and so is everyone aboard it. If the away party survives,
 * the campaign continues without a ship.
 */
export function destroyShip(state: GameState, aboard: Character[]): string[] {
  const lines: string[] = [];
  if (!state.ship) return lines;

  const shipName = state.ship.name;
  state.ship.destroyed = true;

  for (const member of aboard) {
    member.alive = false;
    member.departedReason = `Lost with the ${shipName}`;
    state.crewIds = state.crewIds.filter((id) => id !== member.id);
  }

  state.resources.fuel = 0;
  state.resources.food = Math.min(state.resources.food, 3);
  state.morale = clampMorale(state.morale - MORALE.crewDeathPenalty * 1.5);

  const message =
    aboard.length > 0
      ? `The ${shipName} is lost, with ${aboard.map((c) => c.name).join(', ')} aboard.`
      : `The ${shipName} is lost.`;

  lines.push(message);
  pushLog(state, 'milestone', message);

  const survivors = state.crewIds.length;
  if (survivors === 0) {
    state.ending = { kind: 'death', text: `The ${shipName} is gone and nobody is left.` };
    state.phase = 'dead';
    state.screen = 'gameOver';
  } else {
    lines.push('The away party is still alive. You will need another ship.');
    pushLog(
      state,
      'warning',
      'You have no ship. Find passage, find work, or find someone selling a hull.',
    );
    state.flags['shipless'] = true;
  }

  return lines;
}

/** Whether the run can still continue without a ship. */
export function canContinueShipless(state: GameState): boolean {
  return state.crewIds.length > 0;
}

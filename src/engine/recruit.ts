/**
 * Recruitment.
 *
 * Choose where to look, spend time, discover zero or more candidates, assess
 * them, talk, persuade, negotiate, and recruit or fail. Finding someone does
 * not mean they join.
 */

import { assessChance, bestAssessor } from './assess';
import { generateRecruit } from './character';
import { performCheck, selectParticipants, type CheckContext } from './check';
import { autoEquipParty } from './inventory';
import { pushLog } from './log';
import type { Rng } from './rng';
import { advanceTime, clampMorale, crewMembers } from './sim';
import { safeCrewCapacity } from './ship';
import { MORALE, RECRUIT } from './tuning';
import type {
  Assessment,
  CheckOutcome,
  Character,
  GameState,
  RecruitCandidate,
  RecruitVenue,
} from './types';

// ---------------------------------------------------------------------------
// Terms
// ---------------------------------------------------------------------------

type TermKind = RecruitCandidate['terms']['kind'];

const TERM_TEMPLATES: { kind: TermKind; weight: number; build: (rng: Rng, tier: number) => RecruitCandidate['terms'] }[] = [
  {
    kind: 'credits',
    weight: 34,
    build: (rng, tier) => {
      const credits = rng.int(120, 340) + tier * 90;
      return { kind: 'credits', label: `${credits} credits up front`, credits, met: false };
    },
  },
  {
    kind: 'food',
    weight: 12,
    build: (rng) => {
      const food = rng.int(4, 12);
      return { kind: 'food', label: `${food} days of food for their family`, food, met: false };
    },
  },
  {
    kind: 'medicine',
    weight: 11,
    build: (rng) => {
      const medicine = rng.int(2, 6);
      return { kind: 'medicine', label: `${medicine} medicine for someone who needs it`, medicine, met: false };
    },
  },
  {
    kind: 'passage',
    weight: 16,
    build: () => ({
      kind: 'passage',
      label: 'passage for a family member as well',
      met: false,
    }),
  },
  {
    kind: 'equipment',
    weight: 9,
    build: (rng) => {
      const credits = rng.int(200, 500);
      return { kind: 'equipment', label: 'gear they can work with', credits, met: false };
    },
  },
  {
    kind: 'missionHelp',
    weight: 8,
    build: () => ({ kind: 'missionHelp', label: 'help with something first', met: false }),
  },
  {
    kind: 'debt',
    weight: 6,
    build: (rng) => {
      const credits = rng.int(180, 600);
      return { kind: 'debt', label: 'a debt cleared before they can leave', credits, met: false };
    },
  },
  {
    kind: 'rescue',
    weight: 4,
    build: () => ({ kind: 'rescue', label: 'somebody found before they will go', met: false }),
  },
];

function rollTerms(rng: Rng, tier: number): RecruitCandidate['terms'] {
  const template = rng.weighted(TERM_TEMPLATES.map((t) => ({ value: t, weight: t.weight })));
  return template.build(rng, tier);
}

// ---------------------------------------------------------------------------
// Searching
// ---------------------------------------------------------------------------

export interface SearchResult {
  candidates: RecruitCandidate[];
  hours: number;
  lines: string[];
}

export function searchForRecruits(
  state: GameState,
  venue: RecruitVenue,
  rng: Rng,
): SearchResult {
  const location = state.currentLocationId ? state.locations[state.currentLocationId] : undefined;
  const lines: string[] = [];
  const hours = rng.float(RECRUIT.searchHours[0], RECRUIT.searchHours[1]);

  const advance = advanceTime(state, hours, rng);
  lines.push(...advance.lines);

  const tier = location?.populationTier ?? 1;

  // Population and venue both shift how many people are actually looking.
  const weights = RECRUIT.candidateCountWeights.map((entry) => ({
    value: entry.count,
    weight: entry.weight * (entry.count === 0 ? Math.max(0.3, 2 - tier * 0.4) : 1 + tier * 0.22),
  }));
  const count = rng.weighted(weights);

  const crisis =
    location?.kind === 'homeworld' && state.homeworld.infrastructure < 70;

  const candidates: RecruitCandidate[] = [];
  for (let i = 0; i < count; i++) {
    const character = generateRecruit(rng, venue, { crisis });
    const base = rng.int(RECRUIT.baseWillingness[0], RECRUIT.baseWillingness[1]);
    const willingness = Math.min(
      100,
      base + (crisis ? RECRUIT.crisisWillingnessBonus : 0),
    );

    candidates.push({
      character,
      willingness,
      terms: rollTerms(rng, tier),
      assessment: assessCandidate(state, character, willingness),
      usedBeats: [],
      talkedTo: false,
      persuadeAttempts: 0,
      negotiateAttempts: 0,
      refused: false,
      joined: false,
    });
  }

  if (candidates.length === 0) {
    lines.push('Nobody worth the conversation.');
  } else {
    lines.push(
      candidates.length === 1
        ? 'One person worth talking to.'
        : `${candidates.length} people worth talking to.`,
    );
  }

  state.recruitment = {
    locationId: location?.id ?? '',
    venue,
    candidates,
    searchedAtHours: state.hours,
    selectedIndex: null,
  };

  pushLog(state, 'crew', `Looked for crew at the ${venue.replace(/([A-Z])/g, ' $1').toLowerCase()}.`);
  return { candidates, hours, lines };
}

// ---------------------------------------------------------------------------
// Assessment
// ---------------------------------------------------------------------------

/** What the player can tell about someone before they sign on. */
export function assessCandidate(
  state: GameState,
  candidate: Character,
  willingness: number,
): Assessment {
  const assessor = bestAssessor(crewMembers(state));
  return assessChance(willingness / 100, {
    assessor,
    relevantSkill: 'persuasion',
  }, candidate.portraitSeed);
}

/**
 * Reveal a candidate's traits progressively as the player talks to them.
 * Evaluation drives how much a conversation gives away.
 */
export function observeCandidate(state: GameState, candidate: RecruitCandidate, rng: Rng): string[] {
  const lines: string[] = [];
  const assessor = bestAssessor(crewMembers(state));
  if (!assessor) return lines;

  const evaluation = assessor.attributes.evaluation;
  for (const knowledge of candidate.character.traitKnowledge) {
    if (knowledge.known >= 2) continue;
    if (!rng.percent(evaluation * 3.5)) continue;
    knowledge.evidence += 3;
    if (knowledge.evidence >= 7) {
      knowledge.known = 2;
      lines.push(`You are fairly sure about them now.`);
    } else if (knowledge.known === 0) {
      knowledge.known = 1;
      lines.push(`Something about them stands out.`);
    }
  }
  return lines;
}

// ---------------------------------------------------------------------------
// Conversation
// ---------------------------------------------------------------------------

const TALK_BEATS = [
  'Ask why they are still here.',
  'Ask what they can actually do.',
  'Ask what they want out of it.',
  'Tell them where you are going.',
  'Tell them what happened to the last berth you filled.',
];

export function availableBeats(candidate: RecruitCandidate): string[] {
  return TALK_BEATS.filter((b) => !candidate.usedBeats.includes(b));
}

export function talkTo(
  state: GameState,
  candidate: RecruitCandidate,
  beat: string,
  rng: Rng,
): string[] {
  const lines: string[] = [];
  candidate.usedBeats.push(beat);
  candidate.talkedTo = true;

  const advance = advanceTime(state, 0.5, rng);
  lines.push(...advance.lines);

  lines.push(...observeCandidate(state, candidate, rng));

  // Talking alone moves the needle a little, in either direction.
  const shift = rng.int(-3, 6);
  candidate.willingness = Math.max(0, Math.min(100, candidate.willingness + shift));
  candidate.assessment = assessCandidate(state, candidate.character, candidate.willingness);

  lines.push(
    shift > 3
      ? 'That lands well.'
      : shift < 0
        ? 'That does not help.'
        : 'They hear you out.',
  );

  return lines;
}

// ---------------------------------------------------------------------------
// Persuasion and negotiation
// ---------------------------------------------------------------------------

function context(state: GameState): CheckContext {
  return { characters: state.characters, morale: state.morale, hours: state.hours };
}

export interface AttemptResult {
  outcome: CheckOutcome;
  lines: string[];
  joined: boolean;
}

export function persuade(
  state: GameState,
  candidate: RecruitCandidate,
  rng: Rng,
): AttemptResult {
  const lines: string[] = [];
  const crew = crewMembers(state);

  if (candidate.persuadeAttempts >= RECRUIT.maxPersuadeAttempts) {
    return { outcome: 'failure', lines: ['They have heard enough from you.'], joined: false };
  }
  candidate.persuadeAttempts += 1;

  const check = performCheck(
    {
      skill: 'persuasion',
      secondarySkill: 'negotiation',
      participantIds: selectParticipants(crew, 'persuasion', 'individual'),
      label: `Persuade ${candidate.character.name}`,
    },
    context(state),
    rng,
  );

  const delta = RECRUIT.persuasionDelta[check.outcome];
  candidate.willingness = Math.max(0, Math.min(100, candidate.willingness + delta));
  candidate.assessment = assessCandidate(state, candidate.character, candidate.willingness);

  const advance = advanceTime(state, 0.75, rng);
  lines.push(...advance.lines);

  switch (check.outcome) {
    case 'exceptional':
      lines.push('You say exactly the right thing. They are close to convinced.');
      break;
    case 'success':
      lines.push('They are warming to it.');
      break;
    case 'partial':
      lines.push('They are listening, but not moved much.');
      break;
    case 'failure':
      lines.push('They are not interested in the pitch.');
      break;
    case 'criticalFailure':
      lines.push('You misjudge them badly. That went backwards.');
      if (candidate.willingness < 15) {
        candidate.refused = true;
        lines.push('They are done talking.');
      }
      break;
  }

  if (state.debug.enabled) {
    state.debug.records.push({
      id: `dbg_persuade_${state.debug.records.length}`,
      hours: state.hours,
      label: `Persuade ${candidate.character.name}`,
      detail: { check, willingness: candidate.willingness },
    });
  }

  return { outcome: check.outcome, lines, joined: false };
}

export function negotiate(
  state: GameState,
  candidate: RecruitCandidate,
  rng: Rng,
): AttemptResult {
  const lines: string[] = [];
  const crew = crewMembers(state);

  if (candidate.negotiateAttempts >= RECRUIT.maxNegotiateAttempts) {
    return { outcome: 'failure', lines: ['They will not move on terms again.'], joined: false };
  }
  candidate.negotiateAttempts += 1;

  const check = performCheck(
    {
      skill: 'negotiation',
      secondarySkill: 'persuasion',
      participantIds: selectParticipants(crew, 'negotiation', 'individual'),
      label: `Negotiate with ${candidate.character.name}`,
    },
    context(state),
    rng,
  );

  const reduction = RECRUIT.negotiationDelta[check.outcome];
  const terms = candidate.terms;

  if (terms.credits) terms.credits = Math.max(0, Math.round(terms.credits * (1 - reduction)));
  if (terms.food) terms.food = Math.max(0, Math.round(terms.food * (1 - reduction)));
  if (terms.medicine) terms.medicine = Math.max(0, Math.round(terms.medicine * (1 - reduction)));

  terms.label = rebuildTermsLabel(terms);

  const advance = advanceTime(state, 0.75, rng);
  lines.push(...advance.lines);

  switch (check.outcome) {
    case 'exceptional':
      lines.push('You find a shape of the deal that suits you both.');
      break;
    case 'success':
      lines.push('They come down on their terms.');
      break;
    case 'partial':
      lines.push('A small concession, grudgingly.');
      break;
    case 'failure':
      lines.push('They hold their price.');
      break;
    case 'criticalFailure':
      lines.push('They take offence. The terms get worse.');
      candidate.willingness = Math.max(0, candidate.willingness - 12);
      break;
  }

  return { outcome: check.outcome, lines, joined: false };
}

function rebuildTermsLabel(terms: RecruitCandidate['terms']): string {
  switch (terms.kind) {
    case 'credits':
      return `${terms.credits ?? 0} credits up front`;
    case 'food':
      return `${terms.food ?? 0} days of food for their family`;
    case 'medicine':
      return `${terms.medicine ?? 0} medicine for someone who needs it`;
    case 'equipment':
      return `gear they can work with (${terms.credits ?? 0} credits)`;
    case 'debt':
      return `a debt of ${terms.credits ?? 0} credits cleared first`;
    default:
      return terms.label;
  }
}

// ---------------------------------------------------------------------------
// Meeting the terms and signing on
// ---------------------------------------------------------------------------

export function canMeetTerms(state: GameState, candidate: RecruitCandidate): boolean {
  const terms = candidate.terms;
  if (terms.credits && state.resources.credits < terms.credits) return false;
  if (terms.food && state.resources.food < terms.food) return false;
  if (terms.medicine && state.resources.medicine < terms.medicine) return false;
  return true;
}

export function payTerms(state: GameState, candidate: RecruitCandidate): string[] {
  const lines: string[] = [];
  const terms = candidate.terms;
  if (!canMeetTerms(state, candidate)) {
    return ['You cannot cover what they are asking.'];
  }

  if (terms.credits) {
    state.resources.credits -= terms.credits;
    lines.push(`Paid ${terms.credits} credits.`);
  }
  if (terms.food) {
    state.resources.food -= terms.food;
    lines.push(`Handed over ${terms.food} days of food.`);
  }
  if (terms.medicine) {
    state.resources.medicine -= terms.medicine;
    lines.push(`Handed over ${terms.medicine} medicine.`);
  }

  terms.met = true;
  candidate.willingness = Math.min(100, candidate.willingness + RECRUIT.termsMetWillingness);
  candidate.assessment = assessCandidate(state, candidate.character, candidate.willingness);
  lines.push('Terms met.');
  return lines;
}

export interface OfferResult {
  joined: boolean;
  lines: string[];
}

/** Make the actual offer. Willingness decides. */
export function offerBerth(state: GameState, candidate: RecruitCandidate, rng: Rng): OfferResult {
  const lines: string[] = [];

  if (candidate.refused) {
    return { joined: false, lines: ['They already told you no.'] };
  }

  const capacity = state.ship ? safeCrewCapacity(state.ship) : 0;
  const crew = crewMembers(state);
  if (crew.length >= capacity) {
    lines.push(
      `There is no safe berth for them — ${crew.length} aboard against capacity ${capacity}.`,
    );
    // Overcrowding is allowed, but the player is warned first.
  }

  const threshold = RECRUIT.joinThreshold - (candidate.terms.met ? 0 : 0);
  if (candidate.willingness < threshold) {
    // A last roll, so a near miss is not a flat wall.
    const gap = threshold - candidate.willingness;
    if (gap > 22 || !rng.percent(Math.max(0, 40 - gap * 2))) {
      lines.push(`${candidate.character.name} turns you down.`);
      candidate.refused = true;
      return { joined: false, lines };
    }
  }

  const character = candidate.character;
  character.aboard = true;
  if (!candidate.terms.met && candidate.terms.kind !== 'passage') {
    character.owedTerms = candidate.terms.label;
  }

  state.characters[character.id] = character;
  state.crewIds.push(character.id);
  candidate.joined = true;

  // Everyone aboard now knows of each other, faintly.
  for (const member of crew) {
    member.relationships[character.id] = { value: 0, familiarity: 5, kind: 'crew' };
    character.relationships[member.id] = { value: 0, familiarity: 5, kind: 'crew' };
  }

  // A new hand gets kitted out from the hold rather than walking around empty.
  autoEquipParty([character], state.ship);

  state.morale = clampMorale(state.morale + MORALE.crewRecruitBonus);
  lines.push(`${character.name} ${character.surname} signs on as ${character.role}.`);
  pushLog(state, 'crew', `${character.name} ${character.surname} joined the crew.`);

  return { joined: true, lines };
}

export function closeRecruitment(state: GameState): void {
  state.recruitment = null;
  state.screen = 'locationActions';
}

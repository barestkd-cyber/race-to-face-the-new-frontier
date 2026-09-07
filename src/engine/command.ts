/**
 * Command: who runs the ship, who can leave it, and what happens when the
 * chair is empty.
 *
 * Two posts, and only two. The captain is the protagonist of the run and holds
 * the chair until they die — captaincy is not a role you hand to whichever
 * recruit rolled better numbers, because everything the captain is and has
 * done has to keep mattering. The crew lead is the one reassignable command
 * post, and the alternate character the player can put at the centre of field
 * work.
 *
 * The rule that makes both posts matter: an away party leaves somebody in
 * command. If the captain goes out, the crew lead has the ship. If the crew
 * lead goes out, the captain has it. They only leave together where the berth
 * is genuinely covered.
 */

import { pushLog } from './log';
import { crewMembers, isDependent } from './sim';
import { COMMAND } from './tuning';
import type { Character, GameState } from './types';

export interface CommandCheck {
  ok: boolean;
  reason?: string;
}

// ---------------------------------------------------------------------------
// Who holds what
// ---------------------------------------------------------------------------

export function captainOf(state: GameState): Character | undefined {
  const captain = state.characters[state.captainId];
  return captain && captain.alive ? captain : undefined;
}

export function crewLeadOf(state: GameState): Character | undefined {
  if (!state.crewLeadId) return undefined;
  const lead = state.characters[state.crewLeadId];
  if (!lead || !lead.alive || !state.crewIds.includes(lead.id)) return undefined;
  return lead;
}

/** Everybody who could hold the second command post. */
export function crewLeadCandidates(state: GameState): Character[] {
  return crewMembers(state).filter(
    (c) => c.id !== state.captainId && !isDependent(c) && c.alive,
  );
}

// ---------------------------------------------------------------------------
// Assigning the crew lead
// ---------------------------------------------------------------------------

/**
 * The post moves between jobs, not mid-job. Swapping the second-in-command
 * while a party is standing in a ruin is a tactical toggle, not a command
 * decision, so the engine refuses it.
 */
export function canAssignCrewLead(state: GameState, characterId: string): CommandCheck {
  if (state.expedition) {
    return { ok: false, reason: 'Not while a party is out. This waits until they are back.' };
  }
  if (state.combat) {
    return { ok: false, reason: 'Not in the middle of a fight.' };
  }
  if (characterId === state.captainId) {
    return { ok: false, reason: 'The captain already has a post.' };
  }
  const person = state.characters[characterId];
  if (!person || !person.alive || !state.crewIds.includes(characterId)) {
    return { ok: false, reason: 'They are not aboard.' };
  }
  if (isDependent(person)) {
    return { ok: false, reason: 'They are too young to be given the ship.' };
  }
  return { ok: true };
}

export function assignCrewLead(state: GameState, characterId: string): CommandCheck {
  const allowed = canAssignCrewLead(state, characterId);
  if (!allowed.ok) return allowed;
  const person = state.characters[characterId]!;
  state.crewLeadId = characterId;
  pushLog(state, 'crew', `${person.name} ${person.surname} takes the crew lead.`);
  return { ok: true };
}

/**
 * Keep the post filled without asking when there is only one answer.
 *
 * A ship with a captain and one other adult has exactly one candidate, so
 * making the player go and appoint them is a chore. The moment there is a
 * genuine choice, the player still has it — this only fills an empty post.
 */
export function ensureCrewLead(state: GameState): void {
  if (state.expedition) return;
  if (crewLeadOf(state)) return;

  const candidates = crewLeadCandidates(state);
  if (candidates.length === 0) {
    state.crewLeadId = null;
    return;
  }
  // The steadiest hand, which is what the post is actually for.
  const best = candidates.reduce((a, b) =>
    b.attributes.leadership > a.attributes.leadership ? b : a,
  );
  state.crewLeadId = best.id;
  pushLog(state, 'crew', `${best.name} ${best.surname} is now the crew lead.`);
}

// ---------------------------------------------------------------------------
// A berth somebody else is watching
// ---------------------------------------------------------------------------

export interface BerthSecurity {
  secured: boolean;
  /** Why, in words, whether it is covered or not. */
  reason: string;
  /** True when it is only covered because somebody is being paid. */
  paid: boolean;
}

export function berthSecurity(state: GameState): BerthSecurity {
  const paidUntil = state.shipWatchUntilHours ?? 0;
  if (paidUntil > state.hours) {
    return {
      secured: true,
      paid: true,
      reason: 'You are paying somebody local to sit with the ship.',
    };
  }

  if (state.travel) {
    return { secured: false, paid: false, reason: 'She is under way. Somebody has to be flying her.' };
  }

  const parked = Object.values(state.places).find(
    (p) => p.shipHere && p.locationId === state.currentLocationId,
  );
  if (parked && parked.danger <= COMMAND.securePlaceDanger) {
    return {
      secured: true,
      paid: false,
      reason: `${parked.name} is quiet enough to leave her standing.`,
    };
  }

  return {
    secured: false,
    paid: false,
    reason: parked
      ? `${parked.name} is not somewhere you leave a ship unwatched.`
      : 'There is nowhere secure to leave her.',
  };
}

export function canPayShipWatch(state: GameState): CommandCheck {
  if (state.travel) return { ok: false, reason: 'Not under way.' };
  if (berthSecurity(state).secured) {
    return { ok: false, reason: 'The berth is already covered.' };
  }
  if (state.resources.credits < COMMAND.shipWatchCredits) {
    return {
      ok: false,
      reason: `They want ${COMMAND.shipWatchCredits} credits and you have ${Math.floor(state.resources.credits)}.`,
    };
  }
  return { ok: true };
}

export function payShipWatch(state: GameState): string[] {
  const allowed = canPayShipWatch(state);
  if (!allowed.ok) return [allowed.reason ?? 'Not here.'];
  state.resources.credits -= COMMAND.shipWatchCredits;
  state.shipWatchUntilHours = state.hours + COMMAND.shipWatchHours;
  pushLog(state, 'crew', 'Paid a local crew to watch the ship.');
  return [
    `Paid ${COMMAND.shipWatchCredits} credits. Somebody will sit with her for a day.`,
  ];
}

// ---------------------------------------------------------------------------
// The rule
// ---------------------------------------------------------------------------

/**
 * Whether this away party leaves the ship in somebody's hands.
 *
 * Captain out means the crew lead stays. Crew lead out means the captain
 * stays. Both leave only where the berth is covered — and a captain who is the
 * only person aboard has nobody to leave behind, so the rule does not bind.
 */
export function commandRuleFor(state: GameState, partyIds: string[]): CommandCheck {
  const crew = crewMembers(state);
  if (crew.length <= 1) return { ok: true };

  const captain = captainOf(state);
  const lead = crewLeadOf(state);
  const going = new Set(partyIds);

  const captainGoing = Boolean(captain && going.has(captain.id));
  const leadGoing = Boolean(lead && going.has(lead.id));
  if (!captainGoing && !leadGoing) return { ok: true };

  const security = berthSecurity(state);
  if (security.secured) return { ok: true };

  if (captainGoing && leadGoing) {
    return {
      ok: false,
      reason: `${security.reason} One of you has to stay with her — the captain or the crew lead, not both out.`,
    };
  }
  if (captainGoing && !lead) {
    return {
      ok: false,
      reason: `${security.reason} With you outside there is nobody in command aboard. Name a crew lead first.`,
    };
  }
  return { ok: true };
}

/** Who is holding the ship while this party is out, for the prep screen. */
export function whoHasTheShip(state: GameState, partyIds: string[]): string | null {
  const crew = crewMembers(state);
  if (crew.length <= 1) return null;
  const going = new Set(partyIds);
  const captain = captainOf(state);
  const lead = crewLeadOf(state);

  if (captain && !going.has(captain.id)) return `${captain.name} has the ship.`;
  if (lead && !going.has(lead.id)) return `${lead.name} has the ship.`;
  const security = berthSecurity(state);
  if (security.secured) return security.reason;
  return null;
}

// ---------------------------------------------------------------------------
// Succession
// ---------------------------------------------------------------------------

/** Everybody who could take the chair. */
export function successionCandidates(state: GameState): Character[] {
  return crewMembers(state).filter((c) => c.alive && !isDependent(c));
}

/**
 * Notice that the chair is empty.
 *
 * Called from the one place that reconciles the roster after anything kills
 * anybody. The provisional successor keeps the rest of the engine from
 * dereferencing a dead captain while the player is deciding; the decision
 * itself still belongs to them.
 */
export function noteSuccession(state: GameState): void {
  const captain = state.characters[state.captainId];
  const stillServing = Boolean(captain && captain.alive && state.crewIds.includes(captain.id));
  if (stillServing) return;
  if (state.crewIds.length === 0) return;

  const candidates = successionCandidates(state);
  const provisional =
    candidates.find((c) => c.id === state.crewLeadId) ??
    candidates[0] ??
    crewMembers(state)[0];
  if (!provisional) return;

  takeCommand(state, provisional.id, { announce: false });
  state.pendingSuccession = true;
}

/** Hand the chair over. Permanent — the new captain holds it until they die. */
export function takeCommand(
  state: GameState,
  characterId: string,
  options: { announce?: boolean } = {},
): CommandCheck {
  const person = state.characters[characterId];
  if (!person || !person.alive || !state.crewIds.includes(characterId)) {
    return { ok: false, reason: 'They are not aboard.' };
  }

  const previous = state.characters[state.captainId];
  if (previous && previous.id !== characterId && previous.alive) previous.role = 'crew';

  state.captainId = characterId;
  person.role = 'captain';
  // The chair and the second post are never the same person.
  if (state.crewLeadId === characterId) state.crewLeadId = null;
  ensureCrewLead(state);

  if (options.announce !== false) {
    pushLog(
      state,
      'milestone',
      `${person.name} ${person.surname} takes command. It was not asked for.`,
    );
  }
  return { ok: true };
}

/** The player has chosen. Clears the prompt and makes it permanent. */
export function confirmSuccession(state: GameState, characterId: string): CommandCheck {
  const result = takeCommand(state, characterId);
  if (!result.ok) return result;
  state.pendingSuccession = false;
  return { ok: true };
}

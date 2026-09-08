/**
 * Creating a run.
 *
 * Everything here is a pure function of the seed, so the same seed always
 * produces the same protagonist, ship, family, world and route. Generated facts
 * are persisted once created and never re-rolled.
 */

import {
  createCharacter,
  generateFamily,
  generateProtagonistDraft,
  type ProtagonistDraft,
} from './character';
import { generateGalaxy, generateGarageShip } from './galaxy';
import { hasHook } from './hooks';
import { addItem, autoEquipParty, getItem } from './inventory';
import { pushLog } from './log';
import { generateSeed, normalizeSeed, streamRng, type Rng } from './rng';
import { ensurePlaces, placeKnownCharacters } from './places';
import { generateShip, recomputeShipCapacities, shipRef, takenShipNames } from './ship';
import { ensurePair } from './relationships';
import { pruneDeadCrew } from './sim';
import { MORALE, ONBOARDING, SAVE, SHIPS, START, PERSONALITY } from './tuning';
import { startingCreditsDelta } from './lifeStory';
import { generateWorld } from './world';
import type { Character, GameState, Resources } from './types';

// ---------------------------------------------------------------------------
// Draft — what the character-gen screen edits before the run truly begins
// ---------------------------------------------------------------------------

export interface NewRunDraft {
  seed: string;
  protagonist: ProtagonistDraft;
}

export function beginNewRun(seedInput?: string): NewRunDraft {
  const seed = seedInput ? normalizeSeed(seedInput) : generateSeed();
  const rng = streamRng(seed, 'protagonist');
  return { seed, protagonist: generateProtagonistDraft(rng) };
}

/** Re-roll the protagonist without changing the world the seed describes. */
export function rerollProtagonist(seed: string, attempt: number): ProtagonistDraft {
  return generateProtagonistDraft(streamRng(seed, 'protagonist', 'reroll', attempt));
}

// ---------------------------------------------------------------------------
// Starting resources and kit
// ---------------------------------------------------------------------------

function rollResources(rng: Rng, fuelCapacity: number): Resources {
  return {
    fuel: Math.round(fuelCapacity * rng.float(START.fuelFraction[0], START.fuelFraction[1])),
    fuelCapacity,
    food: rng.int(START.food[0], START.food[1]),
    repairParts: rng.int(START.repairParts[0], START.repairParts[1]),
    medicine: rng.int(START.medicine[0], START.medicine[1]),
    credits: rng.taperedInt(START.credits[0], START.credits[1], 2),
  };
}

function stockShip(state: GameState, rng: Rng): void {
  if (!state.ship) return;
  const cargo = state.ship.cargo;

  for (const entry of START.guaranteedItems) {
    addItem(cargo, entry.itemId, entry.qty, rng.int(entry.condition[0], entry.condition[1]), rng);
  }

  const extras = rng.int(START.randomItemCount[0], START.randomItemCount[1]);
  const chosen = rng.pickMany(START.randomItemPool, extras);
  for (const itemId of chosen) {
    addItem(cargo, itemId, 1, rng.int(30, 95), rng);
  }

  // Whatever weapons came aboard need something to fire.
  const ammoNeeded = new Set<string>();
  for (const stack of cargo) {
    const def = getItem(stack.itemId);
    for (const attack of def?.attacks ?? []) {
      if (attack.ammoId && attack.ammoId !== stack.itemId) ammoNeeded.add(attack.ammoId);
    }
  }
  for (const ammoId of ammoNeeded) {
    addItem(cargo, ammoId, rng.int(START.startingAmmo[0], START.startingAmmo[1]), 100, rng);
  }
}

/**
 * What an authored life leaves you holding on day one.
 *
 * Two hooks put physical objects aboard, and only two. The mercenary's kit is
 * the whole point of that hook — the memorable advantage of that work is the
 * gear, not a skill number, and it is deliberately conventional: plate and
 * ballistics, nothing that came out of a military energy-weapons programme.
 */
function stockHookKit(state: GameState, captain: Character, rng: Rng): void {
  if (!state.ship) return;
  const cargo = state.ship.cargo;

  if (hasHook(captain, 'mercenaryKit')) {
    addItem(cargo, 'plate_carrier', 1, rng.int(70, 95), rng);
    addItem(cargo, 'helmet_combat', 1, rng.int(65, 95), rng);
    addItem(cargo, rng.pick(['rifle_service', 'shotgun_breaching', 'carbine_worn']), 1, rng.int(62, 92), rng);
    addItem(cargo, 'pistol_service', 1, rng.int(60, 90), rng);
    addItem(cargo, 'combat_knife', 1, rng.int(70, 100), rng);
  }

  // Worth more than they will admit, and not for sale for reasons that are
  // not about money.
  if (hasHook(captain, 'valuablePossession')) {
    addItem(cargo, 'heirloom_watch', 1, rng.int(80, 100), rng);
  }
}

// ---------------------------------------------------------------------------
// Committing the run
// ---------------------------------------------------------------------------

/**
 * Turn a finished character-gen draft into a live GameState. The protagonist
 * passed in has already had their player-allocated points spent.
 */
export function createGame(seed: string, protagonist: Character): GameState {
  const world = generateWorld(seed);

  // The wider galaxy the seed decided on. Earth is in it, wherever it is, and
  // nobody here knows that unless the captain's own history says otherwise.
  const galaxy = generateGalaxy(seed);

  const shipRng = streamRng(seed, 'ship');
  const ship = generateShip(shipRng);
  recomputeShipCapacities(ship);

  // The one life event that skips the discovery problem: a grandfather who
  // went, came back with the route, and left a garage on the other end.
  if (hasHook(protagonist, 'earthMap')) {
    galaxy.earth.known = true;
    galaxy.earth.garageShip = generateGarageShip(seed, takenShipNames([ship]));
  }

  const crewRng = streamRng(seed, 'crew');
  const characters: Record<string, Character> = {};

  protagonist.isPlayer = true;
  protagonist.aboard = true;
  protagonist.role = 'captain';
  // You know your own personality. Everyone else's has to be watched for —
  // that rule is about visibility, not about a different set of traits.
  for (const knowledge of protagonist.traitKnowledge) {
    knowledge.known = 2;
    knowledge.evidence = PERSONALITY.evidenceForKnown;
  }
  characters[protagonist.id] = protagonist;

  const crewIds: string[] = [protagonist.id];

  // A couple of people were already aboard, or came with the ship.
  const startingCrew = crewRng.int(START.startingCrew[0], START.startingCrew[1]) - 1;
  for (let i = 0; i < startingCrew; i++) {
    const member = createCharacter({ rng: crewRng, aboard: true });
    member.aboard = true;
    characters[member.id] = member;
    crewIds.push(member.id);
  }

  // Everyone aboard has at least met. They are Peers: normal respect, no
  // particular warmth, and nothing yet that either of them owes the other.
  for (const a of crewIds) {
    for (const b of crewIds) {
      if (a === b) continue;
      ensurePair(characters[a]!, characters[b]!, crewRng.int(15, 55));
    }
  }

  // Family stays on the homeworld until the player does something about it.
  const familyRng = streamRng(seed, 'family');
  // Family are asked into existence one relation at a time, so the size and
  // shape of a family varies the way real ones do.
  const family = generateFamily(familyRng, protagonist);
  for (const member of family) {
    characters[member.id] = member;
    world.homeworld.familyIds.push(member.id);
  }

  const resourceRng = streamRng(seed, 'resources');
  const resources = rollResources(resourceRng, SHIPS.fuelCapacity[ship.shipClass]);

  // A history that involved money leaves some of it behind, in either
  // direction. Only a handful of the five hundred events touch this, and the
  // amounts are deliberately modest — colour and a head start, not a run
  // handed over at the door. Credits never go below nothing.
  const inherited = startingCreditsDelta(protagonist);
  if (inherited !== 0) {
    resources.credits = Math.max(0, Math.round(resources.credits + inherited));
  }

  const state: GameState = {
    version: SAVE.schemaVersion,
    seed,
    rngCursor: 0,
    createdAt: Date.now(),
    savedAt: Date.now(),

    hours: 0,
    speed: 'normal',

    phase: 'homeworld',
    screen: 'shipReveal',
    screenStack: [],

    playerId: protagonist.id,
    captainId: protagonist.id,
    // You start alone, so there is nobody to hold the second post yet.
    crewLeadId: null,
    characters,
    crewIds,

    ship,
    resources,

    galaxy,

    locations: world.locations,
    routeIds: world.routeIds,
    currentLocationId: world.homeworldId,
    travel: null,

    places: {},
    // You begin aboard, on the pad behind the house.
    currentPlaceId: null,

    sites: {},
    missions: [],
    expedition: null,
    combat: null,
    recruitment: null,
    trade: null,
    activeEvent: null,
    pendingRest: null,

    homeworld: world.homeworld,

    morale: MORALE.start,
    crewXp: 0,

    opportunities: [],

    log: [],
    debug: { enabled: false, records: [], revealHidden: false },
    flags: {},

    firedOnce: [],
    recentEvents: {},
    pendingCombat: null,

    onboardingStep: ONBOARDING.startStep,
    pendingFarewells: [],

    ending: null,
    focusCharacterId: null,
    missionPrep: null,
  };

  // The homeworld exists as walkable ground from the first moment, and the
  // people you know are standing somewhere in it rather than in a menu.
  const homeworldLocation = world.locations[world.homeworldId];
  if (homeworldLocation) ensurePlaces(state, homeworldLocation);
  placeKnownCharacters(state, streamRng(seed, 'family', 'places'));

  stockShip(state, streamRng(seed, 'kit'));
  stockHookKit(state, protagonist, streamRng(seed, 'kit', 'hooks'));

  // A best friend from before any of this, out in the wider galaxy somewhere.
  // They are a real generated person from the day the run starts, not a line
  // of text invented later when an event needs one.
  if (hasHook(protagonist, 'childhoodFriend')) {
    const friendRng = streamRng(seed, 'friend');
    const friend = createCharacter({ rng: friendRng, aboard: false });
    friend.aboard = false;
    friend.placeKnown = false;
    friend.availability = 'unreachable';
    friend.departedReason = undefined;
    state.characters[friend.id] = friend;
    ensurePair(protagonist, friend, 90);
    protagonist.relationships[friend.id]!.value = 55;
    friend.relationships[protagonist.id]!.value = 55;
    state.flags.childhood_friend_id = friend.id;
  }

  // Nobody walks off an inherited ship empty-handed when there is gear aboard.
  autoEquipParty(
    crewIds.map((id) => characters[id]!),
    ship,
  );

  if (galaxy.earth.known) {
    pushLog(
      state,
      'milestone',
      "Your grandfather's route is real, and you are the only person on this world who has it.",
    );
  }

  pushLog(state, 'milestone', `Run ${seed} begins on the Homeworld.`);
  pushLog(
    state,
    'system',
    `You inherit ${shipRef(ship)}. ${describeInheritance(state)}`,
  );
  pushLog(
    state,
    'warning',
    'Two separate extinction clocks are running and nobody knows which one finishes first.',
  );

  return state;
}

function describeInheritance(state: GameState): string {
  const ship = state.ship!;
  const rooms = ship.rooms.length;
  const worst = Math.min(...Object.values(ship.systems).filter((s) => s.installed).map((s) => s.condition));
  if (worst < 35) return `${rooms} rooms, and at least one system that needs attention badly.`;
  if (worst < 65) return `${rooms} rooms, worn but serviceable.`;
  return `${rooms} rooms, in better shape than you expected.`;
}

// ---------------------------------------------------------------------------
// Ending conditions
// ---------------------------------------------------------------------------

/** The run is over when nobody is left alive. Losing the ship is survivable. */
export function checkRunEnded(state: GameState): boolean {
  // Casualties from combat and hazards are marked dead in place, so the roster
  // is reconciled here before anything decides whether the run is over.
  pruneDeadCrew(state);

  if (state.ending) return true;
  if (state.crewIds.length === 0) {
    state.ending = { kind: 'death', text: 'Nobody is left.' };
    state.phase = 'dead';
    state.screen = 'gameOver';
    return true;
  }
  return false;
}

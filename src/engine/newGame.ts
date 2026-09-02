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
import { addItem, autoEquipParty, getItem } from './inventory';
import { pushLog } from './log';
import { generateSeed, normalizeSeed, streamRng, type Rng } from './rng';
import { generateShip, recomputeShipCapacities } from './ship';
import { pruneDeadCrew } from './sim';
import { MORALE, SAVE, SHIPS, START } from './tuning';
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
    dataCores: rng.int(START.dataCores[0], START.dataCores[1]),
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

// ---------------------------------------------------------------------------
// Committing the run
// ---------------------------------------------------------------------------

/**
 * Turn a finished character-gen draft into a live GameState. The protagonist
 * passed in has already had their player-allocated points spent.
 */
export function createGame(seed: string, protagonist: Character): GameState {
  const world = generateWorld(seed);

  const shipRng = streamRng(seed, 'ship');
  const ship = generateShip(shipRng);
  recomputeShipCapacities(ship);

  const crewRng = streamRng(seed, 'crew');
  const characters: Record<string, Character> = {};

  protagonist.isPlayer = true;
  protagonist.aboard = true;
  protagonist.role = 'captain';
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

  // Everyone aboard has at least met.
  for (const a of crewIds) {
    for (const b of crewIds) {
      if (a === b) continue;
      characters[a]!.relationships[b] = {
        value: crewRng.int(-5, 25),
        familiarity: crewRng.int(15, 55),
        kind: 'crew',
      };
    }
  }

  // Family stays on the homeworld until the player does something about it.
  const familyRng = streamRng(seed, 'family');
  const family = generateFamily(
    familyRng,
    protagonist,
    familyRng.int(START.familyCount[0], START.familyCount[1]),
  );
  for (const member of family) {
    characters[member.id] = member;
    world.homeworld.familyIds.push(member.id);
  }

  const resourceRng = streamRng(seed, 'resources');
  const resources = rollResources(resourceRng, SHIPS.fuelCapacity[ship.size]);

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
    characters,
    crewIds,

    ship,
    resources,

    locations: world.locations,
    routeIds: world.routeIds,
    currentLocationId: world.homeworldId,
    travel: null,

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

    ending: null,
    focusCharacterId: null,
    missionPrep: null,
  };

  stockShip(state, streamRng(seed, 'kit'));

  // Nobody walks off an inherited ship empty-handed when there is gear aboard.
  autoEquipParty(
    crewIds.map((id) => characters[id]!),
    ship,
  );

  pushLog(state, 'milestone', `Run ${seed} begins on the Homeworld.`);
  pushLog(
    state,
    'system',
    `You inherit the ${ship.name}. ${describeInheritance(state)}`,
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

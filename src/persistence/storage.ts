/**
 * Persistence.
 *
 * The engine never talks to IndexedDB directly — it talks to a SaveStore. V1
 * ships an IndexedDB implementation with a localStorage fallback, and a hosted
 * backend can be dropped in later by implementing the same interface.
 */

import { generateGalaxy } from '../engine/galaxy';
import { recomputeShipCapacities, updateDegradedStates } from '../engine/ship';
import { SAVE, SHIPS } from '../engine/tuning';
import type { GameState, Ship } from '../engine/types';

export interface SaveMeta {
  slot: string;
  seed: string;
  savedAt: number;
  hours: number;
  captainName: string;
  locationName: string;
  crewCount: number;
  schemaVersion: number;
}

export interface SaveRecord {
  meta: SaveMeta;
  state: GameState;
}

export interface SaveStore {
  readonly kind: string;
  available(): Promise<boolean>;
  put(slot: string, record: SaveRecord): Promise<void>;
  get(slot: string): Promise<SaveRecord | null>;
  list(): Promise<SaveMeta[]>;
  remove(slot: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// IndexedDB
// ---------------------------------------------------------------------------

class IndexedDbStore implements SaveStore {
  readonly kind = 'indexeddb';
  private dbPromise: Promise<IDBDatabase> | null = null;

  private open(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(SAVE.dbName, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(SAVE.storeName)) {
          db.createObjectStore(SAVE.storeName, { keyPath: 'slot' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return this.dbPromise;
  }

  async available(): Promise<boolean> {
    if (typeof indexedDB === 'undefined') return false;
    try {
      await this.open();
      return true;
    } catch {
      return false;
    }
  }

  private tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    return this.open().then(
      (db) =>
        new Promise<T>((resolve, reject) => {
          const transaction = db.transaction(SAVE.storeName, mode);
          const request = run(transaction.objectStore(SAVE.storeName));
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        }),
    );
  }

  async put(slot: string, record: SaveRecord): Promise<void> {
    await this.tx('readwrite', (store) =>
      store.put({ slot, meta: record.meta, state: record.state }) as IDBRequest<IDBValidKey>,
    );
  }

  async get(slot: string): Promise<SaveRecord | null> {
    const row = await this.tx<{ meta: SaveMeta; state: GameState } | undefined>(
      'readonly',
      (store) => store.get(slot) as IDBRequest<{ meta: SaveMeta; state: GameState } | undefined>,
    );
    return row ? { meta: row.meta, state: row.state } : null;
  }

  async list(): Promise<SaveMeta[]> {
    const rows = await this.tx<{ meta: SaveMeta }[]>(
      'readonly',
      (store) => store.getAll() as IDBRequest<{ meta: SaveMeta }[]>,
    );
    return rows.map((r) => r.meta).sort((a, b) => b.savedAt - a.savedAt);
  }

  async remove(slot: string): Promise<void> {
    await this.tx('readwrite', (store) => store.delete(slot) as unknown as IDBRequest<undefined>);
  }
}

// ---------------------------------------------------------------------------
// localStorage fallback
// ---------------------------------------------------------------------------

class LocalStorageStore implements SaveStore {
  readonly kind = 'localstorage';

  private key(slot: string): string {
    return `${SAVE.dbName}:${slot}`;
  }

  async available(): Promise<boolean> {
    try {
      const probe = `${SAVE.dbName}:probe`;
      localStorage.setItem(probe, '1');
      localStorage.removeItem(probe);
      return true;
    } catch {
      return false;
    }
  }

  async put(slot: string, record: SaveRecord): Promise<void> {
    localStorage.setItem(this.key(slot), JSON.stringify(record));
  }

  async get(slot: string): Promise<SaveRecord | null> {
    const raw = localStorage.getItem(this.key(slot));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SaveRecord;
    } catch {
      return null;
    }
  }

  async list(): Promise<SaveMeta[]> {
    const metas: SaveMeta[] = [];
    const prefix = `${SAVE.dbName}:`;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(prefix)) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      try {
        metas.push((JSON.parse(raw) as SaveRecord).meta);
      } catch {
        // A corrupt slot should not take the whole save list with it.
      }
    }
    return metas.sort((a, b) => b.savedAt - a.savedAt);
  }

  async remove(slot: string): Promise<void> {
    localStorage.removeItem(this.key(slot));
  }
}

/** In-memory store so the game still runs where no storage is permitted. */
class MemoryStore implements SaveStore {
  readonly kind = 'memory';
  private data = new Map<string, SaveRecord>();

  async available(): Promise<boolean> {
    return true;
  }
  async put(slot: string, record: SaveRecord): Promise<void> {
    this.data.set(slot, record);
  }
  async get(slot: string): Promise<SaveRecord | null> {
    return this.data.get(slot) ?? null;
  }
  async list(): Promise<SaveMeta[]> {
    return [...this.data.values()].map((r) => r.meta).sort((a, b) => b.savedAt - a.savedAt);
  }
  async remove(slot: string): Promise<void> {
    this.data.delete(slot);
  }
}

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

let activeStore: SaveStore | null = null;

export async function getStore(): Promise<SaveStore> {
  if (activeStore) return activeStore;

  const candidates: SaveStore[] = [new IndexedDbStore(), new LocalStorageStore(), new MemoryStore()];
  for (const candidate of candidates) {
    if (await candidate.available()) {
      activeStore = candidate;
      return candidate;
    }
  }
  activeStore = new MemoryStore();
  return activeStore;
}

// ---------------------------------------------------------------------------
// Save / load
// ---------------------------------------------------------------------------

function buildMeta(slot: string, state: GameState): SaveMeta {
  const captain = state.characters[state.captainId];
  const location = state.currentLocationId ? state.locations[state.currentLocationId] : undefined;
  return {
    slot,
    seed: state.seed,
    savedAt: Date.now(),
    hours: state.hours,
    captainName: captain ? `${captain.name} ${captain.surname}` : 'Unknown',
    locationName: state.travel
      ? `En route to ${state.locations[state.travel.toId]?.name ?? 'somewhere'}`
      : (location?.name ?? 'Deep space'),
    crewCount: state.crewIds.length,
    schemaVersion: state.version,
  };
}

export async function saveGame(slot: string, state: GameState): Promise<SaveMeta> {
  const store = await getStore();
  state.savedAt = Date.now();
  const meta = buildMeta(slot, state);
  // Structured clone through JSON keeps the record free of live references.
  const snapshot = JSON.parse(JSON.stringify(state)) as GameState;
  await store.put(slot, { meta, state: snapshot });
  return meta;
}

export async function loadGame(slot: string): Promise<GameState | null> {
  const store = await getStore();
  const record = await store.get(slot);
  if (!record) return null;
  return migrate(record.state);
}

export async function listSaves(): Promise<SaveMeta[]> {
  const store = await getStore();
  return store.list();
}

export async function deleteSave(slot: string): Promise<void> {
  const store = await getStore();
  await store.remove(slot);
}

export async function hasAutosave(): Promise<boolean> {
  const store = await getStore();
  return (await store.get(SAVE.autosaveSlot)) !== null;
}

// ---------------------------------------------------------------------------
// Migration
// ---------------------------------------------------------------------------

/**
 * Bring an older save forward. V1 only needs to backfill fields added after a
 * save was written, so a run in progress survives a patch.
 */
/**
 * Old behaviour keys, translated into the canonical trait that expresses each
 * one. Built from the library itself rather than written out by hand, so it
 * cannot drift away from the words that actually exist.
 */
const LEGACY_TRAIT_MAP = new Map<string, string>([
  // The 24 behaviour keys the game used before the canonical library became
  // the mechanics. Each maps to the trait that best carries the same idea, so
  // an old save keeps a recognisable person. Nothing else survives the trip.
  ['loyal', 'loyal'],
  ['protective', 'protective-of-dependents'],
  ['compassionate', 'compassionate'],
  ['dutiful', 'duty-bound'],
  ['patient', 'strategically-patient'],
  ['generous', 'generous'],
  ['brave', 'brave'],
  ['cooperative', 'cooperative'],
  ['curious', 'curious'],
  ['honest', 'honest'],
  ['vindictive', 'vindictive'],
  ['reckless', 'risk-taker'],
  ['selfPreserving', 'self-reliant'],
  ['greedy', 'materialistic'],
  ['jealous', 'possessive'],
  ['cowardly', 'timid'],
  ['impulsive', 'impulsive'],
  ['controlling', 'controlling'],
  ['suspicious', 'suspicious'],
  ['alcoholic', 'volatile'],
  ['aggressive', 'aggressive'],
  ['cautious', 'cautious'],
  ['opportunistic', 'opportunistic'],
  ['stubborn', 'traditionalist'],
]);

/**
 * v0.6 gave three re-used words their own names. Saves written before that
 * carry the old ids; identity is the id, so this is a straight rename.
 */
const RENAMED_TRAITS = new Map<string, string>([
  ['patient', 'strategically-patient'],
  ['patient-patience-time', 'unhurried'],
  ['humble', 'unassuming'],
  ['humble-pride-shame', 'humble'],
  ['thick-skinned', 'criticism-resistant'],
  ['thick-skinned-pride-shame', 'thick-skinned'],
]);

/**
 * Bring one hull forward onto the permanent Class/Trim model.
 *
 * Every removed field is deleted outright. Trim takes the ship-wide value the
 * old model called quality; rooms keep their kind and lose everything else;
 * maxRooms is set from what is fitted, clamped into the Class range, so an old
 * hull can never come back larger than its Class allows.
 */
function migrateShip(ship: Record<string, unknown> | null | undefined): void {
  if (!ship) return;

  if (ship.shipClass === undefined && typeof ship.size === 'string') {
    ship.shipClass = ship.size;
  }
  delete ship.size;

  if (ship.trim === undefined && typeof ship.quality === 'string') {
    ship.trim = ship.quality;
  }
  delete ship.quality;

  const shipClass = (ship.shipClass as keyof typeof SHIPS.roomCounts) ?? 'small';
  const range = SHIPS.roomCounts[shipClass] ?? SHIPS.roomCounts.small;

  const rooms = (ship.rooms as Record<string, unknown>[] | undefined) ?? [];
  for (const room of rooms) {
    delete room.quality;
    delete room.qualityPotential;
    delete room.condition;
  }

  if (typeof ship.maxRooms !== 'number') {
    ship.maxRooms = Math.min(range[1], Math.max(range[0], rooms.length));
  }
  ship.maxRooms = Math.max(rooms.length, Math.min(range[1], ship.maxRooms as number));

  const systems = (ship.systems as Record<string, Record<string, unknown>>) ?? {};
  for (const system of Object.values(systems)) {
    delete system.quality;
  }

  // Life Support stopped being a second, quieter crew number. If it fails now
  // it is an emergency, not a smaller roster.
  delete ship.lifeSupportCapacity;

  ship.quirks ??= [];
  ship.manufacturer ??= 'Unknown';
  ship.model ??= 'Unrecorded';
  ship.cargo ??= [];

  recomputeShipCapacities(ship as unknown as Ship);
  updateDegradedStates(ship as unknown as Ship);
}

/** Exported so the migration can be tested without touching IndexedDB. */
export function migrateSavedState(state: GameState): GameState {
  return migrate(state);
}

function migrate(state: GameState): GameState {
  const patched = state as GameState & Record<string, unknown>;

  if (!patched.recentEvents) patched.recentEvents = {};
  if (!patched.firedOnce) patched.firedOnce = [];
  if (patched.pendingCombat === undefined) patched.pendingCombat = null;
  if (!patched.opportunities) patched.opportunities = [];
  if (!patched.sites) patched.sites = {};
  if (!patched.missions) patched.missions = [];
  if (!patched.debug) patched.debug = { enabled: false, records: [], revealHidden: false };
  if (!patched.flags) patched.flags = {};
  if (patched.screenStack === undefined) patched.screenStack = [];
  if (patched.crewXp === undefined) patched.crewXp = 0;

  // Saves written before the world had walkable places. Regenerate the places
  // on next arrival rather than guessing where the player was standing.
  if (!patched.places) patched.places = {};
  if (patched.currentPlaceId === undefined) patched.currentPlaceId = null;
  if (patched.onboardingStep === undefined) patched.onboardingStep = 99;
  if (!patched.pendingFarewells) patched.pendingFarewells = [];
  // Saves from before the ship had a second command post. The engine fills the
  // post itself on the next tick if there is anybody to fill it.
  if (patched.crewLeadId === undefined) patched.crewLeadId = null;

  // Saves from before study existed carry an obsolete pool of unplaced marks
  // and no study assignment. Their placed specialisations are already on the
  // ladder, so dropping the pool is the whole migration.
  for (const person of Object.values(
    patched.characters as Record<string, { specSlots?: number[]; study?: unknown }>,
  )) {
    delete person.specSlots;
    if (person.study === null) delete person.study;
  }

  // Saves from before personality was one system. Those characters carry a
  // handful of old behaviour keys where their traits should be, and the
  // captain carries a second list of words on top. Translate the keys into the
  // canonical traits that express them and drop the duplicate list, so no
  // stale value is left anywhere the simulation can read it.
  for (const person of Object.values(
    patched.characters as Record<
      string,
      {
        traits?: string[];
        traitKnowledge?: { trait: string; known: number; evidence: number }[];
        demeanor?: string[];
      }
    >,
  )) {
    delete person.demeanor;
    if (!Array.isArray(person.traits)) continue;
    const migrated = person.traits
      .map((key) => LEGACY_TRAIT_MAP.get(key) ?? key)
      .map((key) => RENAMED_TRAITS.get(key) ?? key)
      .filter((id, index, all) => all.indexOf(id) === index);
    const knowledge = person.traitKnowledge ?? [];
    person.traitKnowledge = migrated.map((id, index) => ({
      trait: id,
      known: knowledge[index]?.known ?? 0,
      evidence: knowledge[index]?.evidence ?? 0,
    }));
    person.traits = migrated;
  }

  // -- The old ship model -------------------------------------------------
  //
  // Saves written before Class and Trim became permanent carry room quality,
  // room condition, per-system quality, a Quality Potential on every room, and
  // a second quieter crew number underneath Capacity. All of it is deleted
  // here rather than left in place, because a field that still exists is a
  // field something can start reading again.
  migrateShip(patched.ship as unknown as Record<string, unknown> | null);
  const earth = (patched.galaxy as { earth?: { garageShip?: unknown } } | undefined)?.earth;
  if (earth?.garageShip) {
    migrateShip(earth.garageShip as unknown as Record<string, unknown>);
  }

  // Saves from before the galaxy existed. Earth has always been out there;
  // this run simply had not been told where.
  if (!patched.galaxy) patched.galaxy = generateGalaxy(patched.seed as string);

  // -- Personal inventory --------------------------------------------------
  //
  // The universal backpack is gone. Nothing is thrown away: equipped gear
  // stays with the person who was using it, and everything else goes into the
  // crew's shared hold, which is where ordinary supplies belonged all along.
  const ship = patched.ship as Ship | null;
  for (const person of Object.values(
    patched.characters as Record<
      string,
      {
        backpack?: { uid: string }[];
        backpackSlots?: number;
        gear?: { uid: string }[];
        equipment?: Record<string, string | undefined>;
      }
    >,
  )) {
    person.gear ??= [];
    const pack = person.backpack ?? [];
    const equipped = new Set(Object.values(person.equipment ?? {}).filter(Boolean));
    for (const stack of pack) {
      if (equipped.has(stack.uid)) person.gear.push(stack);
      else if (ship && !ship.destroyed) ship.cargo.push(stack as never);
      else person.gear.push(stack);
    }
    delete person.backpack;
    delete person.backpackSlots;
  }

  // -- Relationships -------------------------------------------------------
  //
  // A single `kind` word used to carry both how close two people were and what
  // they were to each other. Standing now reads off the number, and the word
  // survives only where it says something the number cannot.
  for (const person of Object.values(
    patched.characters as Record<
      string,
      { relationships?: Record<string, { kind?: string; roles?: string[] }> }
    >,
  )) {
    for (const rel of Object.values(person.relationships ?? {})) {
      if (Array.isArray(rel.roles)) {
        delete rel.kind;
        continue;
      }
      const roles: string[] = [];
      if (rel.kind === 'family') roles.push('family');
      if (rel.kind === 'partner') roles.push('family', 'romantic');
      rel.roles = roles;
      delete rel.kind;
    }
  }

  // Data cores stopped being a resource axis and became ordinary items. Any
  // banked count is dropped rather than converted: the number was never
  // spendable, so nothing of value is lost.
  const resources = patched.resources as unknown as Record<string, unknown> | undefined;
  if (resources && 'dataCores' in resources) delete resources.dataCores;

  // A place id that no longer exists would strand the player outside the ship.
  if (
    patched.currentPlaceId &&
    !(patched.places as Record<string, unknown>)[patched.currentPlaceId as string]
  ) {
    patched.currentPlaceId = null;
    if (patched.screen === 'place' || patched.screen === 'localTravel') {
      patched.screen = 'cockpit';
    }
  }
  if (patched.ending === undefined) patched.ending = null;
  if (patched.missionPrep === undefined) patched.missionPrep = null;
  if (patched.focusCharacterId === undefined) patched.focusCharacterId = null;

  // Combat is never resumed across a load — it is not worth the state surface.
  patched.combat = null;
  if (patched.phase === 'combat') {
    patched.phase = patched.currentLocationId ? 'atLocation' : 'enroute';
    patched.screen = 'cockpit';
  }

  patched.version = SAVE.schemaVersion;
  return patched as GameState;
}

/**
 * Persistence.
 *
 * The engine never talks to IndexedDB directly — it talks to a SaveStore. V1
 * ships an IndexedDB implementation with a localStorage fallback, and a hosted
 * backend can be dropped in later by implementing the same interface.
 */

import { SAVE } from '../engine/tuning';
import type { GameState } from '../engine/types';

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

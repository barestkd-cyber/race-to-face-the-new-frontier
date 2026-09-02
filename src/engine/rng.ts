/**
 * Seeded deterministic randomness.
 *
 * Two usage patterns:
 *  - `Rng` instances with a persisted cursor for live rolls (checks, combat).
 *  - `streamRng(seed, ...keys)` for procedural generation. A derived stream is a
 *    pure function of the run seed plus its key path, so adding a call somewhere
 *    else in the codebase never shifts an unrelated generator's results.
 */

/** FNV-1a 32-bit string hash. */
export function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Mulberry32 — small, fast, good enough for game generation. */
function mulberry32(a: number): () => number {
  let t = a >>> 0;
  return function next(): number {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export interface WeightedEntry<T> {
  value: T;
  weight: number;
}

export class Rng {
  private seedNum: number;
  private cursor: number;
  private gen: () => number;

  constructor(seed: number | string, cursor = 0) {
    this.seedNum = typeof seed === 'number' ? seed >>> 0 : hashString(seed);
    this.cursor = cursor;
    this.gen = mulberry32(this.seedNum);
    // Fast-forward to the saved cursor so a reloaded game continues the sequence.
    for (let i = 0; i < cursor; i++) this.gen();
  }

  /** How many numbers have been drawn — persist this to resume identically. */
  get position(): number {
    return this.cursor;
  }

  get seedValue(): number {
    return this.seedNum;
  }

  /** Uniform float in [0, 1). */
  next(): number {
    this.cursor++;
    return this.gen();
  }

  /** Uniform float in [min, max). */
  float(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** Uniform integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    if (max < min) return min;
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** Classic d100: 1..100. */
  d100(): number {
    return this.int(1, 100);
  }

  /** True with probability p (0..1). */
  chance(p: number): boolean {
    return this.next() < p;
  }

  /** True with probability pct (0..100). */
  percent(pct: number): boolean {
    return this.next() * 100 < pct;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('Rng.pick called with an empty array');
    return items[this.int(0, items.length - 1)]!;
  }

  /** Pick `count` distinct items (or fewer if the pool is smaller). */
  pickMany<T>(items: readonly T[], count: number): T[] {
    const pool = this.shuffle([...items]);
    return pool.slice(0, Math.max(0, Math.min(count, pool.length)));
  }

  weighted<T>(entries: readonly WeightedEntry<T>[]): T {
    const total = entries.reduce((sum, e) => sum + Math.max(0, e.weight), 0);
    if (total <= 0) return this.pick(entries).value;
    let roll = this.next() * total;
    for (const entry of entries) {
      roll -= Math.max(0, entry.weight);
      if (roll <= 0) return entry.value;
    }
    return entries[entries.length - 1]!.value;
  }

  /** Fisher-Yates, in place, returns the same array. */
  shuffle<T>(items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      const tmp = items[i]!;
      items[i] = items[j]!;
      items[j] = tmp;
    }
    return items;
  }

  /**
   * Roughly normal value via the mean of `rolls` uniforms, mapped to [min, max].
   * Higher `rolls` = tighter clustering toward the centre. Used for tapered
   * distributions where extremes should be possible but uncommon.
   */
  tapered(min: number, max: number, rolls = 3): number {
    let sum = 0;
    for (let i = 0; i < rolls; i++) sum += this.next();
    return min + (sum / rolls) * (max - min);
  }

  taperedInt(min: number, max: number, rolls = 3): number {
    return Math.round(this.tapered(min, max + 0.999, rolls));
  }

  /** A fresh independent stream derived from this generator's current position. */
  fork(label: string): Rng {
    return new Rng(hashString(`${this.seedNum}:${this.cursor}:${label}`));
  }
}

/**
 * Deterministic named stream. `streamRng('abc', 'moon', 'A', 'terrain')` always
 * returns the same sequence for the same seed and key path.
 */
export function streamRng(seed: string, ...keys: (string | number)[]): Rng {
  return new Rng(hashString(`${seed}::${keys.join('::')}`));
}

const SEED_WORDS_A = [
  'RUST',
  'EMBER',
  'HOLLOW',
  'VESPER',
  'DUSK',
  'IRON',
  'PALE',
  'GRAVE',
  'SALT',
  'CINDER',
  'BRIGHT',
  'LONG',
  'QUIET',
  'BROKEN',
  'FIRST',
  'LAST',
];

const SEED_WORDS_B = [
  'HARBOR',
  'ORBIT',
  'DRIFT',
  'SIGNAL',
  'ANCHOR',
  'VECTOR',
  'BEACON',
  'PASSAGE',
  'CROSSING',
  'LANTERN',
  'FURROW',
  'MERIDIAN',
  'THRESHOLD',
  'HOLLOWAY',
  'REACH',
  'MARROW',
];

/** Human-readable seed like "RUST-BEACON-4712". */
export function generateSeed(): string {
  const r = new Rng(Date.now() ^ Math.floor(Math.random() * 0xffffffff));
  return `${r.pick(SEED_WORDS_A)}-${r.pick(SEED_WORDS_B)}-${r.int(1000, 9999)}`;
}

/** Normalise user-entered seeds so "rust beacon" and "RUST-BEACON" match. */
export function normalizeSeed(input: string): string {
  const cleaned = input.trim().toUpperCase().replace(/\s+/g, '-');
  return cleaned.length > 0 ? cleaned : generateSeed();
}

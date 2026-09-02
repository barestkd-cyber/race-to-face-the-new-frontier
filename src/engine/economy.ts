/**
 * Economy.
 *
 * Local price = base price x availability x crisis x legal/risk x location.
 * The transaction on top of that folds in merchant terms, Negotiation,
 * relationship, and item condition. Negotiation is the trade skill; Evaluation
 * tells the player whether the deal actually looks good.
 */

import { allItems, getItem } from './inventory';
import type { Rng } from './rng';
import { ECONOMY } from './tuning';
import type {
  CheckOutcome,
  ItemCategory,
  ItemDef,
  ItemId,
  ItemStack,
  LocationCondition,
  LocationKind,
  LocationState,
  MarketState,
} from './types';

// ---------------------------------------------------------------------------
// Scarcity
// ---------------------------------------------------------------------------

export type ScarcityBand = 'surplus' | 'abundant' | 'normal' | 'scarce' | 'critical';

export const SCARCITY_LABELS: Record<ScarcityBand, string> = {
  surplus: 'Surplus',
  abundant: 'Abundant',
  normal: 'Normal',
  scarce: 'Scarce',
  critical: 'Critical',
};

export function bandForMultiplier(multiplier: number): ScarcityBand {
  if (multiplier <= 0.7) return 'surplus';
  if (multiplier <= 0.9) return 'abundant';
  if (multiplier <= 1.1) return 'normal';
  if (multiplier <= 1.6) return 'scarce';
  return 'critical';
}

export function rollScarcity(rng: Rng, band: ScarcityBand): number {
  const [lo, hi] = ECONOMY.scarcityBands[band]!;
  return rng.float(lo, hi);
}

/** Category weighting per location kind — what a place naturally has more of. */
const CATEGORY_ABUNDANCE: Record<LocationKind, Partial<Record<ItemCategory, ScarcityBand>>> = {
  homeworld: {
    food: 'scarce',
    medicine: 'scarce',
    weapon: 'normal',
    shipPart: 'scarce',
    tradeGood: 'abundant',
    valuable: 'surplus',
  },
  moon: {
    shipPart: 'abundant',
    tool: 'abundant',
    tradeGood: 'surplus',
    food: 'scarce',
    medicine: 'scarce',
    explorationGear: 'abundant',
  },
  tradeStation: {
    food: 'normal',
    medicine: 'normal',
    ammo: 'abundant',
    shipPart: 'normal',
    tradeGood: 'normal',
  },
  inhabitedPlanet: {
    food: 'surplus',
    medicine: 'abundant',
    tradeGood: 'abundant',
    weapon: 'scarce',
    shipPart: 'scarce',
    ammo: 'scarce',
  },
  transitStation: {
    food: 'normal',
    medicine: 'abundant',
    weapon: 'normal',
    armor: 'normal',
    shipPart: 'abundant',
    ammo: 'abundant',
    tool: 'normal',
  },
  travelWorld: {
    food: 'normal',
    medicine: 'normal',
    shipPart: 'normal',
    weapon: 'normal',
  },
  temporary: {
    shipPart: 'scarce',
    food: 'scarce',
    medicine: 'critical',
  },
};

/** A moon's economy role makes its own output cheap and everything else dear. */
const ROLE_SURPLUS: Record<string, ItemId[]> = {
  'metallic mining': ['trade_ore_crate', 'salvage_scrap', 'trade_machine_parts'],
  'rare minerals': ['trade_rare_minerals', 'trade_ore_crate'],
  'water/ice harvesting': ['trade_ice_block', 'ration_pack'],
  'fuel/volatile extraction': ['trade_volatiles', 'fuel_canister', 'power_cell'],
  'chemical production': ['trade_chemicals', 'coolant_flask', 'antibiotics'],
  'greenhouse agriculture': ['trade_produce', 'fresh_produce', 'protein_culture'],
  'industrial manufacturing': ['trade_machine_parts', 'repair_kit', 'hull_patch'],
  'resource processing': ['trade_ore_crate', 'trade_chemicals', 'engine_coupling'],
};

// ---------------------------------------------------------------------------
// Market generation
// ---------------------------------------------------------------------------

/** Items a given location plausibly stocks at all. */
function stockableItems(location: LocationState): ItemDef[] {
  return allItems().filter((def) => {
    // Nobody sells your own scavenged junk back to you at scale.
    if (def.id === 'personal_effects') return false;
    if (location.kind === 'inhabitedPlanet' && def.category === 'ammo') {
      return def.id === 'ammo_pistol' || def.id === 'ammo_shotgun';
    }
    if (location.kind === 'moon' && def.category === 'armor') {
      return def.id === 'hardsuit_work' || def.id === 'helmet_industrial' || def.id === 'vest_padded';
    }
    return true;
  });
}

export function generateMarket(location: LocationState, rng: Rng, hours: number): MarketState {
  const scarcity: Record<ItemId, number> = {};
  const abundance = CATEGORY_ABUNDANCE[location.kind] ?? {};
  const roleSurplus = location.economyRole ? (ROLE_SURPLUS[location.economyRole] ?? []) : [];

  for (const def of allItems()) {
    let band: ScarcityBand = abundance[def.category] ?? 'normal';
    if (roleSurplus.includes(def.id)) band = 'surplus';
    // Local drift so two visits to similar places do not price identically.
    const drift = rng.weighted<number>([
      { value: -1, weight: 18 },
      { value: 0, weight: 64 },
      { value: 1, weight: 18 },
    ]);
    const order: ScarcityBand[] = ['surplus', 'abundant', 'normal', 'scarce', 'critical'];
    const shifted = order[Math.max(0, Math.min(4, order.indexOf(band) + drift))]!;
    scarcity[def.id] = rollScarcity(rng, shifted);
  }

  const depth =
    ECONOMY.stockDepthByTier[
      Math.max(0, Math.min(ECONOMY.stockDepthByTier.length - 1, location.populationTier))
    ]!;

  const pool = stockableItems(location);
  const stock: ItemStack[] = [];
  const chosen = rng.pickMany(pool, Math.min(depth + rng.int(0, 4), pool.length));

  let uid = 0;
  for (const def of chosen) {
    // Cheaper, more common goods stock deeper.
    const qty = def.stackable
      ? Math.max(1, Math.round(rng.int(2, 14) * (1 / Math.max(0.4, scarcity[def.id]!))))
      : rng.int(1, 2);
    const condition = def.stackable ? 100 : rng.int(52, 100);
    uid += 1;
    stock.push({
      uid: `mkt_${location.id}_${uid}_${rng.int(0, 0xffff).toString(36)}`,
      itemId: def.id,
      qty,
      condition,
    });
  }

  return {
    scarcity,
    stock,
    restockedAtHours: hours,
    merchantAttitude: rng.int(ECONOMY.attitudeRange[0], ECONOMY.attitudeRange[1]),
  };
}

export function shouldRestock(market: MarketState, hours: number): boolean {
  return hours - market.restockedAtHours >= ECONOMY.restockHours;
}

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------

export interface PriceContext {
  location: LocationState;
  /** 1.0 in normal times; rises as the homeworld clock runs down. */
  crisisMultiplier: number;
  /** Session negotiation swing, -maxSwing..+maxSwing. */
  negotiationModifier?: number;
}

export function conditionMultiplier(condition: number): number {
  return ECONOMY.conditionValueBase + ECONOMY.conditionValueSpan * (condition / 100);
}

/** Base local price before condition, negotiation, or buy/sell direction. */
export function localPrice(itemId: ItemId, ctx: PriceContext): number {
  const def = getItem(itemId);
  if (!def) return 0;

  const availability = ctx.location.market?.scarcity[itemId] ?? 1;
  const conditionPressure =
    ECONOMY.conditionMultiplier[ctx.location.condition as LocationCondition] ?? 1;

  // Only the homeworld region feels the extinction-clock crisis premium.
  const crisis =
    ctx.location.kind === 'homeworld' || ctx.location.kind === 'moon'
      ? ctx.crisisMultiplier
      : 1 + (ctx.crisisMultiplier - 1) * 0.25;

  return def.basePrice * availability * crisis * conditionPressure;
}

export function buyPrice(
  itemId: ItemId,
  ctx: PriceContext,
  condition = 100,
  qty = 1,
): number {
  const base = localPrice(itemId, ctx);
  const attitude = (ctx.location.market?.merchantAttitude ?? 0) / 200;
  const negotiation = ctx.negotiationModifier ?? 0;
  const unit = base * conditionMultiplier(condition) * (1 - attitude - negotiation);
  return Math.max(1, Math.round(unit * qty));
}

export function sellPrice(
  itemId: ItemId,
  ctx: PriceContext,
  condition = 100,
  qty = 1,
): number {
  const base = localPrice(itemId, ctx);
  const attitude = (ctx.location.market?.merchantAttitude ?? 0) / 200;
  const negotiation = ctx.negotiationModifier ?? 0;
  const unit =
    base * ECONOMY.sellFraction * conditionMultiplier(condition) * (1 + attitude + negotiation);
  return Math.max(1, Math.round(unit * qty));
}

// ---------------------------------------------------------------------------
// Negotiation
// ---------------------------------------------------------------------------

/** Price swing in the player's favour from a Negotiation check. */
export function negotiationSwing(outcome: CheckOutcome): number {
  const max = ECONOMY.maxNegotiationSwing;
  switch (outcome) {
    case 'exceptional':
      return max;
    case 'success':
      return max * 0.62;
    case 'partial':
      return max * 0.25;
    case 'failure':
      return 0;
    case 'criticalFailure':
      // The merchant is now annoyed and prices go the wrong way.
      return -max * 0.4;
  }
}

// ---------------------------------------------------------------------------
// Deal quality — what Evaluation actually tells the player
// ---------------------------------------------------------------------------

export type DealQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'terrible';

export const DEAL_LABELS: Record<DealQuality, string> = {
  excellent: 'Excellent deal',
  good: 'Good deal',
  fair: 'Fair price',
  poor: 'Poor deal',
  terrible: 'You are being fleeced',
};

/**
 * Compare an offered price against the item's underlying base value. Returns a
 * ratio where < 1 means the player is paying less than base.
 */
export function dealRatio(itemId: ItemId, offered: number, buying: boolean): number {
  const def = getItem(itemId);
  if (!def || def.basePrice <= 0) return 1;
  const reference = buying ? def.basePrice : def.basePrice * ECONOMY.sellFraction;
  return offered / reference;
}

export function dealQuality(ratio: number, buying: boolean): DealQuality {
  // When buying, lower is better; when selling, higher is better.
  const score = buying ? 1 / Math.max(0.01, ratio) : ratio;
  if (score >= 1.35) return 'excellent';
  if (score >= 1.12) return 'good';
  if (score >= 0.9) return 'fair';
  if (score >= 0.7) return 'poor';
  return 'terrible';
}

// ---------------------------------------------------------------------------
// Crisis pressure
// ---------------------------------------------------------------------------

/**
 * Homeworld prices climb as the clock runs down. Driven by visible
 * infrastructure decay, not by the hidden terminal day, so it never leaks the
 * exact answer.
 */
export function crisisMultiplierFromInfrastructure(infrastructure: number): number {
  const decay = Math.max(0, Math.min(100, 100 - infrastructure)) / 100;
  return 1 + decay * (ECONOMY.crisisMaxMultiplier - 1);
}

// ---------------------------------------------------------------------------
// Repair pricing
// ---------------------------------------------------------------------------

export interface RepairQuote {
  conditionPoints: number;
  parts: number;
  hours: number;
  credits: number;
}

/** Cost to raise one system or room by `points` of condition. */
export function quoteRepair(
  points: number,
  sizeFactor: number,
  engineeringSkill: number,
  payingYard: boolean,
): RepairQuote {
  const efficiency = 1 - (engineeringSkill / 100) * 0.4;
  const parts = Math.ceil(points * 2.4 * sizeFactor * efficiency);
  const hours = Math.max(0.5, points * 0.35 * sizeFactor * efficiency);
  const credits = payingYard ? Math.ceil(points * 14 * sizeFactor) : 0;
  return { conditionPoints: points, parts, hours, credits };
}

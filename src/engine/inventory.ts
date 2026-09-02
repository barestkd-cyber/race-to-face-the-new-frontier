/**
 * Item lookup, stacks, backpacks, and equipment.
 *
 * Core rule: a physical item should not enter meaningful inventory unless
 * possession interacts with at least one gameplay system.
 */

import { ITEM_DEFS } from '../content/items';
import type { Rng } from './rng';
import { ARMOR, INVENTORY } from './tuning';
import type {
  AttackProfile,
  Character,
  DamageType,
  ItemDef,
  ItemId,
  ItemStack,
  Ship,
  SkillKey,
} from './types';

// ---------------------------------------------------------------------------
// Catalog index
// ---------------------------------------------------------------------------

const ITEM_INDEX: Map<ItemId, ItemDef> = new Map(ITEM_DEFS.map((def) => [def.id, def]));

export function getItem(id: ItemId): ItemDef | undefined {
  return ITEM_INDEX.get(id);
}

/** Never throws — unknown ids degrade to a readable placeholder. */
export function itemName(id: ItemId): string {
  return ITEM_INDEX.get(id)?.name ?? id;
}

export function allItems(): ItemDef[] {
  return ITEM_DEFS;
}

export function itemsByCategory(category: ItemDef['category']): ItemDef[] {
  return ITEM_DEFS.filter((d) => d.category === category);
}

// ---------------------------------------------------------------------------
// Stacks
// ---------------------------------------------------------------------------

let stackCounter = 0;

export function newStackUid(rng?: Rng): string {
  stackCounter += 1;
  const salt = rng ? rng.int(0, 0xffff).toString(36) : Math.floor(Math.random() * 0xffff).toString(36);
  return `stk_${stackCounter.toString(36)}_${salt}`;
}

export function createStack(
  itemId: ItemId,
  qty = 1,
  condition = 100,
  rng?: Rng,
): ItemStack {
  const def = getItem(itemId);
  const stack: ItemStack = {
    uid: newStackUid(rng),
    itemId,
    qty,
    condition: Math.max(0, Math.min(100, Math.round(condition))),
  };
  const ranged = def?.attacks?.find((a) => a.ammoId);
  if (ranged) stack.loaded = 0;
  return stack;
}

/** Add items, merging into an existing stack when the item is stackable. */
export function addItem(
  stacks: ItemStack[],
  itemId: ItemId,
  qty = 1,
  condition = 100,
  rng?: Rng,
): ItemStack[] {
  const def = getItem(itemId);
  if (!def) return stacks;

  if (def.stackable) {
    const existing = stacks.find(
      (s) => s.itemId === itemId && s.qty < INVENTORY.maxStack && Math.abs(s.condition - condition) < 12,
    );
    if (existing) {
      existing.qty += qty;
      return stacks;
    }
  }

  if (def.stackable) {
    stacks.push(createStack(itemId, qty, condition, rng));
  } else {
    // Non-stackables carry individual condition, so each copy is its own stack.
    for (let i = 0; i < qty; i++) stacks.push(createStack(itemId, 1, condition, rng));
  }
  return stacks;
}

export function countItem(stacks: ItemStack[], itemId: ItemId): number {
  return stacks.reduce((sum, s) => (s.itemId === itemId ? sum + s.qty : sum), 0);
}

/** Remove up to `qty`; returns how many were actually removed. */
export function removeItem(stacks: ItemStack[], itemId: ItemId, qty = 1): number {
  let remaining = qty;
  for (let i = stacks.length - 1; i >= 0 && remaining > 0; i--) {
    const stack = stacks[i]!;
    if (stack.itemId !== itemId) continue;
    const take = Math.min(stack.qty, remaining);
    stack.qty -= take;
    remaining -= take;
    if (stack.qty <= 0) stacks.splice(i, 1);
  }
  return qty - remaining;
}

export function removeStackByUid(stacks: ItemStack[], uid: string): ItemStack | null {
  const index = stacks.findIndex((s) => s.uid === uid);
  if (index === -1) return null;
  return stacks.splice(index, 1)[0]!;
}

export function findStack(stacks: ItemStack[], uid: string): ItemStack | undefined {
  return stacks.find((s) => s.uid === uid);
}

/** Total slots occupied. Stackables take one slot regardless of quantity. */
export function slotsUsed(stacks: ItemStack[]): number {
  return stacks.length;
}

export function stackWeight(stack: ItemStack): number {
  const def = getItem(stack.itemId);
  return (def?.weight ?? 0) * stack.qty;
}

export function totalWeight(stacks: ItemStack[]): number {
  return stacks.reduce((sum, s) => sum + stackWeight(s), 0);
}

export function isBulky(itemId: ItemId): boolean {
  const def = getItem(itemId);
  if (!def) return false;
  return def.bulky === true || def.weight > INVENTORY.bulkyWeight;
}

// ---------------------------------------------------------------------------
// Backpacks
// ---------------------------------------------------------------------------

export function backpackFree(character: Character): number {
  return Math.max(0, character.backpackSlots - slotsUsed(character.backpack));
}

export function canBackpack(character: Character, itemId: ItemId): boolean {
  if (isBulky(itemId)) return false;
  const def = getItem(itemId);
  if (!def) return false;
  if (def.stackable && character.backpack.some((s) => s.itemId === itemId)) return true;
  return backpackFree(character) > 0;
}

/** Move a stack from ship cargo into a character's backpack. */
export function moveToBackpack(ship: Ship, character: Character, uid: string): string | null {
  const stack = findStack(ship.cargo, uid);
  if (!stack) return 'That is not in the hold.';
  if (isBulky(stack.itemId)) return `${itemName(stack.itemId)} is too bulky to backpack.`;
  if (backpackFree(character) <= 0) return `${character.name}'s pack is full.`;
  removeStackByUid(ship.cargo, uid);
  character.backpack.push(stack);
  return null;
}

export function moveToCargo(ship: Ship, character: Character, uid: string): string | null {
  const stack = findStack(character.backpack, uid);
  if (!stack) return 'That is not in the pack.';
  removeStackByUid(character.backpack, uid);
  ship.cargo.push(stack);
  return null;
}

// ---------------------------------------------------------------------------
// Equipment
// ---------------------------------------------------------------------------

export type EquipSlot = 'weapon' | 'sidearm' | 'armor' | 'tool';

/** Which slot an item can occupy, or null if it is not equippable. */
export function slotFor(itemId: ItemId): EquipSlot | null {
  const def = getItem(itemId);
  if (!def) return null;
  if (def.category === 'armor') return 'armor';
  if (def.category === 'weapon') {
    const oneHanded = !def.properties?.includes('Two-handed') && def.weight <= 4;
    return oneHanded ? 'sidearm' : 'weapon';
  }
  if (def.category === 'tool' || def.category === 'explorationGear') return 'tool';
  // Anything that grants a skill bonus is usable in the tool slot regardless of
  // its category — a surgical kit is filed under medicine but is real equipment.
  if (def.toolBonus && def.toolBonus.length > 0) return 'tool';
  return null;
}

/** Look an equipped stack up wherever it lives — backpack or ship hold. */
export function equippedStack(
  character: Character,
  slot: EquipSlot,
  ship: Ship | null,
): ItemStack | undefined {
  const uid = character.equipment[slot];
  if (!uid) return undefined;
  return (
    findStack(character.backpack, uid) ?? (ship ? findStack(ship.cargo, uid) : undefined)
  );
}

export function equip(character: Character, uid: string, ship: Ship | null): string | null {
  const stack = findStack(character.backpack, uid) ?? (ship ? findStack(ship.cargo, uid) : undefined);
  if (!stack) return 'That item is not available.';
  const slot = slotFor(stack.itemId);
  if (!slot) return `${itemName(stack.itemId)} cannot be equipped.`;
  character.equipment[slot] = uid;
  return null;
}

export function unequip(character: Character, slot: EquipSlot): void {
  delete character.equipment[slot];
}

/**
 * How good this weapon is *for this person*. Raw power is not enough: a knife
 * in the hands of someone with no Melee Weapons training is worse than their
 * own fists, because Skill is the base capability and power only matters on
 * the hits you actually land.
 */
function weaponRating(stack: ItemStack, character: Character): number {
  const def = getItem(stack.itemId);
  if (!def?.attacks?.length) return 0;

  const best = Math.max(
    ...def.attacks.map((attack) => {
      const skill = character.skills[attack.skill] ?? 0;
      // Competence dominates until roughly professional level, then power leads.
      const competence = 0.25 + 0.75 * Math.min(1, skill / 55);
      return attack.power * competence;
    }),
  );

  return best * (0.5 + 0.5 * (stack.condition / 100));
}

function armorRating(stack: ItemStack, _member: Character): number {
  const def = getItem(stack.itemId);
  if (!def?.protection) return 0;
  const total = Object.values(def.protection).reduce((a, b) => a + b, 0);
  return total * (0.5 + 0.5 * (stack.condition / 100));
}

function toolRating(stack: ItemStack, _member: Character): number {
  const def = getItem(stack.itemId);
  if (!def?.toolBonus?.length) return 0;
  return def.toolBonus.reduce((sum, t) => sum + t.value, 0) * (0.5 + 0.5 * (stack.condition / 100));
}

/**
 * Hand out the best available gear from the hold across a group, without two
 * people claiming the same item. A captain would obviously arm the crew before
 * walking into anything, and making the player do it by hand for every new
 * recruit is busywork, not a decision.
 */
export function autoEquipParty(party: Character[], ship: Ship | null): void {
  if (!ship || ship.destroyed) return;

  const claimed = new Set<string>();
  for (const member of party) {
    for (const uid of Object.values(member.equipment)) {
      if (uid) claimed.add(uid);
    }
  }

  const pickBest = (
    rate: (stack: ItemStack, member: Character) => number,
    slot: EquipSlot,
    floor = 0,
  ): ((member: Character) => void) => {
    return (member: Character) => {
      if (member.equipment[slot]) return;
      let best: ItemStack | null = null;
      let bestScore = floor;

      for (const stack of [...member.backpack, ...ship.cargo]) {
        if (claimed.has(stack.uid)) continue;
        if (slotFor(stack.itemId) !== slot) continue;
        const score = rate(stack, member);
        if (score > bestScore) {
          bestScore = score;
          best = stack;
        }
      }

      if (best) {
        member.equipment[slot] = best.uid;
        claimed.add(best.uid);
      }
    };
  };

  // Unarmed sits at power 20 with no skill requirement, so a weapon has to
  // beat that for this person before it is worth carrying.
  const UNARMED_FLOOR = UNARMED_ATTACK.power * 0.6;

  const assignWeapon = pickBest(weaponRating, 'weapon', UNARMED_FLOOR);
  const assignSidearm = pickBest(weaponRating, 'sidearm', UNARMED_FLOOR);
  const assignArmor = pickBest(armorRating, 'armor');
  const assignTool = pickBest(toolRating, 'tool');

  for (const member of party) {
    assignWeapon(member);
    assignSidearm(member);
    assignArmor(member);
    assignTool(member);
  }
}

// ---------------------------------------------------------------------------
// Derived combat capability
// ---------------------------------------------------------------------------

export const UNARMED_ATTACK: AttackProfile = {
  name: 'Strike',
  damageType: 'blunt',
  power: 20,
  skill: 'striking',
  handling: 'fast',
  ranges: ['engaged'],
};

export const GRAPPLE_ATTACK: AttackProfile = {
  name: 'Grapple',
  damageType: 'blunt',
  power: 14,
  skill: 'brawling',
  handling: 'normal',
  ranges: ['engaged'],
};

/**
 * Attack profiles available to a character. Weapon determines what attack is
 * possible; the character determines how well it is executed.
 */
export function availableAttacks(character: Character, ship: Ship | null): AttackProfile[] {
  const attacks: AttackProfile[] = [];

  // The tool slot is included because a few tools — a plasma cutter, a welding
  // rig — are genuinely dangerous in a corridor.
  for (const slot of ['weapon', 'sidearm', 'tool'] as EquipSlot[]) {
    const stack = equippedStack(character, slot, ship);
    if (!stack) continue;
    const def = getItem(stack.itemId);
    if (!def?.attacks) continue;
    for (const attack of def.attacks) attacks.push(attack);
  }

  // Thrown one-use weapons still in the pack are available without equipping.
  for (const stack of character.backpack) {
    const def = getItem(stack.itemId);
    if (!def?.attacks) continue;
    if (!def.properties?.includes('Thrown')) continue;
    for (const attack of def.attacks) attacks.push(attack);
  }

  attacks.push(UNARMED_ATTACK, GRAPPLE_ATTACK);
  return attacks;
}

/** Effective armor protection against one damage type, after condition. */
export function armorProtection(
  character: Character,
  damageType: DamageType,
  ship: Ship | null,
): number {
  const stack = equippedStack(character, 'armor', ship);
  if (!stack) return 0;
  const def = getItem(stack.itemId);
  const listed = def?.protection?.[damageType] ?? 0;
  if (listed <= 0) return 0;
  return listed * (ARMOR.conditionBase + ARMOR.conditionSpan * (stack.condition / 100));
}

/** Degrade worn armor after it absorbs a hit. */
export function degradeArmor(character: Character, ship: Ship | null, amount = ARMOR.conditionLossPerHit): void {
  const stack = equippedStack(character, 'armor', ship);
  if (!stack) return;
  stack.condition = Math.max(0, stack.condition - amount);
}

/** Skill bonus granted by an equipped tool. */
export function toolBonus(character: Character, skill: SkillKey, ship: Ship | null): number {
  const stack = equippedStack(character, 'tool', ship);
  if (!stack) return 0;
  const def = getItem(stack.itemId);
  const entry = def?.toolBonus?.find((t) => t.skill === skill);
  if (!entry) return 0;
  // A worn tool helps less than a good one.
  return Math.round(entry.value * (0.4 + 0.6 * (stack.condition / 100)));
}

/** Best tool bonus anywhere in the party — one good scanner helps everyone. */
export function partyToolBonus(party: Character[], skill: SkillKey, ship: Ship | null): number {
  return party.reduce((best, c) => Math.max(best, toolBonus(c, skill, ship)), 0);
}

// ---------------------------------------------------------------------------
// Ammunition
// ---------------------------------------------------------------------------

export interface AmmoSource {
  stacks: ItemStack[];
  label: string;
}

/** Consume ammo for an attack from the character's pack, then the ship's hold. */
export function consumeAmmo(
  attack: AttackProfile,
  character: Character,
  ship: Ship | null,
): boolean {
  if (!attack.ammoId) return true;
  const need = attack.ammoPerShot ?? 1;

  if (countItem(character.backpack, attack.ammoId) >= need) {
    removeItem(character.backpack, attack.ammoId, need);
    return true;
  }
  if (ship && countItem(ship.cargo, attack.ammoId) >= need) {
    removeItem(ship.cargo, attack.ammoId, need);
    return true;
  }
  return false;
}

export function hasAmmo(attack: AttackProfile, character: Character, ship: Ship | null): boolean {
  if (!attack.ammoId) return true;
  const need = attack.ammoPerShot ?? 1;
  return (
    countItem(character.backpack, attack.ammoId) >= need ||
    (ship ? countItem(ship.cargo, attack.ammoId) >= need : false)
  );
}

// ---------------------------------------------------------------------------
// Consumables
// ---------------------------------------------------------------------------

/** Sum the food value of every food item in a set of stacks, in crew-days. */
export function foodValue(stacks: ItemStack[]): number {
  return stacks.reduce((sum, s) => {
    const def = getItem(s.itemId);
    return sum + (def?.foodDays ?? 0) * s.qty;
  }, 0);
}

export function medicineValue(stacks: ItemStack[]): number {
  return stacks.reduce((sum, s) => {
    const def = getItem(s.itemId);
    return sum + (def?.medicineUnits ?? 0) * s.qty;
  }, 0);
}

/**
 * Items that decant into the ship's tanks rather than being carried as gear.
 * Kept as an explicit table so the conversion is tunable in one place.
 */
export const FUEL_ITEM_UNITS: Record<string, number> = {
  fuel_canister: 20,
};

export function fuelUnitsOf(itemId: ItemId): number {
  return FUEL_ITEM_UNITS[itemId] ?? 0;
}

export function fuelValue(stacks: ItemStack[]): number {
  return stacks.reduce((sum, s) => sum + fuelUnitsOf(s.itemId) * s.qty, 0);
}

export function repairValue(stacks: ItemStack[]): number {
  return stacks.reduce((sum, s) => {
    const def = getItem(s.itemId);
    return sum + (def?.repairParts ?? 0) * s.qty;
  }, 0);
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

export function conditionLabel(condition: number): string {
  if (condition >= 92) return 'Pristine';
  if (condition >= 75) return 'Good';
  if (condition >= 55) return 'Worn';
  if (condition >= 32) return 'Poor';
  if (condition >= 12) return 'Failing';
  return 'Junk';
}

export function describeAttack(attack: AttackProfile): string {
  const ranges = attack.ranges.join('/');
  return `${attack.name} — ${attack.damageType}, power ${attack.power}, ${ranges}`;
}

/**
 * Types for authored content data. Content is pure data — no logic — so it can
 * be reviewed, tuned, and expanded without touching the engine.
 */

import type {
  AttributeKey,
  CharacterRole,
  CombatRange,
  DamageType,
  EventScope,
  ItemId,
  LocationKind,
  RecruitVenue,
  SiteNodeKind,
  SkillKey,
  TraitKey,
} from '../engine/types';

// ---------------------------------------------------------------------------
// Combat encounters
// ---------------------------------------------------------------------------

export type EnemyTier = 'weak' | 'standard' | 'tough' | 'elite';

export interface EncounterEnemy {
  name: string;
  /** Inclusive spawn count range. */
  count: [number, number];
  tier: EnemyTier;
  /** Weapon item ids this enemy may carry; empty means unarmed. */
  weaponIds: ItemId[];
  armorId?: ItemId;
  /** Loot dropped on defeat. */
  drops?: { itemId: ItemId; qty: [number, number]; chance: number }[];
  creditDrop?: [number, number];
}

export interface EncounterTemplate {
  id: string;
  title: string;
  description: string;
  scopes: EventScope[];
  /** Danger band this encounter is appropriate for. */
  danger: [number, number];
  enemies: EncounterEnemy[];
  canFlee: boolean;
  startRange: CombatRange;
  /** Optional line shown when the player wins. */
  victoryText?: string;
}

// ---------------------------------------------------------------------------
// Scavenge site archetypes
// ---------------------------------------------------------------------------

export interface SiteLootEntry {
  itemId: ItemId;
  weight: number;
  qty: [number, number];
  /** Condition range for the rolled item. */
  condition?: [number, number];
}

export interface SiteHazard {
  label: string;
  damageType: DamageType;
  /** Wound severity score range applied on failure. */
  severity: [number, number];
  /** Skill that avoids or mitigates it. */
  avoidSkill: SkillKey;
}

export interface SiteArchetype {
  id: string;
  /** Name template; {adj} and {noun} tokens are substituted at generation. */
  name: string;
  description: string;
  locationKinds: LocationKind[];
  danger: [number, number];
  /** Special sites generate 6-8 nodes instead of 2-5. */
  special?: boolean;
  /** Node kinds that may appear in the body of this site. */
  nodeKinds: SiteNodeKind[];
  lootTable: SiteLootEntry[];
  creditRange: [number, number];
  hazards: SiteHazard[];
  /** Encounter template ids appropriate to this site. */
  encounterIds: string[];
  /** Flavour lines per node kind, picked at generation. */
  nodeFlavor: Partial<Record<SiteNodeKind, string[]>>;
  /** Name-fragment pools for the {adj}/{noun} tokens. */
  nameAdjectives?: string[];
  nameNouns?: string[];
}

// ---------------------------------------------------------------------------
// Names and life history
// ---------------------------------------------------------------------------

export interface NameTables {
  given: string[];
  surnames: string[];
  /** Ship name fragments. */
  shipPrefixes: string[];
  shipNouns: string[];
}

export interface LifePathEntry {
  id: string;
  label: string;
  /** Sentence fragment used on the character sheet. */
  text: string;
  skillBias?: Partial<Record<SkillKey, number>>;
  attributeBias?: Partial<Record<AttributeKey, number>>;
  traitBias?: Partial<Record<TraitKey, number>>;
  weight?: number;
}

export interface CareerEntry extends LifePathEntry {
  role: CharacterRole;
  /** Venues where this career is over-represented. */
  venues?: RecruitVenue[];
}

export interface LifePathTables {
  origins: LifePathEntry[];
  upbringings: LifePathEntry[];
  careers: CareerEntry[];
  formativeEvents: LifePathEntry[];
}

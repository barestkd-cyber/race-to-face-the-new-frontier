/**
 * Race to Face the New Frontier — V1 core domain types.
 *
 * This file is the contract every other engine module and screen builds against.
 * Mechanics live in engine modules; UI only reads these shapes and dispatches actions.
 */

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

export type CharacterId = string;
export type LocationId = string;
export type PlaceId = string;
export type ItemId = string;
export type EventId = string;
export type MissionId = string;

// ---------------------------------------------------------------------------
// Attributes — 18 attributes, 0..15, grouped into 6 facets
// ---------------------------------------------------------------------------

export const ATTRIBUTE_KEYS = [
  // Physical
  'strength',
  'endurance',
  'agility',
  // Precision
  'handEye',
  'proprioception',
  'steadiness',
  // Intelligence
  'learning',
  'reasoning',
  'memory',
  // Awareness
  'perception',
  'evaluation',
  'decisionMaking',
  // Social
  'charisma',
  'leadership',
  'socialAwareness',
  // Will
  'resilience',
  'composure',
  'discipline',
] as const;

export type AttributeKey = (typeof ATTRIBUTE_KEYS)[number];
export type Attributes = Record<AttributeKey, number>;

export type FacetKey =
  | 'physical'
  | 'precision'
  | 'intelligence'
  | 'awareness'
  | 'social'
  | 'will';

export const FACETS: Record<FacetKey, { label: string; attributes: AttributeKey[] }> = {
  physical: { label: 'Physical', attributes: ['strength', 'endurance', 'agility'] },
  precision: { label: 'Precision', attributes: ['handEye', 'proprioception', 'steadiness'] },
  intelligence: { label: 'Intelligence', attributes: ['learning', 'reasoning', 'memory'] },
  awareness: { label: 'Awareness', attributes: ['perception', 'evaluation', 'decisionMaking'] },
  social: { label: 'Social', attributes: ['charisma', 'leadership', 'socialAwareness'] },
  will: { label: 'Will', attributes: ['resilience', 'composure', 'discipline'] },
};

export const ATTRIBUTE_LABELS: Record<AttributeKey, string> = {
  strength: 'Strength',
  endurance: 'Endurance',
  agility: 'Agility',
  handEye: 'Hand-Eye Coordination',
  proprioception: 'Proprioception',
  steadiness: 'Steadiness',
  learning: 'Learning',
  reasoning: 'Reasoning',
  memory: 'Memory',
  perception: 'Perception',
  evaluation: 'Evaluation',
  decisionMaking: 'Decision Making',
  charisma: 'Charisma',
  leadership: 'Leadership',
  socialAwareness: 'Social Awareness',
  resilience: 'Resilience',
  composure: 'Composure',
  discipline: 'Discipline',
};

export const ATTRIBUTE_SHORT: Record<AttributeKey, string> = {
  strength: 'STR',
  endurance: 'END',
  agility: 'AGI',
  handEye: 'HEC',
  proprioception: 'PRO',
  steadiness: 'STE',
  learning: 'LRN',
  reasoning: 'RSN',
  memory: 'MEM',
  perception: 'PER',
  evaluation: 'EVA',
  decisionMaking: 'DEC',
  charisma: 'CHA',
  leadership: 'LDR',
  socialAwareness: 'SOC',
  resilience: 'RES',
  composure: 'CMP',
  discipline: 'DIS',
};

// ---------------------------------------------------------------------------
// Skills — 25 skills, 0..100 (potential-capped)
// ---------------------------------------------------------------------------

export const SKILL_KEYS = [
  // Combat
  'striking',
  'brawling',
  'meleeWeapons',
  'firearms',
  'energyWeapons',
  'shipWeapons',
  'closeQuarters',
  // Technical / Travel
  'mechanicalEngineering',
  'electricalEngineering',
  'weaponsmithing',
  'piloting',
  'navigation',
  // Medical / Science
  'firstAid',
  'medicalDiagnostics',
  'surgery',
  'medicalResearch',
  // Exploration / Survival
  'scavenging',
  'exploration',
  // Social
  'persuasion',
  'negotiation',
  // Utility
  'lockpicking',
  'computers',
  'stealth',
  'explosives',
  'cooking',
] as const;

export type SkillKey = (typeof SKILL_KEYS)[number];
export type SkillMap = Record<SkillKey, number>;

export type SkillGroupKey =
  | 'combat'
  | 'technical'
  | 'medical'
  | 'exploration'
  | 'social'
  | 'utility';

export const SKILL_GROUPS: Record<SkillGroupKey, { label: string; skills: SkillKey[] }> = {
  combat: {
    label: 'Combat',
    skills: [
      'striking',
      'brawling',
      'meleeWeapons',
      'firearms',
      'energyWeapons',
      'shipWeapons',
      'closeQuarters',
    ],
  },
  technical: {
    label: 'Technical / Travel',
    skills: [
      'mechanicalEngineering',
      'electricalEngineering',
      'weaponsmithing',
      'piloting',
      'navigation',
    ],
  },
  medical: {
    label: 'Medical / Science',
    skills: ['firstAid', 'medicalDiagnostics', 'surgery', 'medicalResearch'],
  },
  exploration: { label: 'Exploration / Survival', skills: ['scavenging', 'exploration'] },
  social: { label: 'Social', skills: ['persuasion', 'negotiation'] },
  utility: {
    label: 'Utility',
    skills: ['lockpicking', 'computers', 'stealth', 'explosives', 'cooking'],
  },
};

export const SKILL_LABELS: Record<SkillKey, string> = {
  striking: 'Striking',
  brawling: 'Brawling',
  meleeWeapons: 'Melee Weapons',
  firearms: 'Firearms',
  energyWeapons: 'Energy Weapons',
  shipWeapons: 'Ship Weapons',
  closeQuarters: 'Close Quarters',
  mechanicalEngineering: 'Mechanical Engineering',
  electricalEngineering: 'Electrical Engineering',
  weaponsmithing: 'Weaponsmithing',
  piloting: 'Piloting',
  navigation: 'Navigation',
  firstAid: 'First Aid',
  medicalDiagnostics: 'Medical Diagnostics',
  surgery: 'Surgery',
  medicalResearch: 'Medical Research',
  scavenging: 'Scavenging',
  exploration: 'Exploration',
  persuasion: 'Persuasion',
  negotiation: 'Negotiation',
  lockpicking: 'Lockpicking',
  computers: 'Computers',
  stealth: 'Stealth',
  explosives: 'Explosives',
  cooking: 'Cooking',
};

/**
 * Default primary attribute pair for each skill. A check may override these,
 * but every skill has a sane default so no call site has to invent one.
 */
export const SKILL_PRIMARY_ATTRIBUTES: Record<SkillKey, [AttributeKey, AttributeKey]> = {
  striking: ['strength', 'handEye'],
  brawling: ['strength', 'agility'],
  meleeWeapons: ['handEye', 'agility'],
  firearms: ['handEye', 'steadiness'],
  energyWeapons: ['handEye', 'steadiness'],
  shipWeapons: ['handEye', 'perception'],
  closeQuarters: ['agility', 'proprioception'],
  mechanicalEngineering: ['reasoning', 'proprioception'],
  electricalEngineering: ['reasoning', 'memory'],
  weaponsmithing: ['proprioception', 'memory'],
  piloting: ['handEye', 'proprioception'],
  navigation: ['reasoning', 'perception'],
  firstAid: ['steadiness', 'composure'],
  medicalDiagnostics: ['perception', 'reasoning'],
  surgery: ['steadiness', 'proprioception'],
  medicalResearch: ['reasoning', 'learning'],
  scavenging: ['perception', 'evaluation'],
  exploration: ['perception', 'endurance'],
  persuasion: ['charisma', 'socialAwareness'],
  negotiation: ['evaluation', 'socialAwareness'],
  lockpicking: ['proprioception', 'steadiness'],
  computers: ['reasoning', 'memory'],
  stealth: ['agility', 'perception'],
  explosives: ['reasoning', 'steadiness'],
  cooking: ['memory', 'evaluation'],
};

export type PotentialGrade = 'C' | 'B' | 'A';

/** Immutable per-skill ceiling data for one character. */
export interface SkillPotential {
  grade: PotentialGrade;
  /** Knowledge specialization multiplier: 1.00 | 1.05 | 1.10 | 1.15 | 1.20 */
  specialization: number;
}

export type SkillPotentialMap = Record<SkillKey, SkillPotential>;

export type ExposureBand = 'none' | 'familiar' | 'trained' | 'professional' | 'exceptional';

// ---------------------------------------------------------------------------
// Personality traits — hidden tendencies, not moral alignment
// ---------------------------------------------------------------------------

export const TRAIT_KEYS = [
  'loyal',
  'protective',
  'compassionate',
  'dutiful',
  'patient',
  'generous',
  'brave',
  'cooperative',
  'curious',
  'honest',
  'vindictive',
  'reckless',
  'selfPreserving',
  'greedy',
  'jealous',
  'cowardly',
  'impulsive',
  'controlling',
  'suspicious',
  'alcoholic',
  'aggressive',
  'cautious',
  'opportunistic',
  'stubborn',
] as const;

export type TraitKey = (typeof TRAIT_KEYS)[number];

export interface TraitDef {
  key: TraitKey;
  label: string;
  /** Loose valence used only for generation weighting, never shown as morality. */
  valence: 'positive' | 'negative';
  description: string;
  /** Short hint shown once the trait is discovered. */
  behaviour: string;
}

/** What the player currently knows about a hidden trait. */
export interface TraitKnowledge {
  trait: TraitKey;
  /** 0 = unknown, 1 = suspected, 2 = known */
  known: 0 | 1 | 2;
  /** Accumulated observation weight toward the next knowledge step. */
  evidence: number;
}

// ---------------------------------------------------------------------------
// Wounds and health
// ---------------------------------------------------------------------------

export type BodyRegion = 'head' | 'torso' | 'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg';

export const BODY_REGIONS: BodyRegion[] = [
  'head',
  'torso',
  'leftArm',
  'rightArm',
  'leftLeg',
  'rightLeg',
];

export const BODY_REGION_LABELS: Record<BodyRegion, string> = {
  head: 'Head',
  torso: 'Torso',
  leftArm: 'Left Arm',
  rightArm: 'Right Arm',
  leftLeg: 'Left Leg',
  rightLeg: 'Right Leg',
};

export type WoundSeverity = 'minor' | 'serious' | 'critical' | 'mortal';

export type DamageType = 'slash' | 'pierce' | 'blunt' | 'burn' | 'stun';

export const DAMAGE_TYPES: DamageType[] = ['slash', 'pierce', 'blunt', 'burn', 'stun'];

export interface Wound {
  id: string;
  region: BodyRegion;
  severity: WoundSeverity;
  damageType: DamageType;
  /** Short description shown to the player, e.g. "deep laceration". */
  label: string;
  /** Hours of in-game time this wound has existed. */
  ageHours: number;
  /** Bleeding rate; > 0 causes ongoing health loss until treated. */
  bleeding: number;
  /** True once first aid / surgery has stabilised it. */
  treated: boolean;
  /** Infection risk accumulator, 0..100. */
  infection: number;
  /** Set once the crew has been told this wound turned septic. */
  septicWarned?: boolean;
  /** Remaining hours until fully healed once treated. */
  healHours: number;
  /** Set when the wound is going to kill the character without intervention. */
  lethalInHours?: number;
}

// ---------------------------------------------------------------------------
// Characters
// ---------------------------------------------------------------------------

export type CharacterRole =
  | 'captain'
  | 'navigator'
  | 'engineer'
  | 'medic'
  | 'gunner'
  | 'scavenger'
  | 'pilot'
  | 'technician'
  | 'crew';

export interface Relationship {
  /** -100 hostile .. 0 neutral .. +100 devoted */
  value: number;
  /** How well they know each other, 0..100; gates trait discovery. */
  familiarity: number;
  kind: 'family' | 'friend' | 'crew' | 'rival' | 'stranger' | 'partner';
}

export interface LifeHistory {
  origin: string;
  upbringing: string;
  career: string;
  formativeEvent: string;
  /** Free-text lines shown on the character sheet. */
  notes: string[];
}

export interface Character {
  id: CharacterId;
  name: string;
  surname: string;
  age: number;
  pronouns: 'they/them' | 'she/her' | 'he/him';
  portraitSeed: number;
  role: CharacterRole;

  attributes: Attributes;
  skills: SkillMap;
  potential: SkillPotentialMap;

  /** Hidden until discovered. */
  traits: TraitKey[];
  traitKnowledge: TraitKnowledge[];

  health: number;
  maxHealth: number;
  wounds: Wound[];
  /** 0..100; high stress degrades checks and can trigger behaviour. */
  stress: number;
  /** 0..100; below ~30 the character is exhausted. */
  rested: number;
  /** Hunger debt in crew-days; grows when food runs out. */
  hungerDays: number;

  alive: boolean;
  /** Set when the character has left or died; used for the memorial log. */
  departedReason?: string;

  personalXp: number;
  lifeHistory: LifeHistory;
  relationships: Record<CharacterId, Relationship>;

  /** Equipment slots referencing inventory item instance ids. */
  equipment: {
    weapon?: string;
    sidearm?: string;
    armor?: string;
    tool?: string;
  };

  /** Backpack capacity in slots, 3..15. */
  backpackSlots: number;
  backpack: ItemStack[];

  /** True for the protagonist. */
  isPlayer: boolean;

  /**
   * Unplaced knowledge-specialization marks (e.g. [1.2, 1.15]), strongest
   * first. Placing one onto a skill is permanent and raises that skill's
   * ceiling; the budget never refills. The protagonist starts with all six.
   */
  specSlots: number[];
  /** Non-crew characters (family, contacts) live in the roster but are not aboard. */
  aboard: boolean;
  /** Recruitment terms still owed, if any. */
  owedTerms?: string;

  /**
   * Where this person physically is when they are not aboard. You cannot offer
   * someone passage from a menu — you have to go to where they actually are.
   */
  placeId?: PlaceId;
  /** Whether the player knows where to find them. */
  placeKnown?: boolean;
  /** Why they cannot talk right now, if they cannot. */
  availability?: 'available' | 'working' | 'unreachable';
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

export type CheckOutcome =
  | 'criticalFailure'
  | 'failure'
  | 'partial'
  | 'success'
  | 'exceptional';

export const CHECK_OUTCOME_LABELS: Record<CheckOutcome, string> = {
  criticalFailure: 'Critical Failure',
  failure: 'Failure',
  partial: 'Partial Success',
  success: 'Success',
  exceptional: 'Exceptional Success',
};

export interface CheckModifier {
  label: string;
  value: number;
}

export interface CheckRequest {
  skill: SkillKey;
  /** Overrides SKILL_PRIMARY_ATTRIBUTES when a situation calls for a different pair. */
  attributes?: [AttributeKey, AttributeKey];
  secondarySkill?: SkillKey;
  modifiers?: CheckModifier[];
  /** Tagging an action Critical-Risk removes low-skill critical failure protection. */
  criticalRisk?: boolean;
  /** Participants for multi-person checks; single-element for individual checks. */
  participantIds: CharacterId[];
  /** Leadership only applies to genuine coordinated multi-person checks. */
  leaderId?: CharacterId;
  label: string;
}

export interface CheckResult {
  label: string;
  skill: SkillKey;
  outcome: CheckOutcome;
  roll: number;
  /** Target before clamping. */
  rawTarget: number;
  /** Target after clamping to [5, 95]. */
  finalTarget: number;
  effectiveSkill: number;
  avgAttribute: number;
  attributeMultiplier: number;
  modifiers: CheckModifier[];
  secondaryBonus: number;
  leadershipBonus: number;
  margin: number;
  participantIds: CharacterId[];
  /** Set when low-skill protection converted a critical failure into a failure. */
  protectedFromCritical: boolean;
  timestampHours: number;
}

// ---------------------------------------------------------------------------
// Assessment fidelity
// ---------------------------------------------------------------------------

export type AssessmentQuality = 'veryPoor' | 'poor' | 'moderate' | 'good' | 'excellent';

export const ASSESSMENT_LABELS: Record<AssessmentQuality, string> = {
  veryPoor: 'Very Poor',
  poor: 'Poor',
  moderate: 'Moderate',
  good: 'Good',
  excellent: 'Excellent',
};

export interface Assessment {
  quality: AssessmentQuality;
  /** Player-facing phrasing, deliberately vague at low quality. */
  text: string;
  /** Only populated at good/excellent quality. */
  estimateLow?: number;
  estimateHigh?: number;
  /** Only populated at excellent quality. */
  outcomeOdds?: Record<CheckOutcome, number>;
  /** Debug-only truth for the inspector. */
  trueSuccessChance: number;
  /** Set when something is deliberately distorting the estimate. */
  distortion?: string;
}

// ---------------------------------------------------------------------------
// Items and inventory
// ---------------------------------------------------------------------------

export type ItemCategory =
  | 'weapon'
  | 'armor'
  | 'ammo'
  | 'food'
  | 'medicine'
  | 'tool'
  | 'utility'
  | 'shipPart'
  | 'tradeGood'
  | 'explorationGear'
  | 'valuable';

export type WeaponHandling = 'veryFast' | 'fast' | 'normal' | 'slow' | 'verySlow';

export type CombatRange = 'engaged' | 'close' | 'medium' | 'long';

export const COMBAT_RANGES: CombatRange[] = ['engaged', 'close', 'medium', 'long'];

export interface AttackProfile {
  name: string;
  damageType: DamageType;
  /** Base attack power feeding the wound severity score. */
  power: number;
  skill: SkillKey;
  handling: WeaponHandling;
  ranges: CombatRange[];
  /** Ammo item id consumed per attack, if any. */
  ammoId?: ItemId;
  ammoPerShot?: number;
}

export interface ItemDef {
  id: ItemId;
  name: string;
  category: ItemCategory;
  /** Base credit price before market multipliers. */
  basePrice: number;
  /** Weight in abstract units; drives backpack/hand-carry rules. */
  weight: number;
  /** Items above this weight cannot be backpacked. */
  bulky?: boolean;
  stackable: boolean;
  description: string;
  attacks?: AttackProfile[];
  /** Protection by damage type at 100% condition. */
  protection?: Partial<Record<DamageType, number>>;
  /** Skill bonus granted while equipped in the tool slot. */
  toolBonus?: { skill: SkillKey; value: number }[];
  /** Crew-days of food restored. */
  foodDays?: number;
  /** Medicine units this item is worth. */
  medicineUnits?: number;
  /** Repair parts this item breaks down into. */
  repairParts?: number;
  properties?: string[];
}

export interface ItemStack {
  /** Instance id — unique per stack so condition can differ between copies. */
  uid: string;
  itemId: ItemId;
  qty: number;
  /** 0..100. */
  condition: number;
  /** Loaded rounds/charges for weapons. */
  loaded?: number;
}

// ---------------------------------------------------------------------------
// Ships
// ---------------------------------------------------------------------------

export type ShipQuality = 'makeshift' | 'basic' | 'solid' | 'premium' | 'luxury';

export const SHIP_QUALITIES: ShipQuality[] = [
  'makeshift',
  'basic',
  'solid',
  'premium',
  'luxury',
];

export const SHIP_QUALITY_LABELS: Record<ShipQuality, string> = {
  makeshift: 'Makeshift',
  basic: 'Basic',
  solid: 'Solid',
  premium: 'Premium',
  luxury: 'Luxury',
};

export type ShipSize = 'compact' | 'small' | 'medium' | 'large' | 'massive' | 'capital';

export const SHIP_SIZE_LABELS: Record<ShipSize, string> = {
  compact: 'Compact',
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
  massive: 'Massive',
  capital: 'Capital',
};

export type RoomKind =
  | 'cockpit'
  | 'quarters'
  | 'engineBay'
  | 'cargoBay'
  | 'medBay'
  | 'medicalWard'
  | 'engineeringBay'
  | 'systemsLab'
  | 'armory'
  | 'galley'
  | 'recreation'
  | 'gym'
  | 'study'
  | 'researchLab'
  | 'brig'
  | 'quarantine'
  | 'hydroponics'
  | 'therapy'
  | 'hangar';

export interface ShipRoom {
  id: string;
  kind: RoomKind;
  quality: ShipQuality;
  qualityPotential: ShipQuality;
  /** 0..100, separate from quality. */
  condition: number;
}

export type ShipSystemKind = 'engines' | 'power' | 'lifeSupport' | 'hull' | 'sensors' | 'shields';

export const SHIP_SYSTEM_KINDS: ShipSystemKind[] = [
  'engines',
  'power',
  'lifeSupport',
  'hull',
  'sensors',
  'shields',
];

export interface ShipSystem {
  kind: ShipSystemKind;
  quality: ShipQuality;
  condition: number;
  /** Some systems can be absent entirely (shields on a junker). */
  installed: boolean;
}

export interface Ship {
  id: string;
  name: string;
  size: ShipSize;
  quality: ShipQuality;
  rooms: ShipRoom[];
  systems: Record<ShipSystemKind, ShipSystem>;
  /** Installed weapon equipment ids. */
  weapons: ItemStack[];
  /** Ship-stored cargo, separate from personal backpacks. */
  cargo: ItemStack[];
  /** Derived, but cached for display. */
  quartersCapacity: number;
  lifeSupportCapacity: number;
  /** Cosmetic hull silhouette variant index. */
  hullVariant: number;
  destroyed: boolean;
}

// ---------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------

export interface Resources {
  /** Physical fuel units. Travel hours are derived, never stored. */
  fuel: number;
  fuelCapacity: number;
  /** Crew-days of ordinary food. */
  food: number;
  /** Direct repair parts count. */
  repairParts: number;
  medicine: number;
  credits: number;
  dataCores: number;
}

// ---------------------------------------------------------------------------
// World, route, locations
// ---------------------------------------------------------------------------

export type LocationKind =
  | 'homeworld'
  | 'moon'
  | 'tradeStation'
  | 'inhabitedPlanet'
  | 'transitStation'
  | 'travelWorld'
  | 'temporary';

export type LocationCondition =
  | 'prosperous'
  | 'normal'
  | 'strained'
  | 'rationing'
  | 'damaged'
  | 'partiallyEvacuated'
  | 'abandoned';

export type LocationActionKind =
  | 'trade'
  | 'recruit'
  | 'findWork'
  | 'missions'
  | 'scavenge'
  | 'repair'
  | 'medical'
  | 'social'
  | 'rest'
  /** Work the crowd for a sharper read on the extinction clocks. */
  | 'askForecast'
  | 'depart';

export interface MarketState {
  /** itemId -> scarcity multiplier for this location. */
  scarcity: Record<ItemId, number>;
  /** Item ids currently stocked with quantities. */
  stock: ItemStack[];
  /** Regenerated when the player has been away long enough. */
  restockedAtHours: number;
  /** Merchant disposition, affects final terms. */
  merchantAttitude: number;
}

export interface LocationState {
  id: LocationId;
  kind: LocationKind;
  name: string;
  subtitle: string;
  description: string;
  condition: LocationCondition;
  /** Route position 0..1 along the main outward path; moons sit off-axis. */
  routeIndex: number;
  /** Lateral offset for the map: -1 left, 0 centre, +1 right. */
  lateral: number;
  /** Fuel/time distance from the previous main node. */
  travelDaysFromPrev: number;
  discovered: boolean;
  visited: boolean;
  /** Actions this location exposes at all. */
  actions: LocationActionKind[];
  market?: MarketState;
  /** Procedurally generated flavour facts, persisted once created. */
  facts: string[];
  /** Moon-specific economy role. */
  economyRole?: string;
  terrain?: string;
  /** Ids of scavenge sites generated for this location. */
  siteIds: string[];
  /** Danger 0..100 informs event weighting. */
  danger: number;
  /** Temporary nodes expire. */
  expiresAtHours?: number;
  /** Set for the main linear path. */
  onMainRoute: boolean;
  /** Population scale, used for recruiting and market depth. */
  populationTier: number;
  /** Recruitment venues available here. */
  recruitVenues: RecruitVenue[];
}

export type RecruitVenue =
  | 'workerCamp'
  | 'bar'
  | 'clinic'
  | 'refugeeArea'
  | 'securityOffice'
  | 'freightYard'
  | 'mine'
  | 'university'
  | 'shelter';

// ---------------------------------------------------------------------------
// Places — the world inside a location
// ---------------------------------------------------------------------------

/**
 * A Location is somewhere you fly to. A Place is somewhere you walk to once
 * you are there. Actions hang off Places, not off the Location, so the player
 * reaches a service by going where it is rather than by opening a menu of
 * everything the game supports.
 *
 * Places form a shallow tree: top-level districts have no parent, and venues
 * inside them point at their district.
 */
export type PlaceKind =
  | 'homeProperty'
  | 'house'
  | 'shipYard'
  | 'district'
  | 'market'
  | 'clinic'
  | 'shelter'
  | 'workerCamp'
  | 'salvageYard'
  | 'freightOffice'
  | 'repairYard'
  | 'fuelDepot'
  | 'shipMarket'
  | 'transitHub'
  | 'bar'
  | 'government'
  | 'lodging'
  | 'dock'
  | 'concourse'
  | 'outpost'
  | 'wilds';

export interface Place {
  id: PlaceId;
  locationId: LocationId;
  /** Undefined for a top-level district of its location. */
  parentId?: PlaceId;
  name: string;
  kind: PlaceKind;
  subtitle: string;
  description: string;
  /** What can actually be done here. Empty means it is only a way through. */
  actions: LocationActionKind[];
  /** Hours to walk or ride here from the parent place. */
  travelHours: number;
  discovered: boolean;
  visited: boolean;
  /** Set when people gather here in a way that makes recruiting plausible. */
  recruitVenue?: RecruitVenue;
  /** Scavenge sites reachable from here. */
  siteIds: string[];
  danger: number;
  /** True where the ship is physically parked. */
  shipHere?: boolean;
}

export const RECRUIT_VENUE_LABELS: Record<RecruitVenue, string> = {
  workerCamp: 'Worker Camp',
  bar: 'Bar',
  clinic: 'Clinic',
  refugeeArea: 'Refugee Area',
  securityOffice: 'Security Office',
  freightYard: 'Freight Yard',
  mine: 'Mine',
  university: 'University / Lab',
  shelter: 'Shelter',
};

// ---------------------------------------------------------------------------
// Travel
// ---------------------------------------------------------------------------

export type TimeSpeed = 'normal' | 'fast' | 'veryFast';

export interface TravelLegEvent {
  /** Hours into the leg at which this event fires. */
  atHours: number;
  eventId: EventId;
  /** Routine events auto-resolve into the log; meaningful events interrupt. */
  interrupt: boolean;
  fired: boolean;
}

export interface TravelState {
  fromId: LocationId;
  toId: LocationId;
  totalHours: number;
  elapsedHours: number;
  /** Fuel units per hour for this leg, derived at departure. */
  fuelPerHour: number;
  events: TravelLegEvent[];
  /** True while the player has paused/interrupted travel. */
  paused: boolean;
  speed: TimeSpeed;
  danger: number;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export type EventScope =
  | 'homeworld'
  | 'moon'
  | 'travel'
  | 'station'
  | 'planet'
  | 'social'
  | 'technical'
  | 'medical'
  | 'hostile'
  | 'scavenge';

export interface EventEffect {
  fuel?: number;
  food?: number;
  medicine?: number;
  repairParts?: number;
  credits?: number;
  dataCores?: number;
  morale?: number;
  /** Stress applied to everyone aboard. */
  crewStress?: number;
  /** Hull condition delta. */
  hull?: number;
  /** Named system condition deltas. */
  systems?: Partial<Record<ShipSystemKind, number>>;
  /** Hours consumed by the choice. */
  hours?: number;
  /** Grant items by def id. */
  items?: { itemId: ItemId; qty: number; condition?: number }[];
  /** Wound the acting character. */
  wound?: { severityScore: number; damageType: DamageType };
  /** Trigger combat with a named encounter template. */
  combat?: string;
  /** Free-text log line. */
  log?: string;
  /** Set a persistent world flag. */
  flag?: { key: string; value: number | string | boolean };
  /** Recruit a generated character into the crew. */
  recruit?: boolean;
  /** Lose the named crew member (chosen by the engine). */
  loseCrew?: boolean;
  /** XP awards. */
  personalXp?: number;
  crewXp?: number;
}

export interface EventOutcomeBranch {
  text: string;
  effects: EventEffect;
}

export interface EventChoice {
  id: string;
  label: string;
  /** Shown under the label; may describe the time cost or risk. */
  hint?: string;
  /** Optional check gating the outcome. */
  check?: {
    skill: SkillKey;
    secondarySkill?: SkillKey;
    attributes?: [AttributeKey, AttributeKey];
    modifiers?: CheckModifier[];
    criticalRisk?: boolean;
    /** 'individual' picks the best crew member; group uses the away party or full crew. */
    participation: 'individual' | 'duo' | 'trio' | 'group';
  };
  /** Requirements that must be met for the choice to appear. */
  requires?: {
    minCredits?: number;
    minFood?: number;
    minMedicine?: number;
    minRepairParts?: number;
    minFuel?: number;
    minCrew?: number;
    skill?: { skill: SkillKey; min: number };
    flag?: string;
  };
  /** Immediate effects applied regardless of check outcome. */
  effects?: EventEffect;
  /** Outcome branches keyed by check result. */
  outcomes?: Partial<Record<CheckOutcome, EventOutcomeBranch>>;
  /** Used when there is no check. */
  result?: EventOutcomeBranch;
}

export interface GameEventDef {
  id: EventId;
  scope: EventScope[];
  title: string;
  /** Situation text; may contain {token} substitutions resolved by the narrator. */
  body: string;
  /** Relative selection weight. */
  weight: number;
  /** Routine events auto-resolve; meaningful ones interrupt travel/rest. */
  routine?: boolean;
  /** Only fire when these conditions hold. */
  conditions?: {
    minDanger?: number;
    maxDanger?: number;
    minCrew?: number;
    requiresShip?: boolean;
    locationKinds?: LocationKind[];
    /** Fire at most once per run. */
    once?: boolean;
    flag?: string;
    notFlag?: string;
  };
  choices: EventChoice[];
  /** Tags used by the generator to avoid repeating similar beats. */
  tags?: string[];
}

export interface ActiveEvent {
  def: GameEventDef;
  /** Resolved narrative substitutions. */
  tokens: Record<string, string>;
  /** Set once a choice resolves so the UI can show the outcome before dismissing. */
  resolution?: {
    choiceId: string;
    text: string;
    check?: CheckResult;
    effectSummary: string[];
  };
  /** Where the event came from, for the log. */
  source: EventScope;
}

// ---------------------------------------------------------------------------
// Missions, scavenging, sites
// ---------------------------------------------------------------------------

export type MissionKind = 'solo' | 'group' | 'crew';

export interface MissionDef {
  id: MissionId;
  kind: MissionKind;
  title: string;
  description: string;
  locationId: LocationId;
  /** Group capacity 2..5. */
  capacity: number;
  /** Estimated hours. */
  estimatedHours: number;
  danger: number;
  rewardCredits: number;
  rewardItems?: { itemId: ItemId; qty: number }[];
  /** Scavenge site to enter, when the mission is a site expedition. */
  siteId?: string;
  expiresAtHours?: number;
  /** Set once accepted. */
  accepted?: boolean;
}

export type SiteNodeKind =
  | 'entrance'
  | 'storage'
  | 'corridor'
  | 'machinery'
  | 'office'
  | 'habitation'
  | 'medical'
  | 'lockedRoom'
  | 'hiddenBranch'
  | 'hazardZone'
  | 'exit';

export interface SiteNode {
  id: string;
  kind: SiteNodeKind;
  label: string;
  description: string;
  /** Node ids reachable from here. */
  links: string[];
  /** Player knows this node exists. */
  revealed: boolean;
  /** Player has resolved this node. */
  cleared: boolean;
  /** Hidden until a perception/exploration check finds it. */
  hidden: boolean;
  /** Hours to traverse/search. */
  hours: number;
  danger: number;
  /** Loot rolled when the node is cleared. */
  loot?: { itemId: ItemId; qty: number; condition?: number }[];
  lootCredits?: number;
  /** Optional check to get through/into the node. */
  check?: {
    skill: SkillKey;
    secondarySkill?: SkillKey;
    modifiers?: CheckModifier[];
    criticalRisk?: boolean;
    description: string;
  };
  /** Hazard applied on failure. */
  hazard?: { severityScore: number; damageType: DamageType; label: string };
  /** Combat encounter template. */
  encounter?: string;
}

export interface ScavengeSite {
  id: string;
  locationId: LocationId;
  archetype: string;
  name: string;
  description: string;
  danger: number;
  nodes: SiteNode[];
  entranceId: string;
  exitId: string;
  /** Set once the site has been fully looted. */
  exhausted: boolean;
  /** Intel level 0..3 improves pre-entry information. */
  intel: number;
}

export interface ExpeditionState {
  siteId: string;
  partyIds: CharacterId[];
  leaderId: CharacterId;
  currentNodeId: string;
  /** Node ids already resolved. */
  visited: string[];
  /** Loot accumulated this run, applied on exit. */
  carried: { itemId: ItemId; qty: number; condition?: number }[];
  carriedCredits: number;
  startedAtHours: number;
  missionId?: MissionId;
  /** Last node resolution shown to the player. */
  lastResult?: {
    nodeId: string;
    text: string;
    check?: CheckResult;
    lines: string[];
  };
}

// ---------------------------------------------------------------------------
// Combat
// ---------------------------------------------------------------------------

/**
 * A combatant always resolves to a Character — crew from the roster, hostiles
 * from the combat-local `hostiles` map — so wounds, checks, and health all run
 * through exactly one code path.
 */
export interface Combatant {
  id: string;
  characterId: CharacterId;
  name: string;
  hostile: boolean;
  /** Action meter 0..100. May go negative as a slow-weapon deficit. */
  meter: number;
  range: CombatRange;
  inCover: boolean;
  fled: boolean;
  portraitSeed: number;
  /** Hostiles carry a fixed attack list; crew derive theirs from equipment. */
  attacks?: AttackProfile[];
  protection?: Partial<Record<DamageType, number>>;
  armorCondition?: number;
  /** Loot dropped when this combatant is defeated. */
  drops?: { itemId: ItemId; qty: number }[];
  creditDrop?: number;
}

export type CombatActionKind =
  | 'attack'
  | 'strike'
  | 'brawl'
  | 'createDistance'
  | 'closeDistance'
  | 'cover'
  | 'escape'
  | 'readyWeapon'
  | 'firstAid'
  | 'context';

export interface CombatAction {
  kind: CombatActionKind;
  label: string;
  hint?: string;
  /** Meter cost multiplier derived from handling. */
  speed: number;
  attackIndex?: number;
  targetId?: string;
  available: boolean;
  reason?: string;
}

export interface FarewellEntry {
  characterId: CharacterId;
  name: string;
  surname: string;
  portraitSeed: number;
  /** Player's relation to them, for the tone of the line. */
  relation: 'family' | 'crew';
  cause: string;
}

export interface CombatState {
  id: string;
  title: string;
  combatants: Combatant[];
  /** Generated hostiles, kept out of the permanent character roster. */
  hostiles: Record<CharacterId, Character>;
  /** Combatant id whose meter filled and is awaiting player input. */
  activeId: string | null;
  round: number;
  log: string[];
  /**
   * Set when combat has ended. 'victory' means the hostiles are down and the
   * ground is yours; 'droveOff' means they ran and you held; 'fled' means you
   * got out. Only 'victory' loots — nobody strips the pockets of someone who
   * got away.
   */
  resolution?: 'victory' | 'droveOff' | 'defeat' | 'fled' | 'truce';
  /** Names of crew killed in this fight, so the ending reads what it cost. */
  casualties?: string[];
  /** Where to return once combat resolves. */
  returnTo: ScreenId;
  canFlee: boolean;
  encounterId: string;
}

// ---------------------------------------------------------------------------
// Recruitment
// ---------------------------------------------------------------------------

export interface RecruitCandidate {
  character: Character;
  /** 0..100 willingness to join right now. */
  willingness: number;
  /** What they want in exchange. */
  terms: {
    kind:
      | 'credits'
      | 'food'
      | 'passage'
      | 'medicine'
      | 'equipment'
      | 'missionHelp'
      | 'debt'
      | 'rescue';
    label: string;
    credits?: number;
    food?: number;
    medicine?: number;
    /** True once the player has met the terms. */
    met: boolean;
  };
  /** What the player currently knows, gated by Evaluation. */
  assessment: Assessment;
  /** Conversation beats already used. */
  usedBeats: string[];
  talkedTo: boolean;
  persuadeAttempts: number;
  negotiateAttempts: number;
  refused: boolean;
  joined: boolean;
}

export interface RecruitmentState {
  locationId: LocationId;
  venue: RecruitVenue;
  candidates: RecruitCandidate[];
  searchedAtHours: number;
  selectedIndex: number | null;
}

// ---------------------------------------------------------------------------
// Trade
// ---------------------------------------------------------------------------

export interface TradeState {
  locationId: LocationId;
  mode: 'buy' | 'sell';
  /** Negotiated modifier applied this session, from the Negotiation check. */
  priceModifier: number;
  negotiated: boolean;
  lastCheck?: CheckResult;
}

// ---------------------------------------------------------------------------
// Homeworld clock
// ---------------------------------------------------------------------------

export interface HomeworldState {
  /** Hidden true terminal day, 7..49. Never shown directly. */
  terminalDay: number;
  /** Which threat reaches terminal state first. */
  dominantThreat: 'atmospheric' | 'mantle';
  /** Publicly known infrastructure decay 0..100. */
  infrastructure: number;
  /** Number of forecast refinements the player has bought/earned. */
  forecastQuality: number;
  /** True once the world has ended. */
  ended: boolean;
  /** Set once the player leaves the homeworld region for the last time. */
  departed: boolean;
  /** Ids of family members generated at start. */
  familyIds: CharacterId[];
  /** Family members successfully brought aboard. */
  rescuedFamilyIds: CharacterId[];
}

// ---------------------------------------------------------------------------
// Logging and debug
// ---------------------------------------------------------------------------

export type LogKind =
  | 'system'
  | 'travel'
  | 'event'
  | 'combat'
  | 'trade'
  | 'crew'
  | 'medical'
  | 'mission'
  | 'warning'
  | 'milestone';

export interface LogEntry {
  id: string;
  hours: number;
  kind: LogKind;
  text: string;
}

export interface DebugRecord {
  id: string;
  hours: number;
  label: string;
  detail: Record<string, unknown>;
}

export interface DebugState {
  enabled: boolean;
  records: DebugRecord[];
  /** Reveal hidden traits, true assessment, terminal day. */
  revealHidden: boolean;
}

// ---------------------------------------------------------------------------
// Screens and top-level state
// ---------------------------------------------------------------------------

export type ScreenId =
  | 'title'
  | 'newGame'
  | 'charGen'
  | 'shipReveal'
  | 'cockpit'
  /** The districts and venues reachable on foot from where you are standing. */
  | 'localTravel'
  /** One specific place, and what can actually be done there. */
  | 'place'
  | 'crew'
  | 'character'
  | 'ship'
  | 'inventory'
  | 'trade'
  | 'recruitSearch'
  | 'recruitCandidate'
  | 'missionPrep'
  | 'expedition'
  | 'combat'
  | 'medical'
  | 'event'
  | 'log'
  | 'rest'
  | 'saveLoad'
  | 'debug'
  | 'travelCenter'
  | 'gameOver';

export type GamePhase =
  | 'menu'
  | 'creating'
  | 'homeworld'
  | 'enroute'
  | 'atLocation'
  | 'expedition'
  | 'combat'
  | 'complete'
  | 'dead';

export interface PendingRest {
  hours: number;
  startedAtHours: number;
}

export interface GameState {
  /** Save schema version. */
  version: number;
  seed: string;
  /** Serialized RNG cursor so live rolls resume identically after a load. */
  rngCursor: number;
  createdAt: number;
  savedAt: number;

  /** Total in-game hours elapsed since the run began. */
  hours: number;
  speed: TimeSpeed;

  phase: GamePhase;
  screen: ScreenId;
  /** Screen stack for back navigation. */
  screenStack: ScreenId[];

  playerId: CharacterId;
  captainId: CharacterId;
  characters: Record<CharacterId, Character>;
  /** Ordered crew roster (aboard the ship). */
  crewIds: CharacterId[];

  ship: Ship | null;
  resources: Resources;

  locations: Record<LocationId, LocationState>;
  /** Ordered main route ids. */
  routeIds: LocationId[];
  currentLocationId: LocationId | null;
  travel: TravelState | null;

  /** Every walkable place across every location, keyed by id. */
  places: Record<PlaceId, Place>;
  /** Where the player is standing. Null means aboard the ship. */
  currentPlaceId: PlaceId | null;

  sites: Record<string, ScavengeSite>;
  missions: MissionDef[];
  expedition: ExpeditionState | null;
  combat: CombatState | null;
  recruitment: RecruitmentState | null;
  trade: TradeState | null;
  activeEvent: ActiveEvent | null;
  pendingRest: PendingRest | null;

  homeworld: HomeworldState;

  /** 0..100 crew morale. */
  morale: number;
  crewXp: number;

  /** Opportunities currently offered at the current location. */
  opportunities: Opportunity[];

  log: LogEntry[];
  debug: DebugState;
  flags: Record<string, number | string | boolean>;

  /** Ids of events already fired when marked `once`. */
  firedOnce: string[];
  /** Event id -> hour it last fired, used to suppress immediate repeats. */
  recentEvents: Record<EventId, number>;
  /** Encounter template id waiting to start combat once the event is dismissed. */
  pendingCombat: string | null;

  /**
   * Diegetic onboarding cursor. Introduces the interface a step at a time
   * instead of presenting every control at once. See ONBOARDING in tuning.
   */
  onboardingStep: number;

  /**
   * Crew deaths waiting to be acknowledged. Every death gets one beat — a
   * name, a face, a line — before play carries on. Queued here by the store
   * whenever the roster shrinks, shown once combat has finished saying its
   * piece.
   */
  pendingFarewells: FarewellEntry[];

  /** Set when the run has ended, with the reason. */
  ending: { kind: 'victory' | 'death' | 'stranded'; text: string } | null;

  /** Character detail screen focus. */
  focusCharacterId: CharacterId | null;
  /** Mission prep working set. */
  missionPrep: {
    missionId?: MissionId;
    siteId?: string;
    kind: MissionKind;
    selectedIds: CharacterId[];
    leaderId: CharacterId | null;
  } | null;
}

/** A rolling, expiring thing to do at the current location. */
export interface Opportunity {
  id: string;
  kind: LocationActionKind | 'event' | 'mission';
  title: string;
  description: string;
  locationId: LocationId;
  expiresAtHours?: number;
  /** Event def id when kind === 'event'. */
  eventId?: EventId;
  missionId?: MissionId;
  hours: number;
}

// ---------------------------------------------------------------------------
// Narration
// ---------------------------------------------------------------------------

export interface NarrationContext {
  state: GameState;
  actor?: Character;
  location?: LocationState;
  tokens?: Record<string, string>;
}

/**
 * CENTRAL TUNING LAYER
 *
 * Every provisional number from the V1 candidate spec lives here. No magic
 * numbers in UI components, and no gameplay constant defined twice.
 *
 * Entries marked V1 PROVISIONAL are expected to move once playtesting starts.
 * Entries marked V1 LOCKED come straight from the spec and should not drift
 * without an explicit design decision.
 */

import type {
  CheckOutcome,
  ExposureBand,
  PotentialGrade,
  ShipQuality,
  ShipSize,
  WoundSeverity,
} from './types';

// ---------------------------------------------------------------------------
// Time
// ---------------------------------------------------------------------------

export const TIME = {
  hoursPerDay: 24,
  /** In-game hours advanced per real second at each speed while travelling. */
  speedHoursPerSecond: {
    normal: 0.75,
    fast: 3,
    veryFast: 9,
  },
  /** Simulation granularity — travel is stepped in chunks this size. */
  tickHours: 0.25,
  restOptions: [8, 16, 24] as const,
} as const;

// ---------------------------------------------------------------------------
// Homeworld extinction clock — V1 LOCKED RANGE (7..49 days)
// ---------------------------------------------------------------------------

export const HOMEWORLD_CLOCK = {
  minDay: 7,
  maxDay: 49,
  /** Tapered weighting from the spec; extremes possible but uncommon. */
  bands: [
    { min: 7, max: 13, weight: 10 },
    { min: 14, max: 20, weight: 22 },
    { min: 21, max: 28, weight: 30 },
    { min: 29, max: 35, weight: 22 },
    { min: 36, max: 42, weight: 11 },
    { min: 43, max: 49, weight: 5 },
  ],
  /** Infrastructure decay per day, drives visible world degradation. */
  infrastructureDecayPerDay: 2.4,
  /** How much a forecast purchase tightens the displayed estimate. */
  forecastQualityStep: 1,
  maxForecastQuality: 4,
  /** V1 PROVISIONAL: half-width of the displayed estimate at each forecast level. */
  estimateHalfWidthByQuality: [14, 10, 7, 4, 2],
} as const;

// ---------------------------------------------------------------------------
// Check system — V1 formula
// ---------------------------------------------------------------------------

export const CHECK = {
  /** multiplier = base + (avgAttribute / attributeScale) * span */
  attributeMultiplierBase: 0.75,
  attributeMultiplierSpan: 0.5,
  attributeScale: 15,

  /** V1 PROVISIONAL: final rolled target clamps to this range. */
  minTarget: 5,
  maxTarget: 95,

  /** Exceptional success when roll <= target * this. */
  exceptionalFraction: 0.2,

  /** Miss margins: partial 1..15, failure 16..35, critical beyond. */
  partialMaxMargin: 15,
  failureMaxMargin: 35,

  /** V1 low-skill protection: below this target, criticals need a 96+ roll. */
  lowSkillProtectionTarget: 25,
  lowSkillCriticalRollFloor: 96,

  /** Secondary skill contribution bands. */
  secondarySkillBands: [
    { max: 19, bonus: 0 },
    { max: 39, bonus: 2 },
    { max: 59, bonus: 5 },
    { max: 79, bonus: 8 },
    { max: 100, bonus: 10 },
  ],

  /** Situational modifier presets, exposed so content can name them. */
  modifiers: {
    majorAdvantage: 15,
    strongAdvantage: 10,
    smallAdvantage: 5,
    ordinary: 0,
    problem: -5,
    difficult: -10,
    severe: -20,
    extreme: -30,
  },

  /** Leadership 0..15 maps to 0..this fraction of gap closure for the weakest. */
  leadershipMaxGapClosure: 0.5,
  leadershipAttributeScale: 15,

  /** Stress penalty to checks: -1 per this many stress points above the floor. */
  stressPenaltyFloor: 40,
  stressPenaltyPerPoint: 0.25,
  maxStressPenalty: 20,

  /** Exhaustion penalty applied when `rested` falls below the floor. */
  exhaustionFloor: 35,
  exhaustionPenaltyPerPoint: 0.3,
  maxExhaustionPenalty: 15,

  /** Wound penalty per severity, applied to physical checks. */
  woundPenalty: {
    minor: 2,
    serious: 6,
    critical: 14,
    mortal: 25,
  } as Record<WoundSeverity, number>,
} as const;

// ---------------------------------------------------------------------------
// Attribute generation
// ---------------------------------------------------------------------------

export const ATTRIBUTE_GEN = {
  attributeCount: 18,
  maxPerAttribute: 15,
  /** Theoretical maximum total = 18 * 15 = 270. */
  theoreticalMax: 270,
  absoluteMin: 75,
  absoluteMax: 165,
  commonMin: 105,
  commonMax: 135,
  /** Higher = tighter clustering toward the common band. */
  taperRolls: 4,
  /** 90% procedurally assigned, 10% player allocated. */
  playerAllocationFraction: 0.1,
  /** Facet tendency spread — how far facets diverge from the character average. */
  facetSpread: 3.2,
  /** Within-facet jitter. */
  attributeJitter: 2.2,
} as const;

// ---------------------------------------------------------------------------
// Skills, potential, exposure
// ---------------------------------------------------------------------------

export const POTENTIAL_CAP: Record<PotentialGrade, number> = {
  C: 70,
  B: 85,
  A: 100,
};

export const SKILLS_TUNING = {
  /** Distribution of potential grades across a character's 25 skills. */
  gradeWeights: { C: 62, B: 28, A: 10 },
  /** Knowledge specialization allowance: 2 at x1.20, 2 at x1.15, 2 at x1.10. */
  specializationAllowance: [
    { multiplier: 1.2, count: 2 },
    { multiplier: 1.15, count: 2 },
    { multiplier: 1.1, count: 2 },
  ],
  /**
   * V1 PROVISIONAL: specialization raises the usable ceiling rather than
   * multiplying every roll, keeping "Skill is base capability" intact.
   * Set false to treat specialization as a flat check bonus instead.
   */
  specializationRaisesCap: true,

  /** Skill value ranges rolled for each exposure band. */
  exposureRanges: {
    none: [0, 0],
    familiar: [5, 22],
    trained: [20, 45],
    professional: [40, 70],
    exceptional: [65, 92],
  } as Record<ExposureBand, [number, number]>,

  /** Base probability of each exposure band before life-history bias. */
  exposureWeights: {
    none: 52,
    familiar: 26,
    trained: 13,
    professional: 7,
    exceptional: 2,
  } as Record<ExposureBand, number>,

  /** Free points the protagonist allocates after generation. */
  protagonistFreeSkillPoints: 25,
  /** Recruits get a smaller top-up so they read as specialists, not blanks. */
  recruitFreeSkillPoints: 8,
} as const;

// ---------------------------------------------------------------------------
// Personality
// ---------------------------------------------------------------------------

export const TRAITS_TUNING = {
  /** 2 is common, 3 is less common. */
  countWeights: [
    { count: 2, weight: 72 },
    { count: 3, weight: 28 },
  ],
  /** Chance the whole set rolls all-positive or all-negative. */
  uniformValenceChance: 0.14,
  /** Evidence needed to move from unknown -> suspected -> known. */
  evidenceForSuspected: 3,
  evidenceForKnown: 7,
  /** Familiarity gained per shared meaningful scene. */
  familiarityPerScene: 4,
} as const;

// ---------------------------------------------------------------------------
// Health, wounds, armor, medicine
// ---------------------------------------------------------------------------

export const HEALTH = {
  /** Derived health = base + END * enduranceFactor + STR * strengthFactor. */
  base: 50,
  enduranceFactor: 3,
  strengthFactor: 1,
} as const;

export const WOUNDS = {
  /** V1 PROVISIONAL severity score thresholds. */
  thresholds: {
    none: 20,
    minor: 40,
    serious: 60,
    critical: 80,
    mortal: 95,
  },
  /** Outcome modifiers folded into the severity score. */
  outcomeModifier: {
    exceptional: 18,
    success: 8,
    partial: 0,
    failure: -12,
    criticalFailure: -20,
  } as Record<CheckOutcome, number>,
  /** Resilience reduces severity by this much per point. */
  resilienceFactor: 1.1,
  /** Head and torso hits are more likely to be lethal. */
  regionLethality: {
    head: 1.35,
    torso: 1.15,
    leftArm: 0.75,
    rightArm: 0.75,
    leftLeg: 0.8,
    rightLeg: 0.8,
  },
  /** Hit location weights for an untargeted attack. */
  regionWeights: {
    head: 10,
    torso: 38,
    leftArm: 13,
    rightArm: 13,
    leftLeg: 13,
    rightLeg: 13,
  },
  /**
   * Immediate health loss by severity.
   *
   * Deliberately compressed relative to a naive curve. At minor = 6 a knife
   * fight against an unarmoured scavenger took sixty exchanges to resolve —
   * everyone was an HP sponge against light weapons while rifles killed in
   * two. Raising the bottom and flattening the top makes low-tier fights
   * finish and narrows the gap between a good weapon and a poor one, without
   * turning a typical 82-health character into someone who survives a rifle.
   */
  healthLoss: {
    minor: 11,
    serious: 25,
    critical: 40,
    mortal: 58,
  } as Record<WoundSeverity, number>,
  /** Bleeding rate (health per hour) by severity when untreated. */
  bleeding: {
    minor: 0.2,
    serious: 0.9,
    critical: 2.2,
    mortal: 4.5,
  } as Record<WoundSeverity, number>,

  /**
   * Untreated bleeding decays as the body clots. Without this, every untreated
   * wound is eventually fatal at a fixed rate and the whole medical system
   * collapses into "treat instantly or die" — a single serious wound would
   * drain 22 health a day forever.
   *
   * At 0.12/hour a serious wound costs roughly 7 health in total before it
   * stops, and a critical one roughly 18. Mortal wounds do NOT clot: they keep
   * their `lethalInHours` deadline, which is where the urgency belongs.
   */
  bleedingDecayPerHour: 0.12,
  bleedingStopsBelow: 0.04,

  /**
   * Cap on separately tracked wounds. Past this, a new injury escalates an
   * existing wound in the same region instead of appending, so a long fight
   * cannot produce a character carrying ten independent penalties.
   */
  maxTrackedWounds: 6,
  /** Hours to heal once treated. */
  healHours: {
    minor: 18,
    serious: 72,
    critical: 190,
    mortal: 400,
  } as Record<WoundSeverity, number>,
  /** A mortal wound kills within this many hours without surgery. */
  mortalDeadlineHours: 10,
  /** Infection accrual per hour while untreated and still open. */
  infectionPerHour: {
    minor: 0.2,
    serious: 0.6,
    critical: 1.2,
    mortal: 2,
  } as Record<WoundSeverity, number>,

  /**
   * Untreated wounds still close on their own, just badly and slowly. Without
   * this every injury is permanent, infection climbs forever, and a crew that
   * never finds a medic is guaranteed to die of old scratches.
   */
  untreatedHealMultiplier: 0.3,

  /**
   * Health lost per hour at full infection, scaling linearly with the infection
   * level. Sepsis is meant to be a real threat with a visible clock, not an
   * unkillable permanent bleed.
   */
  infectionDamagePerHour: 0.3,
  /** Infection the body clears per hour when fed and resting. */
  infectionRecoveryPerHour: 0.5,
  /** Above this the wound is visibly septic and needs proper treatment. */
  infectionSepticAt: 60,
  /** Below this health the character is incapacitated; at 0 they die. */
  incapacitatedAt: 12,
} as const;

export const ARMOR = {
  /** V1 PROVISIONAL: effective = listed * (base + span * condition/100). */
  conditionBase: 0.5,
  conditionSpan: 0.5,
  /**
   * Each point of effective protection removes this much severity score.
   * Raised alongside the wound curve so armour stays worth carrying now that
   * hits land harder.
   */
  protectionToSeverity: 0.62,
  /** Armor degrades per absorbed hit. */
  conditionLossPerHit: 0.9,
} as const;

export const MEDICINE = {
  /** Medicine units consumed by severity. */
  usage: {
    minor: [0, 1],
    serious: [1, 3],
    critical: [3, 6],
    mortal: [5, 9],
  } as Record<WoundSeverity, [number, number]>,
  /** Med Bay quality bonus to treatment checks. */
  medBayBonus: {
    makeshift: 2,
    basic: 5,
    solid: 9,
    premium: 14,
    luxury: 20,
  } as Record<ShipQuality, number>,
  /** Surgery is required at and above this severity. */
  surgeryRequiredFrom: 'critical' as WoundSeverity,
  /** Natural health regeneration per hour when rested and fed. */
  regenPerHour: 0.35,
  /** Rest quality multiplier on regeneration by quarters quality. */
  quartersRegenMultiplier: {
    makeshift: 0.6,
    basic: 0.85,
    solid: 1,
    premium: 1.2,
    luxury: 1.4,
  } as Record<ShipQuality, number>,
} as const;

// ---------------------------------------------------------------------------
// Combat
// ---------------------------------------------------------------------------

export const COMBAT = {
  meterMax: 100,
  /** Meter gained per tick = base + agility * agilityFactor. */
  meterBase: 6,
  meterAgilityFactor: 0.55,
  /** Handling multipliers on the meter cost of an action. */
  handlingSpeed: {
    veryFast: 0.6,
    fast: 0.8,
    normal: 1,
    slow: 1.3,
    verySlow: 1.7,
  },
  /** Modifier applied when firing outside a weapon's effective range band. */
  wrongRangePenalty: -25,
  /** Cover modifier applied to attacks against a covered target. */
  coverPenalty: -15,
  /** Bonus to attacks when the target is incapacitated. */
  incapacitatedTargetBonus: 25,
  /** Meter knocked off a target on a strong hit. */
  knockbackMeter: 22,
  /** Extra meter granted after an exceptional action. */
  exceptionalMeterBonus: 18,
  /** Chance a hostile flees when badly hurt. */
  hostileFleeHealthFraction: 0.28,
  /**
   * After this many actions a fight that is going nowhere starts pulling
   * hostiles toward the exit, so a stalemate between an untrained crew and a
   * nest of vermin ends in the vermin scattering rather than at the round cap.
   */
  disengageAfterActions: 22,
  disengagePressure: 0.55,

  /** Encounter size scales with the away party rather than being fixed. */
  hostilesPerCrew: 1.5,
  minHostiles: 2,
  maxHostiles: 8,
  /** Escape check base target modifier. */
  escapeModifier: -5,
  /** Wound penalties scale attacker accuracy; see CHECK.woundPenalty. */
  maxRounds: 80,
} as const;

// ---------------------------------------------------------------------------
// Ships
// ---------------------------------------------------------------------------

export const SHIPS = {
  quartersCapacity: {
    makeshift: 1,
    basic: 2,
    solid: 3,
    premium: 4,
    luxury: 5,
  } as Record<ShipQuality, number>,

  /** Functional room counts per size class. */
  roomCounts: {
    compact: [3, 3],
    small: [4, 5],
    medium: [6, 8],
    large: [9, 12],
    massive: [13, 20],
    capital: [21, 40],
  } as Record<ShipSize, [number, number]>,

  mandatoryRooms: ['cockpit', 'quarters', 'engineBay'] as const,

  /** Life support capacity by system quality. */
  lifeSupportCapacity: {
    makeshift: 2,
    basic: 3,
    solid: 5,
    premium: 7,
    luxury: 9,
  } as Record<ShipQuality, number>,

  /** Overcrowding penalties applied per crew member above safe capacity. */
  overcrowdMoralePerHead: 4,
  overcrowdStressPerDayPerHead: 1.5,

  /** Starting ship size split. */
  startingSizeWeights: { compact: 45, small: 55 },

  /** Starting quality distribution per size. */
  startingQualityWeights: {
    compact: { makeshift: 8, basic: 22, solid: 38, premium: 24, luxury: 8 },
    small: { makeshift: 18, basic: 32, solid: 35, premium: 12, luxury: 3 },
  } as Record<'compact' | 'small', Record<ShipQuality, number>>,

  /** Small ships get 1-2 flex rooms beyond the mandatory three. */
  smallFlexRooms: [1, 2] as [number, number],

  /** Condition roll ranges — quality is coherent, condition can be chaotic. */
  startingConditionRange: [28, 96] as [number, number],

  /** Base fuel capacity by size. Sized so a full tank clears the final leg. */
  fuelCapacity: {
    compact: 120,
    small: 180,
    medium: 300,
    large: 520,
    massive: 950,
    capital: 1900,
  } as Record<ShipSize, number>,

  /** Mass factor feeding fuel burn. */
  massFactor: {
    compact: 0.8,
    small: 1,
    medium: 1.5,
    large: 2.4,
    massive: 4,
    capital: 7,
  } as Record<ShipSize, number>,

  /** Engine quality efficiency multiplier (lower burns less). */
  engineEfficiency: {
    makeshift: 1.35,
    basic: 1.15,
    solid: 1,
    premium: 0.87,
    luxury: 0.74,
  } as Record<ShipQuality, number>,

  /** Hangar can carry a compact mission vessel only at this size and above. */
  hangarMissionVesselMinSize: 'large' as ShipSize,
} as const;

// ---------------------------------------------------------------------------
// Fuel and food
// ---------------------------------------------------------------------------

export const FUEL = {
  /**
   * V1 PROVISIONAL baseline — DEVIATES FROM THE SPEC ANCHOR, deliberately.
   *
   * The spec suggested calibrating so an average Small ship burns ~10 credits
   * of fuel per travel hour. Taken literally alongside legs measured in days
   * (the final leg alone is 8-16 days = 192-384 travel hours) that prices a
   * single leg at 1,900-3,400 credits, against a starting purse of 380-2,200
   * and mission pay of 200-600. It also put a full tank at 4 days of range
   * when the very first leg is 3-6 days, so no leg was completable.
   *
   * These values instead target: a full Small tank covers ~19 days, the final
   * leg costs roughly 550 credits of fuel, and the Main Transit Station is the
   * natural place to top up before committing. Raise `creditsPerUnit` toward 8
   * to make fuel bite harder once the credit economy has been playtested.
   */
  baseUnitsPerHour: 0.32,
  creditsPerUnit: 5,
  /** Condition below 100 raises burn. */
  conditionPenaltySpan: 0.45,
  /** Piloting/Navigation skill of the best crew member reduces burn. */
  maxSkillEfficiencyBonus: 0.18,
  /** Emergency reserve below which warnings show. */
  lowFuelWarning: 0.18,
  /** Travel hours per displayed "jump" on the cockpit fuel gauge. */
  hoursPerJump: 12,
} as const;

export const FOOD = {
  /** Crew-days consumed per crew member per day. */
  perCrewPerDay: 1,
  /** Days of hunger before health starts falling. */
  hungerGraceDays: 1,
  moralePerDayStarving: -6,
  stressPerDayStarving: 5,
  healthPerDayStarving: -4,
  /** Cooking skill of the best cook stretches rations. */
  maxCookingEfficiency: 0.22,
  lowFoodWarningDays: 3,
} as const;

// ---------------------------------------------------------------------------
// Morale and stress
// ---------------------------------------------------------------------------

export const MORALE = {
  start: 68,
  min: 0,
  max: 100,
  bands: [
    { min: 80, label: 'High', key: 'high' },
    { min: 60, label: 'Good', key: 'good' },
    { min: 40, label: 'Strained', key: 'strained' },
    { min: 20, label: 'Poor', key: 'poor' },
    { min: 0, label: 'Breaking', key: 'breaking' },
  ] as const,
  /** Check modifier contributed by each morale band. */
  checkModifier: { high: 4, good: 2, strained: 0, poor: -4, breaking: -9 } as Record<
    string,
    number
  >,
  /** Daily drift toward the neutral point when nothing happens. */
  driftPerDay: 0.6,
  neutralPoint: 55,
  /** Morale hit when a crew member dies. */
  crewDeathPenalty: 16,
  crewRecruitBonus: 4,
} as const;

export const STRESS = {
  min: 0,
  max: 100,
  /** Recovery per hour of safe rest. */
  restRecoveryPerHour: 1.4,
  /** Passive recovery per hour otherwise. */
  passiveRecoveryPerHour: 0.12,
  /** Recreation/gym/therapy rooms add this per hour of rest. */
  facilityRecoveryPerHour: { recreation: 0.5, gym: 0.35, therapy: 0.9 } as Record<string, number>,
  /** Stress added by common pressures. */
  fromCombat: 12,
  fromWoundSerious: 10,
  fromCrewDeath: 22,
  fromLeadership: 4,
  /** Composure and Discipline reduce accrual. */
  willReductionPerPoint: 0.02,
  /** Above this, behaviour degrades noticeably. */
  breakingPoint: 80,
} as const;

export const REST = {
  /** Rested points recovered per hour of sleep. */
  restedPerHour: 6,
  /** Rested points lost per waking hour. */
  restedLossPerHour: 1.6,
  /** Chance per rest that a routine event auto-resolves into the log. */
  routineEventChance: 0.45,
  /** Chance a dangerous location interrupts rest. */
  dangerInterruptScale: 0.006,
} as const;

// ---------------------------------------------------------------------------
// Economy
// ---------------------------------------------------------------------------

export const ECONOMY = {
  /** Scarcity bands, from the spec. */
  scarcityBands: {
    surplus: [0.45, 0.7],
    abundant: [0.7, 0.9],
    normal: [0.9, 1.1],
    scarce: [1.15, 1.6],
    critical: [1.6, 2.75],
  } as Record<string, [number, number]>,

  /** Location condition price pressure. */
  conditionMultiplier: {
    prosperous: 0.9,
    normal: 1,
    strained: 1.12,
    rationing: 1.35,
    damaged: 1.28,
    partiallyEvacuated: 1.2,
    abandoned: 1,
  },

  /** Homeworld crisis multiplier ramps as the clock runs down. */
  crisisMaxMultiplier: 2.1,

  /** What a merchant pays relative to what they charge. */
  sellFraction: 0.55,
  /** Negotiation moves price by up to this fraction. */
  maxNegotiationSwing: 0.28,
  /** Merchant attitude range. */
  attitudeRange: [-20, 20] as [number, number],
  /** Item condition scales value. */
  conditionValueBase: 0.35,
  conditionValueSpan: 0.65,

  /** Market restocks after this many hours away. */
  restockHours: 48,
  /** Stock depth by population tier. */
  stockDepthByTier: [4, 7, 10, 14, 18],
} as const;

export const REPAIR = {
  /** Rough parts costs from the spec, used to price repair jobs. */
  costBands: {
    tinyFitting: [1, 3],
    smallLeak: [4, 10],
    wiring: [10, 25],
    minorEngine: [25, 60],
    moderateHull: [50, 120],
    significantEngine: [150, 400],
    majorRebuild: [500, 900],
  } as Record<string, [number, number]>,
  /** Parts needed per condition point restored, scaled by ship size. */
  partsPerConditionPoint: 2.4,
  /** Hours per condition point at Solid engineering. */
  hoursPerConditionPoint: 0.35,
  /** Engineering skill reduces both parts and hours. */
  maxSkillEfficiency: 0.4,
  /** Yard labour charge per condition point when paying a facility. */
  yardCreditsPerPoint: 14,
} as const;

// ---------------------------------------------------------------------------
// XP and progression
// ---------------------------------------------------------------------------

export const XP = {
  /** Cost to raise a skill by 1: max(1, floor(current/10) + 1). */
  skillCostDivisor: 10,
  skillCostOffset: 1,
  /** Cost to raise an attribute by 1: base + current * factor. */
  attributeCostBase: 8,
  attributeCostFactor: 4,

  /** Awards. */
  perCheckSuccess: 1,
  perExceptional: 3,
  perEventResolved: 2,
  perMissionCompleted: 12,
  perCombatVictory: 10,
  perSiteCleared: 8,
  perLocationReached: 15,
  /** Use-based growth is secondary: chance a used skill ticks up on its own. */
  useGrowthChance: 0.06,
  useGrowthCeiling: 55,
} as const;

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------

export const INVENTORY = {
  minSlots: 3,
  maxSlots: 15,
  /** Backpack slot distribution from the spec. */
  slotWeights: [
    { min: 3, max: 5, weight: 15 },
    { min: 6, max: 8, weight: 33 },
    { min: 9, max: 11, weight: 39 },
    { min: 12, max: 14, weight: 10 },
    { min: 15, max: 15, weight: 3 },
  ],
  /** Above this weight an item cannot be backpacked. */
  bulkyWeight: 12,
  /** Default stack ceiling for stackable items. */
  maxStack: 99,
} as const;

// ---------------------------------------------------------------------------
// Travel and events
// ---------------------------------------------------------------------------

export const TRAVEL = {
  /** Base hours per route-day unit; legs are defined in days in the route. */
  hoursPerRouteDay: 24,

  /** V1 PROVISIONAL final leg length: 8..16 days. */
  finalLegDays: [8, 16] as [number, number],

  /** Event density: expected meaningful events per day of travel. */
  meaningfulEventsPerDay: 0.55,
  routineEventsPerDay: 1.5,
  /** Variance multiplier applied to both densities per leg. */
  eventDensityVariance: [0.55, 1.65] as [number, number],
  /** Danger raises meaningful event frequency. */
  dangerEventScale: 0.011,
  /** Minimum gap between meaningful events so they don't stack. */
  minMeaningfulGapHours: 5,
} as const;

export const EVENTS = {
  /** Homeworld rolls a new opportunity roughly this often. */
  homeworldOpportunityPerDay: 3.2,
  /** Opportunities live this long before expiring. */
  opportunityLifetimeHours: [10, 60] as [number, number],
  maxActiveOpportunities: 7,
  /** Chance an autonomous ship event fires per day while the party is away. */
  autonomousShipEventPerDay: 1.1,
  /** Recently used events are suppressed for this many hours. */
  repeatSuppressionHours: 60,
} as const;

// ---------------------------------------------------------------------------
// Recruitment
// ---------------------------------------------------------------------------

export const RECRUIT = {
  searchHours: [3, 8] as [number, number],
  /**
   * Candidates found, weighted by venue and population tier.
   *
   * Raised from an average of ~1.5 per search. Combined with the willingness
   * change below this is what makes recruiting a plan rather than a lottery —
   * necessary once the player starts alone and every hire is load-bearing.
   */
  candidateCountWeights: [
    { count: 0, weight: 8 },
    { count: 1, weight: 27 },
    { count: 2, weight: 35 },
    { count: 3, weight: 22 },
    { count: 4, weight: 8 },
  ],
  /**
   * Starting willingness range, raised from 18-62.
   *
   * People on a world with two extinction clocks running are already looking
   * for a way off. Persuasion should be what closes a deal that is plausible,
   * not what drags an unwilling stranger the whole distance: at 18-62 against
   * a threshold of 70, three maxed persuasion attempts averaged +33 and only
   * 19% of candidates ever signed.
   */
  baseWillingness: [35, 75] as [number, number],
  /** Willingness needed to accept. */
  joinThreshold: 60,
  /** Willingness change per persuasion outcome. */
  persuasionDelta: {
    exceptional: 26,
    success: 15,
    partial: 6,
    failure: -4,
    criticalFailure: -18,
  } as Record<CheckOutcome, number>,
  /** Terms cost reduction per negotiation outcome. */
  negotiationDelta: {
    exceptional: 0.45,
    success: 0.28,
    partial: 0.12,
    failure: 0,
    criticalFailure: -0.2,
  } as Record<CheckOutcome, number>,
  maxPersuadeAttempts: 3,
  maxNegotiateAttempts: 2,
  /** Meeting the terms adds this much willingness. */
  termsMetWillingness: 30,
  /** Crisis on the homeworld makes people more willing to leave. */
  crisisWillingnessBonus: 22,
} as const;

// ---------------------------------------------------------------------------
// Scavenging / sites
// ---------------------------------------------------------------------------

export const SCAVENGE = {
  /** Normal site: 2-5 meaningful nodes. Special sites up to 8. */
  normalNodeRange: [2, 5] as [number, number],
  specialNodeRange: [6, 8] as [number, number],
  specialSiteChance: 0.16,
  /** Chance a node is hidden and needs a discovery check. */
  hiddenNodeChance: 0.3,
  /** Hours per node. */
  nodeHours: [0.75, 3] as [number, number],
  /** Discovery check bonus per intel level. */
  intelBonusPerLevel: 6,
  /**
   * Chance a node holds a combat encounter, scaled by danger. At 0.0045 a
   * danger-50 site threw a fight at roughly six visits in ten, which made
   * scavenging a combat treadmill rather than an exploration loop with combat
   * as one of its risks. This sits deliberately between that and harmless.
   */
  encounterChanceScale: 0.0035,
  /** Loot value scaling by danger. */
  lootDangerScale: 0.012,
  /** Sites regenerate stock after this long. */
  siteRefreshHours: 240,
} as const;

// ---------------------------------------------------------------------------
// Missions
// ---------------------------------------------------------------------------

export const MISSIONS = {
  soloPartySize: 1,
  groupMin: 2,
  groupMaxCapacity: 5,
  /** Missions offered per location visit. */
  offerCount: [1, 3] as [number, number],
  expiryHours: [36, 180] as [number, number],
} as const;

// ---------------------------------------------------------------------------
// Autonomous base ship (Captain AI)
// ---------------------------------------------------------------------------

export const AUTONOMY = {
  /** Decision Making maps to the odds the Captain picks a coherent option. */
  coherenceBase: 0.28,
  coherencePerDecisionPoint: 0.046,
  /** Leadership improves crew cooperation on autonomous resolution. */
  leadershipBonusPerPoint: 0.9,
  /** Trait pull on option scoring. */
  traitWeight: 12,
  /** Stress degrades autonomous performance. */
  stressPenaltyPerPoint: 0.08,
  /** Chance the ship is destroyed outright by an unresolved catastrophic event. */
  catastrophicLossChance: 0.18,
} as const;

// ---------------------------------------------------------------------------
// Assessment fidelity
// ---------------------------------------------------------------------------

export const ASSESSMENT = {
  /** Evaluation thresholds mapping to fidelity tiers. */
  tiers: [
    { minEvaluation: 0, quality: 'veryPoor' as const },
    { minEvaluation: 5, quality: 'poor' as const },
    { minEvaluation: 8, quality: 'moderate' as const },
    { minEvaluation: 11, quality: 'good' as const },
    { minEvaluation: 14, quality: 'excellent' as const },
  ],
  /** Perception contributes half as much as Evaluation. */
  perceptionWeight: 0.5,
  /** Relevant skill contributes to reading a specialised situation. */
  skillWeightPer10: 0.35,
  /** Half-width of the displayed percentage range at Good quality. */
  goodRangeHalfWidth: 9,
  /** Prior intel narrows estimates. */
  intelBonus: 1.2,
} as const;

// ---------------------------------------------------------------------------
// Starting state
// ---------------------------------------------------------------------------

export const START = {
  /**
   * Crew aboard at the start, protagonist included.
   *
   * You begin alone, every run. Safe capacity is never below 1, so a solo start
   * is never in violation on any hull — every additional body is a choice the
   * player makes against a cost they can see on the crew screen.
   *
   * This makes recruitment the first real objective rather than an optional
   * system: a Group Mission needs two people, and the autonomous base ship has
   * nothing to simulate until somebody can be left aboard.
   */
  startingCrew: [1, 1] as [number, number],
  /** Family members generated on the homeworld. */
  familyCount: [2, 4] as [number, number],

  /** Fraction of tank capacity the inherited ship still holds. */
  fuelFraction: [0.45, 0.85] as [number, number],
  /** Crew-days of food aboard — enough for the first leg, not for the route. */
  food: [14, 34] as [number, number],
  medicine: [2, 12] as [number, number],
  repairParts: [12, 90] as [number, number],
  credits: [380, 2200] as [number, number],
  dataCores: [0, 3] as [number, number],

  /**
   * Guaranteed starting kit, so a new run is never unplayable. The knife and
   * vest matter more than they look: without at least one weapon and one piece
   * of armor aboard, the first hostile encounter is a slaughter.
   */
  guaranteedItems: [
    { itemId: 'multitool', qty: 1, condition: [45, 90] as [number, number] },
    { itemId: 'medkit_basic', qty: 2, condition: [70, 100] as [number, number] },
    { itemId: 'repair_kit', qty: 1, condition: [50, 95] as [number, number] },
    { itemId: 'ration_pack', qty: 4, condition: [100, 100] as [number, number] },
    { itemId: 'glow_rods', qty: 3, condition: [100, 100] as [number, number] },
    { itemId: 'utility_knife', qty: 2, condition: [40, 85] as [number, number] },
    { itemId: 'vest_padded', qty: 2, condition: [35, 80] as [number, number] },
  ],

  /** Rolled extras — an inherited ship has whatever the last owner left. */
  randomItemPool: [
    'pistol_holdout',
    'pistol_service',
    'utility_knife',
    'combat_knife',
    'crowbar',
    'pipe_wrench',
    'vest_padded',
    'jacket_reinforced',
    'helmet_industrial',
    'rope_line',
    'handheld_scanner',
    'rebreather',
    'thermal_blanket',
    'lockpick_set',
    'portable_terminal',
    'welding_rig',
    'hull_patch',
    'power_cell',
    'coolant_flask',
    'antibiotics',
    'painkillers',
    'preserved_meal',
    'salvage_scrap',
    'heirloom_watch',
    'personal_effects',
  ],
  randomItemCount: [3, 7] as [number, number],
  /** Ammunition for whatever weapon happened to come with the ship. */
  startingAmmo: [8, 30] as [number, number],
} as const;

// ---------------------------------------------------------------------------
// Save / persistence
// ---------------------------------------------------------------------------

export const SAVE = {
  schemaVersion: 3,
  dbName: 'rtftnf-v1',
  storeName: 'saves',
  autosaveSlot: 'autosave',
  manualSlots: ['slot1', 'slot2', 'slot3'],
  /** Log ring buffer size — keeps mobile memory bounded. */
  maxLogEntries: 400,
  maxDebugRecords: 250,
} as const;

// ---------------------------------------------------------------------------
// Aggregate export so the debug screen can dump the whole tuning layer.
// ---------------------------------------------------------------------------

export const TUNING = {
  TIME,
  HOMEWORLD_CLOCK,
  CHECK,
  ATTRIBUTE_GEN,
  POTENTIAL_CAP,
  SKILLS_TUNING,
  TRAITS_TUNING,
  HEALTH,
  WOUNDS,
  ARMOR,
  MEDICINE,
  COMBAT,
  SHIPS,
  FUEL,
  FOOD,
  MORALE,
  STRESS,
  REST,
  ECONOMY,
  REPAIR,
  XP,
  INVENTORY,
  TRAVEL,
  EVENTS,
  RECRUIT,
  SCAVENGE,
  MISSIONS,
  AUTONOMY,
  ASSESSMENT,
  SAVE,
};

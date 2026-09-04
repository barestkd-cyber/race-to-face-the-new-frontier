/**
 * Turn-based combat with action meters.
 *
 * Meters fill automatically. At 100 a combatant acts, then the meter resets.
 * Slow actions leave a deficit rather than resetting cleanly, which is how
 * weapon handling stays meaningful without a buff/debuff metagame. A ready
 * player-controlled character pauses combat; enemies act automatically.
 *
 * Weapon determines what attack is possible. Character determines how well it
 * is executed.
 */

import { ENCOUNTER_INDEX } from '../content';
import type { EncounterEnemy, EncounterTemplate, EnemyTier } from '../content/contentTypes';
import { performCheck, type CheckContext } from './check';
import { deriveMaxHealth } from './character';
import {
  GRAPPLE_ATTACK,
  UNARMED_ATTACK,
  addItem,
  armorProtection,
  availableAttacks,
  consumeAmmo,
  degradeArmor,
  getItem,
  hasAmmo,
} from './inventory';
import { pushLog } from './log';
import type { Rng } from './rng';
import { applyStress, crewMembers, activeParty, pruneDeadCrew } from './sim';
import { COMBAT, SKILLS_TUNING, XP } from './tuning';
import { applyWound, isIncapacitated, rollHitRegion } from './wounds';
import {
  ATTRIBUTE_KEYS,
  COMBAT_RANGES,
  SKILL_KEYS,
  SKILL_LABELS,
  type AttackProfile,
  type Attributes,
  type Character,
  type CharacterId,
  type CombatAction,
  type CombatRange,
  type CombatState,
  type Combatant,
  type DamageType,
  type GameState,
  type ScreenId,
  type SkillMap,
} from './types';

// ---------------------------------------------------------------------------
// Hostile generation
// ---------------------------------------------------------------------------

/**
 * `health` scales the derived maximum. Without it a weak-tier hull rat rolls
 * roughly 70 health from the standard formula — near-parity with a crew member
 * — and a nuisance encounter turns into a sixty-exchange slog.
 */
const TIER_PROFILE: Record<
  EnemyTier,
  { attr: [number, number]; skill: [number, number]; health: number }
> = {
  weak: { attr: [3, 7], skill: [6, 24], health: 0.45 },
  standard: { attr: [5, 9], skill: [22, 44], health: 0.75 },
  tough: { attr: [7, 11], skill: [40, 62], health: 1 },
  elite: { attr: [9, 13], skill: [58, 82], health: 1.15 },
};

/** Natural weapons for anything that does not carry gear. */
const NATURAL_ATTACKS: Record<string, AttackProfile> = {
  bite: {
    name: 'Bite',
    damageType: 'pierce',
    power: 34,
    skill: 'brawling',
    handling: 'fast',
    ranges: ['engaged'],
  },
  claw: {
    name: 'Claw',
    damageType: 'slash',
    power: 30,
    skill: 'brawling',
    handling: 'veryFast',
    ranges: ['engaged'],
  },
  ram: {
    name: 'Ram',
    damageType: 'blunt',
    power: 38,
    skill: 'striking',
    handling: 'slow',
    ranges: ['engaged'],
  },
};

let hostileCounter = 0;

function makeHostileCharacter(
  spec: EncounterEnemy,
  index: number,
  rng: Rng,
): { character: Character; combatant: Omit<Combatant, 'id'> } {
  const profile = TIER_PROFILE[spec.tier];

  const attributes = {} as Attributes;
  for (const key of ATTRIBUTE_KEYS) {
    attributes[key] = rng.taperedInt(profile.attr[0], profile.attr[1], 2);
  }

  const skills = {} as SkillMap;
  for (const key of SKILL_KEYS) {
    skills[key] = rng.taperedInt(0, Math.round(profile.skill[1] * 0.4), 2);
  }
  // Combat skills get the tier's real range.
  for (const key of ['firearms', 'energyWeapons', 'meleeWeapons', 'striking', 'brawling', 'closeQuarters'] as const) {
    skills[key] = rng.taperedInt(profile.skill[0], profile.skill[1], 2);
  }

  hostileCounter += 1;
  const id: CharacterId = `hst_${hostileCounter.toString(36)}_${rng.int(0, 0xffff).toString(36)}`;
  const maxHealth = Math.max(12, Math.round(deriveMaxHealth(attributes) * profile.health));

  const character: Character = {
    id,
    name: spec.count[1] > 1 ? `${spec.name} ${index + 1}` : spec.name,
    surname: '',
    age: rng.int(19, 52),
    pronouns: 'they/them',
    portraitSeed: rng.int(0, 0xffffff),
    role: 'crew',
    attributes,
    skills,
    potential: {} as never,
    traits: [],
    traitKnowledge: [],
    health: maxHealth,
    maxHealth,
    wounds: [],
    stress: 0,
    rested: 100,
    hungerDays: 0,
    alive: true,
    personalXp: 0,
    lifeHistory: { origin: '', upbringing: '', career: '', formativeEvent: '', notes: [] },
    relationships: {},
    equipment: {},
    backpackSlots: 0,
    backpack: [],
    isPlayer: false,
    aboard: false,
    specSlots: [],
  };

  // Potential is never consulted for hostiles, but the map must exist so any
  // shared code path that reads it does not explode.
  const potential = {} as Record<string, { grade: 'C'; specialization: number }>;
  for (const key of SKILL_KEYS) potential[key] = { grade: 'C', specialization: 1 };
  character.potential = potential as never;

  // Attacks from carried weapons, or natural weapons if unarmed.
  const attacks: AttackProfile[] = [];
  for (const weaponId of spec.weaponIds) {
    const def = getItem(weaponId);
    if (def?.attacks) attacks.push(...def.attacks);
  }
  if (attacks.length === 0) {
    attacks.push(
      rng.pick([NATURAL_ATTACKS.bite!, NATURAL_ATTACKS.claw!, NATURAL_ATTACKS.ram!]),
      UNARMED_ATTACK,
    );
  } else {
    attacks.push(UNARMED_ATTACK);
  }

  const armorDef = spec.armorId ? getItem(spec.armorId) : undefined;

  const drops: { itemId: string; qty: number }[] = [];
  for (const drop of spec.drops ?? []) {
    if (rng.chance(drop.chance)) {
      drops.push({ itemId: drop.itemId, qty: rng.int(drop.qty[0], drop.qty[1]) });
    }
  }
  // Their weapon is often worth taking off the deck.
  for (const weaponId of spec.weaponIds) {
    if (rng.chance(0.35)) drops.push({ itemId: weaponId, qty: 1 });
  }

  return {
    character,
    combatant: {
      characterId: id,
      name: character.name,
      hostile: true,
      meter: rng.int(0, 40),
      range: 'medium',
      inCover: false,
      fled: false,
      portraitSeed: character.portraitSeed,
      attacks,
      protection: armorDef?.protection,
      armorCondition: armorDef ? rng.int(45, 95) : 100,
      drops,
      creditDrop: spec.creditDrop ? rng.int(spec.creditDrop[0], spec.creditDrop[1]) : 0,
    },
  };
}

// ---------------------------------------------------------------------------
// Starting combat
// ---------------------------------------------------------------------------

let combatantCounter = 0;

export function startCombat(
  state: GameState,
  encounterId: string,
  rng: Rng,
  returnTo: ScreenId = 'cockpit',
): CombatState | null {
  const template: EncounterTemplate | undefined = ENCOUNTER_INDEX.get(encounterId);
  if (!template) return null;

  const party = activeParty(state).filter((c) => c.alive && !isIncapacitated(c));
  if (party.length === 0) return null;

  const combatants: Combatant[] = [];
  const hostiles: Record<CharacterId, Character> = {};

  for (const member of party) {
    combatantCounter += 1;
    combatants.push({
      id: `cmb_${combatantCounter.toString(36)}`,
      characterId: member.id,
      name: member.name,
      hostile: false,
      meter: rng.int(0, 45),
      range: template.startRange,
      inCover: false,
      fled: false,
      portraitSeed: member.portraitSeed,
    });
  }

  // Scale the opposition to the party. A swarm template can field eight
  // bodies, which against two people is not a hard fight so much as a long
  // one — and crew size swings from two to six over a campaign, so a fixed
  // count reads completely differently at either end.
  const maxHostiles = Math.max(
    COMBAT.minHostiles,
    Math.min(COMBAT.maxHostiles, party.length * COMBAT.hostilesPerCrew + 1),
  );

  let spawned = 0;
  for (const spec of template.enemies) {
    const wanted = rng.int(spec.count[0], spec.count[1]);
    // Leaders and single elites are never trimmed away; padding goes first.
    const isLeader = spec.count[1] === 1;
    const remaining = maxHostiles - spawned;
    const count = isLeader ? wanted : Math.max(0, Math.min(wanted, remaining));

    for (let i = 0; i < count; i++) {
      const { character, combatant } = makeHostileCharacter(spec, i, rng);
      hostiles[character.id] = character;
      combatantCounter += 1;
      combatants.push({
        ...combatant,
        id: `cmb_${combatantCounter.toString(36)}`,
        range: template.startRange,
      });
      spawned++;
    }
  }

  const combat: CombatState = {
    id: `fight_${rng.int(0, 0xffffff).toString(36)}`,
    title: template.title,
    combatants,
    hostiles,
    activeId: null,
    round: 1,
    log: [template.description],
    returnTo,
    canFlee: template.canFlee,
    encounterId,
  };

  state.combat = combat;
  state.phase = 'combat';
  state.screen = 'combat';
  state.pendingCombat = null;

  pushLog(state, 'combat', `Combat: ${template.title}`);
  for (const member of party) applyStress(member, COMBAT_STRESS_ON_START);

  return combat;
}

const COMBAT_STRESS_ON_START = 6;
const COMBAT_STRESS_ON_END = 12;

// ---------------------------------------------------------------------------
// Character resolution
// ---------------------------------------------------------------------------

/** Merged view of everyone in the fight, for checks and wounds. */
export function combatCharacters(state: GameState): Record<CharacterId, Character> {
  if (!state.combat) return state.characters;
  return { ...state.characters, ...state.combat.hostiles };
}

export function characterFor(state: GameState, combatant: Combatant): Character | undefined {
  return state.combat?.hostiles[combatant.characterId] ?? state.characters[combatant.characterId];
}

export function isActive(state: GameState, combatant: Combatant): boolean {
  const character = characterFor(state, combatant);
  if (!character || !character.alive || combatant.fled) return false;
  return !isIncapacitated(character);
}

// ---------------------------------------------------------------------------
// Meters
// ---------------------------------------------------------------------------

function meterGainPerTick(state: GameState, combatant: Combatant): number {
  const character = characterFor(state, combatant);
  if (!character) return 0;

  let gain = COMBAT.meterBase + character.attributes.agility * COMBAT.meterAgilityFactor;

  // Injuries slow people down.
  const woundDrag = character.wounds.reduce((sum, w) => {
    switch (w.severity) {
      case 'minor':
        return sum + 0.04;
      case 'serious':
        return sum + 0.12;
      case 'critical':
        return sum + 0.26;
      case 'mortal':
        return sum + 0.42;
    }
  }, 0);

  return Math.max(1, gain * (1 - Math.min(0.75, woundDrag)));
}

/**
 * Fill meters until someone is ready. Returns the ready combatant, or null when
 * the fight has resolved.
 */
export function tickCombat(state: GameState, rng: Rng): Combatant | null {
  const combat = state.combat;
  if (!combat) return null;

  const resolution = checkResolution(state);
  if (resolution) {
    endCombat(state, resolution, rng);
    return null;
  }

  let guard = 0;
  while (guard < 4000) {
    guard++;
    const ready = combat.combatants
      .filter((c) => isActive(state, c) && c.meter >= COMBAT.meterMax)
      .sort((a, b) => b.meter - a.meter)[0];

    if (ready) {
      combat.activeId = ready.id;
      if (ready.hostile) {
        runHostileTurn(state, ready, rng);
        combat.activeId = null;
        const after = checkResolution(state);
        if (after) {
          endCombat(state, after, rng);
          return null;
        }
        continue;
      }
      // A player-controlled ready character pauses combat for input.
      return ready;
    }

    for (const combatant of combat.combatants) {
      if (!isActive(state, combatant)) continue;
      // Meters are capped so a long fill cannot show as "109/100" and so a
      // slow weapon's deficit cannot be banked indefinitely.
      combatant.meter = Math.min(
        COMBAT.meterMax + COMBAT.exceptionalMeterBonus,
        combatant.meter + meterGainPerTick(state, combatant),
      );
    }

    // `round` counts actions taken, not meter ticks — the guard below is what
    // stops a stalemate from spinning.
    if (guard > COMBAT.maxRounds * 40) {
      endCombat(state, 'truce', rng);
      return null;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Action availability
// ---------------------------------------------------------------------------

function rangeIndex(range: CombatRange): number {
  return COMBAT_RANGES.indexOf(range);
}

/** Effective range between two combatants is the wider of the two positions. */
export function effectiveRange(a: Combatant, b: Combatant): CombatRange {
  return COMBAT_RANGES[Math.max(rangeIndex(a.range), rangeIndex(b.range))]!;
}

export function attacksFor(state: GameState, combatant: Combatant): AttackProfile[] {
  if (combatant.attacks) return combatant.attacks;
  const character = characterFor(state, combatant);
  if (!character) return [UNARMED_ATTACK];
  return availableAttacks(character, state.ship);
}

export function livingEnemies(state: GameState, combatant: Combatant): Combatant[] {
  if (!state.combat) return [];
  return state.combat.combatants.filter(
    (c) => c.hostile !== combatant.hostile && isActive(state, c),
  );
}

export function availableActions(state: GameState, combatant: Combatant): CombatAction[] {
  const actions: CombatAction[] = [];
  const character = characterFor(state, combatant);
  if (!character) return actions;

  const enemies = livingEnemies(state, combatant);
  const nearest = enemies[0];
  const attacks = attacksFor(state, combatant);

  // Attacks are ranked by what this person can actually do with them, and the
  // hint names the governing skill and its value. A knife you have no training
  // with should not sit above the fists you do know how to use.
  const attackActions: CombatAction[] = [];

  attacks.forEach((attack, index) => {
    const range = nearest ? effectiveRange(combatant, nearest) : combatant.range;
    const inBand = attack.ranges.includes(range);
    const ammoOk = combatant.hostile || hasAmmo(attack, character, state.ship);
    const isMelee = attack.ranges.length === 1 && attack.ranges[0] === 'engaged';
    const skill = character.skills[attack.skill] ?? 0;

    attackActions.push({
      kind: isMelee ? 'strike' : 'attack',
      label: attack.name,
      hint: `${SKILL_LABELS[attack.skill]} ${Math.round(skill)} · ${attack.damageType} · power ${attack.power} · ${attack.ranges.join('/')}`,
      speed: COMBAT.handlingSpeed[attack.handling],
      attackIndex: index,
      targetId: nearest?.id,
      available: Boolean(nearest) && inBand && ammoOk,
      reason: !nearest
        ? 'No target'
        : !inBand
          ? `Not usable at ${range} range`
          : !ammoOk
            ? 'No ammunition'
            : undefined,
    });
  });

  attackActions.sort((a, b) => {
    if (a.available !== b.available) return a.available ? -1 : 1;
    const rate = (action: CombatAction) => {
      const attack = attacks[action.attackIndex ?? 0];
      if (!attack) return 0;
      const skill = character.skills[attack.skill] ?? 0;
      return attack.power * (0.25 + 0.75 * Math.min(1, skill / 55));
    };
    return rate(b) - rate(a);
  });

  actions.push(...attackActions);

  const idx = rangeIndex(combatant.range);

  actions.push({
    kind: 'closeDistance',
    label: idx > 0 ? 'Close Distance' : 'Press the Attack',
    hint: idx > 0 ? `Move to ${COMBAT_RANGES[idx - 1]}` : 'Already engaged',
    speed: 0.8,
    available: idx > 0,
    reason: idx > 0 ? undefined : 'Already engaged',
  });

  actions.push({
    kind: 'createDistance',
    label: 'Create Distance',
    hint: idx < COMBAT_RANGES.length - 1 ? `Move to ${COMBAT_RANGES[idx + 1]}` : 'Already at range',
    speed: 0.9,
    available: idx < COMBAT_RANGES.length - 1,
    reason: idx < COMBAT_RANGES.length - 1 ? undefined : 'Already at maximum range',
  });

  actions.push({
    kind: 'cover',
    label: combatant.inCover ? 'Stay in Cover' : 'Take Cover',
    hint: 'Harder to hit until you act again',
    speed: 0.7,
    available: combatant.range !== 'engaged',
    reason: combatant.range === 'engaged' ? 'Too close for cover' : undefined,
  });

  const medic = character.skills.firstAid ?? 0;
  actions.push({
    kind: 'firstAid',
    label: 'Emergency Aid',
    hint: 'Stabilise a downed crewmate',
    speed: 1.2,
    available:
      medic > 0 &&
      state.combat!.combatants.some(
        (c) => !c.hostile && c.id !== combatant.id && isDowned(state, c),
      ),
    reason: medic <= 0 ? 'No first aid training' : 'Nobody is down',
  });

  actions.push({
    kind: 'escape',
    label: 'Escape',
    hint: 'Break off and run',
    speed: 1,
    available: state.combat!.canFlee,
    reason: state.combat!.canFlee ? undefined : 'There is nowhere to go',
  });

  return actions;
}

function isDowned(state: GameState, combatant: Combatant): boolean {
  const character = characterFor(state, combatant);
  return Boolean(character?.alive && isIncapacitated(character));
}

// ---------------------------------------------------------------------------
// Performing an action
// ---------------------------------------------------------------------------

export interface ActionResult {
  lines: string[];
  ended: boolean;
}

export function performAction(
  state: GameState,
  combatantId: string,
  action: CombatAction,
  targetId: string | undefined,
  rng: Rng,
): ActionResult {
  const combat = state.combat;
  const lines: string[] = [];
  if (!combat) return { lines, ended: true };

  const combatant = combat.combatants.find((c) => c.id === combatantId);
  if (!combatant) return { lines, ended: false };
  const character = characterFor(state, combatant);
  if (!character) return { lines, ended: false };

  // Acting always breaks cover.
  const wasInCover = combatant.inCover;
  combatant.inCover = false;

  switch (action.kind) {
    case 'attack':
    case 'strike': {
      const target =
        combat.combatants.find((c) => c.id === (targetId ?? action.targetId)) ??
        livingEnemies(state, combatant)[0];
      if (!target) break;
      lines.push(...resolveAttack(state, combatant, target, action.attackIndex ?? 0, rng));
      break;
    }
    case 'closeDistance': {
      const idx = rangeIndex(combatant.range);
      if (idx > 0) {
        combatant.range = COMBAT_RANGES[idx - 1]!;
        lines.push(`${combatant.name} closes to ${combatant.range} range.`);
      }
      break;
    }
    case 'createDistance': {
      const idx = rangeIndex(combatant.range);
      if (idx < COMBAT_RANGES.length - 1) {
        combatant.range = COMBAT_RANGES[idx + 1]!;
        lines.push(`${combatant.name} breaks to ${combatant.range} range.`);
      }
      break;
    }
    case 'cover': {
      combatant.inCover = true;
      lines.push(`${combatant.name} takes cover.`);
      break;
    }
    case 'firstAid': {
      lines.push(...resolveFieldAid(state, combatant, rng));
      break;
    }
    case 'escape': {
      lines.push(...resolveEscape(state, combatant, rng));
      break;
    }
    default: {
      lines.push(`${combatant.name} holds position.`);
      break;
    }
  }

  if (wasInCover && action.kind !== 'cover') {
    // Nothing extra — noted only so the intent is legible.
  }

  // Meter reset. A slow action leaves a deficit; a fast one leaves a surplus.
  const speed = action.speed || 1;
  combatant.meter = -(speed - 1) * COMBAT.meterMax * 0.4;

  combat.round += 1;
  if (combat.round > COMBAT.maxRounds) {
    endCombat(state, 'truce', rng);
    return { lines, ended: true };
  }

  pushCombatLines(combat, lines);
  if (combat.log.length > 80) combat.log.splice(0, combat.log.length - 80);
  combat.activeId = null;

  const resolution = checkResolution(state);
  if (resolution) {
    endCombat(state, resolution, rng);
    return { lines, ended: true };
  }

  return { lines, ended: false };
}

function resolveAttack(
  state: GameState,
  attacker: Combatant,
  target: Combatant,
  attackIndex: number,
  rng: Rng,
): string[] {
  const lines: string[] = [];
  const attackerChar = characterFor(state, attacker);
  const targetChar = characterFor(state, target);
  if (!attackerChar || !targetChar) return lines;

  const attacks = attacksFor(state, attacker);
  const attack = attacks[attackIndex] ?? attacks[0] ?? UNARMED_ATTACK;

  // Ammunition is only tracked for the player's crew.
  if (!attacker.hostile && !consumeAmmo(attack, attackerChar, state.ship)) {
    return [`${attacker.name} is out of ammunition for the ${attack.name.toLowerCase()}.`];
  }

  const range = effectiveRange(attacker, target);
  const modifiers = [];
  if (!attack.ranges.includes(range)) {
    modifiers.push({ label: 'Wrong range', value: COMBAT.wrongRangePenalty });
  }
  if (target.inCover) modifiers.push({ label: 'Target in cover', value: COMBAT.coverPenalty });
  if (isIncapacitated(targetChar)) {
    modifiers.push({ label: 'Target is down', value: COMBAT.incapacitatedTargetBonus });
  }

  const context: CheckContext = {
    characters: combatCharacters(state),
    morale: attacker.hostile ? 55 : state.morale,
    hours: state.hours,
  };

  const check = performCheck(
    {
      skill: attack.skill,
      modifiers,
      participantIds: [attacker.characterId],
      label: `${attacker.name}: ${attack.name}`,
    },
    context,
    rng,
  );

  if (state.debug.enabled) {
    state.debug.records.push({
      id: `dbg_atk_${state.debug.records.length}`,
      hours: state.hours,
      label: `Attack: ${attacker.name} -> ${target.name}`,
      detail: { check, attack, range },
    });
  }

  if (check.outcome === 'failure' || check.outcome === 'criticalFailure') {
    lines.push(
      check.outcome === 'criticalFailure'
        ? `${attacker.name} fumbles the ${attack.name.toLowerCase()} badly.`
        : `${attacker.name} misses.`,
    );
    if (check.outcome === 'criticalFailure') {
      // Lose the next action rather than inventing a jam subsystem.
      attacker.meter -= COMBAT.meterMax * 0.5;
    }
    return lines;
  }

  // Hit. Build the wound severity score.
  const region = rollHitRegion(rng);
  const protection = target.hostile
    ? (target.protection?.[attack.damageType] ?? 0) *
      (0.5 + 0.5 * ((target.armorCondition ?? 100) / 100))
    : armorProtection(targetChar, attack.damageType, state.ship);

  const contextModifier = check.outcome === 'partial' ? -10 : 0;

  const result = applyWound(
    targetChar,
    {
      attackPower: attack.power,
      outcome: check.outcome,
      contextModifier,
      armorProtection: protection,
      resilience: targetChar.attributes.resilience,
      region,
    },
    attack.damageType,
    rng,
  );

  lines.push(...result.lines);

  if (!target.hostile) degradeArmor(targetChar, state.ship);
  else if (target.armorCondition !== undefined) {
    target.armorCondition = Math.max(0, target.armorCondition - 1);
  }

  // Occasional meter effects, not a buff economy.
  if (result.severity === 'serious' || result.severity === 'critical') {
    target.meter -= COMBAT.knockbackMeter;
    lines.push(`${target.name} reels.`);
  }
  if (check.outcome === 'exceptional') {
    attacker.meter += COMBAT.exceptionalMeterBonus;
  }

  if (!attacker.hostile) {
    attackerChar.personalXp += check.outcome === 'exceptional' ? XP.perExceptional : XP.perCheckSuccess;
    maybeGrowSkill(attackerChar, attack.skill, rng);
  }

  // Badly hurt hostiles look for the door.
  if (
    target.hostile &&
    targetChar.alive &&
    state.combat?.canFlee !== false &&
    targetChar.health / targetChar.maxHealth < COMBAT.hostileFleeHealthFraction &&
    rng.chance(0.35)
  ) {
    target.fled = true;
    lines.push(`${target.name} breaks and runs.`);
  }

  return lines;
}

function resolveFieldAid(state: GameState, combatant: Combatant, rng: Rng): string[] {
  const combat = state.combat!;
  const medic = characterFor(state, combatant);
  if (!medic) return [];

  const patientCombatant = combat.combatants.find(
    (c) => !c.hostile && c.id !== combatant.id && isDowned(state, c),
  );
  if (!patientCombatant) return [`${combatant.name} has nobody to treat.`];
  const patient = characterFor(state, patientCombatant);
  if (!patient) return [];

  const check = performCheck(
    {
      skill: 'firstAid',
      modifiers: [{ label: 'Under fire', value: COMBAT.wrongRangePenalty / 2 }],
      participantIds: [medic.id],
      label: `${medic.name}: emergency aid`,
    },
    { characters: combatCharacters(state), morale: state.morale, hours: state.hours },
    rng,
  );

  if (check.outcome === 'failure' || check.outcome === 'criticalFailure') {
    return [`${medic.name} cannot stabilise ${patient.name} under fire.`];
  }

  const restored = check.outcome === 'exceptional' ? 22 : check.outcome === 'success' ? 14 : 7;
  patient.health = Math.min(patient.maxHealth, patient.health + restored);
  for (const wound of patient.wounds) {
    if (!wound.treated && wound.bleeding > 0) {
      wound.bleeding = Math.max(0, wound.bleeding * 0.4);
      break;
    }
  }
  return [`${medic.name} drags ${patient.name} back from the edge.`];
}

function resolveEscape(state: GameState, combatant: Combatant, rng: Rng): string[] {
  const character = characterFor(state, combatant);
  if (!character) return [];

  const check = performCheck(
    {
      skill: 'stealth',
      attributes: ['agility', 'endurance'],
      modifiers: [{ label: 'Breaking contact', value: COMBAT.escapeModifier }],
      participantIds: [character.id],
      label: `${combatant.name}: escape`,
    },
    { characters: combatCharacters(state), morale: state.morale, hours: state.hours },
    rng,
  );

  if (check.outcome === 'failure' || check.outcome === 'criticalFailure') {
    return [`${combatant.name} cannot break away.`];
  }

  combatant.fled = true;
  return [`${combatant.name} breaks contact and gets clear.`];
}

function maybeGrowSkill(character: Character, skill: keyof SkillMap, rng: Rng): void {
  if (character.skills[skill] >= XP.useGrowthCeiling) return;
  if (!rng.chance(XP.useGrowthChance)) return;
  const grade = character.potential[skill]?.grade ?? 'C';
  const cap =
    (grade === 'A' ? 100 : grade === 'B' ? 85 : 70) *
    (SKILLS_TUNING.specializationRaisesCap ? (character.potential[skill]?.specialization ?? 1) : 1);
  if (character.skills[skill] < cap) character.skills[skill] += 1;
}

// ---------------------------------------------------------------------------
// Hostile turns
// ---------------------------------------------------------------------------

function runHostileTurn(state: GameState, combatant: Combatant, rng: Rng): void {
  const actions = availableActions(state, combatant).filter((a) => a.available);
  const character = characterFor(state, combatant);
  if (!character || actions.length === 0) {
    combatant.meter = 0;
    return;
  }

  const hurt = character.health / character.maxHealth;
  const canAttackNow = actions.some((a) => a.kind === 'attack' || a.kind === 'strike');

  // Where this combatant's weapons actually work. Moving away from your own
  // effective band is how a fight turns into two sides walking in circles.
  const attacks = attacksFor(state, combatant);
  const enemies = livingEnemies(state, combatant);
  const currentIndex = rangeIndex(enemies[0] ? effectiveRange(combatant, enemies[0]) : combatant.range);
  // Range indices run engaged(0) → close(1) → medium(2) → long(3). A melee
  // weapon tops out at 0, so being at close(1) means they need to come IN.
  const usableIndices = attacks.flatMap((a) => a.ranges.map((r) => rangeIndex(r)));
  const wantsCloser = usableIndices.length > 0 && Math.max(...usableIndices) < currentIndex;
  const wantsFurther = usableIndices.length > 0 && Math.min(...usableIndices) > currentIndex;

  const scored = actions.map((action) => {
    let score = 1;
    switch (action.kind) {
      case 'attack':
      case 'strike':
        // If they can hit you, that is overwhelmingly what they do.
        score = 22;
        break;
      case 'closeDistance':
        score = wantsCloser ? 18 : canAttackNow ? 0.6 : 4;
        break;
      case 'createDistance':
        // Backing off is for people who need the room or are losing.
        score = wantsFurther ? 16 : hurt < 0.4 ? 4 : 0.4;
        break;
      case 'cover':
        score = combatant.inCover ? 0.2 : hurt < 0.55 ? 5 : 1.2;
        break;
      case 'escape': {
        // Wounded hostiles look for the door, and so do unwounded ones once a
        // fight has clearly stopped going anywhere. Nothing here fights to the
        // death out of stubbornness, and a stalemate that grinds to the round
        // cap is worse than either side winning.
        const dragging = Math.max(0, (state.combat?.round ?? 0) - COMBAT.disengageAfterActions);
        score =
          hurt < COMBAT.hostileFleeHealthFraction
            ? 10
            : 0.1 + dragging * COMBAT.disengagePressure;
        break;
      }
      default:
        score = 0.5;
    }
    return { value: action, weight: score };
  });

  const choice = rng.weighted(scored);
  performAction(state, combatant.id, choice, choice.targetId, rng);
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

function checkResolution(state: GameState): CombatState['resolution'] | null {
  const combat = state.combat;
  if (!combat) return null;

  const crewUp = combat.combatants.filter((c) => !c.hostile && isActive(state, c));
  const hostilesUp = combat.combatants.filter((c) => c.hostile && isActive(state, c));

  if (hostilesUp.length === 0) {
    // If your own side already broke and ran, the hostiles leaving afterwards
    // does not turn a rout into a win.
    if (crewUp.length === 0) {
      const anyCrewAlive = combat.combatants.some((c) => {
        if (c.hostile) return false;
        const ch = characterFor(state, c);
        return ch?.alive;
      });
      return anyCrewAlive ? 'fled' : 'defeat';
    }
    // Held the ground. Whether anyone is left to loot depends on how they went.
    const anyHostileFled = combat.combatants.some((c) => c.hostile && c.fled);
    const anyHostileDown = combat.combatants.some((c) => {
      if (!c.hostile) return false;
      const ch = combat.hostiles[c.characterId];
      return !ch?.alive || (!c.fled && !isActive(state, c));
    });
    return anyHostileFled && !anyHostileDown ? 'droveOff' : 'victory';
  }

  if (crewUp.length === 0) {
    const anyFled = combat.combatants.some((c) => !c.hostile && c.fled);
    const anyAlive = combat.combatants.some((c) => {
      if (c.hostile) return false;
      const ch = characterFor(state, c);
      return ch?.alive;
    });
    if (anyFled && anyAlive) return 'fled';
    return 'defeat';
  }
  return null;
}

/**
 * Append to the fight log without stuttering: an action that repeats the
 * previous line verbatim (a failed escape three rounds running) collapses into
 * one line with a count instead of three copies.
 */
function pushCombatLines(combat: CombatState, lines: string[]): void {
  for (const line of lines) {
    const last = combat.log[combat.log.length - 1];
    if (last === line) {
      combat.log[combat.log.length - 1] = `${line} (again)`;
      continue;
    }
    if (last === `${line} (again)`) continue;
    combat.log.push(line);
  }
}

export function endCombat(
  state: GameState,
  resolution: NonNullable<CombatState['resolution']>,
  rng: Rng,
): void {
  const combat = state.combat;
  if (!combat) return;
  // A fight ends exactly once. Without this, your own escape can later be
  // overwritten by a "victory" when the last hostile also runs.
  if (combat.resolution) return;

  combat.resolution = resolution;
  const template = ENCOUNTER_INDEX.get(combat.encounterId);
  const lines: string[] = [];

  if (resolution === 'victory' || resolution === 'droveOff') {
    let credits = 0;
    const container = state.ship && !state.ship.destroyed ? state.ship.cargo : null;

    // You only strip the ones who did not walk away.
    for (const combatant of combat.combatants) {
      if (!combatant.hostile || combatant.fled) continue;
      const character = combat.hostiles[combatant.characterId];
      if (character?.alive && isActive(state, combatant)) continue;
      credits += combatant.creditDrop ?? 0;
      for (const drop of combatant.drops ?? []) {
        const target = container ?? activeParty(state)[0]?.backpack;
        if (target) addItem(target, drop.itemId, drop.qty, rng.int(25, 80), rng);
      }
    }

    if (credits > 0) {
      state.resources.credits += credits;
      lines.push(`Taken from the fallen: ${credits} credits.`);
    }

    state.crewXp += XP.perCombatVictory;
    if (resolution === 'victory') {
      lines.push(template?.victoryText ?? 'The fight is over.');
    } else {
      lines.push('They break contact and leave you the ground.');
    }
  } else if (resolution === 'defeat') {
    lines.push('You are overrun.');
  } else if (resolution === 'fled') {
    lines.push('You break contact and get clear.');
    // Fleeing inside a site means falling back to the way in, not standing in
    // the room you just ran out of.
    if (state.expedition) {
      const site = state.sites[state.expedition.siteId];
      if (site) {
        state.expedition.currentNodeId = site.entranceId;
        lines.push('You fall back to the way in.');
      }
    }
  } else {
    lines.push('The fight breaks off without resolution.');
  }

  // Anyone killed in the fight leaves the roster before anything reads it.
  const dead = pruneDeadCrew(state);
  combat.casualties = dead.map((c) => `${c.name} ${c.surname}`);
  for (const casualty of dead) {
    const line = `${casualty.name} ${casualty.surname} was killed. ${casualty.departedReason ?? ''}`.trim();
    lines.push(line);
    state.morale = Math.max(0, state.morale - 16);
  }

  for (const line of lines) pushLog(state, 'combat', line);
  pushCombatLines(combat, lines);

  // Stress from having been in a fight at all.
  for (const member of crewMembers(state)) applyStress(member, COMBAT_STRESS_ON_END);

  // Drop hostiles; they were never part of the permanent roster.
  combat.hostiles = {};

  state.phase = state.travel ? 'enroute' : state.currentLocationId ? 'atLocation' : 'enroute';
  if (state.expedition) state.phase = 'expedition';

  // Anyone still alive but down stays down until treated.
  if (crewMembers(state).length === 0) {
    state.ending = { kind: 'death', text: 'Nobody walked away.' };
    state.phase = 'dead';
    state.screen = 'gameOver';
    state.combat = null;
    return;
  }
}

export function dismissCombat(state: GameState): void {
  const combat = state.combat;
  if (!combat) return;
  const returnTo = combat.returnTo;
  state.combat = null;
  state.screen = state.expedition ? 'expedition' : returnTo;
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

export const RANGE_LABELS: Record<CombatRange, string> = {
  engaged: 'Engaged',
  close: 'Close',
  medium: 'Medium',
  long: 'Long',
};

export function damageTypeLabel(type: DamageType): string {
  return type[0]!.toUpperCase() + type.slice(1);
}

export function grappleAttack(): AttackProfile {
  return GRAPPLE_ATTACK;
}

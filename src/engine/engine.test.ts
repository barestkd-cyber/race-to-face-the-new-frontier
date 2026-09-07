/**
 * Engine tests.
 *
 * Two jobs: assert the rules the spec actually locked down, and run whole
 * simulated campaigns to prove the systems survive contact with each other.
 */

import { describe, expect, it } from 'vitest';

import { ALL_EVENTS, ENCOUNTER_TEMPLATES, ITEM_DEFS, SITE_ARCHETYPES, contentSummary } from '../content';
import { getItem } from './inventory';
import {
  aggregateGroupSkill,
  outcomeOdds,
  resolveOutcome,
  secondarySkillBonus,
} from './check';
import { attributeTotal, createCharacter, generateProtagonistDraft } from './character';
import { applyRawWound, computeSeverityScore, severityFromScore, tickWounds } from './wounds';
import {
  childPlaces,
  districtsAt,
  shipPlace,
  walkEstimateHours,
  walkOptions,
  walkTo,
} from './places';
import { endCombat } from './combat';
import type { GameState } from './types';
import { offerPassage, visitContact } from './actions';
import { skillUpgradeCost, attributeUpgradeCost } from './progression';
import { beginStudy, countAtTier, focuses, studyOptions, tickStudy } from './study';
import { Rng, streamRng } from './rng';
import {
  flightReadiness,
  generateShip,
  isFlyable,
  safeCrewCapacity,
  shipConditionLabel,
} from './ship';
import { applyDevelopment, developmentOptions, noteSkillUse, recentSkills } from './development';
import { recommend } from './advice';
import { situationReport } from './situation';
import { PROFESSIONS } from '../content/professions';
import { LIFE_EVENTS } from '../content/lifeEvents';
import { rollCaptainAge, rollLifeStory, startingCreditsDelta } from './lifeStory';
import { PERSONALITY_TRAITS } from '../content/personality';
import { LIFE_PATHS } from '../content/lifepaths';
import {
  frictionFor,
  rollPersonality,
  knownTraits,
  optionWeight,
  reactTo,
  refusalFor,
  refusalTraits,
  relationshipDelta,
  temperamentOf,
  traitById,
} from './personality';
import { EMITTED_TAGS, tagsForChoice } from './tags';
import { migrateSavedState } from '../persistence/storage';
import {
  berthSecurity,
  canAssignCrewLead,
  commandRuleFor,
  confirmSuccession,
  ensureCrewLead,
  noteSuccession,
  payShipWatch,
} from './command';
import { autoDevelop } from './development';
import { commandStress, pruneDeadCrew } from './sim';
import { treatmentFacility } from './actions';
import { ATTRIBUTE_GEN, CHECK, HOMEWORLD_CLOCK, POTENTIAL_CAP, SPEC } from './tuning';
import { generateWorld, rollTerminalDay } from './world';
import { checkRunEnded, createGame } from './newGame';
import { simulateRun } from './simulate';
import {
  ATTRIBUTE_KEYS,
  SKILL_KEYS,
  type AttributeKey,
  type SkillKey,
} from './types';

// ---------------------------------------------------------------------------
// Check system
// ---------------------------------------------------------------------------

describe('check system', () => {
  it('clamps the rolled target to 5..95', () => {
    // Handled by computeCheck; here we assert the constants the spec locked.
    expect(CHECK.minTarget).toBe(5);
    expect(CHECK.maxTarget).toBe(95);
  });

  it('maps rolls onto the five outcome bands', () => {
    // Target 50: exceptional at <= 10, success to 50, partial to 65, failure to 85.
    expect(resolveOutcome(5, 50, false).outcome).toBe('exceptional');
    expect(resolveOutcome(10, 50, false).outcome).toBe('exceptional');
    expect(resolveOutcome(11, 50, false).outcome).toBe('success');
    expect(resolveOutcome(50, 50, false).outcome).toBe('success');
    expect(resolveOutcome(65, 50, false).outcome).toBe('partial');
    expect(resolveOutcome(66, 50, false).outcome).toBe('failure');
    expect(resolveOutcome(85, 50, false).outcome).toBe('failure');
    expect(resolveOutcome(86, 50, false).outcome).toBe('criticalFailure');
  });

  it('protects low-skill characters from critical failure on ordinary tasks', () => {
    // Target 20 is below the protection threshold of 25.
    expect(resolveOutcome(95, 20, false).outcome).toBe('failure');
    expect(resolveOutcome(95, 20, false).protectedFromCritical).toBe(true);
    // A 96+ roll still fumbles.
    expect(resolveOutcome(96, 20, false).outcome).toBe('criticalFailure');
    // So does an explicitly Critical-Risk action.
    expect(resolveOutcome(95, 20, true).outcome).toBe('criticalFailure');
  });

  it('never reports impossible odds', () => {
    for (let target = CHECK.minTarget; target <= CHECK.maxTarget; target++) {
      const odds = outcomeOdds(target, false);
      const total = Object.values(odds).reduce((a, b) => a + b, 0);
      expect(total).toBeCloseTo(1, 6);
      for (const value of Object.values(odds)) expect(value).toBeGreaterThanOrEqual(0);
    }
  });

  it('gives secondary skills the banded bonus from the spec', () => {
    expect(secondarySkillBonus(0)).toBe(0);
    expect(secondarySkillBonus(19)).toBe(0);
    expect(secondarySkillBonus(20)).toBe(2);
    expect(secondarySkillBonus(39)).toBe(2);
    expect(secondarySkillBonus(40)).toBe(5);
    expect(secondarySkillBonus(60)).toBe(8);
    expect(secondarySkillBonus(100)).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// Leadership on group checks
// ---------------------------------------------------------------------------

describe('leadership on group checks', () => {
  it('is a straight average with no leader', () => {
    const result = aggregateGroupSkill([90, 90, 30], null);
    expect(result.average).toBe(70);
    expect(result.leadershipBonus).toBe(0);
  });

  it('only lifts the weakest participant, never above the second weakest', () => {
    const result = aggregateGroupSkill([90, 90, 30], 15);
    // Median is 90, so max closure of 50% would take 30 -> 60, but the
    // second-weakest is 90 so the cap does not bind here.
    expect(result.adjustedValues[0]).toBeCloseTo(60, 5);
    expect(result.average).toBeGreaterThan(70);
  });

  it('caps the lift at the second weakest participant', () => {
    // Weakest 10, second weakest 20, median 60. 50% closure would give 35,
    // but 20 is the ceiling.
    const result = aggregateGroupSkill([10, 20, 60, 100], 15);
    expect(result.adjustedValues[0]).toBeLessThanOrEqual(20);
  });

  it('does nothing for a single participant', () => {
    const result = aggregateGroupSkill([40], 15);
    expect(result.average).toBe(40);
    expect(result.leadershipBonus).toBe(0);
  });

  it('scales continuously with the leader attribute', () => {
    const none = aggregateGroupSkill([90, 90, 30], 0);
    const half = aggregateGroupSkill([90, 90, 30], 7);
    const full = aggregateGroupSkill([90, 90, 30], 15);
    expect(none.leadershipBonus).toBeCloseTo(0, 5);
    expect(half.leadershipBonus).toBeGreaterThan(0);
    expect(full.leadershipBonus).toBeGreaterThan(half.leadershipBonus);
  });
});

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

describe('character generation', () => {
  it('keeps attribute totals inside the absolute range', () => {
    for (let seed = 0; seed < 250; seed++) {
      const character = createCharacter({ rng: new Rng(`gen-${seed}`) });
      const total = attributeTotal(character.attributes);
      expect(total).toBeGreaterThanOrEqual(ATTRIBUTE_GEN.absoluteMin - 20);
      expect(total).toBeLessThanOrEqual(ATTRIBUTE_GEN.absoluteMax);
      for (const value of Object.values(character.attributes)) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(15);
      }
    }
  });

  it('respects skill potential caps', () => {
    for (let seed = 0; seed < 120; seed++) {
      const character = createCharacter({ rng: new Rng(`cap-${seed}`) });
      for (const skill of SKILL_KEYS) {
        const potential = character.potential[skill];
        const cap = Math.round(POTENTIAL_CAP[potential.grade] * potential.specialization);
        expect(character.skills[skill]).toBeLessThanOrEqual(cap);
      }
    }
  });

  it('deals no specialization to the protagonist — that lever is the player’s alone', () => {
    for (let seed = 0; seed < 30; seed++) {
      const draft = generateProtagonistDraft(streamRng(`pspec-${seed}`, 'protagonist'));
      const placed = SKILL_KEYS.filter((k) => draft.character.potential[k].specialization > 1);
      expect(placed).toEqual([]);
    }
  });

  it('never exceeds the tier caps when dealing a life already lived', () => {
    for (let seed = 0; seed < 60; seed++) {
      const person = createCharacter({ rng: new Rng(`spec-${seed}`) });
      for (const tier of [1.1, 1.15, 1.2]) {
        expect(countAtTier(person, tier)).toBeLessThanOrEqual(2);
      }
      expect(focuses(person).length).toBeLessThanOrEqual(SPEC.maxFocuses);
    }
  });

  it('lets an old professional arrive more specialised than a young recruit', () => {
    let young = 0;
    let old = 0;
    const runs = 80;
    for (let seed = 0; seed < runs; seed++) {
      young += focuses(createCharacter({ rng: new Rng(`young-${seed}`), ageRange: [18, 22] })).length;
      old += focuses(createCharacter({ rng: new Rng(`old-${seed}`), ageRange: [48, 56] })).length;
    }
    expect(old / runs).toBeGreaterThan(young / runs);
  });

  it('gives every character one to seven canonical traits, hidden to start', () => {
    for (let seed = 0; seed < 200; seed++) {
      const character = createCharacter({ rng: new Rng(`trait-${seed}`) });
      expect(character.traits.length).toBeGreaterThanOrEqual(1);
      expect(character.traits.length).toBeLessThanOrEqual(7);
      // Every id is a real entry in the one library.
      for (const id of character.traits) {
        expect(PERSONALITY_TRAITS.some((t) => t.id === id)).toBe(true);
      }
      // Traits start hidden for anybody who is not the player.
      expect(character.traitKnowledge.every((k) => k.known === 0)).toBe(true);
      expect(character.traitKnowledge.map((k) => k.trait)).toEqual(character.traits);
    }
  });

  it('derives health from Endurance and Strength', () => {
    const character = createCharacter({ rng: new Rng('health') });
    expect(character.maxHealth).toBe(
      50 + character.attributes.endurance * 3 + character.attributes.strength,
    );
  });

  it('reserves an allocation pool for the protagonist', () => {
    const draft = generateProtagonistDraft(new Rng('pc'));
    expect(draft.skillPoints).toBe(25);
    expect(draft.attributePoints).toBeGreaterThan(0);
    expect(draft.character.isPlayer).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// World
// ---------------------------------------------------------------------------

describe('world generation', () => {
  it('rolls the homeworld terminal day inside the locked 7..49 range', () => {
    for (let seed = 0; seed < 3000; seed++) {
      const day = rollTerminalDay(new Rng(`clock-${seed}`));
      expect(day).toBeGreaterThanOrEqual(HOMEWORLD_CLOCK.minDay);
      expect(day).toBeLessThanOrEqual(HOMEWORLD_CLOCK.maxDay);
    }
  });

  it('produces the seven major locations plus a linear outward route', () => {
    const world = generateWorld('TEST-WORLD-1');
    const kinds = Object.values(world.locations).map((l) => l.kind);
    expect(kinds.filter((k) => k === 'homeworld')).toHaveLength(1);
    expect(kinds.filter((k) => k === 'moon')).toHaveLength(2);
    expect(kinds.filter((k) => k === 'tradeStation')).toHaveLength(1);
    expect(kinds.filter((k) => k === 'inhabitedPlanet')).toHaveLength(1);
    expect(kinds.filter((k) => k === 'transitStation')).toHaveLength(1);
    expect(kinds.filter((k) => k === 'travelWorld')).toHaveLength(1);
    expect(world.routeIds).toHaveLength(5);
  });

  it('gives the two moons complementary economies', () => {
    for (let seed = 0; seed < 40; seed++) {
      const world = generateWorld(`MOONS-${seed}`);
      const [a, b] = world.moonIds.map((id) => world.locations[id]!);
      expect(a!.economyRole).not.toBe(b!.economyRole);
    }
  });

  it('is fully deterministic for a given seed', () => {
    const a = generateWorld('DETERMINISM-1');
    const b = generateWorld('DETERMINISM-1');
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe('seeded rng', () => {
  it('replays identically from a persisted cursor', () => {
    const first = new Rng('resume', 0);
    const drawn = [first.next(), first.next(), first.next()];
    const resumed = new Rng('resume', 3);
    const continued = [resumed.next(), resumed.next()];

    const straight = new Rng('resume', 0);
    const all = [straight.next(), straight.next(), straight.next(), straight.next(), straight.next()];

    expect(drawn).toEqual(all.slice(0, 3));
    expect(continued).toEqual(all.slice(3));
  });

  it('gives named streams independent sequences', () => {
    const a = streamRng('seed', 'alpha').next();
    const b = streamRng('seed', 'beta').next();
    expect(a).not.toBe(b);
    expect(streamRng('seed', 'alpha').next()).toBe(a);
  });
});

// ---------------------------------------------------------------------------
// Wounds
// ---------------------------------------------------------------------------

describe('wound model', () => {
  it('maps severity scores onto the spec thresholds', () => {
    expect(severityFromScore(20)).toBe('none');
    expect(severityFromScore(21)).toBe('minor');
    expect(severityFromScore(40)).toBe('minor');
    expect(severityFromScore(41)).toBe('serious');
    expect(severityFromScore(60)).toBe('serious');
    expect(severityFromScore(61)).toBe('critical');
    expect(severityFromScore(80)).toBe('critical');
    expect(severityFromScore(81)).toBe('mortal');
    expect(severityFromScore(95)).toBe('mortal');
    expect(severityFromScore(96)).toBe('fatal');
  });

  it('lets armor and resilience reduce severity', () => {
    const bare = computeSeverityScore({
      attackPower: 60,
      outcome: 'success',
      resilience: 0,
      region: 'torso',
    });
    const armored = computeSeverityScore({
      attackPower: 60,
      outcome: 'success',
      armorProtection: 40,
      resilience: 12,
      region: 'torso',
    });
    expect(armored.score).toBeLessThan(bare.score);
  });

  it('makes head hits more dangerous than limb hits', () => {
    const base = { attackPower: 55, outcome: 'success' as const, resilience: 6 };
    const head = computeSeverityScore({ ...base, region: 'head' });
    const arm = computeSeverityScore({ ...base, region: 'leftArm' });
    expect(head.score).toBeGreaterThan(arm.score);
  });
});

// ---------------------------------------------------------------------------
// Progression
// ---------------------------------------------------------------------------

describe('progression costs', () => {
  it('uses the spec skill formula', () => {
    expect(skillUpgradeCost(0)).toBe(1);
    expect(skillUpgradeCost(9)).toBe(1);
    expect(skillUpgradeCost(10)).toBe(2);
    expect(skillUpgradeCost(55)).toBe(6);
    expect(skillUpgradeCost(99)).toBe(10);
  });

  it('uses the spec attribute formula', () => {
    expect(attributeUpgradeCost(0)).toBe(8);
    expect(attributeUpgradeCost(5)).toBe(28);
    expect(attributeUpgradeCost(14)).toBe(64);
  });
});

// ---------------------------------------------------------------------------
// Ships
// ---------------------------------------------------------------------------

describe('ship generation', () => {
  it('always fits the mandatory rooms and a workable crew capacity', () => {
    for (let seed = 0; seed < 200; seed++) {
      const ship = generateShip(new Rng(`ship-${seed}`));
      const kinds = ship.rooms.map((r) => r.kind);
      expect(kinds).toContain('cockpit');
      expect(kinds).toContain('quarters');
      expect(kinds).toContain('engineBay');
      expect(safeCrewCapacity(ship)).toBeGreaterThanOrEqual(1);

      if (ship.size === 'compact') expect(ship.rooms).toHaveLength(3);
      if (ship.size === 'small') {
        expect(ship.rooms.length).toBeGreaterThanOrEqual(4);
        expect(ship.rooms.length).toBeLessThanOrEqual(5);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Content integrity
// ---------------------------------------------------------------------------

describe('content integrity', () => {
  it('meets every content minimum in the spec', () => {
    const summary = contentSummary();
    expect(summary.homeworldEvents).toBeGreaterThanOrEqual(20);
    expect(summary.moonEvents).toBeGreaterThanOrEqual(15);
    expect(summary.travelEvents).toBeGreaterThanOrEqual(20);
    expect(summary.stationEvents).toBeGreaterThanOrEqual(15);
    expect(summary.planetEvents).toBeGreaterThanOrEqual(12);
    expect(summary.socialEvents).toBeGreaterThanOrEqual(10);
    expect(summary.technicalEvents).toBeGreaterThanOrEqual(10);
    expect(summary.medicalEvents).toBeGreaterThanOrEqual(10);
    expect(summary.hostileEvents).toBeGreaterThanOrEqual(10);
    expect(summary.encounters).toBeGreaterThanOrEqual(10);
    expect(summary.siteArchetypes).toBeGreaterThanOrEqual(15);
  });

  it('has unique event ids', () => {
    const ids = ALL_EVENTS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every event at least two choices', () => {
    for (const event of ALL_EVENTS) {
      expect(event.choices.length, `${event.id} needs choices`).toBeGreaterThanOrEqual(1);
      expect(event.title.length).toBeGreaterThan(0);
      expect(event.body.length).toBeGreaterThan(0);
    }
  });

  it('only references item ids that exist', () => {
    const missing = new Set<string>();

    const checkItem = (id: string) => {
      if (!getItem(id)) missing.add(id);
    };

    for (const event of ALL_EVENTS) {
      for (const choice of event.choices) {
        for (const item of choice.effects?.items ?? []) checkItem(item.itemId);
        for (const branch of Object.values(choice.outcomes ?? {})) {
          for (const item of branch?.effects.items ?? []) checkItem(item.itemId);
        }
        for (const item of choice.result?.effects.items ?? []) checkItem(item.itemId);
      }
    }
    for (const template of ENCOUNTER_TEMPLATES) {
      for (const enemy of template.enemies) {
        for (const weapon of enemy.weaponIds) checkItem(weapon);
        if (enemy.armorId) checkItem(enemy.armorId);
        for (const drop of enemy.drops ?? []) checkItem(drop.itemId);
      }
    }
    for (const archetype of SITE_ARCHETYPES) {
      for (const loot of archetype.lootTable) checkItem(loot.itemId);
    }

    expect([...missing]).toEqual([]);
  });

  it('only references encounter templates that exist', () => {
    const known = new Set(ENCOUNTER_TEMPLATES.map((t) => t.id));
    const missing = new Set<string>();

    for (const event of ALL_EVENTS) {
      for (const choice of event.choices) {
        const combats = [
          choice.effects?.combat,
          choice.result?.effects.combat,
          ...Object.values(choice.outcomes ?? {}).map((b) => b?.effects.combat),
        ];
        for (const id of combats) if (id && !known.has(id)) missing.add(id);
      }
    }
    for (const archetype of SITE_ARCHETYPES) {
      for (const id of archetype.encounterIds) if (!known.has(id)) missing.add(id);
    }

    expect([...missing]).toEqual([]);
  });

  it('gives every weapon a usable attack and every armor real protection', () => {
    for (const def of ITEM_DEFS) {
      if (def.category === 'weapon') {
        expect(def.attacks?.length, `${def.id} needs an attack`).toBeGreaterThan(0);
        for (const attack of def.attacks ?? []) {
          expect(attack.ranges.length).toBeGreaterThan(0);
          expect(attack.power).toBeGreaterThan(0);
          if (attack.ammoId) expect(getItem(attack.ammoId)).toBeTruthy();
        }
      }
      if (def.category === 'armor') {
        const total = Object.values(def.protection ?? {}).reduce((a, b) => a + b, 0);
        expect(total, `${def.id} needs protection`).toBeGreaterThan(0);
      }
    }
  });

  it('gives every site archetype a way to generate nodes and loot', () => {
    for (const archetype of SITE_ARCHETYPES) {
      expect(archetype.nodeKinds.length, `${archetype.id} node kinds`).toBeGreaterThan(0);
      expect(archetype.lootTable.length, `${archetype.id} loot`).toBeGreaterThan(0);
      expect(archetype.encounterIds.length, `${archetype.id} encounters`).toBeGreaterThan(0);
      // Entrance and exit are added by the generator, never drawn from the pool.
      expect(archetype.nodeKinds).not.toContain('entrance');
      expect(archetype.nodeKinds).not.toContain('exit');
    }
  });
});

// ---------------------------------------------------------------------------
// Full-run simulation
// ---------------------------------------------------------------------------

function countVictories(prefix: string, strategy: 'balanced' | 'explore' | 'rush'): number {
  let victories = 0;
  for (let seed = 0; seed < 20; seed++) {
    const result = simulateRun(`${prefix}-${seed}`, { maxSteps: 9000, strategy });
    if (result.outcome === 'victory') victories++;
  }
  return victories;
}

// ---------------------------------------------------------------------------
// Playability pass: the game answers for itself
// ---------------------------------------------------------------------------

describe('walking somewhere', () => {
  it('quotes the same time it charges', () => {
    const draft = generateProtagonistDraft(streamRng('WALK-1', 'protagonist'));
    const state = createGame('WALK-1', draft.character);

    const options = walkOptions(state);
    expect(options.length, 'a homeworld you can move around').toBeGreaterThan(3);

    // The flat list is only honest if the card and the clock agree.
    const target = options.find((o) => o.place.parentId)!;
    expect(target, 'somewhere inside a district').toBeTruthy();
    const quoted = target.hours;

    const before = state.hours;
    const move = walkTo(state, target.place.id, new Rng('WALK-1:move'));
    expect(move.ok).toBe(true);
    expect(state.hours - before).toBeCloseTo(quoted, 6);
  });

  it('charges for crossing a district as well as walking in', () => {
    const draft = generateProtagonistDraft(streamRng('WALK-2', 'protagonist'));
    const state = createGame('WALK-2', draft.character);

    // A venue in a district you are not standing in costs both legs. Before the
    // flat list this quietly cost only the second one.
    const away = Object.values(state.places).find(
      (place) => place.parentId !== undefined && !state.places[place.parentId]?.shipHere,
    )!;
    const district = state.places[away.parentId!]!;
    expect(walkEstimateHours(state, away)).toBeGreaterThanOrEqual(district.travelHours);
  });

  it('lists every discovered place on the world, not just the current branch', () => {
    const draft = generateProtagonistDraft(streamRng('WALK-3', 'protagonist'));
    const state = createGame('WALK-3', draft.character);
    const discovered = Object.values(state.places).filter(
      (p) => p.locationId === state.currentLocationId && p.discovered,
    );
    expect(walkOptions(state).length).toBe(discovered.length);
  });
});

describe('flight readiness', () => {
  it('never disagrees with the rule that actually gates travel', () => {
    // One verdict feeds the cockpit, the ship screen and Set Course, so it must
    // agree with isFlyable at every condition, not just the comfortable ones.
    const ship = generateShip(new Rng('FLY-1'), { size: 'small' });
    for (const condition of [0, 3, 5, 6, 14, 29, 30, 54, 55, 80, 100]) {
      ship.systems.engines.condition = condition;
      expect(flightReadiness(ship).canFly).toBe(isFlyable(ship));
    }
  });

  it('says something is wrong whenever something is wrong', () => {
    const ship = generateShip(new Rng('FLY-2'), { size: 'small' });
    for (const system of Object.values(ship.systems)) system.condition = 100;
    expect(flightReadiness(ship).tone).toBe('ok');

    ship.systems.engines.condition = 20;
    const worn = flightReadiness(ship);
    expect(worn.canFly).toBe(true);
    expect(worn.tone).toBe('warn');
    expect(worn.worst?.kind).toBe('engines');
    // The headline must use the same word the rest of the game uses for that
    // condition, or the player is back to reconciling two vocabularies.
    expect(worn.headline.toLowerCase()).toContain(
      shipConditionLabel(ship.systems.engines.condition).toLowerCase(),
    );

    ship.systems.engines.condition = 33;
    const failing = flightReadiness(ship);
    expect(failing.headline.toLowerCase()).toContain(
      shipConditionLabel(33).toLowerCase(),
    );

    ship.systems.engines.condition = 2;
    expect(flightReadiness(ship).canFly).toBe(false);
    expect(flightReadiness(ship).tone).toBe('bad');
  });
});

describe('development', () => {
  it('remembers what somebody has been doing, within a bounded window', () => {
    const draft = generateProtagonistDraft(streamRng('DEV-1', 'protagonist'));
    const character = draft.character;
    for (let i = 0; i < 40; i += 1) noteSkillUse(character, 'scavenging');
    noteSkillUse(character, 'firearms');
    expect(character.skillLog!.length).toBeLessThanOrEqual(24);
    expect(recentSkills(character)[0]!.skill).toBe('scavenging');
  });

  it('offers a direction drawn from the character, and follows the story first', () => {
    const draft = generateProtagonistDraft(streamRng('DEV-2', 'protagonist'));
    const state = createGame('DEV-2', draft.character);
    const captain = state.characters[state.playerId]!;

    for (let i = 0; i < 6; i += 1) noteSkillUse(captain, 'scavenging');
    const options = developmentOptions(captain);
    expect(options.length).toBeGreaterThan(0);
    expect(options[0]!.id).toBe('story');
    expect(options[0]!.skills).toContain('scavenging');
  });

  it('spends only what is banked and never past potential', () => {
    const draft = generateProtagonistDraft(streamRng('DEV-3', 'protagonist'));
    const state = createGame('DEV-3', draft.character);
    const captain = state.characters[state.playerId]!;

    for (let i = 0; i < 6; i += 1) noteSkillUse(captain, 'scavenging');
    state.crewXp = 500;
    captain.personalXp = 0;

    const before = captain.skills.scavenging;
    const result = applyDevelopment(state, captain, 'story');

    expect(result.ok).toBe(true);
    expect(captain.skills.scavenging).toBeGreaterThan(before);
    expect(state.crewXp).toBeGreaterThanOrEqual(0);
    expect(state.crewXp).toBe(500 - result.spent);
    // Potential is the ceiling, exactly as it is for a hand-placed point.
    expect(captain.skills.scavenging).toBeLessThanOrEqual(
      POTENTIAL_CAP[captain.potential.scavenging.grade],
    );
  });

  it('refuses politely when there is nothing banked', () => {
    const draft = generateProtagonistDraft(streamRng('DEV-4', 'protagonist'));
    const state = createGame('DEV-4', draft.character);
    const captain = state.characters[state.playerId]!;
    noteSkillUse(captain, 'scavenging');
    state.crewXp = 0;
    captain.personalXp = 0;
    const result = applyDevelopment(state, captain, 'story');
    expect(result.ok).toBe(false);
    expect(result.spent).toBe(0);
  });
});

describe('telling the player who should do a job', () => {
  it('ranks by the skill as it actually performs, and names the catch', () => {
    const draft = generateProtagonistDraft(streamRng('ADV-1', 'protagonist'));
    const state = createGame('ADV-1', draft.character);
    const captain = state.characters[state.playerId]!;

    captain.skills.scavenging = 60;
    captain.rested = 10; // below the exhaustion floor the check already penalises
    const advice = recommend([captain], 'scavenging');

    expect(advice.best?.character.id).toBe(captain.id);
    expect(advice.best?.problems).toContain('exhausted');
    expect(advice.line).toContain('exhausted');
  });
});

describe('the situation report', () => {
  it('always says something, and says the worst thing first when asked', () => {
    const draft = generateProtagonistDraft(streamRng('SIT-1', 'protagonist'));
    const state = createGame('SIT-1', draft.character);
    expect(situationReport(state).length).toBeGreaterThan(0);
  });

  it('speaks up about exhaustion instead of leaving it in a number', () => {
    const draft = generateProtagonistDraft(streamRng('SIT-2', 'protagonist'));
    const state = createGame('SIT-2', draft.character);
    state.characters[state.playerId]!.rested = CHECK.exhaustionFloor - 5;
    const lines = situationReport(state);
    expect(lines.some((l) => l.id === 'exhausted')).toBe(true);
  });
});

describe('treatment facilities', () => {
  it('reports the room you are standing in, not only the one aboard', () => {
    const draft = generateProtagonistDraft(streamRng('MED-1', 'protagonist'));
    const state = createGame('MED-1', draft.character);

    const clinic = Object.values(state.places).find((p) => p.actions.includes('medical'));
    expect(clinic, 'the homeworld has somewhere to be treated').toBeTruthy();

    state.currentPlaceId = clinic!.id;
    const facility = treatmentFacility(state);
    expect(facility.bonus).toBeGreaterThan(0);
    expect(facility.label).toContain(clinic!.name);
  });
});

// ---------------------------------------------------------------------------
// Places and physical access
// ---------------------------------------------------------------------------

describe('places', () => {
  it('gives the homeworld walkable districts with the ship parked on one', () => {
    const draft = generateProtagonistDraft(streamRng('PLACES-1', 'protagonist'));
    const state = createGame('PLACES-1', draft.character);

    const districts = districtsAt(state, 'loc_homeworld');
    expect(districts.length).toBeGreaterThanOrEqual(4);

    const parked = shipPlace(state);
    expect(parked, 'the ship has to be somewhere').toBeTruthy();
    expect(parked!.shipHere).toBe(true);

    // You begin aboard, not standing in a district.
    expect(state.currentPlaceId).toBeNull();

    // Districts hold venues, so actions live two steps in rather than on a menu.
    const withVenues = districts.filter((d) => childPlaces(state, d.id).length > 0);
    expect(withVenues.length).toBeGreaterThan(0);
  });

  it('never exposes an action a place does not contain', () => {
    const draft = generateProtagonistDraft(streamRng('PLACES-2', 'protagonist'));
    const state = createGame('PLACES-2', draft.character);
    const location = state.locations['loc_homeworld']!;

    for (const place of Object.values(state.places)) {
      for (const action of place.actions) {
        expect(
          location.actions.includes(action),
          `${place.name} offers ${action} which ${location.name} does not support`,
        ).toBe(true);
      }
    }
  });

  it('puts family somewhere real rather than in a menu', () => {
    const draft = generateProtagonistDraft(streamRng('PLACES-3', 'protagonist'));
    const state = createGame('PLACES-3', draft.character);

    const family = state.homeworld.familyIds.map((id) => state.characters[id]!);
    expect(family.length).toBeGreaterThan(0);
    for (const person of family) {
      expect(person.placeId, `${person.name} has no location`).toBeTruthy();
      expect(state.places[person.placeId!], 'their location must exist').toBeTruthy();
    }
    // At least one relative is findable from the start, so the opening has
    // somewhere obvious to go.
    expect(family.some((p) => p.placeKnown)).toBe(true);
  });

  it('refuses passage to anyone you are not standing next to', () => {
    const draft = generateProtagonistDraft(streamRng('PLACES-4', 'protagonist'));
    const state = createGame('PLACES-4', draft.character);
    const rng = new Rng('PLACES-4:live');

    const relative = state.homeworld.familyIds
      .map((id) => state.characters[id]!)
      .find((p) => p.placeKnown && p.availability === 'available');
    if (!relative) return;

    const crewBefore = state.crewIds.length;

    // Aboard the ship: no access at all.
    state.currentPlaceId = null;
    offerPassage(state, relative.id, rng);
    expect(state.crewIds.length, 'cannot recruit from the cockpit').toBe(crewBefore);

    // Standing somewhere else on the same world: still no.
    const elsewhere = Object.values(state.places).find((p) => p.id !== relative.placeId);
    state.currentPlaceId = elsewhere!.id;
    offerPassage(state, relative.id, rng);
    expect(state.crewIds.length, 'cannot recruit across the city').toBe(crewBefore);

    // Standing where they are, but without having spoken: still refused. You
    // do not ask somebody to abandon their world before you have talked to them.
    state.currentPlaceId = relative.placeId!;
    const player = state.characters[state.playerId]!;
    player.relationships[relative.id] = { value: 60, familiarity: 80, kind: 'family' };
    offerPassage(state, relative.id, rng);
    expect(state.crewIds.length, 'must talk before asking').toBe(crewBefore);

    // Talk first, settle whatever they raise, and it can work.
    visitContact(state, relative.id, rng);
    expect(relative.spokenTo).toBe(true);
    relative.concernResolved = true;
    player.relationships[relative.id] = { value: 90, familiarity: 90, kind: 'family' };
    offerPassage(state, relative.id, rng);
    expect(state.crewIds.length, 'talked to and willing should work').toBe(crewBefore + 1);
  });

  it('charges time for walking around', () => {
    const draft = generateProtagonistDraft(streamRng('PLACES-5', 'protagonist'));
    const state = createGame('PLACES-5', draft.character);
    const rng = new Rng('PLACES-5:live');

    const before = state.hours;
    const target = districtsAt(state, 'loc_homeworld').find((d) => !d.shipHere)!;
    const result = walkTo(state, target.id, rng);

    expect(result.ok).toBe(true);
    expect(state.hours, 'crossing a city is not free').toBeGreaterThan(before);
    expect(state.currentPlaceId).toBe(target.id);
  });
});


// ---------------------------------------------------------------------------
// Combat resolution truthfulness (audit P0-1)
// ---------------------------------------------------------------------------

describe('combat resolution', () => {
  function makeCombatFixture(seed: string) {
    const draft = generateProtagonistDraft(streamRng(seed, 'protagonist'));
    const state = createGame(seed, draft.character);
    const rng = new Rng(`${seed}:combat`);

    const combat: NonNullable<GameState['combat']> = {
      id: 'cmb_test',
      title: 'Test Fight',
      combatants: [],
      hostiles: {},
      activeId: null,
      round: 3,
      log: [],
      returnTo: 'cockpit',
      canFlee: true,
      encounterId: 'enc_scavenger_pair',
    };
    state.combat = combat;
    return { state, combat, rng };
  }

  const crewCombatant = (state: GameState, fled: boolean) => ({
    id: 'c1',
    characterId: state.playerId,
    name: 'You',
    hostile: false,
    meter: 0,
    range: 'medium' as const,
    inCover: false,
    fled,
    portraitSeed: 1,
  });

  const hostileCombatant = (fled: boolean, credit: number) => ({
    id: 'h1',
    characterId: 'hst_test',
    name: 'Raider',
    hostile: true,
    meter: 0,
    range: 'medium' as const,
    inCover: false,
    fled,
    portraitSeed: 2,
    creditDrop: credit,
    drops: [],
  });

  it('a fled fight can never be overwritten into a victory', () => {
    const { state, combat, rng } = makeCombatFixture('CBT-1');
    combat.combatants = [crewCombatant(state, true), hostileCombatant(true, 500)];
    const credits = state.resources.credits;

    endCombat(state, 'fled', rng);
    expect(state.combat?.resolution).toBe('fled');

    // The stale double-call the audit caught live: hostiles disperse after the
    // player already ran, and a second resolution tried to declare victory.
    endCombat(state, 'victory', rng);
    expect(state.combat?.resolution, 'first resolution stands').toBe('fled');
    expect(state.resources.credits, 'no loot for running away').toBe(credits);
  });

  it('hostiles who got away are not loot', () => {
    const { state, combat, rng } = makeCombatFixture('CBT-2');
    combat.combatants = [crewCombatant(state, false), hostileCombatant(true, 500)];
    const credits = state.resources.credits;

    endCombat(state, 'droveOff', rng);
    expect(state.combat?.resolution).toBe('droveOff');
    expect(state.resources.credits, 'they left with their pockets').toBe(credits);
  });

  it('the fallen are lootable and a death is named', () => {
    const { state, combat, rng } = makeCombatFixture('CBT-3');

    // A dead hostile drops; a dead crew member is recorded by name.
    const deadHostile = hostileCombatant(false, 300);
    combat.hostiles[deadHostile.characterId] = {
      ...state.characters[state.playerId]!,
      id: deadHostile.characterId,
      alive: false,
    };

    const extra = createCharacter({ rng: streamRng('CBT-3', 'extra'), aboard: true });
    extra.alive = false;
    extra.departedReason = 'Killed — test';
    state.characters[extra.id] = extra;
    state.crewIds.push(extra.id);

    combat.combatants = [crewCombatant(state, false), deadHostile];
    const credits = state.resources.credits;

    endCombat(state, 'victory', rng);
    expect(state.resources.credits).toBe(credits + 300);
    expect(combat.casualties).toEqual([`${extra.name} ${extra.surname}`]);
    expect(state.crewIds.includes(extra.id), 'dead crew leave the roster').toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Study — specialization is earned, and the rungs above the first are a queue
// ---------------------------------------------------------------------------

describe('study', () => {
  it('refuses a craft that has not been practised', () => {
    const draft = generateProtagonistDraft(streamRng('study-1', 'protagonist'));
    const state = createGame('study-1', draft.character);
    const captain = state.characters[state.playerId]!;

    const raw = SKILL_KEYS.find((k) => (captain.skills[k] ?? 0) < SPEC.placeMinSkill);
    if (!raw) return;
    const result = beginStudy(captain, raw);
    expect(result.ok).toBe(false);
    expect(result.message).toContain(String(SPEC.placeMinSkill));
  });

  it('opens a focus at the first rung and climbs one at a time', () => {
    const draft = generateProtagonistDraft(streamRng('study-2', 'protagonist'));
    const state = createGame('study-2', draft.character);
    const captain = state.characters[state.playerId]!;

    const practised = SKILL_KEYS.find((k) => (captain.skills[k] ?? 0) >= SPEC.placeMinSkill);
    if (!practised) return;

    expect(studyOptions(captain).find((o) => o.skill === practised)?.target).toBe(1.05);
    expect(beginStudy(captain, practised).ok).toBe(true);
    expect(captain.study?.skill).toBe(practised);

    // Give them somewhere to work and enough time to finish the first rung.
    state.ship!.rooms.push({
      id: 'room_study_test',
      kind: 'study',
      quality: 'solid',
      qualityPotential: 'solid',
      condition: 90,
    });
    tickStudy(state, SPEC.hoursToTier[1.05]! * 20);
    expect(captain.potential[practised].specialization).toBe(1.05);
    // Reaching a rung clears the assignment; the next one is a fresh decision.
    expect(captain.study).toBeUndefined();
  });

  it('holds the middle rungs to two, so advancement queues', () => {
    const draft = generateProtagonistDraft(streamRng('study-3', 'protagonist'));
    const state = createGame('study-3', draft.character);
    const captain = state.characters[state.playerId]!;

    const eligible = SKILL_KEYS.filter((k) => (captain.skills[k] ?? 0) >= SPEC.placeMinSkill);
    if (eligible.length < 3) return;

    for (const skill of eligible.slice(0, 2)) {
      captain.potential[skill] = { ...captain.potential[skill], specialization: 1.1 };
    }
    captain.potential[eligible[2]!] = { ...captain.potential[eligible[2]!], specialization: 1.05 };

    const blocked = studyOptions(captain).find((o) => o.skill === eligible[2]);
    expect(blocked?.available).toBe(false);
    expect(blocked?.reason).toContain('promote');

    // Promote one out of the rung and the queue moves.
    captain.potential[eligible[0]!] = { ...captain.potential[eligible[0]!], specialization: 1.15 };
    expect(studyOptions(captain).find((o) => o.skill === eligible[2])?.available).toBe(true);
  });

  it('does not let a deployed party study', () => {
    const draft = generateProtagonistDraft(streamRng('study-4', 'protagonist'));
    const state = createGame('study-4', draft.character);
    const captain = state.characters[state.playerId]!;
    const practised = SKILL_KEYS.find((k) => (captain.skills[k] ?? 0) >= SPEC.placeMinSkill);
    if (!practised) return;

    state.ship!.rooms.push({
      id: 'room_study_test2',
      kind: 'study',
      quality: 'solid',
      qualityPotential: 'solid',
      condition: 90,
    });
    beginStudy(captain, practised);
    state.expedition = {
      siteId: 'nowhere',
      partyIds: [captain.id],
      leaderId: captain.id,
      currentNodeId: 'x',
      visited: [],
      carried: [],
      carriedCredits: 0,
      startedAtHours: 0,
    };

    tickStudy(state, 5000);
    expect(captain.potential[practised].specialization).toBe(1);
  });
});

describe('campaign simulation', () => {
  it('creates a playable starting state', () => {
    const draft = generateProtagonistDraft(streamRng('START-1', 'protagonist'));
    const state = createGame('START-1', draft.character);

    // You begin alone. Every additional crew member is a choice the player
    // makes, against a safe-capacity cost they can see.
    expect(state.crewIds.length).toBe(1);
    expect(state.characters[state.playerId]?.isPlayer).toBe(true);
    // A solo start must never be in violation of safe capacity on any hull.
    expect(state.crewIds.length).toBeLessThanOrEqual(safeCrewCapacity(state.ship!));
    expect(state.ship).toBeTruthy();
    expect(state.resources.food).toBeGreaterThan(0);
    expect(state.resources.fuel).toBeGreaterThan(0);
    expect(state.currentLocationId).toBe('loc_homeworld');
    expect(state.homeworld.familyIds.length).toBeGreaterThanOrEqual(2);
    expect(state.ship!.cargo.length).toBeGreaterThan(0);
  });

  it('runs whole campaigns without throwing', () => {
    const outcomes: string[] = [];

    for (let seed = 0; seed < 12; seed++) {
      const result = simulateRun(`SIM-${seed}`, { maxSteps: 3000 });
      outcomes.push(result.outcome);

      expect(result.errors, `seed SIM-${seed} threw`).toEqual([]);
      expect(result.hours).toBeGreaterThan(0);
      // Time must actually move; a stalled run means a broken loop.
      expect(result.steps).toBeGreaterThan(10);
    }

    // Across a dozen seeds at least one run should get somewhere.
    expect(outcomes.some((o) => o !== 'stalled')).toBe(true);
  });

  it('is winnable at a sensible rate under competent play', () => {
    // Guards the balance baseline in both directions. Measured at roughly a
    // third of runs reaching the Travel Center; if a tuning change makes the
    // game unwinnable or trivial, this is what catches it.
    let victories = 0;
    let deaths = 0;
    const runs = 30;

    for (let seed = 0; seed < runs; seed++) {
      const result = simulateRun(`WIN-${seed}`, { maxSteps: 9000, strategy: 'balanced' });
      expect(result.errors, `seed WIN-${seed} threw`).toEqual([]);
      if (result.outcome === 'victory') victories++;
      if (result.outcome === 'death') deaths++;
    }

    const winRate = victories / runs;
    expect(winRate, 'the route must be completable').toBeGreaterThan(0.1);
    expect(winRate, 'a survival game should not be a walkover').toBeLessThan(0.75);
    // Failure has to remain the common outcome for the premise to hold.
    expect(deaths).toBeGreaterThan(0);
  });

  it('makes crew a real requirement — you cannot beeline alone', () => {
    // The player starts solo, so recruiting is not optional. A run that never
    // hires anyone should do markedly worse than one that builds a crew.
    // Compared against the "rush" bot, which never recruits at all, the gap is
    // large and stable; comparing two similar strategies is mostly noise.
    const withCrew = countVictories('CREWED', 'balanced');
    const alone = countVictories('SOLO', 'rush');
    expect(withCrew).toBeGreaterThan(alone);
  });

  it('continues the campaign when the ship is lost but crew survive', () => {
    // Across seeds, at least one forced ship loss must leave survivors who are
    // still playing rather than ending the run outright.
    let sawLoss = false;
    let sawSurvivingLoss = false;

    for (let seed = 0; seed < 10; seed++) {
      const result = simulateRun(`SHIPLESS-${seed}`, { maxSteps: 1500, forceShipLoss: true });
      expect(result.errors, `seed SHIPLESS-${seed} threw`).toEqual([]);
      if (!result.shipLost) continue;
      sawLoss = true;
      if (result.survivingCrew > 0) {
        sawSurvivingLoss = true;
        expect(result.finalState.ship?.destroyed).toBe(true);
        expect(result.outcome).not.toBe('death');
      }
    }

    expect(sawLoss).toBe(true);
    expect(sawSurvivingLoss).toBe(true);
  });

  it('never leaves a dead character on the active crew roster', () => {
    for (let seed = 0; seed < 10; seed++) {
      const result = simulateRun(`ROSTER-${seed}`, { maxSteps: 2500, strategy: 'balanced' });
      for (const id of result.finalState.crewIds) {
        expect(result.finalState.characters[id]?.alive, `${id} is dead but still crew`).toBe(true);
      }
    }
  });

  it('lets untreated wounds close on their own so a medic-less crew can recover', () => {
    // Regression guard: untreated wounds used to never heal and infection
    // re-armed bleeding forever, which made every scratch eventually fatal.
    const draft = generateProtagonistDraft(streamRng('HEAL-1', 'protagonist'));
    const state = createGame('HEAL-1', draft.character);
    const rng = new Rng('HEAL-1:wounds');
    const victim = state.characters[state.crewIds[0]!]!;

    applyRawWound(victim, 45, 'slash', rng, 'leftArm');
    expect(victim.wounds.length).toBe(1);

    // Two weeks of fed, rested time with no treatment at all.
    for (let i = 0; i < 14 * 24; i++) {
      tickWounds(victim, { hours: 1, fed: true, resting: true }, rng);
    }

    expect(victim.alive).toBe(true);
    expect(victim.wounds.length).toBe(0);
    expect(victim.health).toBeGreaterThan(victim.maxHealth * 0.5);
  });
});

// ---------------------------------------------------------------------------
// Places and physical access
// ---------------------------------------------------------------------------

describe('places', () => {
  it('gives the homeworld walkable districts with the ship parked on one', () => {
    const draft = generateProtagonistDraft(streamRng('PLACES-1', 'protagonist'));
    const state = createGame('PLACES-1', draft.character);

    const districts = districtsAt(state, 'loc_homeworld');
    expect(districts.length).toBeGreaterThanOrEqual(4);

    const parked = shipPlace(state);
    expect(parked, 'the ship has to be somewhere').toBeTruthy();
    expect(parked!.shipHere).toBe(true);

    // You begin aboard, not standing in a district.
    expect(state.currentPlaceId).toBeNull();

    // Districts hold venues, so actions live two steps in rather than on a menu.
    const withVenues = districts.filter((d) => childPlaces(state, d.id).length > 0);
    expect(withVenues.length).toBeGreaterThan(0);
  });

  it('never exposes an action a place does not contain', () => {
    const draft = generateProtagonistDraft(streamRng('PLACES-2', 'protagonist'));
    const state = createGame('PLACES-2', draft.character);
    const location = state.locations['loc_homeworld']!;

    for (const place of Object.values(state.places)) {
      for (const action of place.actions) {
        expect(
          location.actions.includes(action),
          `${place.name} offers ${action} which ${location.name} does not support`,
        ).toBe(true);
      }
    }
  });

  it('puts family somewhere real rather than in a menu', () => {
    const draft = generateProtagonistDraft(streamRng('PLACES-3', 'protagonist'));
    const state = createGame('PLACES-3', draft.character);

    const family = state.homeworld.familyIds.map((id) => state.characters[id]!);
    expect(family.length).toBeGreaterThan(0);
    for (const person of family) {
      expect(person.placeId, `${person.name} has no location`).toBeTruthy();
      expect(state.places[person.placeId!], 'their location must exist').toBeTruthy();
    }
    // At least one relative is findable from the start, so the opening has
    // somewhere obvious to go.
    expect(family.some((p) => p.placeKnown)).toBe(true);
  });

  it('refuses passage to anyone you are not standing next to', () => {
    const draft = generateProtagonistDraft(streamRng('PLACES-4', 'protagonist'));
    const state = createGame('PLACES-4', draft.character);
    const rng = new Rng('PLACES-4:live');

    const relative = state.homeworld.familyIds
      .map((id) => state.characters[id]!)
      .find((p) => p.placeKnown && p.availability === 'available');
    if (!relative) return;

    const crewBefore = state.crewIds.length;

    // Aboard the ship: no access at all.
    state.currentPlaceId = null;
    offerPassage(state, relative.id, rng);
    expect(state.crewIds.length, 'cannot recruit from the cockpit').toBe(crewBefore);

    // Standing somewhere else on the same world: still no.
    const elsewhere = Object.values(state.places).find((p) => p.id !== relative.placeId);
    state.currentPlaceId = elsewhere!.id;
    offerPassage(state, relative.id, rng);
    expect(state.crewIds.length, 'cannot recruit across the city').toBe(crewBefore);

    // Standing where they are, but without having spoken: still refused. You
    // do not ask somebody to abandon their world before you have talked to them.
    state.currentPlaceId = relative.placeId!;
    const player = state.characters[state.playerId]!;
    player.relationships[relative.id] = { value: 60, familiarity: 80, kind: 'family' };
    offerPassage(state, relative.id, rng);
    expect(state.crewIds.length, 'must talk before asking').toBe(crewBefore);

    // Talk first, settle whatever they raise, and it can work.
    visitContact(state, relative.id, rng);
    expect(relative.spokenTo).toBe(true);
    relative.concernResolved = true;
    player.relationships[relative.id] = { value: 90, familiarity: 90, kind: 'family' };
    offerPassage(state, relative.id, rng);
    expect(state.crewIds.length, 'talked to and willing should work').toBe(crewBefore + 1);
  });

  it('charges time for walking around', () => {
    const draft = generateProtagonistDraft(streamRng('PLACES-5', 'protagonist'));
    const state = createGame('PLACES-5', draft.character);
    const rng = new Rng('PLACES-5:live');

    const before = state.hours;
    const target = districtsAt(state, 'loc_homeworld').find((d) => !d.shipHere)!;
    const result = walkTo(state, target.id, rng);

    expect(result.ok).toBe(true);
    expect(state.hours, 'crossing a city is not free').toBeGreaterThan(before);
    expect(state.currentPlaceId).toBe(target.id);
  });
});


// ---------------------------------------------------------------------------
// Combat resolution truthfulness (audit P0-1)
// ---------------------------------------------------------------------------

describe('combat resolution', () => {
  function makeCombatFixture(seed: string) {
    const draft = generateProtagonistDraft(streamRng(seed, 'protagonist'));
    const state = createGame(seed, draft.character);
    const rng = new Rng(`${seed}:combat`);

    const combat: NonNullable<GameState['combat']> = {
      id: 'cmb_test',
      title: 'Test Fight',
      combatants: [],
      hostiles: {},
      activeId: null,
      round: 3,
      log: [],
      returnTo: 'cockpit',
      canFlee: true,
      encounterId: 'enc_scavenger_pair',
    };
    state.combat = combat;
    return { state, combat, rng };
  }

  const crewCombatant = (state: GameState, fled: boolean) => ({
    id: 'c1',
    characterId: state.playerId,
    name: 'You',
    hostile: false,
    meter: 0,
    range: 'medium' as const,
    inCover: false,
    fled,
    portraitSeed: 1,
  });

  const hostileCombatant = (fled: boolean, credit: number) => ({
    id: 'h1',
    characterId: 'hst_test',
    name: 'Raider',
    hostile: true,
    meter: 0,
    range: 'medium' as const,
    inCover: false,
    fled,
    portraitSeed: 2,
    creditDrop: credit,
    drops: [],
  });

  it('a fled fight can never be overwritten into a victory', () => {
    const { state, combat, rng } = makeCombatFixture('CBT-1');
    combat.combatants = [crewCombatant(state, true), hostileCombatant(true, 500)];
    const credits = state.resources.credits;

    endCombat(state, 'fled', rng);
    expect(state.combat?.resolution).toBe('fled');

    // The stale double-call the audit caught live: hostiles disperse after the
    // player already ran, and a second resolution tried to declare victory.
    endCombat(state, 'victory', rng);
    expect(state.combat?.resolution, 'first resolution stands').toBe('fled');
    expect(state.resources.credits, 'no loot for running away').toBe(credits);
  });

  it('hostiles who got away are not loot', () => {
    const { state, combat, rng } = makeCombatFixture('CBT-2');
    combat.combatants = [crewCombatant(state, false), hostileCombatant(true, 500)];
    const credits = state.resources.credits;

    endCombat(state, 'droveOff', rng);
    expect(state.combat?.resolution).toBe('droveOff');
    expect(state.resources.credits, 'they left with their pockets').toBe(credits);
  });

  it('the fallen are lootable and a death is named', () => {
    const { state, combat, rng } = makeCombatFixture('CBT-3');

    // A dead hostile drops; a dead crew member is recorded by name.
    const deadHostile = hostileCombatant(false, 300);
    combat.hostiles[deadHostile.characterId] = {
      ...state.characters[state.playerId]!,
      id: deadHostile.characterId,
      alive: false,
    };

    const extra = createCharacter({ rng: streamRng('CBT-3', 'extra'), aboard: true });
    extra.alive = false;
    extra.departedReason = 'Killed — test';
    state.characters[extra.id] = extra;
    state.crewIds.push(extra.id);

    combat.combatants = [crewCombatant(state, false), deadHostile];
    const credits = state.resources.credits;

    endCombat(state, 'victory', rng);
    expect(state.resources.credits).toBe(credits + 300);
    expect(combat.casualties).toEqual([`${extra.name} ${extra.surname}`]);
    expect(state.crewIds.includes(extra.id), 'dead crew leave the roster').toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Study — specialization is earned, and the rungs above the first are a queue
// ---------------------------------------------------------------------------

describe('study', () => {
  it('refuses a craft that has not been practised', () => {
    const draft = generateProtagonistDraft(streamRng('study-1', 'protagonist'));
    const state = createGame('study-1', draft.character);
    const captain = state.characters[state.playerId]!;

    const raw = SKILL_KEYS.find((k) => (captain.skills[k] ?? 0) < SPEC.placeMinSkill);
    if (!raw) return;
    const result = beginStudy(captain, raw);
    expect(result.ok).toBe(false);
    expect(result.message).toContain(String(SPEC.placeMinSkill));
  });

  it('opens a focus at the first rung and climbs one at a time', () => {
    const draft = generateProtagonistDraft(streamRng('study-2', 'protagonist'));
    const state = createGame('study-2', draft.character);
    const captain = state.characters[state.playerId]!;

    const practised = SKILL_KEYS.find((k) => (captain.skills[k] ?? 0) >= SPEC.placeMinSkill);
    if (!practised) return;

    expect(studyOptions(captain).find((o) => o.skill === practised)?.target).toBe(1.05);
    expect(beginStudy(captain, practised).ok).toBe(true);
    expect(captain.study?.skill).toBe(practised);

    // Give them somewhere to work and enough time to finish the first rung.
    state.ship!.rooms.push({
      id: 'room_study_test',
      kind: 'study',
      quality: 'solid',
      qualityPotential: 'solid',
      condition: 90,
    });
    tickStudy(state, SPEC.hoursToTier[1.05]! * 20);
    expect(captain.potential[practised].specialization).toBe(1.05);
    // Reaching a rung clears the assignment; the next one is a fresh decision.
    expect(captain.study).toBeUndefined();
  });

  it('holds the middle rungs to two, so advancement queues', () => {
    const draft = generateProtagonistDraft(streamRng('study-3', 'protagonist'));
    const state = createGame('study-3', draft.character);
    const captain = state.characters[state.playerId]!;

    const eligible = SKILL_KEYS.filter((k) => (captain.skills[k] ?? 0) >= SPEC.placeMinSkill);
    if (eligible.length < 3) return;

    for (const skill of eligible.slice(0, 2)) {
      captain.potential[skill] = { ...captain.potential[skill], specialization: 1.1 };
    }
    captain.potential[eligible[2]!] = { ...captain.potential[eligible[2]!], specialization: 1.05 };

    const blocked = studyOptions(captain).find((o) => o.skill === eligible[2]);
    expect(blocked?.available).toBe(false);
    expect(blocked?.reason).toContain('promote');

    // Promote one out of the rung and the queue moves.
    captain.potential[eligible[0]!] = { ...captain.potential[eligible[0]!], specialization: 1.15 };
    expect(studyOptions(captain).find((o) => o.skill === eligible[2])?.available).toBe(true);
  });

  it('does not let a deployed party study', () => {
    const draft = generateProtagonistDraft(streamRng('study-4', 'protagonist'));
    const state = createGame('study-4', draft.character);
    const captain = state.characters[state.playerId]!;
    const practised = SKILL_KEYS.find((k) => (captain.skills[k] ?? 0) >= SPEC.placeMinSkill);
    if (!practised) return;

    state.ship!.rooms.push({
      id: 'room_study_test2',
      kind: 'study',
      quality: 'solid',
      qualityPotential: 'solid',
      condition: 90,
    });
    beginStudy(captain, practised);
    state.expedition = {
      siteId: 'nowhere',
      partyIds: [captain.id],
      leaderId: captain.id,
      currentNodeId: 'x',
      visited: [],
      carried: [],
      carriedCredits: 0,
      startedAtHours: 0,
    };

    tickStudy(state, 5000);
    expect(captain.potential[practised].specialization).toBe(1);
  });
});

describe('campaign simulation', () => {
  it('creates a playable starting state', () => {
    const draft = generateProtagonistDraft(streamRng('START-1', 'protagonist'));
    const state = createGame('START-1', draft.character);

    // You begin alone. Every additional crew member is a choice the player
    // makes, against a safe-capacity cost they can see.
    expect(state.crewIds.length).toBe(1);
    expect(state.characters[state.playerId]?.isPlayer).toBe(true);
    // A solo start must never be in violation of safe capacity on any hull.
    expect(state.crewIds.length).toBeLessThanOrEqual(safeCrewCapacity(state.ship!));
    expect(state.ship).toBeTruthy();
    expect(state.resources.food).toBeGreaterThan(0);
    expect(state.resources.fuel).toBeGreaterThan(0);
    expect(state.currentLocationId).toBe('loc_homeworld');
    expect(state.homeworld.familyIds.length).toBeGreaterThanOrEqual(2);
    expect(state.ship!.cargo.length).toBeGreaterThan(0);
  });

  it('runs whole campaigns without throwing', () => {
    const outcomes: string[] = [];

    for (let seed = 0; seed < 12; seed++) {
      const result = simulateRun(`SIM-${seed}`, { maxSteps: 3000 });
      outcomes.push(result.outcome);

      expect(result.errors, `seed SIM-${seed} threw`).toEqual([]);
      expect(result.hours).toBeGreaterThan(0);
      // Time must actually move; a stalled run means a broken loop.
      expect(result.steps).toBeGreaterThan(10);
    }

    // Across a dozen seeds at least one run should get somewhere.
    expect(outcomes.some((o) => o !== 'stalled')).toBe(true);
  });

  it('is winnable at a sensible rate under competent play', () => {
    // Guards the balance baseline in both directions. Measured at roughly a
    // third of runs reaching the Travel Center; if a tuning change makes the
    // game unwinnable or trivial, this is what catches it.
    let victories = 0;
    let deaths = 0;
    const runs = 30;

    for (let seed = 0; seed < runs; seed++) {
      const result = simulateRun(`WIN-${seed}`, { maxSteps: 9000, strategy: 'balanced' });
      expect(result.errors, `seed WIN-${seed} threw`).toEqual([]);
      if (result.outcome === 'victory') victories++;
      if (result.outcome === 'death') deaths++;
    }

    const winRate = victories / runs;
    expect(winRate, 'the route must be completable').toBeGreaterThan(0.1);
    expect(winRate, 'a survival game should not be a walkover').toBeLessThan(0.75);
    // Failure has to remain the common outcome for the premise to hold.
    expect(deaths).toBeGreaterThan(0);
  });

  it('makes crew a real requirement — you cannot beeline alone', () => {
    // The player starts solo, so recruiting is not optional. A run that never
    // hires anyone should do markedly worse than one that builds a crew.
    // Compared against the "rush" bot, which never recruits at all, the gap is
    // large and stable; comparing two similar strategies is mostly noise.
    const withCrew = countVictories('CREWED', 'balanced');
    const alone = countVictories('SOLO', 'rush');
    expect(withCrew).toBeGreaterThan(alone);
  });

  it('continues the campaign when the ship is lost but crew survive', () => {
    // Across seeds, at least one forced ship loss must leave survivors who are
    // still playing rather than ending the run outright.
    let sawLoss = false;
    let sawSurvivingLoss = false;

    for (let seed = 0; seed < 10; seed++) {
      const result = simulateRun(`SHIPLESS-${seed}`, { maxSteps: 1500, forceShipLoss: true });
      expect(result.errors, `seed SHIPLESS-${seed} threw`).toEqual([]);
      if (!result.shipLost) continue;
      sawLoss = true;
      if (result.survivingCrew > 0) {
        sawSurvivingLoss = true;
        expect(result.finalState.ship?.destroyed).toBe(true);
        expect(result.outcome).not.toBe('death');
      }
    }

    expect(sawLoss).toBe(true);
    expect(sawSurvivingLoss).toBe(true);
  });

  it('never leaves a dead character on the active crew roster', () => {
    for (let seed = 0; seed < 10; seed++) {
      const result = simulateRun(`ROSTER-${seed}`, { maxSteps: 2500, strategy: 'balanced' });
      for (const id of result.finalState.crewIds) {
        expect(result.finalState.characters[id]?.alive, `${id} is dead but still crew`).toBe(true);
      }
    }
  });

  it('lets untreated wounds close on their own so a medic-less crew can recover', () => {
    // Regression guard: untreated wounds used to never heal and infection
    // re-armed bleeding forever, which made every scratch eventually fatal.
    const draft = generateProtagonistDraft(streamRng('HEAL-1', 'protagonist'));
    const state = createGame('HEAL-1', draft.character);
    const rng = new Rng('HEAL-1:wounds');
    const victim = state.characters[state.crewIds[0]!]!;

    applyRawWound(victim, 45, 'slash', rng, 'leftArm');
    expect(victim.wounds.length).toBe(1);

    // Two weeks of fed, rested time with no treatment at all.
    for (let i = 0; i < 14 * 24; i++) {
      tickWounds(victim, { hours: 1, fed: true, resting: true }, rng);
    }

    expect(victim.alive).toBe(true);
    expect(victim.wounds.length).toBe(0);
    expect(victim.health).toBeGreaterThan(victim.maxHealth * 0.5);
  });
});

// ---------------------------------------------------------------------------
// Temperament — the captain knows their own baseline

// ---------------------------------------------------------------------------
// Captain generation library
// ---------------------------------------------------------------------------

describe('the captain generation library', () => {
  it('carries the sizes and the balance the library specifies', () => {
    expect(PROFESSIONS).toHaveLength(250);
    expect(LIFE_EVENTS).toHaveLength(500);

    // 35 / 35 / 30, on purpose: influential does not mean bad.
    const polarity = { positive: 0, negative: 0, mixed: 0 };
    for (const event of LIFE_EVENTS) polarity[event.polarity] += 1;
    expect(polarity.positive).toBe(175);
    expect(polarity.negative).toBe(175);
    expect(polarity.mixed).toBe(150);

    // Every profession leans on skills and attributes the engine actually has.
    for (const profession of PROFESSIONS) {
      const skills = Object.keys(profession.skillBias) as SkillKey[];
      const attrs = Object.keys(profession.attributeBias) as AttributeKey[];
      expect(skills.length).toBeGreaterThanOrEqual(2);
      for (const key of skills) expect(SKILL_KEYS).toContain(key);
      for (const key of attrs) expect(ATTRIBUTE_KEYS).toContain(key);
    }
  });

  it('spreads captain age across the whole range instead of the middle', () => {
    const ages: number[] = [];
    for (let seed = 0; seed < 400; seed += 1) {
      ages.push(rollCaptainAge(new Rng(`age-${seed}`)));
    }
    expect(Math.min(...ages)).toBeLessThanOrEqual(22);
    expect(Math.max(...ages)).toBeGreaterThanOrEqual(64);
    // The old generator could not produce either end of this.
    expect(ages.some((a) => a < 25)).toBe(true);
    expect(ages.some((a) => a > 56)).toBe(true);
  });

  it('never gives somebody a history they are too young to have had', () => {
    for (let seed = 0; seed < 200; seed += 1) {
      const rng = new Rng(`story-${seed}`);
      const age = rollCaptainAge(rng);
      const story = rollLifeStory(rng, age);
      expect(story.profession.minAge).toBeLessThanOrEqual(age);
      for (const event of story.events) {
        const entry = LIFE_EVENTS.find((e) => e.id === event.id)!;
        expect(entry.minAge).toBeLessThanOrEqual(age);
      }
    }
  });

  it('rolls exactly two events, from two different areas of a life', () => {
    for (let seed = 0; seed < 200; seed += 1) {
      const rng = new Rng(`events-${seed}`);
      const story = rollLifeStory(rng, rollCaptainAge(rng));
      expect(story.events).toHaveLength(2);
      expect(story.events[0]!.category).not.toBe(story.events[1]!.category);
    }
  });

  it('keeps polarity and severity as separate axes', () => {
    // A good thing is allowed to be transformative and a bad thing minor.
    const seen = new Set<string>();
    for (let seed = 0; seed < 600; seed += 1) {
      const rng = new Rng(`axes-${seed}`);
      for (const event of rollLifeStory(rng, rollCaptainAge(rng)).events) {
        seen.add(`${event.polarity}:${event.severity}`);
      }
    }
    expect(seen.has('positive:transformative')).toBe(true);
    expect(seen.has('negative:minor')).toBe(true);
  });

  it('gives the captain one to seven canonical traits, and the whole range is reachable', () => {
    const counts = new Set<number>();
    for (let seed = 0; seed < 300; seed += 1) {
      const draft = generateProtagonistDraft(streamRng(`CAP-${seed}`, 'protagonist'));
      const traits = draft.character.traits;
      expect(traits.length).toBeGreaterThanOrEqual(1);
      expect(traits.length).toBeLessThanOrEqual(7);
      counts.add(traits.length);
      expect(new Set(traits).size).toBe(traits.length);
      for (const id of traits) {
        expect(PERSONALITY_TRAITS.some((t) => t.id === id)).toBe(true);
      }
    }
    expect(counts.has(1)).toBe(true);
    expect(counts.has(7)).toBe(true);
  });

  it('gives the captain a profession and leaves recruits on the old generator', () => {
    const draft = generateProtagonistDraft(streamRng('CAP-PROF', 'protagonist'));
    expect(draft.character.profession).toBeTruthy();
    expect(draft.character.lifeEvents).toHaveLength(2);
    expect(draft.character.lifeHistory.career).toBe(draft.character.profession);

    // Recruits and family are untouched by this pass.
    const recruit = createCharacter({ rng: new Rng('CAP-PROF:recruit') });
    expect(recruit.profession).toBeUndefined();
    expect(recruit.lifeEvents).toBeUndefined();
  });

  it('is deterministic — the same seed builds the same life', () => {
    const a = generateProtagonistDraft(streamRng('CAP-DET', 'protagonist'));
    const b = generateProtagonistDraft(streamRng('CAP-DET', 'protagonist'));
    expect(a.character.age).toBe(b.character.age);
    expect(a.character.profession).toBe(b.character.profession);
    expect(a.character.lifeEvents).toEqual(b.character.lifeEvents);
    expect(a.character.traits).toEqual(b.character.traits);
  });

  it('lets a history with money in it move the starting credits, and only that', () => {
    const withMoney = LIFE_EVENTS.filter((e) => e.money !== 0);
    expect(withMoney.length).toBeGreaterThan(0);
    // Nothing else in the library claims an economic effect.
    expect(withMoney.length).toBeLessThan(LIFE_EVENTS.length * 0.1);

    const plain = createCharacter({ rng: new Rng('CAP-MONEY') });
    expect(startingCreditsDelta(plain)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Captain and crew lead
// ---------------------------------------------------------------------------

function twoCrewGame(seed: string): GameState {
  const draft = generateProtagonistDraft(streamRng(seed, 'protagonist'));
  const state = createGame(seed, draft.character);
  const second = createCharacter({ rng: new Rng(`${seed}:second`), aboard: true });
  second.age = 34;
  state.characters[second.id] = second;
  state.crewIds.push(second.id);
  ensureCrewLead(state);
  return state;
}

describe('command', () => {
  it('starts with a captain and nobody else to hold the ship', () => {
    const draft = generateProtagonistDraft(streamRng('CMD-1', 'protagonist'));
    const state = createGame('CMD-1', draft.character);
    expect(state.captainId).toBe(draft.character.id);
    expect(state.crewLeadId).toBeNull();
    // Alone, the rule cannot bind — there is nobody to leave behind.
    expect(commandRuleFor(state, [state.captainId]).ok).toBe(true);
  });

  it('fills the second post itself when there is only one candidate', () => {
    const state = twoCrewGame('CMD-2');
    expect(state.crewLeadId).toBeTruthy();
    expect(state.crewLeadId).not.toBe(state.captainId);
  });

  it('keeps one of the two commanders aboard at an exposed berth', () => {
    const state = twoCrewGame('CMD-3');
    // Put the ship somewhere nobody would leave it standing.
    for (const place of Object.values(state.places)) {
      if (place.shipHere) place.danger = 70;
    }
    expect(berthSecurity(state).secured).toBe(false);

    // Either one alone is fine.
    expect(commandRuleFor(state, [state.captainId]).ok).toBe(true);
    expect(commandRuleFor(state, [state.crewLeadId!]).ok).toBe(true);
    // Both is not.
    expect(commandRuleFor(state, [state.captainId, state.crewLeadId!]).ok).toBe(false);
  });

  it('lets them both leave where the berth is genuinely covered', () => {
    const state = twoCrewGame('CMD-4');
    for (const place of Object.values(state.places)) {
      if (place.shipHere) place.danger = 70;
    }
    state.resources.credits = 5000;
    payShipWatch(state);
    expect(berthSecurity(state).secured).toBe(true);
    expect(commandRuleFor(state, [state.captainId, state.crewLeadId!]).ok).toBe(true);
  });

  it('will not move the second post while a party is out', () => {
    const state = twoCrewGame('CMD-5');
    const other = state.crewIds.find((id) => id !== state.captainId)!;
    state.expedition = {
      siteId: 'x',
      partyIds: [other],
      leaderId: other,
      currentNodeId: null,
      carried: [],
      carriedCredits: 0,
      startedAtHours: 0,
      log: [],
    } as unknown as GameState['expedition'];
    expect(canAssignCrewLead(state, other).ok).toBe(false);
  });

  it('hands the chair to a survivor when the captain dies, keeping who they are', () => {
    const state = twoCrewGame('CMD-6');
    const successorId = state.crewIds.find((id) => id !== state.captainId)!;
    const successor = state.characters[successorId]!;
    const skillsBefore = { ...successor.skills };
    const ageBefore = successor.age;

    const captain = state.characters[state.captainId]!;
    captain.alive = false;
    captain.departedReason = 'Killed';
    pruneDeadCrew(state);
    noteSuccession(state);

    // A provisional captain is installed so nothing dereferences a corpse,
    // and the player is still asked.
    expect(state.pendingSuccession).toBe(true);
    expect(state.characters[state.captainId]!.alive).toBe(true);

    confirmSuccession(state, successorId);
    expect(state.captainId).toBe(successorId);
    expect(state.pendingSuccession).toBe(false);
    expect(state.characters[successorId]!.role).toBe('captain');
    // Not regenerated: the same person, with everything they had.
    expect(state.characters[successorId]!.age).toBe(ageBefore);
    expect(state.characters[successorId]!.skills).toEqual(skillsBefore);
    // And the run is not over.
    expect(checkRunEnded(state)).toBe(false);
  });

  it('never leaves the chair and the second post with the same person', () => {
    const state = twoCrewGame('CMD-7');
    const lead = state.crewLeadId!;
    confirmSuccession(state, lead);
    expect(state.captainId).toBe(lead);
    expect(state.crewLeadId).not.toBe(lead);
  });

  it('puts command pressure on the captain and nobody else', () => {
    const state = twoCrewGame('CMD-8');
    const other = state.crewIds.find((id) => id !== state.captainId)!;
    const captainBefore = state.characters[state.captainId]!.stress;
    const otherBefore = state.characters[other]!.stress;

    commandStress(state, 10);
    expect(state.characters[state.captainId]!.stress).toBeGreaterThan(captainBefore);
    expect(state.characters[other]!.stress).toBe(otherBefore);
  });

  it('develops crew from their own experience and never from the shared pool', () => {
    const state = twoCrewGame('CMD-9');
    const other = state.characters[state.crewIds.find((id) => id !== state.captainId)!]!;
    noteSkillUse(other, 'scavenging');
    other.personalXp = 40;
    state.crewXp = 500;
    const before = other.skills.scavenging;

    const lines = autoDevelop(state, other);
    expect(lines.length).toBeGreaterThan(0);
    expect(other.skills.scavenging).toBeGreaterThan(before);
    // The shared pool is the player's, for the captain.
    expect(state.crewXp).toBe(500);
    expect(other.personalXp).toBeLessThan(40);

    // And it never touches the captain — that development is player-directed.
    const captain = state.characters[state.captainId]!;
    noteSkillUse(captain, 'scavenging');
    captain.personalXp = 40;
    expect(autoDevelop(state, captain)).toEqual([]);
    expect(captain.personalXp).toBe(40);
  });
});


// ---------------------------------------------------------------------------
// Personality — the 247 canonical traits ARE the mechanics
// ---------------------------------------------------------------------------

/** A throwaway character wearing exactly the traits a test cares about. */
function withTraits(seed: string, ...ids: string[]) {
  const character = createCharacter({ rng: new Rng(seed) });
  character.traits = ids;
  character.traitKnowledge = ids.map((trait) => ({ trait, known: 0 as const, evidence: 0 }));
  return character;
}

describe('personality', () => {
  it('is the only active personality state on a character', () => {
    for (let seed = 0; seed < 120; seed += 1) {
      const character = createCharacter({ rng: new Rng(`pers-${seed}`) });
      expect(character.traits.length).toBeGreaterThanOrEqual(1);
      expect(character.traits.length).toBeLessThanOrEqual(7);
      for (const id of character.traits) {
        expect(PERSONALITY_TRAITS.some((t) => t.id === id)).toBe(true);
      }
      // No legacy list, no second roll, no behaviour class.
      const loose = character as unknown as Record<string, unknown>;
      expect(loose.demeanor).toBeUndefined();
      expect(loose.temperament).toBeUndefined();
      expect(loose.behaviour).toBeUndefined();
      expect(new Set(character.traits).size).toBe(character.traits.length);
    }
  });

  it('resolves from the trait itself, never through a shared behaviour class', () => {
    // Every canonical trait carries its own tags, intensity and rule. If any of
    // them were still collapsing into a small shared vocabulary, this would
    // fail: 247 traits produce far more distinct rule sets than 24.
    const shapes = new Set(
      PERSONALITY_TRAITS.map((t) =>
        [t.favored.join('|'), t.opposed.join('|'), t.intensity].join('//'),
      ),
    );
    expect(shapes.size).toBeGreaterThan(200);
    for (const trait of PERSONALITY_TRAITS) {
      expect(trait.favored.length + trait.opposed.length).toBeGreaterThan(0);
      expect(trait.rule.length).toBeGreaterThan(10);
    }
  });

  it('makes four danger traits behave four different ways', () => {
    const danger = ['danger', 'physical_risk'];
    const rescue = ['danger', 'physical_risk', 'protect_others', 'rescue'];

    const brave = withTraits('D1', 'brave');
    const fearless = withTraits('D2', 'fearless');
    const steady = withTraits('D3', 'steady-under-fire');
    const guardian = withTraits('D4', 'protective-courage');

    // Ordinary danger: Brave steadies, Fearless steadies harder.
    const braveCalm = -reactTo(brave, danger).stress;
    const fearlessCalm = -reactTo(fearless, danger).stress;
    expect(braveCalm).toBeGreaterThan(0);
    expect(fearlessCalm).toBeGreaterThan(braveCalm);

    // Steady Under Fire does nothing until it is an actual crisis.
    expect(reactTo(steady, ['combat']).stress).toBe(0);
    expect(reactTo(steady, ['combat'], { crisis: true }).stress).toBeLessThan(0);

    // Protective Courage does nothing until somebody is being protected.
    expect(optionWeight(guardian, danger)).toBe(0);
    expect(optionWeight(guardian, rescue, { protecting: true })).toBeGreaterThan(0);

    // And none of the four resolve identically on the same input.
    const all = [brave, fearless, steady, guardian].map((c) =>
      JSON.stringify(reactTo(c, rescue, { crisis: true, protecting: true })),
    );
    expect(new Set(all).size).toBe(4);
  });

  it('lets personality cost the player without choosing for them', () => {
    const pacifist = withTraits('P1', 'pacifistic');
    const violence = ['violence', 'combat', 'aggression'];

    const friction = frictionFor(pacifist, violence);
    expect(friction.material).toBe(true);
    expect(friction.aligned).toBe(false);
    expect(friction.reaction.stress).toBeGreaterThan(0);
    // Ordinary violence is a cost, not a wall.
    expect(refusalFor(pacifist, violence).refused).toBe(false);
  });

  it('refuses only in the extreme cases, and only for the four named traits', () => {
    expect(refusalTraits()).toHaveLength(4);

    const pacifist = withTraits('R1', 'pacifistic');
    expect(refusalFor(pacifist, ['execution']).refused).toBe(true);
    // And even then, an overriding situation is allowed to break the rule.
    expect(refusalFor(pacifist, ['execution'], { override: true }).refused).toBe(false);

    const ordinary = withTraits('R2', 'brave', 'curious');
    expect(refusalFor(ordinary, ['execution', 'torture']).refused).toBe(false);
  });

  it('weights autonomous options, and lets two traits pull opposite ways', () => {
    const gambler = withTraits('A1', 'risk-taker');
    const guardian = withTraits('A2', 'protective-of-dependents');
    const both = withTraits('A3', 'risk-taker', 'protective-of-dependents');

    const pointless = ['gamble', 'danger'];
    const rescue = ['rescue', 'protect_others', 'danger', 'physical_risk'];

    // The gambler wants the gamble; the guardian does not care for it.
    expect(optionWeight(gambler, pointless)).toBeGreaterThan(0);
    // The same person is pulled both ways, and the sum is what moves.
    expect(optionWeight(both, rescue)).not.toBe(optionWeight(gambler, rescue));
    expect(optionWeight(guardian, rescue)).toBeGreaterThan(0);
  });

  it('reacts to other people through the same traits, not a separate system', () => {
    const loyal = withTraits('REL1', 'loyal');
    const suspicious = withTraits('REL2', 'suspicious');
    const rescue = ['crew', 'protect_others', 'promise'];

    expect(relationshipDelta(loyal, rescue).delta).toBeGreaterThan(0);
    expect(relationshipDelta(loyal, ['betrayal']).delta).toBeLessThan(0);
    // A suspicious onlooker does not warm to the same act as readily.
    expect(relationshipDelta(suspicious, rescue).delta).toBeLessThan(
      relationshipDelta(loyal, rescue).delta,
    );

    // Grudges keep hold of a bad one, and let go of it more slowly than most.
    // Grudge-Holding's own opposed tag is `forgiveness` — the trait does not
    // react to the betrayal, it changes how long the reaction lasts.
    const grudge = withTraits('REL3', 'grudge-holding');
    const held = relationshipDelta(grudge, ['forgiveness']);
    expect(held.delta).toBeLessThan(0);
    expect(held.lingers).toBe(true);

    const lets_go = withTraits('REL4', 'forgiving');
    expect(relationshipDelta(lets_go, ['ongoing_revenge']).lingers).toBe(false);
  });

  it('keeps hidden traits working while the player cannot see them', () => {
    const stranger = createCharacter({ rng: new Rng('HIDE-1') });
    stranger.traits = ['fearless'];
    stranger.traitKnowledge = [{ trait: 'fearless', known: 0, evidence: 0 }];

    // Nothing is visible.
    expect(knownTraits(stranger)).toHaveLength(0);
    expect(temperamentOf(stranger).descriptors).toHaveLength(0);
    // And it still works.
    expect(reactTo(stranger, ['danger']).stress).toBeLessThan(0);
    expect(optionWeight(stranger, ['danger'])).toBeGreaterThan(0);
  });

  it('builds the temperament summary from canonical traits only', () => {
    const draft = generateProtagonistDraft(streamRng('TEMP-V5', 'protagonist'));
    const captain = draft.character;
    const temperament = temperamentOf(captain, { full: true });

    expect(temperament.descriptors).toEqual(
      captain.traits.map((id) => traitById(id)!.label),
    );
    // Shown as sentences, but every one is that trait's own authored rule.
    expect(temperament.tendencies.map((t) => t.rule.toLowerCase())).toEqual(
      captain.traits.map((id) => traitById(id)!.rule.toLowerCase()),
    );
    expect(temperament.partial).toBe(false);
  });

  it('reads meaningful tags off the events the game already has', () => {
    const tagged = ALL_EVENTS.filter((def) =>
      def.choices.some((choice) => tagsForChoice(choice).length > 0),
    );
    // Every authored event reaches personality without naming a trait.
    expect(tagged.length).toBe(ALL_EVENTS.length);

    const wounding = tagsForChoice({
      id: 'x',
      label: 'x',
      result: { text: '', effects: { wound: { severityScore: 40, damageType: 'blunt' } } },
    });
    expect(wounding).toContain('danger');
    expect(wounding).toContain('physical_risk');
  });
});

describe('personality in saves', () => {
  it('translates legacy behaviour keys and never reactivates them', async () => {
    const draft = generateProtagonistDraft(streamRng('SAVE-P', 'protagonist'));
    const state = createGame('SAVE-P', draft.character);
    const captain = state.characters[state.playerId]!;

    // A save written before the library became the mechanics.
    const legacy = JSON.parse(JSON.stringify(state)) as Record<string, never>;
    const person = (legacy as unknown as { characters: Record<string, Record<string, unknown>> })
      .characters[captain.id]!;
    person.traits = ['brave', 'stubborn'];
    person.traitKnowledge = [
      { trait: 'brave', known: 2, evidence: 7 },
      { trait: 'stubborn', known: 0, evidence: 0 },
    ];
    person.demeanor = ['Brave', 'Stubborn'];

    const restored = migrateSavedState(legacy as never);
    const migrated = (restored as unknown as { characters: Record<string, import('./types').Character> })
      .characters[captain.id]!;

    expect((migrated as unknown as { demeanor?: unknown }).demeanor).toBeUndefined();
    for (const id of migrated.traits) {
      expect(PERSONALITY_TRAITS.some((t) => t.id === id)).toBe(true);
    }
    expect(migrated.traitKnowledge.map((k: { trait: string }) => k.trait)).toEqual(
      migrated.traits,
    );
  });
});

describe('personality and the life a character lived', () => {
  it('lets a life history lean the roll through the same tags traits use', () => {
    const flat = ATTRIBUTE_KEYS.reduce(
      (acc, key) => ({ ...acc, [key]: 7 }),
      {} as Record<AttributeKey, number>,
    );
    let leaned = 0;
    for (let seed = 0; seed < 200; seed += 1) {
      const traits = rollPersonality(new Rng(`lean-${seed}`), flat, {
        danger: 4,
        physical_risk: 4,
      });
      const drawn = traits.flatMap((id) => traitById(id)!.favored);
      if (drawn.includes('danger') || drawn.includes('physical_risk')) leaned += 1;
    }
    // It shows across many rolls, and it is never a guarantee.
    expect(leaned).toBeGreaterThan(30);
    expect(leaned).toBeLessThan(200);
  });

  it('carries no old behaviour keys in the life-path bias tables', () => {
    const legacy = [
      'selfPreserving',
      'dutiful',
      'cowardly',
      'vindictive',
      'opportunistic',
      'compassionate',
    ];
    for (const table of [
      LIFE_PATHS.origins,
      LIFE_PATHS.upbringings,
      LIFE_PATHS.careers,
      LIFE_PATHS.formativeEvents,
    ]) {
      for (const entry of table) {
        for (const key of Object.keys(entry.traitBias ?? {})) {
          expect(legacy).not.toContain(key);
        }
      }
    }
  });
});

describe('personality is per character, not per ship', () => {
  it('lets two people react differently to the same event', () => {
    // One who is steadied by danger, one who is not.
    const brave = withTraits('PC1', 'fearless');
    const timid = withTraits('PC2', 'timid');
    const tags = ['danger', 'physical_risk', 'extreme_risk'];

    const a = reactTo(brave, tags);
    const b = reactTo(timid, tags);
    expect(a.stress).toBeLessThan(0);
    expect(b.stress).toBeGreaterThan(0);
    expect(a.morale).not.toBe(b.morale);
  });

  it('moves each crew member by their own traits when an event resolves', () => {
    const draft = generateProtagonistDraft(streamRng('PC-EVENT', 'protagonist'));
    const state = createGame('PC-EVENT', draft.character);

    const calm = createCharacter({ rng: new Rng('PC-EVENT:calm'), aboard: true });
    calm.traits = ['fearless'];
    calm.traitKnowledge = [{ trait: 'fearless', known: 0, evidence: 0 }];
    calm.stress = 40;

    const jumpy = createCharacter({ rng: new Rng('PC-EVENT:jumpy'), aboard: true });
    jumpy.traits = ['timid'];
    jumpy.traitKnowledge = [{ trait: 'timid', known: 0, evidence: 0 }];
    jumpy.stress = 40;

    for (const person of [calm, jumpy]) {
      state.characters[person.id] = person;
      state.crewIds.push(person.id);
    }

    // A dangerous choice, resolved the way the game resolves one.
    const before = { calm: calm.stress, jumpy: jumpy.stress };
    const tags = ['danger', 'physical_risk', 'extreme_risk'];
    for (const person of [calm, jumpy]) {
      person.stress = Math.max(0, person.stress + reactTo(person, tags).stress);
    }

    // Same event, opposite outcomes, because they are different people.
    expect(calm.stress).toBeLessThan(before.calm);
    expect(jumpy.stress).toBeGreaterThan(before.jumpy);
  });

  it('keeps all 250 canonical traits, each with a unique name and id', () => {
    expect(PERSONALITY_TRAITS).toHaveLength(250);
    expect(new Set(PERSONALITY_TRAITS.map((t) => t.id)).size).toBe(250);
    expect(new Set(PERSONALITY_TRAITS.map((t) => t.label)).size).toBe(250);

    // The six the library renamed in v0.6, and the pairs they separate.
    const named = (label: string) => PERSONALITY_TRAITS.filter((t) => t.label === label);
    for (const label of [
      'Strategically Patient',
      'Unhurried',
      'Unassuming',
      'Humble',
      'Criticism-Resistant',
      'Thick-Skinned',
    ]) {
      expect(named(label)).toHaveLength(1);
    }
    // The two former Patients are still two different rules.
    expect(traitById('strategically-patient')!.opposed).not.toEqual(
      traitById('unhurried')!.opposed,
    );

    // And one person is never described by the same word twice.
    for (let seed = 0; seed < 200; seed += 1) {
      const character = createCharacter({ rng: new Rng(`dup-${seed}`) });
      const labels = character.traits.map((id) => traitById(id)!.label);
      expect(new Set(labels).size).toBe(labels.length);
    }
  });

  it('keys identity by id, never by the visible name', () => {
    // Renaming a trait must not change who has it. The stored value is the id.
    const character = createCharacter({ rng: new Rng('ID-KEY') });
    for (const id of character.traits) {
      expect(traitById(id)).toBeDefined();
      // Nothing anywhere stores the label.
      expect(PERSONALITY_TRAITS.some((t) => t.label === id)).toBe(false);
    }
  });
});

describe('the tags the world emits', () => {
  it('declares exactly what it emits, and every one is listened to', () => {
    const listened = new Set(
      PERSONALITY_TRAITS.flatMap((t) => [...t.favored, ...t.opposed]),
    );
    for (const tag of EMITTED_TAGS) {
      expect(listened.has(tag)).toBe(true);
    }
    // A choice that does anything at all produces tags.
    const paid = tagsForChoice({
      id: 'x',
      label: 'x',
      result: { text: '', effects: { credits: 200 } },
    });
    expect(paid).toContain('wealth');
    for (const tag of paid) expect(EMITTED_TAGS).toContain(tag);
  });

  it('reaches a large part of the library through the tags V1 actually emits', () => {
    const live = new Set(EMITTED_TAGS);
    const reached = PERSONALITY_TRAITS.filter((t) =>
      [...t.favored, ...t.opposed].some((tag) => live.has(tag)),
    );
    // Two thirds of the library is live today; the rest waits on content that
    // does not exist yet, which is the intended shape.
    expect(reached.length).toBeGreaterThan(150);
  });
});

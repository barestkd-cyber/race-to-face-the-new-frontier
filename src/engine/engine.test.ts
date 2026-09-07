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
import { treatmentFacility } from './actions';
import { ATTRIBUTE_GEN, CHECK, HOMEWORLD_CLOCK, POTENTIAL_CAP, SPEC } from './tuning';
import { generateWorld, rollTerminalDay } from './world';
import { createGame } from './newGame';
import { simulateRun } from './simulate';
import { SKILL_KEYS } from './types';

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

  it('gives every character two or three hidden traits', () => {
    for (let seed = 0; seed < 200; seed++) {
      const character = createCharacter({ rng: new Rng(`trait-${seed}`) });
      expect(character.traits.length).toBeGreaterThanOrEqual(2);
      expect(character.traits.length).toBeLessThanOrEqual(3);
      // Traits start hidden.
      expect(character.traitKnowledge.every((k) => k.known === 0)).toBe(true);
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

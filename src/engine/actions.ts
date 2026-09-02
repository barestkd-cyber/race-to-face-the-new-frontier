/**
 * Location and ship actions: repair, medical treatment, rest, trade, refuelling.
 *
 * These are the things the player does with time and resources rather than
 * through the event system.
 */

import { bestAt, performCheck, selectParticipants, type CheckContext } from './check';
import {
  addItem,
  autoEquipParty,
  countItem,
  fuelUnitsOf,
  getItem,
  removeItem,
  toolBonus,
} from './inventory';
import { buyPrice, negotiationSwing, sellPrice, type PriceContext } from './economy';
import { crisisMultiplierFromInfrastructure } from './economy';
import { pushLog } from './log';
import type { Rng } from './rng';
import { medicalFacility, qualityIndex, safeCrewCapacity, SYSTEM_LABELS } from './ship';
import { advanceTime, applyStress, clampMorale, crewMembers } from './sim';
import { autoResolveRoutine, selectEvent } from './eventEngine';
import { MEDICINE, REPAIR, REST, SHIPS } from './tuning';
import { requiresSurgery, treatWound } from './wounds';
import type {
  Character,
  GameState,
  ItemId,
  LocationState,
  ShipRoom,
  ShipSystemKind,
  Wound,
} from './types';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function context(state: GameState): CheckContext {
  return { characters: state.characters, morale: state.morale, hours: state.hours };
}

export function currentLocation(state: GameState): LocationState | undefined {
  return state.currentLocationId ? state.locations[state.currentLocationId] : undefined;
}

export function priceContext(state: GameState): PriceContext | null {
  const location = currentLocation(state);
  if (!location) return null;
  return {
    location,
    crisisMultiplier: crisisMultiplierFromInfrastructure(state.homeworld.infrastructure),
    negotiationModifier: state.trade?.negotiated ? state.trade.priceModifier : 0,
  };
}

// ---------------------------------------------------------------------------
// Repair
// ---------------------------------------------------------------------------

export interface RepairTarget {
  key: string;
  label: string;
  condition: number;
  kind: 'system' | 'room';
  systemKind?: ShipSystemKind;
  roomId?: string;
}

export function repairTargets(state: GameState): RepairTarget[] {
  const ship = state.ship;
  if (!ship || ship.destroyed) return [];

  const targets: RepairTarget[] = [];
  for (const system of Object.values(ship.systems)) {
    if (!system.installed) continue;
    if (system.condition >= 100) continue;
    targets.push({
      key: `sys:${system.kind}`,
      label: SYSTEM_LABELS[system.kind],
      condition: system.condition,
      kind: 'system',
      systemKind: system.kind,
    });
  }
  for (const room of ship.rooms) {
    if (room.condition >= 100) continue;
    targets.push({
      key: `room:${room.id}`,
      label: room.kind.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()),
      condition: room.condition,
      kind: 'room',
      roomId: room.id,
    });
  }
  return targets.sort((a, b) => a.condition - b.condition);
}

export interface RepairQuoteDetail {
  points: number;
  parts: number;
  hours: number;
  credits: number;
  canAfford: boolean;
  engineer: Character | null;
  engineeringSkill: number;
}

export function quoteRepairAction(
  state: GameState,
  target: RepairTarget,
  points: number,
  payYard: boolean,
): RepairQuoteDetail {
  const crew = crewMembers(state);
  const engineer = bestAt(crew, 'mechanicalEngineering');
  const skill = engineer
    ? engineer.skills.mechanicalEngineering + toolBonus(engineer, 'mechanicalEngineering', state.ship)
    : 0;

  // Core systems are more demanding to work on than living space.
  const targetFactor = target.kind === 'system' ? 1.25 : 0.8;
  const sizeFactor = (state.ship ? SHIPS.massFactor[state.ship.size] : 1) * targetFactor;
  const efficiency = 1 - Math.min(REPAIR.maxSkillEfficiency, (skill / 100) * REPAIR.maxSkillEfficiency);

  const parts = payYard ? 0 : Math.ceil(points * REPAIR.partsPerConditionPoint * sizeFactor * efficiency);
  const hours = payYard
    ? Math.max(1, points * REPAIR.hoursPerConditionPoint * sizeFactor * 0.4)
    : Math.max(0.5, points * REPAIR.hoursPerConditionPoint * sizeFactor * efficiency);
  const credits = payYard ? Math.ceil(points * REPAIR.yardCreditsPerPoint * sizeFactor) : 0;

  return {
    points,
    parts,
    hours,
    credits,
    canAfford: state.resources.repairParts >= parts && state.resources.credits >= credits,
    engineer,
    engineeringSkill: skill,
  };
}

export function performRepair(
  state: GameState,
  target: RepairTarget,
  points: number,
  payYard: boolean,
  rng: Rng,
): string[] {
  const lines: string[] = [];
  const ship = state.ship;
  if (!ship || ship.destroyed) return ['There is no ship to repair.'];

  const quote = quoteRepairAction(state, target, points, payYard);
  if (!quote.canAfford) {
    return [
      payYard
        ? `The yard wants ${quote.credits} credits and you have ${Math.floor(state.resources.credits)}.`
        : `That needs ${quote.parts} repair parts and you have ${state.resources.repairParts}.`,
    ];
  }

  state.resources.repairParts -= quote.parts;
  state.resources.credits -= quote.credits;

  const advance = advanceTime(state, quote.hours, rng);
  lines.push(...advance.lines);

  let achieved = points;

  if (!payYard) {
    // Doing it yourself is a real check; a yard just does the work.
    const check = performCheck(
      {
        skill: 'mechanicalEngineering',
        secondarySkill: 'electricalEngineering',
        participantIds: selectParticipants(crewMembers(state), 'mechanicalEngineering', 'duo'),
        leaderId: state.captainId,
        label: `Repair ${target.label}`,
      },
      context(state),
      rng,
    );

    switch (check.outcome) {
      case 'exceptional':
        achieved = Math.round(points * 1.35);
        lines.push('The repair goes better than planned.');
        break;
      case 'success':
        lines.push('The repair holds.');
        break;
      case 'partial':
        achieved = Math.round(points * 0.6);
        lines.push('It is patched, not fixed.');
        break;
      case 'failure':
        achieved = Math.round(points * 0.2);
        state.resources.repairParts = Math.max(0, state.resources.repairParts - Math.ceil(quote.parts * 0.3));
        lines.push('Parts are wasted and the fault is still there.');
        break;
      case 'criticalFailure':
        achieved = -Math.round(points * 0.4);
        lines.push('Something else breaks in the process.');
        break;
    }

    if (state.debug.enabled) {
      state.debug.records.push({
        id: `dbg_repair_${state.debug.records.length}`,
        hours: state.hours,
        label: `Repair ${target.label}`,
        detail: { check, quote, achieved },
      });
    }
  } else {
    lines.push(`The yard works on the ${target.label.toLowerCase()}.`);
  }

  if (target.kind === 'system' && target.systemKind) {
    const system = ship.systems[target.systemKind];
    system.condition = Math.max(0, Math.min(100, system.condition + achieved));
    lines.push(`${SYSTEM_LABELS[target.systemKind]} condition is now ${Math.round(system.condition)}.`);
  } else if (target.roomId) {
    const room = ship.rooms.find((r) => r.id === target.roomId);
    if (room) {
      room.condition = Math.max(0, Math.min(100, room.condition + achieved));
      lines.push(`Room condition is now ${Math.round(room.condition)}.`);
    }
  }

  pushLog(state, 'system', `Repaired ${target.label}.`);
  return lines;
}

// ---------------------------------------------------------------------------
// Medical treatment
// ---------------------------------------------------------------------------

export interface TreatmentOption {
  characterId: string;
  woundId: string;
  label: string;
  needsSurgery: boolean;
  skill: 'firstAid' | 'surgery';
  estimatedMedicine: number;
  canAttempt: boolean;
  reason?: string;
}

export function treatmentOptions(state: GameState): TreatmentOption[] {
  const options: TreatmentOption[] = [];
  const crew = crewMembers(state);

  for (const member of crew) {
    for (const wound of member.wounds) {
      if (wound.treated) continue;
      const surgery = requiresSurgery(wound);
      const skill = surgery ? ('surgery' as const) : ('firstAid' as const);
      const best = bestAt(crew, skill);
      const [lo, hi] = MEDICINE.usage[wound.severity];
      const estimate = Math.ceil((lo + hi) / 2);
      const capable = (best?.skills[skill] ?? 0) > 0;

      options.push({
        characterId: member.id,
        woundId: wound.id,
        label: `${member.name} — ${wound.label} (${wound.severity})`,
        needsSurgery: surgery,
        skill,
        estimatedMedicine: estimate,
        canAttempt: capable && state.resources.medicine > 0,
        reason: !capable
          ? `Nobody aboard has ${skill === 'surgery' ? 'Surgery' : 'First Aid'} training.`
          : state.resources.medicine <= 0
            ? 'No medicine left.'
            : undefined,
      });
    }
  }

  return options;
}

export function performTreatment(
  state: GameState,
  option: TreatmentOption,
  rng: Rng,
): string[] {
  const lines: string[] = [];
  const patient = state.characters[option.characterId];
  const wound = patient?.wounds.find((w) => w.id === option.woundId);
  if (!patient || !wound) return ['That injury is no longer there.'];

  const crew = crewMembers(state);
  const facility = medicalFacility(state.ship);
  const facilityBonus = facility ? MEDICINE.medBayBonus[facility.quality] : 0;

  const medic = bestAt(
    crew.filter((c) => c.id !== patient.id || crew.length === 1),
    option.skill,
  );
  if (!medic) return ['Nobody can do this.'];

  const toolHelp = toolBonus(medic, option.skill, state.ship);
  const hours = option.needsSurgery ? rng.float(2, 5) : rng.float(0.5, 1.5);

  const advance = advanceTime(state, hours, rng);
  lines.push(...advance.lines);

  const check = performCheck(
    {
      skill: option.skill,
      secondarySkill: 'medicalDiagnostics',
      modifiers: [
        ...(facilityBonus > 0
          ? [{ label: facility ? 'Medical facility' : 'Facility', value: facilityBonus }]
          : [{ label: 'No proper facility', value: -8 }]),
        ...(toolHelp > 0 ? [{ label: 'Equipment', value: toolHelp }] : []),
      ],
      criticalRisk: option.needsSurgery,
      participantIds: [medic.id],
      label: `${medic.name} treats ${patient.name}`,
    },
    context(state),
    rng,
  );

  const result = treatWound(patient, wound, check.outcome, state.resources.medicine, rng);
  state.resources.medicine = Math.max(0, state.resources.medicine - result.medicineUsed);
  lines.push(...result.lines);

  if (result.medicineUsed > 0) lines.push(`Used ${result.medicineUsed} medicine.`);

  if (state.debug.enabled) {
    state.debug.records.push({
      id: `dbg_treat_${state.debug.records.length}`,
      hours: state.hours,
      label: `Treat ${patient.name}`,
      detail: { check, wound: { ...wound }, medicineUsed: result.medicineUsed },
    });
  }

  if (!patient.alive) {
    state.crewIds = state.crewIds.filter((id) => id !== patient.id);
  }

  pushLog(state, 'medical', lines[lines.length - 1] ?? 'Treatment attempted.');
  return lines;
}

// ---------------------------------------------------------------------------
// Rest
// ---------------------------------------------------------------------------

export interface RestResult {
  lines: string[];
  interrupted: boolean;
}

export function rest(state: GameState, hours: number, rng: Rng): RestResult {
  const lines: string[] = [];
  const location = currentLocation(state);
  const danger = location?.danger ?? state.travel?.danger ?? 0;

  // A dangerous place can interrupt rest; a safe berth normally will not.
  const interruptChance = danger * REST.dangerInterruptScale * (hours / 8);
  const interrupted = rng.chance(Math.min(0.6, interruptChance));

  const slept = interrupted ? hours * rng.float(0.25, 0.7) : hours;
  const advance = advanceTime(state, slept, rng, { resting: true });
  lines.push(...advance.lines);

  // Routine events can auto-resolve while resting.
  if (rng.chance(REST.routineEventChance)) {
    const def = selectEvent(state, ['social', 'technical', 'medical'], rng, {
      routine: true,
      danger,
    });
    if (def) {
      const line = autoResolveRoutine(state, def, rng);
      if (line) lines.push(line);
    }
  }

  if (interrupted) {
    lines.push('Rest is cut short.');
    const def = selectEvent(state, ['hostile', 'technical', 'social'], rng, {
      routine: false,
      danger,
    });
    if (def) {
      lines.push('Something needs attention.');
      return { lines, interrupted: true };
    }
  } else {
    state.morale = clampMorale(state.morale + Math.min(6, hours / 4));
    lines.push(`Rested ${Math.round(slept)} hours.`);
  }

  pushLog(state, 'crew', `Rested ${Math.round(slept)} hours.`);
  return { lines, interrupted };
}

// ---------------------------------------------------------------------------
// Trade
// ---------------------------------------------------------------------------

export function beginTrade(state: GameState): void {
  const location = currentLocation(state);
  if (!location?.market) return;
  state.trade = {
    locationId: location.id,
    mode: 'buy',
    priceModifier: 0,
    negotiated: false,
  };
  state.screen = 'trade';
}

export function negotiatePrices(state: GameState, rng: Rng): string[] {
  const lines: string[] = [];
  if (!state.trade || state.trade.negotiated) return ['You have already talked terms.'];

  const check = performCheck(
    {
      skill: 'negotiation',
      secondarySkill: 'persuasion',
      participantIds: selectParticipants(crewMembers(state), 'negotiation', 'individual'),
      label: 'Negotiate terms',
    },
    context(state),
    rng,
  );

  state.trade.priceModifier = negotiationSwing(check.outcome);
  state.trade.negotiated = true;
  state.trade.lastCheck = check;

  const advance = advanceTime(state, 0.75, rng);
  lines.push(...advance.lines);

  const pct = Math.round(state.trade.priceModifier * 100);
  lines.push(
    pct > 0
      ? `Terms improve by about ${pct}%.`
      : pct < 0
        ? `You have soured it. Prices are ${Math.abs(pct)}% worse.`
        : 'They will not move on price.',
  );

  return lines;
}

export function buyItem(
  state: GameState,
  uid: string,
  qty: number,
  rng: Rng,
): string[] {
  const location = currentLocation(state);
  const ctx = priceContext(state);
  if (!location?.market || !ctx) return ['There is nothing to buy here.'];

  const stack = location.market.stock.find((s) => s.uid === uid);
  if (!stack) return ['That is gone.'];

  const take = Math.min(qty, stack.qty);
  const cost = buyPrice(stack.itemId, ctx, stack.condition, take);

  if (state.resources.credits < cost) {
    return [`That costs ${cost} credits and you have ${Math.floor(state.resources.credits)}.`];
  }

  state.resources.credits -= cost;
  stack.qty -= take;
  if (stack.qty <= 0) {
    location.market.stock = location.market.stock.filter((s) => s.uid !== uid);
  }

  const lines = applyPurchase(state, stack.itemId, take, stack.condition, rng);
  lines.unshift(`Bought ${take} × ${getItem(stack.itemId)?.name ?? stack.itemId} for ${cost} credits.`);
  pushLog(state, 'trade', lines[0]!);
  return lines;
}

/** Some purchases go straight into a resource pool rather than the hold. */
function applyPurchase(
  state: GameState,
  itemId: ItemId,
  qty: number,
  condition: number,
  rng: Rng,
): string[] {
  const def = getItem(itemId);
  const container = state.ship && !state.ship.destroyed ? state.ship.cargo : null;

  if (!container) {
    const carrier = crewMembers(state)[0];
    if (carrier) addItem(carrier.backpack, itemId, qty, condition, rng);
    return ['Stowed in a pack — you have no hold.'];
  }

  addItem(container, itemId, qty, condition, rng);
  void def;
  return [];
}

export function sellStack(state: GameState, uid: string, qty: number): string[] {
  const ctx = priceContext(state);
  const ship = state.ship;
  if (!ctx) return ['Nobody here is buying.'];
  if (!ship || ship.destroyed) return ['You have nothing to sell from.'];

  const stack = ship.cargo.find((s) => s.uid === uid);
  if (!stack) return ['That is not in the hold.'];

  const take = Math.min(qty, stack.qty);
  const paid = sellPrice(stack.itemId, ctx, stack.condition, take);

  stack.qty -= take;
  if (stack.qty <= 0) ship.cargo = ship.cargo.filter((s) => s.uid !== uid);
  state.resources.credits += paid;

  const line = `Sold ${take} × ${getItem(stack.itemId)?.name ?? stack.itemId} for ${paid} credits.`;
  pushLog(state, 'trade', line);
  return [line];
}

// ---------------------------------------------------------------------------
// Resupply: fuel, food, medicine, parts
// ---------------------------------------------------------------------------

export type ResupplyKind = 'fuel' | 'food' | 'medicine' | 'repairParts';

const RESUPPLY_UNIT_ITEM: Record<ResupplyKind, ItemId> = {
  fuel: 'fuel_canister',
  food: 'ration_pack',
  medicine: 'medkit_basic',
  repairParts: 'repair_kit',
};

export function resupplyUnitPrice(state: GameState, kind: ResupplyKind): number {
  const ctx = priceContext(state);
  if (!ctx) return 0;
  const itemId = RESUPPLY_UNIT_ITEM[kind];
  const def = getItem(itemId);
  if (!def) return 0;

  const perUnit = buyPrice(itemId, ctx, 100, 1);
  switch (kind) {
    case 'fuel':
      return Math.max(1, Math.round(perUnit / Math.max(1, fuelUnitsOf(itemId))));
    case 'food':
      return Math.max(1, Math.round(perUnit / Math.max(1, def.foodDays ?? 1)));
    case 'medicine':
      return Math.max(1, Math.round(perUnit / Math.max(1, def.medicineUnits ?? 1)));
    case 'repairParts':
      return Math.max(1, Math.round(perUnit / Math.max(1, def.repairParts ?? 1)));
  }
}

export function resupply(
  state: GameState,
  kind: ResupplyKind,
  amount: number,
  rng: Rng,
): string[] {
  const unit = resupplyUnitPrice(state, kind);
  if (unit <= 0) return ['Not available here.'];

  let quantity = Math.max(0, Math.round(amount));
  if (kind === 'fuel') {
    quantity = Math.min(quantity, Math.round(state.resources.fuelCapacity - state.resources.fuel));
  }
  if (quantity <= 0) return ['Nothing to buy.'];

  const cost = unit * quantity;
  if (state.resources.credits < cost) {
    return [`That costs ${cost} credits and you have ${Math.floor(state.resources.credits)}.`];
  }

  state.resources.credits -= cost;
  state.resources[kind] += quantity;

  // Loading supplies takes a little time, which also stops a no-op resupply
  // from being repeatable for free.
  const advance = advanceTime(state, 0.5, rng);

  const label =
    kind === 'repairParts' ? 'repair parts' : kind === 'food' ? 'days of food' : kind;
  const line = `Bought ${quantity} ${label} for ${cost} credits.`;
  pushLog(state, 'trade', line);
  return [line, ...advance.lines];
}

/** Empty a fuel canister from the hold into the tanks. */
export function decantFuel(state: GameState): string[] {
  const ship = state.ship;
  if (!ship || ship.destroyed) return ['No tanks to fill.'];
  if (countItem(ship.cargo, 'fuel_canister') <= 0) return ['No fuel canisters aboard.'];

  const units = fuelUnitsOf('fuel_canister');
  const space = state.resources.fuelCapacity - state.resources.fuel;
  if (space < 1) return ['The tanks are already full.'];

  removeItem(ship.cargo, 'fuel_canister', 1);
  const added = Math.min(units, space);
  state.resources.fuel += added;

  const line = `Decanted a canister — ${Math.round(added)} fuel added.`;
  pushLog(state, 'system', line);
  return [line];
}

/** Break a spare part or scrap down into repair parts. */
export function breakDownForParts(state: GameState, uid: string): string[] {
  const ship = state.ship;
  if (!ship || ship.destroyed) return ['Nowhere to work.'];
  const stack = ship.cargo.find((s) => s.uid === uid);
  if (!stack) return ['That is not in the hold.'];

  const def = getItem(stack.itemId);
  const yieldPer = def?.repairParts ?? 0;
  if (yieldPer <= 0) return [`${def?.name ?? 'That'} does not break down into anything useful.`];

  const gained = Math.max(1, Math.round(yieldPer * stack.qty * (0.4 + 0.6 * (stack.condition / 100))));
  ship.cargo = ship.cargo.filter((s) => s.uid !== uid);
  state.resources.repairParts += gained;

  const line = `Stripped ${stack.qty} × ${def?.name ?? stack.itemId} for ${gained} repair parts.`;
  pushLog(state, 'system', line);
  return [line];
}

// ---------------------------------------------------------------------------
// Social — spending time with the crew
// ---------------------------------------------------------------------------

export function socialise(state: GameState, rng: Rng): string[] {
  const lines: string[] = [];
  const crew = crewMembers(state);
  if (crew.length < 2) return ['There is nobody to talk to.'];

  const advance = advanceTime(state, rng.float(1.5, 3.5), rng);
  lines.push(...advance.lines);

  // Time together builds familiarity, which is how hidden traits surface.
  for (const a of crew) {
    for (const b of crew) {
      if (a.id === b.id) continue;
      const rel = a.relationships[b.id] ?? { value: 0, familiarity: 0, kind: 'crew' as const };
      rel.familiarity = Math.min(100, rel.familiarity + rng.int(2, 6));
      rel.value = Math.max(-100, Math.min(100, rel.value + rng.int(-1, 4)));
      a.relationships[b.id] = rel;
    }
  }

  // Trait discovery.
  for (const member of crew) {
    if (member.isPlayer) continue;
    const observer = crew.find((c) => c.isPlayer) ?? crew[0]!;
    const familiarity = observer.relationships[member.id]?.familiarity ?? 0;
    for (const knowledge of member.traitKnowledge) {
      if (knowledge.known >= 2) continue;
      if (!rng.percent(familiarity * 0.28 + observer.attributes.evaluation * 1.6)) continue;
      knowledge.evidence += rng.int(1, 3);
      if (knowledge.evidence >= 7 && knowledge.known < 2) {
        knowledge.known = 2;
        lines.push(`You are now sure about something in ${member.name}.`);
      } else if (knowledge.known === 0) {
        knowledge.known = 1;
        lines.push(`You notice something about ${member.name}.`);
      }
    }
  }

  for (const member of crew) applyStress(member, -rng.float(2, 6));
  state.morale = clampMorale(state.morale + rng.int(1, 4));
  lines.push('The crew spends some time not working.');

  pushLog(state, 'crew', 'Time spent with the crew.');
  return lines;
}

// ---------------------------------------------------------------------------
// Family and contacts
// ---------------------------------------------------------------------------

/**
 * People you know who are not aboard. This is an INFORMATION list — the crew
 * screen uses it to answer "who do I know about". It confers no ability to act
 * on them; for that you have to be standing where they are.
 */
export function knownContacts(state: GameState): Character[] {
  const player = state.characters[state.playerId];
  return Object.values(state.characters)
    .filter((c) => c.alive && !c.aboard && (player?.relationships[c.id] !== undefined))
    .sort((a, b) => {
      const aRel = player?.relationships[a.id]?.value ?? 0;
      const bRel = player?.relationships[b.id]?.value ?? 0;
      return bRel - aRel;
    });
}

/** The people actually standing in the place the player is standing in. */
export function contactsHere(state: GameState): Character[] {
  if (!state.currentPlaceId) return [];
  return knownContacts(state).filter((c) => c.placeId === state.currentPlaceId);
}

/** Whether this person can be talked to right now, and why not if not. */
export function contactAccess(
  state: GameState,
  id: string,
): { ok: boolean; reason?: string } {
  const person = state.characters[id];
  if (!person) return { ok: false, reason: 'You do not know them.' };
  if (person.aboard) return { ok: false, reason: 'They are already aboard.' };
  if (!person.alive) return { ok: false, reason: 'They are gone.' };

  if (!person.placeId) {
    return { ok: false, reason: 'Nobody can tell you where they are.' };
  }
  if (!person.placeKnown) {
    return { ok: false, reason: 'You do not know where to find them.' };
  }
  if (person.placeId !== state.currentPlaceId) {
    const place = state.places[person.placeId];
    return { ok: false, reason: place ? `They are at ${place.name}.` : 'They are elsewhere.' };
  }
  if (person.availability === 'working') {
    return { ok: false, reason: 'They are on shift and cannot stop.' };
  }
  if (person.availability === 'unreachable') {
    return { ok: false, reason: 'They will not see you.' };
  }
  return { ok: true };
}

export function isFamily(state: GameState, id: string): boolean {
  return state.homeworld.familyIds.includes(id);
}

/** Spend a few hours with someone. Builds the relationship and reveals them. */
export function visitContact(state: GameState, id: string, rng: Rng): string[] {
  const lines: string[] = [];
  const contact = state.characters[id];
  const player = state.characters[state.playerId];
  if (!contact || !player) return ['They are not here.'];

  const access = contactAccess(state, id);
  if (!access.ok) return [access.reason ?? 'You cannot reach them.'];

  const advance = advanceTime(state, rng.float(2, 5), rng);
  lines.push(...advance.lines);

  const rel = player.relationships[id] ?? { value: 0, familiarity: 0, kind: 'friend' as const };
  rel.value = Math.max(-100, Math.min(100, rel.value + rng.int(2, 8)));
  rel.familiarity = Math.min(100, rel.familiarity + rng.int(3, 9));
  player.relationships[id] = rel;
  contact.relationships[player.id] = { ...rel };

  // Time together is how hidden tendencies surface.
  for (const knowledge of contact.traitKnowledge) {
    if (knowledge.known >= 2) continue;
    if (!rng.percent(rel.familiarity * 0.3 + player.attributes.evaluation * 1.5)) continue;
    knowledge.evidence += rng.int(1, 3);
    if (knowledge.evidence >= 7) {
      knowledge.known = 2;
      lines.push(`You understand something about ${contact.name} now.`);
    } else if (knowledge.known === 0) {
      knowledge.known = 1;
    }
  }

  state.morale = clampMorale(state.morale + rng.int(0, 3));
  lines.push(`You spend a few hours with ${contact.name}.`);
  pushLog(state, 'crew', `Visited ${contact.name} ${contact.surname}.`);
  return lines;
}

/**
 * Offer someone a berth. Family will generally come if the relationship is
 * there; whether the ship can carry them is the player's problem.
 */
export function offerPassage(state: GameState, id: string, rng: Rng): string[] {
  const lines: string[] = [];
  const contact = state.characters[id];
  const player = state.characters[state.playerId];
  if (!contact || !player) return ['They are not here.'];
  if (contact.aboard) return [`${contact.name} is already aboard.`];

  // You cannot offer somebody a berth from the other side of a city.
  const access = contactAccess(state, id);
  if (!access.ok) return [access.reason ?? 'You cannot reach them.'];

  const rel = player.relationships[id];
  const closeness = rel?.value ?? 0;
  const family = isFamily(state, id);

  // Someone who barely knows you will not abandon their life on your word.
  const threshold = family ? 10 : 45;
  if (closeness < threshold) {
    const advance = advanceTime(state, 1, rng);
    lines.push(...advance.lines);
    lines.push(`${contact.name} will not go with you. Not yet.`);
    return lines;
  }

  const advance = advanceTime(state, rng.float(1.5, 3), rng);
  lines.push(...advance.lines);

  contact.aboard = true;
  delete contact.placeId;
  contact.availability = 'available';
  state.characters[id] = contact;
  state.crewIds.push(id);
  if (family && !state.homeworld.rescuedFamilyIds.includes(id)) {
    state.homeworld.rescuedFamilyIds.push(id);
  }

  for (const member of crewMembers(state)) {
    if (member.id === id) continue;
    member.relationships[id] ??= { value: 0, familiarity: 5, kind: 'crew' };
    contact.relationships[member.id] ??= { value: 0, familiarity: 5, kind: 'crew' };
  }

  autoEquipParty([contact], state.ship);
  state.morale = clampMorale(state.morale + (family ? 8 : 4));

  const capacity = state.ship ? safeCrewCapacity(state.ship) : 0;
  lines.push(`${contact.name} ${contact.surname} comes aboard.`);
  if (crewMembers(state).length > capacity) {
    lines.push(`That puts you over safe capacity — ${crewMembers(state).length} against ${capacity}.`);
  }
  pushLog(state, 'crew', `${contact.name} ${contact.surname} came aboard.`);

  return lines;
}

// ---------------------------------------------------------------------------
// Facility helpers used by the UI
// ---------------------------------------------------------------------------

export function medicalFacilityLabel(state: GameState): string {
  const facility: ShipRoom | null = medicalFacility(state.ship);
  if (!facility) return 'No medical facility — field treatment only.';
  const quality = facility.quality;
  return `${facility.kind === 'medicalWard' ? 'Medical Ward' : 'Med Bay'} (${quality}), +${MEDICINE.medBayBonus[quality]} to treatment.`;
}

export function canRepairHere(state: GameState): boolean {
  const location = currentLocation(state);
  return Boolean(location?.actions.includes('repair'));
}

export function bestEngineerLabel(state: GameState): string {
  const engineer = bestAt(crewMembers(state), 'mechanicalEngineering');
  if (!engineer) return 'Nobody aboard can do this work.';
  return `${engineer.name} — Mechanical Engineering ${engineer.skills.mechanicalEngineering}`;
}

export function qualityRank(room: ShipRoom): number {
  return qualityIndex(room.quality);
}

export function untreatedWoundCount(state: GameState): number {
  return crewMembers(state).reduce(
    (sum, c) => sum + c.wounds.filter((w: Wound) => !w.treated).length,
    0,
  );
}

/**
 * The ship.
 *
 * Systems, rooms, what she can carry, what she burns, and what it costs to put
 * her back together. Every number here is derived by the engine; this screen
 * only chooses a target and dispatches the work.
 */

import { useState } from 'react';
import { Btn, Chip, Duration, Empty, Fold, KV, Meter, Panel, Row, Segments, Stepper } from '../components';
import { store, useGame } from '../useStore';
import {
  bestEngineerLabel,
  canRepairHere,
  quoteRepairAction,
  repairTargets,
  type RepairTarget,
} from '../../engine/actions';
import { fuelValue } from '../../engine/inventory';
import { formatDuration } from '../../engine/log';
import {
  describeShip,
  estimateFuel,
  ROOM_DESCRIPTIONS,
  ROOM_LABELS,
  safeCrewCapacity,
  shipConditionLabel,
  SYSTEM_DESCRIPTIONS,
  SYSTEM_LABELS,
} from '../../engine/ship';
import { crewMembers } from '../../engine/sim';
import {
  SHIP_QUALITY_LABELS,
  SHIP_SIZE_LABELS,
  SHIP_SYSTEM_KINDS,
} from '../../engine/types';

export function ShipScreen() {
  const state = useGame();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [pointsWanted, setPointsWanted] = useState(10);

  if (!state) {
    return <Empty>No run is loaded, captain. Start or load a game first.</Empty>;
  }

  const ship = state.ship;
  if (!ship) {
    return <Empty>You have no ship. There is nothing to inspect.</Empty>;
  }

  const crew = crewMembers(state);
  const capacity = safeCrewCapacity(ship);
  const overBy = Math.max(0, crew.length - capacity);

  const fuel = estimateFuel(ship, crew, state.resources.fuel);
  const fuelFraction =
    state.resources.fuelCapacity > 0 ? state.resources.fuel / state.resources.fuelCapacity : 0;
  const canistersAboard = fuelValue(ship.cargo) > 0;
  const tanksFull = state.resources.fuel >= state.resources.fuelCapacity - 0.5;

  const targets = repairTargets(state);
  const target: RepairTarget | undefined =
    targets.find((t) => t.key === selectedKey) ?? targets[0];
  const maxPoints = target ? Math.max(1, Math.round(100 - target.condition)) : 1;
  const points = Math.max(1, Math.min(pointsWanted, maxPoints));
  const selfQuote = target ? quoteRepairAction(state, target, points, false) : null;
  const yardQuote = target ? quoteRepairAction(state, target, points, true) : null;
  const yardAvailable = canRepairHere(state);

  return (
    <div className="stack">
      {/* -- Identity ------------------------------------------------------ */}
      <Panel title="Vessel" aside={SHIP_QUALITY_LABELS[ship.quality]}>
        <div className="split">
          <span className="value">{ship.name}</span>
          <Chip tone={ship.destroyed ? 'red' : 'cyan'}>{SHIP_SIZE_LABELS[ship.size]}</Chip>
        </div>
        <p className="prose prose--dim" style={{ marginTop: 4 }}>
          {describeShip(ship)} · {SHIP_QUALITY_LABELS[ship.quality]} build
        </p>
        {ship.destroyed && (
          <p className="prose" style={{ marginTop: 8 }}>
            <span className="red">This ship is destroyed.</span> She holds no air and
            goes nowhere. Nothing aboard can be repaired.
          </p>
        )}
      </Panel>

      {/* -- Capacities ---------------------------------------------------- */}
      <Panel title="Capacity" aside={`${crew.length} / ${capacity}`}>
        <KV
          items={[
            ['Quarters', <span className="readout">{ship.quartersCapacity}</span>],
            ['Life support', <span className="readout">{ship.lifeSupportCapacity}</span>],
            [
              'Safe crew',
              <span className={overBy > 0 ? 'red readout' : 'readout'}>{capacity}</span>,
            ],
            [
              'Aboard now',
              <span className={overBy > 0 ? 'red readout' : 'readout'}>{crew.length}</span>,
            ],
          ]}
        />
        <div style={{ marginTop: 6 }}>
          <Meter
            value={crew.length}
            max={Math.max(1, capacity)}
            color={overBy > 0 ? 'var(--red)' : 'var(--green)'}
          />
        </div>
        <p className="prose prose--dim" style={{ marginTop: 8 }}>
          {overBy > 0
            ? `You are ${overBy} over what the ship can hold safely. That runs as constant stress on the crew and a steady drag on morale until you fix the quarters, fix life support, or reduce the roster.`
            : 'Safe crew is the lower of quarters and life support. Better rooms or a better life support system raise it.'}
        </p>
      </Panel>

      {/* -- Fuel ---------------------------------------------------------- */}
      <Panel title="Fuel" aside={`${Math.round(fuelFraction * 100)}%`}>
        <div className="split">
          <span className="label">In the tanks</span>
          <span className="value readout">
            {Math.round(state.resources.fuel)} / {Math.round(state.resources.fuelCapacity)}
          </span>
        </div>
        <div style={{ marginTop: 6 }}>
          <Segments value={state.resources.fuel} max={Math.max(1, state.resources.fuelCapacity)} />
        </div>
        <div style={{ marginTop: 8 }}>
          <KV
            items={[
              ['Burn', <span className="readout">{fuel.unitsPerHour.toFixed(2)} per hour</span>],
              ['Range', <Duration hours={fuel.hoursRemaining} />],
              ['Jumps left', <span className="readout">{fuel.jumpsRemaining}</span>],
              [
                'Cost of burn',
                <span className="readout">{Math.round(fuel.creditsPerHour)} cr per hour</span>,
              ],
            ]}
          />
        </div>
        <p className="prose prose--dim" style={{ marginTop: 8 }}>
          Burn rises with mass and with worn engines, and falls with a good pilot or
          navigator aboard. Nothing here is stored — it is recomputed from the ship you
          currently have.
        </p>
        <div className="btn-row" style={{ marginTop: 8 }}>
          <Btn
            block
            onClick={() => store.decant()}
            disabled={!canistersAboard || tanksFull || ship.destroyed}
            sub={
              !canistersAboard
                ? 'No canisters in the hold'
                : tanksFull
                  ? 'The tanks are already full'
                  : 'Empties one canister into the tanks'
            }
          >
            Decant A Canister
          </Btn>
        </div>
      </Panel>

      {/* -- Core systems -------------------------------------------------- */}
      <Fold title="Core systems" defaultOpen>
        <div className="rows">
          {SHIP_SYSTEM_KINDS.map((kind) => {
            const system = ship.systems[kind];
            if (!system.installed) {
              return (
                <Row
                  key={kind}
                  title={<span className="faint">{SYSTEM_LABELS[kind]}</span>}
                  sub={
                    <span>
                      Not fitted. The bay is empty — there is nothing here to break or to
                      repair. {SYSTEM_DESCRIPTIONS[kind]}
                    </span>
                  }
                  right={<Chip>Absent</Chip>}
                />
              );
            }
            return (
              <Row
                key={kind}
                title={SYSTEM_LABELS[kind]}
                sub={
                  <span>
                    {SHIP_QUALITY_LABELS[system.quality]} ·{' '}
                    {shipConditionLabel(system.condition)} — {SYSTEM_DESCRIPTIONS[kind]}
                  </span>
                }
                danger={system.condition < 20}
                right={
                  <span style={{ display: 'inline-block', width: 64 }}>
                    <Meter value={system.condition} max={100} />
                    <span className="tiny readout">{Math.round(system.condition)}%</span>
                  </span>
                }
              />
            );
          })}
        </div>
      </Fold>

      {/* -- Rooms --------------------------------------------------------- */}
      <Fold title={`Rooms (${ship.rooms.length})`}>
        <div className="rows">
          {ship.rooms.map((room) => (
            <Row
              key={room.id}
              title={ROOM_LABELS[room.kind]}
              sub={
                <span>
                  {SHIP_QUALITY_LABELS[room.quality]}
                  {room.qualityPotential !== room.quality && (
                    <span className="cyan">
                      {' '}
                      (up to {SHIP_QUALITY_LABELS[room.qualityPotential]})
                    </span>
                  )}{' '}
                  · {shipConditionLabel(room.condition)} — {ROOM_DESCRIPTIONS[room.kind]}
                </span>
              }
              danger={room.condition < 20}
              right={
                <span style={{ display: 'inline-block', width: 64 }}>
                  <Meter value={room.condition} max={100} />
                  <span className="tiny readout">{Math.round(room.condition)}%</span>
                </span>
              }
            />
          ))}
        </div>
      </Fold>

      {/* -- Repair -------------------------------------------------------- */}
      <Panel title="Repair" aside={`${targets.length} needing work`}>
        {ship.destroyed ? (
          <Empty>She is beyond repair.</Empty>
        ) : targets.length === 0 || !target || !selfQuote || !yardQuote ? (
          <Empty>Every system and room is at full condition. Nothing needs work.</Empty>
        ) : (
          <>
            <p className="prose prose--dim">
              Pick what to work on, then how many condition points to buy back. Doing it
              yourself costs parts, hours and a real engineering check that can go wrong.
              A yard just does the work and charges you for it.
            </p>

            <div className="rows" style={{ marginTop: 8, maxHeight: 260, overflowY: 'auto' }}>
              {targets.map((entry) => (
                <Row
                  key={entry.key}
                  selected={entry.key === target.key}
                  onClick={() => {
                    setSelectedKey(entry.key);
                    setPointsWanted(Math.min(10, Math.max(1, Math.round(100 - entry.condition))));
                  }}
                  title={entry.label}
                  sub={`${entry.kind === 'system' ? 'Core system' : 'Room'} · ${shipConditionLabel(entry.condition)}`}
                  danger={entry.condition < 20}
                  right={
                    <span style={{ display: 'inline-block', width: 58 }}>
                      <Meter value={entry.condition} max={100} />
                      <span className="tiny readout">{Math.round(entry.condition)}%</span>
                    </span>
                  }
                />
              ))}
            </div>

            <div className="divider" />

            <div className="split">
              <span className="label">Working on</span>
              <span className="value">{target.label}</span>
            </div>
            <div style={{ marginTop: 8 }}>
              <Stepper
                label="Condition points"
                value={points}
                min={1}
                max={maxPoints}
                step={1}
                onChange={setPointsWanted}
              />
            </div>

            <div className="divider" />

            <KV
              items={[
                ['Condition now', <span className="readout">{Math.round(target.condition)}%</span>],
                [
                  'After the job',
                  <span className="readout">
                    {Math.min(100, Math.round(target.condition + points))}%
                  </span>,
                ],
                [
                  'Parts needed',
                  <span
                    className={
                      state.resources.repairParts < selfQuote.parts ? 'red readout' : 'readout'
                    }
                  >
                    {selfQuote.parts} of {Math.round(state.resources.repairParts)}
                  </span>,
                ],
                ['Our hours', <Duration hours={selfQuote.hours} />],
                [
                  'Yard price',
                  <span
                    className={state.resources.credits < yardQuote.credits ? 'red readout' : 'readout'}
                  >
                    {yardQuote.credits} cr
                  </span>,
                ],
                ['Yard hours', <Duration hours={yardQuote.hours} />],
              ]}
            />

            <p className="tiny" style={{ marginTop: 8 }}>
              Engineer on the job: {bestEngineerLabel(state)}
            </p>
            {!yardAvailable && (
              <p className="tiny faint">
                There is no yard here. Find a place that offers repair work if you want
                someone else to do it.
              </p>
            )}

            <div className="btn-row" style={{ marginTop: 8 }}>
              <Btn
                tone="go"
                wide
                disabled={!selfQuote.canAfford}
                onClick={() => store.repair(target, points, false)}
                sub={`${selfQuote.parts} parts · ${formatDuration(selfQuote.hours)}`}
              >
                Repair Ourselves
              </Btn>
              <Btn
                tone="primary"
                wide
                disabled={!yardAvailable || !yardQuote.canAfford}
                onClick={() => store.repair(target, points, true)}
                sub={`${yardQuote.credits} cr · ${formatDuration(yardQuote.hours)}`}
              >
                Pay The Yard
              </Btn>
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}

/**
 * Ship reveal — shown once, immediately after character generation.
 *
 * The hull silhouette is drawn from `hullVariant` as chunky rectangles so it
 * reads as pixel art rather than a vector illustration.
 */

import { Btn, Chip, Empty, KV, Meter, Panel, Row } from '../components';
import { store, useGame } from '../useStore';
import {
  ROOM_LABELS,
  SYSTEM_LABELS,
  describeShip,
  safeCrewCapacity,
  shipConditionLabel,
} from '../../engine/ship';
import {
  SHIP_QUALITY_LABELS,
  SHIP_SIZE_LABELS,
  SHIP_SYSTEM_KINDS,
  type Ship,
} from '../../engine/types';

type Rect = [x: number, y: number, w: number, h: number];

interface HullSpec {
  plates: Rect[];
  glass: Rect[];
  glow: Rect[];
}

/** Six silhouettes on a 48x24 grid. Nose right, drives left. */
const HULLS: HullSpec[] = [
  {
    // Blunt hauler
    plates: [[8, 8, 28, 8], [14, 4, 14, 4], [16, 16, 10, 3], [36, 9, 6, 6], [42, 11, 3, 2], [4, 7, 4, 4], [4, 13, 4, 4]],
    glass: [[37, 10, 3, 2]],
    glow: [[2, 8, 2, 2], [2, 14, 2, 2]],
  },
  {
    // Needle courier
    plates: [[6, 10, 34, 4], [40, 11, 6, 2], [14, 6, 8, 4], [14, 14, 8, 4], [2, 9, 4, 3], [2, 12, 4, 3]],
    glass: [[33, 10, 4, 2]],
    glow: [[0, 10, 2, 4]],
  },
  {
    // Split twin hull
    plates: [[8, 5, 28, 5], [8, 14, 28, 5], [16, 10, 12, 4], [36, 6, 6, 3], [36, 15, 6, 3], [4, 5, 4, 5], [4, 14, 4, 5]],
    glass: [[32, 6, 3, 3]],
    glow: [[2, 6, 2, 3], [2, 15, 2, 3]],
  },
  {
    // Bulk freighter with deck containers
    plates: [[6, 7, 30, 10], [10, 3, 6, 4], [18, 3, 6, 4], [26, 3, 6, 4], [36, 9, 7, 6], [2, 6, 4, 4], [2, 13, 4, 4]],
    glass: [[37, 10, 4, 2]],
    glow: [[0, 7, 2, 2], [0, 14, 2, 2]],
  },
  {
    // Winged runner
    plates: [[10, 9, 26, 6], [36, 10, 8, 4], [14, 3, 10, 6], [14, 15, 10, 6], [6, 8, 4, 8]],
    glass: [[32, 10, 3, 2]],
    glow: [[3, 10, 3, 4]],
  },
  {
    // Patched salvager
    plates: [[8, 8, 26, 8], [16, 5, 8, 3], [12, 16, 16, 3], [34, 9, 6, 5], [4, 6, 4, 5], [4, 13, 4, 4]],
    glass: [[35, 10, 3, 2]],
    glow: [[2, 7, 2, 3], [2, 14, 2, 2]],
  },
];

function HullSilhouette({ ship }: { ship: Ship }) {
  const spec = HULLS[Math.abs(ship.hullVariant) % HULLS.length];

  return (
    <div className="viewport">
      <svg
        className="viewport__svg"
        viewBox="0 0 48 24"
        shapeRendering="crispEdges"
        role="img"
        aria-label={`${ship.name} hull silhouette`}
      >
        {spec.plates.map(([x, y, w, h], index) => (
          <rect key={`p${index}`} x={x} y={y} width={w} height={h} fill="var(--hull-light)" />
        ))}
        {spec.plates.map(([x, y, w], index) => (
          <rect key={`e${index}`} x={x} y={y} width={w} height={1} fill="var(--bevel-light)" />
        ))}
        {spec.glass.map(([x, y, w, h], index) => (
          <rect key={`g${index}`} x={x} y={y} width={w} height={h} fill="var(--cyan-dim)" />
        ))}
        {spec.glow.map(([x, y, w, h], index) => (
          <rect key={`f${index}`} x={x} y={y} width={w} height={h} fill="var(--amber)" />
        ))}
      </svg>
    </div>
  );
}

export function ShipRevealScreen() {
  const state = useGame();

  if (!state?.ship) {
    return (
      <Panel title="Ship">
        <Empty>There is no ship to inspect.</Empty>
      </Panel>
    );
  }

  const ship = state.ship;
  const capacity = safeCrewCapacity(ship);
  const crewCount = state.crewIds.length;

  return (
    <div className="stack">
      <Panel title="Your Inheritance" aside={SHIP_QUALITY_LABELS[ship.quality]} tight>
        <HullSilhouette ship={ship} />
      </Panel>

      <Panel title={ship.name} aside={describeShip(ship)}>
        <p className="prose">
          She is yours, captain. Nobody asked whether you wanted her, and nobody is coming to take
          her back. Everything below is what you have to work with when the homeworld stops being
          an option.
        </p>
        <div className="divider" />
        <KV
          items={[
            ['Size class', SHIP_SIZE_LABELS[ship.size]],
            ['Overall quality', SHIP_QUALITY_LABELS[ship.quality]],
            ['Rooms', `${ship.rooms.length}`],
            [
              'Safe crew',
              <span key="cap" className={crewCount > capacity ? 'amber' : 'green'}>
                {crewCount} aboard / {capacity}
              </span>,
            ],
            ['Fuel capacity', `${state.resources.fuelCapacity} units`],
            ['Fuel aboard', `${Math.round(state.resources.fuel)} units`],
          ]}
        />
        {crewCount > capacity && (
          <p className="tiny amber">
            More people than berths. Overcrowding costs morale every day it continues.
          </p>
        )}
      </Panel>

      <Panel title="Rooms" aside={`${ship.rooms.length} fitted`} tight>
        <div className="rows">
          {ship.rooms.map((room) => (
            <Row
              key={room.id}
              title={ROOM_LABELS[room.kind]}
              sub={`${SHIP_QUALITY_LABELS[room.quality]} build · ${shipConditionLabel(room.condition)}`}
              right={
                <div style={{ width: 64 }}>
                  <Meter value={room.condition} />
                  <span className="tiny readout">{Math.round(room.condition)}</span>
                </div>
              }
            />
          ))}
        </div>
      </Panel>

      <Panel title="Core Systems" tight>
        <div className="rows">
          {SHIP_SYSTEM_KINDS.map((kind) => {
            const system = ship.systems[kind];
            return (
              <Row
                key={kind}
                danger={system.installed && system.condition < 25}
                title={SYSTEM_LABELS[kind]}
                sub={
                  system.installed
                    ? `${SHIP_QUALITY_LABELS[system.quality]} · ${shipConditionLabel(system.condition)}`
                    : 'Nothing fitted in this bay'
                }
                right={
                  system.installed ? (
                    <div style={{ width: 64 }}>
                      <Meter value={system.condition} />
                      <span className="tiny readout">{Math.round(system.condition)}</span>
                    </div>
                  ) : (
                    <Chip tone="red">Not installed</Chip>
                  )
                }
              />
            );
          })}
        </div>
        <div className="divider" />
        <p className="tiny faint">
          Anything not installed cannot be repaired into existence. It has to be bought and fitted.
        </p>
      </Panel>

      <Panel title="Depart" tight>
        <Btn
          tone="primary"
          block
          onClick={() => store.setScreen('cockpit')}
          sub="The homeworld clock is already running"
        >
          Take the Helm
        </Btn>
      </Panel>
    </div>
  );
}

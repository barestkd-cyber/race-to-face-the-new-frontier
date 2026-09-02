/**
 * The inheritance.
 *
 * Fade from black onto the ship standing in the backyard. This is a
 * run-defining moment, so it gets identity and breathing room rather than a
 * table of room conditions — the detail is all still there behind Ship.
 */

import { Rng } from '../../engine/rng';
import {
  notableFacts,
  overallCondition,
  safeCrewCapacity,
  shipArchetype,
  shipConditionLabel,
} from '../../engine/ship';
import { SHIP_QUALITY_LABELS, type Ship } from '../../engine/types';
import { Btn, Empty, Meter, Panel } from '../components';
import { store, useGame } from '../useStore';

export function ShipRevealScreen() {
  const state = useGame();
  if (!state?.ship) {
    return <Empty>There is no ship to look at.</Empty>;
  }

  const ship = state.ship;
  const condition = overallCondition(ship);
  const capacity = safeCrewCapacity(ship);
  const facts = notableFacts(ship);

  return (
    <>
      <div className="blackout" />

      <div className="stack" style={{ paddingTop: 8 }}>
        <div className="scene reveal-in">
          <ShipExterior ship={ship} seed={state.seed} />
          <div className="scene__caption">
            <div className="scene__where">Home Property</div>
            <div className="scene__sub">Homeworld · yours now</div>
          </div>
        </div>

        <div className="reveal-in reveal-in--late" style={{ padding: '4px 2px' }}>
          <div className="reveal-name">{ship.name}</div>
          <div className="reveal-type">{shipArchetype(ship)}</div>
        </div>

        <Panel title="What You Have Been Left" flush>
          <div className="reveal-in reveal-in--late">
            <div className="grid2">
              <div>
                <span className="label">Construction</span>
                <div className="value">{SHIP_QUALITY_LABELS[ship.quality]}</div>
              </div>
              <div>
                <span className="label">Condition</span>
                <div
                  className={
                    condition > 65 ? 'value green' : condition > 40 ? 'value amber' : 'value red'
                  }
                >
                  {Math.round(condition)}%
                </div>
              </div>
            </div>

            <div style={{ marginTop: 6 }}>
              <Meter value={condition} />
              <span className="tiny faint">{shipConditionLabel(condition)}</span>
            </div>

            <div className="divider" />

            <div className="split">
              <span className="label">Safe crew capacity</span>
              <span className="value readout">{capacity}</span>
            </div>
            <p className="tiny faint" style={{ marginTop: 2, marginBottom: 0 }}>
              The lower of berths and breathable air. You are one person; the rest of
              those bunks are empty.
            </p>

            {facts.length > 0 && (
              <>
                <div className="divider" />
                <span className="label">Notable</span>
                <ul className="tiny dim" style={{ margin: '4px 0 0', paddingLeft: 16 }}>
                  {facts.map((fact, index) => (
                    <li key={index}>{fact}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </Panel>

        <div className="reveal-in reveal-in--last">
          <p className="prose prose--dim" style={{ marginTop: 4 }}>
            Nobody asked whether you wanted her. Nobody is coming to take her back.
            Everything you do from here happens out of this hull.
          </p>
          <Btn block tone="primary" onClick={() => store.setScreen('cockpit')}>
            Enter Ship
          </Btn>
        </div>
      </div>
    </>
  );
}

/**
 * The ship as seen from outside, standing on the pad behind the house.
 * Silhouette varies with hull variant and size so a run is recognisable.
 */
function ShipExterior({ ship, seed }: { ship: Ship; seed: string }) {
  const rng = new Rng(`${seed}:exterior`);
  const W = 360;
  const H = 190;

  const stars = Array.from({ length: 40 }, () => ({
    x: Math.floor(rng.float(0, W)),
    y: Math.floor(rng.float(0, H * 0.42)),
    o: rng.float(0.2, 0.8),
  }));

  const long = ship.size !== 'compact';
  const bodyW = long ? 186 : 148;
  const bodyH = long ? 40 : 34;
  const x = (W - bodyW) / 2;
  const y = H * 0.5;
  const variant = ship.hullVariant % 3;

  return (
    <svg
      className="scene__svg"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`${ship.name}, exterior`}
      shapeRendering="crispEdges"
    >
      <defs>
        <linearGradient id="revealSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a0f18" />
          <stop offset="70%" stopColor="#2a2130" />
          <stop offset="100%" stopColor="#5c3a20" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width={W} height={H} fill="url(#revealSky)" />
      {stars.map((s, i) => (
        <rect key={i} x={s.x} y={s.y} width={1} height={1} fill="#fff" opacity={s.o} />
      ))}

      {/* Distant settlement */}
      {Array.from({ length: 22 }, (_, i) => {
        const bx = i * 17 + 2;
        const bh = 6 + ((i * 7919) % 22);
        return (
          <g key={`b-${i}`}>
            <rect x={bx} y={H * 0.62 - bh} width={11} height={bh} fill="#12161e" />
            {i % 3 === 0 && (
              <rect x={bx + 3} y={H * 0.62 - bh + 3} width={2} height={2} fill="#e8a33d" opacity={0.8} />
            )}
          </g>
        );
      })}

      {/* Ground */}
      <rect x="0" y={H * 0.62} width={W} height={H * 0.38} fill="#20241d" />
      <rect x="0" y={H * 0.72} width={W} height={H * 0.28} fill="#191c16" />

      {/* Landing apron */}
      <rect x={W * 0.16} y={H * 0.74} width={W * 0.68} height={H * 0.2} fill="#2a2d26" />

      {/* Hull */}
      <g>
        <rect x={x} y={y} width={bodyW} height={bodyH} fill="#39414b" />
        <rect x={x} y={y} width={bodyW} height={4} fill="#4d5763" />
        <rect x={x} y={y + bodyH - 4} width={bodyW} height={4} fill="#232932" />

        {/* Nose */}
        <path
          d={`M ${x + bodyW} ${y} L ${x + bodyW + 26} ${y + bodyH * 0.42} L ${x + bodyW + 26} ${y + bodyH * 0.62} L ${x + bodyW} ${y + bodyH} Z`}
          fill="#333b45"
        />
        {/* Cockpit glass */}
        <rect x={x + bodyW - 26} y={y + 7} width={20} height={9} fill="#5aa9e6" opacity={0.75} />

        {/* Engine block */}
        <rect x={x - 20} y={y + 5} width={20} height={bodyH - 10} fill="#2b323c" />
        <rect x={x - 24} y={y + 10} width={5} height={bodyH - 20} fill="#e8a33d" opacity={0.55} />

        {/* Dorsal detail varies by hull variant */}
        {variant === 0 && <rect x={x + 30} y={y - 9} width={44} height={9} fill="#2f3640" />}
        {variant === 1 && (
          <>
            <rect x={x + 24} y={y - 12} width={16} height={12} fill="#2f3640" />
            <rect x={x + bodyW - 60} y={y - 8} width={30} height={8} fill="#2f3640" />
          </>
        )}
        {variant === 2 && (
          <rect x={x + bodyW * 0.3} y={y - 14} width={bodyW * 0.4} height={14} fill="#2f3640" />
        )}

        {/* Landing gear */}
        {[0.18, 0.52, 0.84].map((t) => (
          <rect key={t} x={x + bodyW * t} y={y + bodyH} width={5} height={H * 0.74 - (y + bodyH)} fill="#232932" />
        ))}

        {/* Hull lights */}
        {[0.25, 0.45, 0.65].map((t) => (
          <rect key={`l-${t}`} x={x + bodyW * t} y={y + 12} width={3} height={3} fill="#e8a33d" opacity={0.8} />
        ))}

        {/* Open ramp, because you are about to walk up it */}
        <path
          d={`M ${x + bodyW * 0.55} ${y + bodyH} L ${x + bodyW * 0.75} ${H * 0.74} L ${x + bodyW * 0.5} ${H * 0.74} Z`}
          fill="#2b323c"
        />
      </g>
    </svg>
  );
}

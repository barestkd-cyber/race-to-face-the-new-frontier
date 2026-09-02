/**
 * The cockpit windshield: the local route drawn as a navigation display.
 *
 * Shows the Homeworld and its two lateral moons as the opening cluster, the
 * mostly linear path outward, temporary signals sitting off the main line, and
 * the ship's own position while a leg is under way.
 */

import { useMemo } from 'react';
import { Rng } from '../engine/rng';
import type { GameState, LocationId, LocationState } from '../engine/types';

const W = 320;
const H = 200;
const LEFT = 26;
const RIGHT = W - 26;

function px(location: LocationState): number {
  return LEFT + location.routeIndex * (RIGHT - LEFT);
}

function py(location: LocationState): number {
  return H / 2 + location.lateral * 48;
}

const KIND_FILL: Record<string, string> = {
  homeworld: '#c25a3a',
  moon: '#8b93a3',
  tradeStation: '#5aa9e6',
  inhabitedPlanet: '#4fae6d',
  transitStation: '#5aa9e6',
  travelWorld: '#e8d04d',
  temporary: '#a97fd0',
};

const KIND_RADIUS: Record<string, number> = {
  homeworld: 13,
  moon: 7,
  tradeStation: 8,
  inhabitedPlanet: 10,
  transitStation: 9,
  travelWorld: 11,
  temporary: 5,
};

export interface StarMapProps {
  state: GameState;
  selectedId: LocationId | null;
  onSelect: (id: LocationId) => void;
}

export function StarMap({ state, selectedId, onSelect }: StarMapProps) {
  const stars = useMemo(() => buildStars(state.seed), [state.seed]);

  const visible = Object.values(state.locations).filter(
    (l) => l.discovered || l.visited || l.kind === 'temporary',
  );

  const mainRoute = state.routeIds
    .map((id) => state.locations[id])
    .filter((l): l is LocationState => Boolean(l) && (l.discovered || l.visited));

  const current = state.currentLocationId ? state.locations[state.currentLocationId] : undefined;
  const homeworld = state.locations['loc_homeworld'];

  // Ship marker: interpolated along the current leg, or parked at the location.
  let shipX = current ? px(current) : LEFT;
  let shipY = current ? py(current) : H / 2;
  if (state.travel) {
    const from = state.locations[state.travel.fromId];
    const to = state.locations[state.travel.toId];
    if (from && to) {
      const t =
        state.travel.totalHours > 0
          ? Math.max(0, Math.min(1, state.travel.elapsedHours / state.travel.totalHours))
          : 0;
      shipX = px(from) + (px(to) - px(from)) * t;
      shipY = py(from) + (py(to) - py(from)) * t;
    }
  }

  return (
    <svg
      className="viewport__svg"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Navigation display"
      shapeRendering="geometricPrecision"
    >
      {/* Starfield */}
      {stars.map((star, index) => (
        <circle
          key={index}
          cx={star.x}
          cy={star.y}
          r={star.r}
          fill="#ffffff"
          opacity={star.o}
        />
      ))}

      {/* Main outward path */}
      {mainRoute.slice(0, -1).map((from, index) => {
        const to = mainRoute[index + 1]!;
        return (
          <line
            key={`route-${from.id}`}
            x1={px(from)}
            y1={py(from)}
            x2={px(to)}
            y2={py(to)}
            stroke="#3a4a5e"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        );
      })}

      {/* Waypoint ticks along the main path so it reads as a plotted course */}
      {mainRoute.slice(0, -1).map((from, index) => {
        const to = mainRoute[index + 1]!;
        return [0.33, 0.66].map((t) => (
          <circle
            key={`tick-${from.id}-${t}`}
            cx={px(from) + (px(to) - px(from)) * t}
            cy={py(from) + (py(to) - py(from)) * t}
            r={1.4}
            fill="#4a5d75"
          />
        ));
      })}

      {/* Lateral branches to the moons */}
      {homeworld &&
        visible
          .filter((l) => l.kind === 'moon')
          .map((moon) => (
            <line
              key={`moon-link-${moon.id}`}
              x1={px(homeworld)}
              y1={py(homeworld)}
              x2={px(moon)}
              y2={py(moon)}
              stroke="#3a4a5e"
              strokeWidth={1}
              strokeDasharray="2 3"
            />
          ))}

      {/* Temporary signals hang off the route on their own stub */}
      {visible
        .filter((l) => l.kind === 'temporary')
        .map((node) => (
          <line
            key={`temp-link-${node.id}`}
            x1={px(node)}
            y1={H / 2}
            x2={px(node)}
            y2={py(node)}
            stroke="#5a4a70"
            strokeWidth={1}
            strokeDasharray="2 2"
          />
        ))}

      {/* Locations */}
      {visible.map((location) => {
        const x = px(location);
        const y = py(location);
        const r = KIND_RADIUS[location.kind] ?? 7;
        const fill = KIND_FILL[location.kind] ?? '#8b93a3';
        const isCurrent = location.id === state.currentLocationId;
        const isSelected = location.id === selectedId;

        return (
          <g
            key={location.id}
            onClick={() => onSelect(location.id)}
            style={{ cursor: 'pointer' }}
            role="button"
            aria-label={location.name}
          >
            {/* Generous invisible hit area — this is a phone target. */}
            <circle cx={x} cy={y} r={Math.max(r + 12, 20)} fill="transparent" />

            {isSelected && (
              <rect
                x={x - r - 5}
                y={y - r - 5}
                width={(r + 5) * 2}
                height={(r + 5) * 2}
                fill="none"
                stroke="#e8a33d"
                strokeWidth={1.2}
                strokeDasharray="3 2"
              />
            )}

            {location.kind === 'temporary' ? (
              <rect
                x={x - r}
                y={y - r}
                width={r * 2}
                height={r * 2}
                fill="none"
                stroke={fill}
                strokeWidth={1.4}
                strokeDasharray="2 2"
              />
            ) : (
              <>
                <circle cx={x} cy={y} r={r} fill={fill} />
                {/* Terminator, so bodies read as lit from one side. */}
                <path
                  d={`M ${x} ${y - r} A ${r} ${r} 0 0 1 ${x} ${y + r} Z`}
                  fill="rgba(0,0,0,0.32)"
                />
                {location.kind === 'travelWorld' && (
                  <circle
                    cx={x}
                    cy={y}
                    r={r + 4}
                    fill="none"
                    stroke="#e8d04d"
                    strokeWidth={0.8}
                    opacity={0.5}
                  />
                )}
              </>
            )}

            {isCurrent && !state.travel && (
              <circle
                cx={x}
                cy={y}
                r={r + 7}
                fill="none"
                stroke="#5fd77a"
                strokeWidth={1}
                opacity={0.75}
              />
            )}

            <text
              x={x}
              y={y + r + 11}
              textAnchor="middle"
              fontSize={7.5}
              fill={isSelected ? '#e8a33d' : '#8d98a6'}
              fontFamily="ui-monospace, monospace"
              letterSpacing="0.5"
            >
              {location.name.toUpperCase()}
            </text>
          </g>
        );
      })}

      {/* The ship */}
      <g transform={`translate(${shipX} ${shipY})`}>
        {state.travel && (
          <path d="M -12 0 L -4 0" stroke="#e8a33d" strokeWidth={1.2} opacity={0.7} />
        )}
        <path
          d="M -4 -2.5 L 5 0 L -4 2.5 L -2 0 Z"
          fill="#5fd77a"
          stroke="#0b0e13"
          strokeWidth={0.5}
        />
      </g>
    </svg>
  );
}

interface Star {
  x: number;
  y: number;
  r: number;
  o: number;
}

function buildStars(seed: string): Star[] {
  const rng = new Rng(`${seed}:starfield`);
  const stars: Star[] = [];
  for (let i = 0; i < 90; i++) {
    stars.push({
      x: rng.float(0, W),
      y: rng.float(0, H),
      r: rng.float(0.3, 1.1),
      o: rng.float(0.15, 0.75),
    });
  }
  return stars;
}

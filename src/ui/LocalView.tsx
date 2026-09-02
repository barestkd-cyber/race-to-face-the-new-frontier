/**
 * The windshield when the ship is on the ground.
 *
 * You are not looking at a star map. You are looking out of a parked ship at
 * the place you are standing in — the backyard, a colony field, a docking ring.
 * Chunky, low-detail, and lit by the hour of day.
 */

import { useMemo } from 'react';
import { Rng } from '../engine/rng';
import type { LocationKind } from '../engine/types';

const W = 360;
const H = 170;

export interface LocalViewProps {
  seed: string;
  locationKind: LocationKind;
  /** In-game hours, used for the time of day. */
  hours: number;
  /** 0..100 — drives how bad the sky looks on a failing world. */
  decay?: number;
}

interface Palette {
  skyTop: string;
  skyBottom: string;
  haze: string;
  ground: string;
  groundFar: string;
  structure: string;
  structureLit: string;
  accent: string;
}

function paletteFor(kind: LocationKind, night: boolean, decay: number): Palette {
  const rot = Math.max(0, Math.min(1, decay / 100));

  switch (kind) {
    case 'homeworld':
      return night
        ? {
            skyTop: '#0a0f18',
            skyBottom: mix('#1d2436', '#3a2418', rot),
            haze: mix('#2a3348', '#5c3a20', rot),
            ground: '#141a16',
            groundFar: '#1b2320',
            structure: '#0e1319',
            structureLit: '#e8a33d',
            accent: '#5fd77a',
          }
        : {
            skyTop: mix('#3f5878', '#6b5335', rot),
            skyBottom: mix('#8aa2b8', '#b08a55', rot),
            haze: mix('#a8bccb', '#c9a173', rot),
            ground: '#3a3a2e',
            groundFar: '#4b4a3a',
            structure: '#2a2f38',
            structureLit: '#f0c987',
            accent: '#5fd77a',
          };
    case 'moon':
      return {
        skyTop: '#05070c',
        skyBottom: '#0b1119',
        haze: '#151d28',
        ground: '#3e4148',
        groundFar: '#4d5158',
        structure: '#242a33',
        structureLit: '#5aa9e6',
        accent: '#8b93a3',
      };
    case 'inhabitedPlanet':
      return night
        ? {
            skyTop: '#07101a',
            skyBottom: '#123040',
            haze: '#1c4a5a',
            ground: '#0d2630',
            groundFar: '#12333f',
            structure: '#0a1a20',
            structureLit: '#e8d04d',
            accent: '#4fae6d',
          }
        : {
            skyTop: '#4a86a8',
            skyBottom: '#9fd0dd',
            haze: '#c3e2e8',
            ground: '#1c4f57',
            groundFar: '#276a6e',
            structure: '#173c44',
            structureLit: '#fff0c0',
            accent: '#4fae6d',
          };
    case 'travelWorld':
      return {
        skyTop: '#101426',
        skyBottom: '#2c2f4a',
        haze: '#43466a',
        ground: '#22242e',
        groundFar: '#2c2f3a',
        structure: '#171a24',
        structureLit: '#e8d04d',
        accent: '#5aa9e6',
      };
    default:
      // Stations and temporary nodes: interior dock, hard light, black outside.
      return {
        skyTop: '#04060a',
        skyBottom: '#080d14',
        haze: '#0d141d',
        ground: '#2b313a',
        groundFar: '#353c46',
        structure: '#1a1f28',
        structureLit: '#5aa9e6',
        accent: '#8b93a3',
      };
  }
}

function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift: number) => {
    const va = (pa >> shift) & 0xff;
    const vb = (pb >> shift) & 0xff;
    return Math.round(va + (vb - va) * t);
  };
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`;
}

export function LocalView({ seed, locationKind, hours, decay = 0 }: LocalViewProps) {
  const hourOfDay = ((hours % 24) + 24) % 24;
  const night = hourOfDay < 6 || hourOfDay >= 19;
  const palette = paletteFor(locationKind, night, decay);

  const scenery = useMemo(
    () => buildScenery(seed, locationKind),
    [seed, locationKind],
  );

  const isStation = locationKind === 'tradeStation' || locationKind === 'transitStation' || locationKind === 'temporary';

  return (
    <svg className="scene__svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="View from the cockpit" shapeRendering="crispEdges">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.skyTop} />
          <stop offset="100%" stopColor={palette.skyBottom} />
        </linearGradient>
        <linearGradient id="hazeGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.haze} stopOpacity="0" />
          <stop offset="100%" stopColor={palette.haze} stopOpacity="0.85" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width={W} height={H} fill="url(#sky)" />

      {/* Stars, where there is a sky to see them in */}
      {(night || locationKind === 'moon' || isStation) &&
        scenery.stars.map((s, i) => (
          <rect key={`st-${i}`} x={s.x} y={s.y} width={1} height={1} fill="#fff" opacity={s.o} />
        ))}

      {/* Distant settlement / structures on the horizon */}
      {scenery.skyline.map((b, i) => (
        <g key={`sk-${i}`}>
          <rect x={b.x} y={H * 0.55 - b.h} width={b.w} height={b.h} fill={palette.structure} />
          {b.lit && (
            <rect
              x={b.x + 2}
              y={H * 0.55 - b.h + 3}
              width={2}
              height={2}
              fill={palette.structureLit}
              opacity={night ? 0.95 : 0.4}
            />
          )}
        </g>
      ))}

      {/* Atmospheric haze — thicker as the world fails */}
      <rect x="0" y={H * 0.3} width={W} height={H * 0.28} fill="url(#hazeGrad)" />

      {/* Processing plumes: visible evidence the world is not coping */}
      {locationKind === 'homeworld' &&
        scenery.plumes.map((p, i) => (
          <rect
            key={`pl-${i}`}
            x={p.x}
            y={H * 0.55 - p.h - 26}
            width={3}
            height={p.h + 26}
            fill={palette.haze}
            opacity={0.35 + (decay / 100) * 0.35}
          />
        ))}

      {/* Middle ground */}
      <rect x="0" y={H * 0.55} width={W} height={H * 0.14} fill={palette.groundFar} />

      {/* Foreground: the property / pad you are standing on */}
      <rect x="0" y={H * 0.69} width={W} height={H * 0.31} fill={palette.ground} />

      {/* Pad markings */}
      <rect x={W * 0.1} y={H * 0.82} width={W * 0.8} height={2} fill={palette.groundFar} opacity={0.6} />
      {[0.18, 0.5, 0.82].map((t) => (
        <rect key={`m-${t}`} x={W * t} y={H * 0.76} width={3} height={10} fill={palette.structureLit} opacity={0.35} />
      ))}

      {/* Nose of your own ship, framing the shot from inside */}
      <g>
        <path
          d={`M ${W * 0.28} ${H} L ${W * 0.36} ${H * 0.79} L ${W * 0.64} ${H * 0.79} L ${W * 0.72} ${H} Z`}
          fill={palette.structure}
          opacity={0.95}
        />
        <rect x={W * 0.44} y={H * 0.82} width={W * 0.12} height={3} fill={palette.structureLit} opacity={0.5} />
      </g>

      {/* Interior framing for a station berth */}
      {isStation && (
        <>
          <rect x="0" y="0" width={W} height={10} fill={palette.structure} />
          <rect x="0" y={H - 4} width={W} height={4} fill={palette.structure} />
        </>
      )}
    </svg>
  );
}

interface Scenery {
  stars: { x: number; y: number; o: number }[];
  skyline: { x: number; w: number; h: number; lit: boolean }[];
  plumes: { x: number; h: number }[];
}

function buildScenery(seed: string, kind: LocationKind): Scenery {
  const rng = new Rng(`${seed}:localview:${kind}`);

  const stars = Array.from({ length: 60 }, () => ({
    x: Math.floor(rng.float(0, W)),
    y: Math.floor(rng.float(0, H * 0.5)),
    o: rng.float(0.2, 0.85),
  }));

  const skyline: Scenery['skyline'] = [];
  let x = -6;
  while (x < W) {
    const w = rng.int(6, 26);
    const h = rng.int(6, kind === 'homeworld' ? 44 : 26);
    skyline.push({ x, w, h, lit: rng.chance(0.55) });
    x += w + rng.int(1, 7);
  }

  const plumes = Array.from({ length: 4 }, () => ({
    x: Math.floor(rng.float(W * 0.05, W * 0.95)),
    h: rng.int(18, 46),
  }));

  return { stars, skyline, plumes };
}

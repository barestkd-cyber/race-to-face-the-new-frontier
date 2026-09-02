/**
 * Procedurally generated pixel-art crew portraits.
 *
 * Deterministic from a character's portraitSeed, drawn as an SVG grid so it
 * stays crisp at any size and needs no image assets. Individual crew members
 * have to be visually distinguishable at a glance — that is most of what makes
 * a roster feel like people rather than rows.
 */

import { useMemo } from 'react';
import { Rng } from '../engine/rng';

const SKIN = [
  '#f0c8a0', '#e0ab76', '#c68642', '#a9713c', '#8d5524',
  '#6b4020', '#f5d5b8', '#d9a066', '#7a4a28', '#5a3618',
];

const HAIR = [
  '#1a1512', '#2e2119', '#4a3423', '#6b4a2c', '#8a6236',
  '#b58b52', '#d8c08a', '#7a2f22', '#9c3b1e', '#3d3d42',
  '#6e6e78', '#a8a8b2', '#2a3a55', '#4a2a55',
];

const CLOTH = [
  '#3d5a6c', '#4a6b52', '#6b4a3d', '#5a4a6b', '#6b6b4a',
  '#3d4a5a', '#5c3a3a', '#2f4f4f', '#4f4f2f', '#3a3a4a',
];

const EYES = ['#2b1c10', '#3a5a7a', '#3a6b4a', '#5a4a3a', '#1a1a1a'];

export interface PortraitProps {
  seed: number;
  size?: 'sm' | 'md' | 'lg';
  dead?: boolean;
  className?: string;
}

const GRID = 12;

export function Portrait({ seed, size = 'md', dead = false, className }: PortraitProps) {
  const cells = useMemo(() => buildFace(seed), [seed]);

  const sizeClass =
    size === 'lg' ? 'portrait portrait--lg' : size === 'sm' ? 'portrait portrait--sm' : 'portrait';

  return (
    <svg
      className={`${sizeClass}${dead ? ' portrait--dead' : ''}${className ? ` ${className}` : ''}`}
      viewBox={`0 0 ${GRID} ${GRID}`}
      role="img"
      aria-label="Crew portrait"
      shapeRendering="crispEdges"
    >
      {cells.map((cell, index) => (
        <rect key={index} x={cell.x} y={cell.y} width={1} height={1} fill={cell.fill} />
      ))}
    </svg>
  );
}

interface Cell {
  x: number;
  y: number;
  fill: string;
}

function buildFace(seed: number): Cell[] {
  const rng = new Rng(seed >>> 0);

  const skin = rng.pick(SKIN);
  const hair = rng.pick(HAIR);
  const cloth = rng.pick(CLOTH);
  const eye = rng.pick(EYES);
  const shade = shadeColor(skin, -0.18);

  const hairStyle = rng.int(0, 4);
  const hairLength = rng.int(0, 2);
  const hasBeard = rng.chance(0.3);
  const hasBrow = rng.chance(0.75);
  const wide = rng.chance(0.4);

  const cells: Cell[] = [];
  const put = (x: number, y: number, fill: string) => {
    if (x < 0 || y < 0 || x >= GRID || y >= GRID) return;
    cells.push({ x, y, fill });
  };

  // Background plate.
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) put(x, y, '#0a0e14');
  }

  const faceLeft = wide ? 2 : 3;
  const faceRight = wide ? 9 : 8;

  // Shoulders / collar.
  for (let x = 1; x < GRID - 1; x++) {
    put(x, 11, cloth);
    if (x > 1 && x < GRID - 2) put(x, 10, cloth);
  }
  put(5, 10, shadeColor(cloth, 0.2));
  put(6, 10, shadeColor(cloth, 0.2));

  // Neck.
  for (let x = 5; x <= 6; x++) put(x, 9, shade);

  // Head block.
  for (let y = 2; y <= 9; y++) {
    for (let x = faceLeft; x <= faceRight; x++) {
      if (y === 9 && (x < 4 || x > 7)) continue;
      put(x, y, skin);
    }
  }

  // Cheek shading down the right side.
  for (let y = 4; y <= 8; y++) put(faceRight, y, shade);

  // Hair.
  const hairTop = 1 + (hairLength === 0 ? 1 : 0);
  for (let y = hairTop; y <= 3; y++) {
    for (let x = faceLeft; x <= faceRight; x++) put(x, y, hair);
  }

  switch (hairStyle) {
    case 0: // Cropped
      break;
    case 1: // Sides
      for (let y = 4; y <= 6; y++) {
        put(faceLeft, y, hair);
        put(faceRight, y, hair);
      }
      break;
    case 2: // Long
      for (let y = 4; y <= 8; y++) {
        put(faceLeft - 1, y, hair);
        put(faceRight + 1, y, hair);
      }
      break;
    case 3: // Swept fringe
      for (let x = faceLeft; x <= faceLeft + 3; x++) put(x, 4, hair);
      break;
    case 4: // Receding
      put(faceLeft, 2, skin);
      put(faceRight, 2, skin);
      break;
  }

  if (hairLength === 2) {
    for (let x = faceLeft - 1; x <= faceRight + 1; x++) put(x, 9, hair);
  }

  // Brow.
  if (hasBrow) {
    put(faceLeft + 1, 5, hair);
    put(faceLeft + 2, 5, hair);
    put(faceRight - 2, 5, hair);
    put(faceRight - 1, 5, hair);
  }

  // Eyes.
  put(faceLeft + 1, 6, '#f4f4f4');
  put(faceLeft + 2, 6, eye);
  put(faceRight - 2, 6, eye);
  put(faceRight - 1, 6, '#f4f4f4');

  // Nose and mouth.
  put(5, 7, shade);
  put(6, 7, shade);
  put(5, 8, shadeColor(skin, -0.32));
  put(6, 8, shadeColor(skin, -0.32));

  // Beard.
  if (hasBeard) {
    for (let x = faceLeft + 1; x <= faceRight - 1; x++) put(x, 8, hair);
    put(faceLeft + 1, 7, hair);
    put(faceRight - 1, 7, hair);
    put(5, 8, shadeColor(hair, 0.15));
    put(6, 8, shadeColor(hair, 0.15));
  }

  return cells;
}

function shadeColor(hex: string, amount: number): string {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  const r = clamp(((num >> 16) & 0xff) * (1 + amount));
  const g = clamp(((num >> 8) & 0xff) * (1 + amount));
  const b = clamp((num & 0xff) * (1 + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

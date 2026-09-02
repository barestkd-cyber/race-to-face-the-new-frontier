/**
 * Event log and debug records. Both are ring buffers so a long run cannot grow
 * unbounded on a phone.
 */

import { SAVE } from './tuning';
import type { GameState, LogKind } from './types';

let logCounter = 0;

export function pushLog(state: GameState, kind: LogKind, text: string): void {
  if (!text.trim()) return;
  logCounter += 1;
  state.log.push({
    id: `log_${logCounter.toString(36)}`,
    hours: state.hours,
    kind,
    text: text.trim(),
  });
  if (state.log.length > SAVE.maxLogEntries) {
    state.log.splice(0, state.log.length - SAVE.maxLogEntries);
  }
}

export function pushLogLines(state: GameState, kind: LogKind, lines: string[]): void {
  for (const line of lines) pushLog(state, kind, line);
}

export function pushDebug(
  state: GameState,
  label: string,
  detail: Record<string, unknown>,
): void {
  if (!state.debug.enabled) return;
  state.debug.records.push({
    id: `dbg_${state.debug.records.length}_${Math.random().toString(36).slice(2, 7)}`,
    hours: state.hours,
    label,
    detail,
  });
  if (state.debug.records.length > SAVE.maxDebugRecords) {
    state.debug.records.splice(0, state.debug.records.length - SAVE.maxDebugRecords);
  }
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/** Starday display used across the cockpit, e.g. "072.18". */
export function stardayLabel(hours: number): string {
  const day = Math.floor(hours / 24) + 1;
  const hour = Math.floor(hours % 24);
  return `${day.toString().padStart(3, '0')}.${hour.toString().padStart(2, '0')}`;
}

export function dayNumber(hours: number): number {
  return Math.floor(hours / 24) + 1;
}

export function formatDuration(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 24) {
    const whole = Math.floor(hours);
    const minutes = Math.round((hours - whole) * 60);
    return minutes >= 5 ? `${whole}h ${minutes}m` : `${whole}h`;
  }
  const days = hours / 24;
  return days < 10 ? `${days.toFixed(1)} days` : `${Math.round(days)} days`;
}

export const LOG_KIND_LABELS: Record<LogKind, string> = {
  system: 'System',
  travel: 'Travel',
  event: 'Event',
  combat: 'Combat',
  trade: 'Trade',
  crew: 'Crew',
  medical: 'Medical',
  mission: 'Mission',
  warning: 'Warning',
  milestone: 'Milestone',
};

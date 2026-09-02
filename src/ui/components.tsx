/**
 * Shared UI primitives. Every screen builds from these so the cockpit identity
 * stays consistent and no screen reimplements a gauge or a row.
 */

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { conditionLabel } from '../engine/wounds';
import { formatDuration, stardayLabel } from '../engine/log';
import type { Character, LogEntry, LogKind, Resources } from '../engine/types';
import { Portrait } from './Portrait';

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export function Panel({
  title,
  aside,
  children,
  inset,
  tight,
  flush,
  riveted = true,
}: {
  title?: string;
  aside?: ReactNode;
  children?: ReactNode;
  inset?: boolean;
  tight?: boolean;
  flush?: boolean;
  riveted?: boolean;
}) {
  return (
    <section
      className={[
        'panel',
        inset ? 'panel--inset' : '',
        flush ? 'panel--flush' : '',
        riveted && title ? 'panel--riveted' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {title && (
        <header className="panel__head">
          <span className="panel__title">{title}</span>
          {aside !== undefined && <span className="panel__aside">{aside}</span>}
        </header>
      )}
      {children !== undefined && (
        <div className={tight ? 'panel__body panel__body--tight' : 'panel__body'}>{children}</div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

export type BtnTone = 'default' | 'primary' | 'danger' | 'go' | 'ghost';

export function Btn({
  children,
  onClick,
  tone = 'default',
  disabled,
  block,
  small,
  wide,
  sub,
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: BtnTone;
  disabled?: boolean;
  block?: boolean;
  small?: boolean;
  wide?: boolean;
  sub?: string;
  title?: string;
}) {
  const toneClass =
    tone === 'primary'
      ? 'btn--primary'
      : tone === 'danger'
        ? 'btn--danger'
        : tone === 'go'
          ? 'btn--go'
          : tone === 'ghost'
            ? 'btn--ghost'
            : '';

  return (
    <button
      type="button"
      className={[
        'btn',
        toneClass,
        block ? 'btn--block' : '',
        small ? 'btn--sm' : '',
        wide ? 'btn--wide' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      <span>
        {children}
        {sub && <span className="btn__sub">{sub}</span>}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Gauges
// ---------------------------------------------------------------------------

export function Meter({
  value,
  max = 100,
  color,
  tall,
}: {
  value: number;
  max?: number;
  color?: string;
  tall?: boolean;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const tone = color ?? (pct > 60 ? 'var(--green)' : pct > 30 ? 'var(--amber)' : 'var(--red)');
  return (
    <div className={tall ? 'meter meter--tall' : 'meter'}>
      <div className="meter__fill" style={{ width: `${pct}%`, background: tone, color: tone }} />
    </div>
  );
}

export function Segments({
  value,
  max = 100,
  count = 10,
  color,
}: {
  value: number;
  max?: number;
  count?: number;
  color?: string;
}) {
  const filled = Math.round((Math.max(0, Math.min(max, value)) / Math.max(1, max)) * count);
  const tone =
    color ??
    (filled / count > 0.6 ? 'var(--green)' : filled / count > 0.3 ? 'var(--amber)' : 'var(--red)');
  return (
    <div className="segments">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className={i < filled ? 'segments__cell segments__cell--on' : 'segments__cell'}
          style={i < filled ? { color: tone } : undefined}
        />
      ))}
    </div>
  );
}

/** 0..15 attribute pips, with the unreachable remainder shown greyed. */
export function Pips({ value, max = 15 }: { value: number; max?: number }) {
  return (
    <div className="pips">
      {Array.from({ length: max }, (_, i) => (
        <div key={i} className={i < value ? 'pip pip--on' : 'pip'} />
      ))}
    </div>
  );
}

export function StatLine({
  name,
  value,
  max,
  right,
}: {
  name: string;
  value: number;
  max?: number;
  right?: ReactNode;
}) {
  return (
    <div className="statline">
      <span className="statline__name">{name}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {max !== undefined && max <= 15 && <Pips value={value} max={max} />}
        <span className="statline__val">{Math.round(value)}</span>
        {right}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chips
// ---------------------------------------------------------------------------

export function Chip({
  children,
  tone,
}: {
  children: ReactNode;
  tone?: 'amber' | 'green' | 'red' | 'cyan';
}) {
  return <span className={tone ? `chip chip--${tone}` : 'chip'}>{children}</span>;
}

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

export function Row({
  title,
  sub,
  right,
  onClick,
  selected,
  disabled,
  danger,
  left,
}: {
  title: ReactNode;
  sub?: ReactNode;
  right?: ReactNode;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  danger?: boolean;
  left?: ReactNode;
}) {
  const className = [
    'row',
    onClick ? '' : 'row--static',
    selected ? 'row--selected' : '',
    danger ? 'row--danger' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      {left}
      <span className="row__main">
        <span className="row__title">{title}</span>
        {sub !== undefined && <span className="row__sub">{sub}</span>}
      </span>
      {right !== undefined && <span className="row__right">{right}</span>}
    </>
  );

  if (!onClick) {
    return <div className={className}>{content}</div>;
  }

  return (
    <button type="button" className={className} onClick={onClick} disabled={disabled}>
      {content}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Key/value
// ---------------------------------------------------------------------------

export function KV({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="kv">
      {items.map(([key, value], index) => (
        <div key={`${key}-${index}`} style={{ display: 'contents' }}>
          <dt>{key}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

// ---------------------------------------------------------------------------
// Resource strip
// ---------------------------------------------------------------------------

export interface ResourceStripProps {
  resources: Resources;
  crewCount: number;
  crewCapacity: number;
  foodDays: number;
  fuelJumps: number;
}

export function ResourceStrip({
  resources,
  crewCount,
  crewCapacity,
  foodDays,
  fuelJumps,
}: ResourceStripProps) {
  const fuelPct = resources.fuelCapacity > 0 ? resources.fuel / resources.fuelCapacity : 0;

  return (
    <div className="resources">
      <ResourceCell
        label="Crew"
        value={`${crewCount}/${crewCapacity}`}
        tone={crewCount > crewCapacity ? 'warn' : 'ok'}
        sub={crewCount > crewCapacity ? 'crowded' : undefined}
      />
      <ResourceCell
        label="Fuel"
        value={`${Math.round(fuelPct * 100)}%`}
        sub={`${fuelJumps} jumps`}
        tone={fuelPct < 0.12 ? 'crit' : fuelPct < 0.25 ? 'warn' : 'ok'}
      />
      <ResourceCell
        label="Food"
        value={Math.round(resources.food).toString()}
        sub={foodDays === Infinity ? 'stable' : `${Math.floor(foodDays)}d`}
        tone={foodDays < 2 ? 'crit' : foodDays < 5 ? 'warn' : 'ok'}
      />
      <ResourceCell
        label="Parts"
        value={Math.round(resources.repairParts).toString()}
        tone={resources.repairParts < 10 ? 'warn' : 'ok'}
      />
      <ResourceCell
        label="Meds"
        value={Math.round(resources.medicine).toString()}
        tone={resources.medicine <= 1 ? 'warn' : 'ok'}
      />
      <ResourceCell label="Credits" value={Math.round(resources.credits).toLocaleString()} />
      <ResourceCell label="Cores" value={resources.dataCores.toString()} />
      <ResourceCell
        label="Tank"
        value={Math.round(resources.fuel).toString()}
        sub={`/${resources.fuelCapacity}`}
      />
    </div>
  );
}

function ResourceCell({
  label,
  value,
  sub,
  tone = 'ok',
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'ok' | 'warn' | 'crit';
}) {
  return (
    <div className={`resource${tone === 'warn' ? ' resource--warn' : tone === 'crit' ? ' resource--crit' : ''}`}>
      <span className="resource__label">{label}</span>
      <span className="resource__value">{value}</span>
      {sub && <span className="resource__sub">{sub}</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Crew row
// ---------------------------------------------------------------------------

export function CrewRow({
  character,
  onClick,
  right,
  selected,
  showRole = true,
}: {
  character: Character;
  onClick?: () => void;
  right?: ReactNode;
  selected?: boolean;
  showRole?: boolean;
}) {
  const health = character.maxHealth > 0 ? character.health / character.maxHealth : 0;
  const untreated = character.wounds.filter((w) => !w.treated).length;

  return (
    <Row
      selected={selected}
      onClick={onClick}
      left={<Portrait seed={character.portraitSeed} dead={!character.alive} />}
      title={
        <span>
          {character.name} {character.surname}
          {character.isPlayer && <span className="amber"> ★</span>}
        </span>
      }
      sub={
        <span>
          {showRole && <span style={{ textTransform: 'capitalize' }}>{character.role}</span>}
          {showRole && ' · '}
          <span className={health > 0.6 ? 'green' : health > 0.3 ? 'amber' : 'red'}>
            {conditionLabel(character)}
          </span>
          {untreated > 0 && <span className="red"> · {untreated} untreated</span>}
        </span>
      }
      right={
        right ?? (
          <div style={{ width: 58 }}>
            <Meter value={character.health} max={character.maxHealth} />
            <span className="tiny">{Math.round(character.health)}</span>
          </div>
        )
      }
    />
  );
}

// ---------------------------------------------------------------------------
// Log
// ---------------------------------------------------------------------------

export function LogFeed({ entries, limit }: { entries: LogEntry[]; limit?: number }) {
  const shown = limit ? entries.slice(-limit) : entries;
  if (shown.length === 0) {
    return <p className="tiny faint">Nothing logged yet.</p>;
  }
  return (
    <div className="logfeed">
      {shown
        .slice()
        .reverse()
        .map((entry) => (
          <div key={entry.id} className={`logline logline--${entry.kind satisfies LogKind}`}>
            <span className="logline__time">{stardayLabel(entry.hours)}</span>
            <span className="logline__text">{entry.text}</span>
          </div>
        ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sheet
// ---------------------------------------------------------------------------

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="sheet-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div className="sheet" onClick={(event) => event.stopPropagation()}>
        <div className="sheet__grip" />
        {title && (
          <div className="panel__head" style={{ borderRadius: 0 }}>
            <span className="panel__title">{title}</span>
            <button type="button" className="btn btn--sm btn--ghost" onClick={onClose}>
              Close
            </button>
          </div>
        )}
        <div className="sheet__body">{children}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Number stepper — avoids tiny +/- targets on a phone
// ---------------------------------------------------------------------------

export function Stepper({
  value,
  min = 0,
  max = 99,
  step = 1,
  onChange,
  label,
}: {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (next: number) => void;
  label?: string;
}) {
  const clamp = (next: number) => Math.max(min, Math.min(max, next));
  return (
    <div className="split" style={{ gap: 6 }}>
      {label && <span className="label">{label}</span>}
      <div className="btn-row" style={{ flexWrap: 'nowrap', alignItems: 'center' }}>
        <Btn small onClick={() => onChange(clamp(value - step))} disabled={value <= min}>
          −
        </Btn>
        <span className="value readout" style={{ minWidth: 52, textAlign: 'center' }}>
          {Math.round(value)}
        </span>
        <Btn small onClick={() => onChange(clamp(value + step))} disabled={value >= max}>
          +
        </Btn>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Collapsible section
// ---------------------------------------------------------------------------

export function Fold({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details className="fold panel" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>{title}</summary>
      <div className="fold__body">{children}</div>
    </details>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="tiny faint center" style={{ padding: '18px 10px' }}>
      {children}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Duration label
// ---------------------------------------------------------------------------

export function Duration({ hours }: { hours: number }) {
  return <span className="readout">{formatDuration(hours)}</span>;
}

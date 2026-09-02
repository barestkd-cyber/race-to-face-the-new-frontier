/**
 * Debug and explainability.
 *
 * The check inspector is the reason this screen exists: every roll the engine
 * recorded, taken apart into the numbers that produced it. Nothing here is
 * player-facing fiction — it is the truth, including the parts the crew cannot
 * see.
 */

import { useState } from 'react';
import { contentSummary } from '../../content';
import { stardayLabel } from '../../engine/log';
import { simulateBatch, type BatchSummary } from '../../engine/simulate';
import { TUNING } from '../../engine/tuning';
import {
  CHECK_OUTCOME_LABELS,
  SKILL_LABELS,
  type CheckResult,
  type DebugRecord,
  type GameState,
} from '../../engine/types';
import { Btn, Chip, Empty, Fold, KV, Panel } from '../components';
import { store, useGame } from '../useStore';

function asCheckResult(value: unknown): CheckResult | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<CheckResult>;
  if (
    typeof candidate.skill === 'string' &&
    typeof candidate.roll === 'number' &&
    typeof candidate.finalTarget === 'number' &&
    typeof candidate.outcome === 'string'
  ) {
    return candidate as CheckResult;
  }
  return null;
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2) ?? 'undefined';
  } catch {
    return '[could not serialise]';
  }
}

function Json({ value }: { value: unknown }) {
  return (
    <div className="scroll-x panel panel--inset">
      <pre className="tiny" style={{ margin: 0, padding: 8 }}>
        {safeJson(value)}
      </pre>
    </div>
  );
}

function CheckCard({ check, state }: { check: CheckResult; state: GameState }) {
  const names = check.participantIds
    .map((id) => state.characters[id])
    .filter(Boolean)
    .map((c) => `${c.name} ${c.surname}`);

  return (
    <div className="stack stack--tight">
      <div className="split">
        <span className="value">{check.label}</span>
        <Chip
          tone={
            check.outcome === 'exceptional' || check.outcome === 'success'
              ? 'green'
              : check.outcome === 'partial'
                ? 'amber'
                : 'red'
          }
        >
          {CHECK_OUTCOME_LABELS[check.outcome]}
        </Chip>
      </div>
      <KV
        items={[
          ['Skill', SKILL_LABELS[check.skill]],
          ['Roll', check.roll],
          ['Raw target', Math.round(check.rawTarget * 100) / 100],
          ['Final target', Math.round(check.finalTarget * 100) / 100],
          ['Margin', Math.round(check.margin * 100) / 100],
          ['Effective skill', Math.round(check.effectiveSkill * 100) / 100],
          ['Avg attribute', Math.round(check.avgAttribute * 100) / 100],
          ['Attr multiplier', check.attributeMultiplier.toFixed(3)],
          ['Secondary bonus', check.secondaryBonus],
          ['Leadership bonus', Math.round(check.leadershipBonus * 100) / 100],
          ['Low-skill protection', check.protectedFromCritical ? 'Applied' : 'No'],
          ['Participants', names.length > 0 ? names.join(', ') : '—'],
          ['At', `Starday ${stardayLabel(check.timestampHours)}`],
        ]}
      />
      <span className="label">Situational modifiers</span>
      {check.modifiers.length === 0 ? (
        <p className="tiny faint">None applied.</p>
      ) : (
        <KV
          items={check.modifiers.map((modifier): [string, string] => [
            modifier.label,
            modifier.value > 0 ? `+${modifier.value}` : `${modifier.value}`,
          ])}
        />
      )}
    </div>
  );
}

function RecordCard({ record, state }: { record: DebugRecord; state: GameState }) {
  const embedded = asCheckResult(record.detail.check);
  const direct = embedded ? null : asCheckResult(record.detail);
  const check = embedded ?? direct;
  const rest = Object.fromEntries(
    Object.entries(record.detail).filter(([key]) => !(embedded && key === 'check')),
  );
  const showRest = !direct && Object.keys(rest).length > 0;

  return (
    <div className="panel panel--inset">
      <div className="panel__body panel__body--tight">
        <div className="split">
          <span className="label">{record.label}</span>
          <span className="tiny faint readout">{stardayLabel(record.hours)}</span>
        </div>
        {check ? <CheckCard check={check} state={state} /> : null}
        {showRest && <Json value={rest} />}
        {!check && !showRest && <p className="tiny faint">No detail recorded.</p>}
      </div>
    </div>
  );
}

export function DebugScreen() {
  const state = useGame();
  const [limit, setLimit] = useState(20);
  const [running, setRunning] = useState(false);
  const [batch, setBatch] = useState<BatchSummary | null>(null);

  if (!state) {
    return <Empty>No run is loaded.</Empty>;
  }

  const debug = state.debug;
  const records = [...debug.records].reverse();
  const shown = records.slice(0, limit);
  const counts = contentSummary();

  const runBatch = (): void => {
    setRunning(true);
    window.setTimeout(() => {
      try {
        setBatch(simulateBatch(10, { strategy: 'balanced' }));
      } finally {
        setRunning(false);
      }
    }, 50);
  };

  return (
    <div className="stack">
      <Panel title="Instrumentation">
        <div className="btn-row">
          <Btn
            wide
            tone={debug.enabled ? 'go' : 'ghost'}
            onClick={() => store.toggleDebug()}
            sub={debug.enabled ? 'Recording checks' : 'Not recording'}
          >
            Debug {debug.enabled ? 'on' : 'off'}
          </Btn>
          <Btn
            wide
            tone={debug.revealHidden ? 'danger' : 'ghost'}
            onClick={() => store.toggleRevealHidden()}
            sub={debug.revealHidden ? 'Showing hidden truth' : 'Hidden truth concealed'}
          >
            Reveal {debug.revealHidden ? 'on' : 'off'}
          </Btn>
        </div>
        <p className="tiny faint" style={{ marginTop: 6 }}>
          Checks are only recorded while debug is on. Turn it on before playing the part you want to
          take apart.
        </p>
      </Panel>

      <Panel title="Run">
        <KV
          items={[
            ['Seed', state.seed],
            ['RNG cursor', state.rngCursor],
            ['Hours', state.hours.toFixed(2)],
            ['Starday', stardayLabel(state.hours)],
            ['Phase', state.phase],
            ['Screen', state.screen],
            ['Save version', state.version],
            ['Crew', state.crewIds.length],
            ['Location', state.currentLocationId ?? 'underway'],
            ['Records held', debug.records.length],
          ]}
        />
      </Panel>

      {debug.revealHidden && (
        <Panel title="Hidden truth" aside="spoilers">
          <KV
            items={[
              ['Terminal day', state.homeworld.terminalDay],
              ['Dominant threat', state.homeworld.dominantThreat],
              ['Infrastructure', Math.round(state.homeworld.infrastructure)],
              ['Forecast quality', state.homeworld.forecastQuality],
              ['Ended', state.homeworld.ended ? 'yes' : 'no'],
              ['Departed', state.homeworld.departed ? 'yes' : 'no'],
            ]}
          />
          <div className="divider" />
          <span className="label">True traits</span>
          <div className="stack stack--tight" style={{ marginTop: 4 }}>
            {Object.values(state.characters).map((character) => (
              <div key={character.id} className="panel panel--inset">
                <div className="panel__body panel__body--tight">
                  <div className="split">
                    <span className="value">
                      {character.name} {character.surname}
                    </span>
                    <span className="chips">
                      {character.aboard && <Chip tone="cyan">Aboard</Chip>}
                      {!character.alive && <Chip tone="red">Dead</Chip>}
                    </span>
                  </div>
                  <p className="tiny">
                    {character.traits.length > 0 ? character.traits.join(', ') : 'no traits'}
                  </p>
                  <p className="tiny faint">
                    {character.traitKnowledge
                      .map(
                        (knowledge) =>
                          `${knowledge.trait}: ${
                            knowledge.known === 2
                              ? 'known'
                              : knowledge.known === 1
                                ? 'suspected'
                                : 'unknown'
                          } (${knowledge.evidence})`,
                      )
                      .join(' · ') || 'nothing observed'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <Panel title="Check inspector" aside={`${records.length} records`}>
        {records.length === 0 ? (
          <Empty>
            Nothing recorded. Turn debug on and take an action that rolls something.
          </Empty>
        ) : (
          <div className="stack stack--tight">
            {shown.map((record) => (
              <RecordCard key={record.id} record={record} state={state} />
            ))}
            {records.length > shown.length && (
              <Btn block tone="ghost" onClick={() => setLimit(limit + 20)}>
                Show 20 more ({records.length - shown.length} left)
              </Btn>
            )}
          </div>
        )}
      </Panel>

      <Panel title="Simulation harness">
        <p className="prose prose--dim">
          Runs ten headless campaigns on the balanced strategy and reports how they ended. It blocks
          the interface for a few seconds while it works.
        </p>
        <Btn block tone="primary" disabled={running} onClick={runBatch}>
          {running ? 'Running ten runs…' : 'Run 10 campaigns'}
        </Btn>
        {batch && !running && (
          <>
            <div className="divider" />
            <KV
              items={[
                ['Runs', batch.runs],
                ['Victories', batch.victories],
                ['Deaths', batch.deaths],
                ['Stalled', batch.stalled],
                ['Avg days', batch.averageDays.toFixed(1)],
                ['Avg crew alive', batch.averageCrewSurviving.toFixed(2)],
                ['Avg events', batch.averageEvents.toFixed(1)],
                ['Avg fights', batch.averageFights.toFixed(1)],
                ['Ships lost', batch.shipsLost],
                ['Errors', batch.errors.length],
              ]}
            />
            {batch.errors.length > 0 && (
              <>
                <span className="label">Errors</span>
                {batch.errors.map((error, i) => (
                  <p key={i} className="tiny red">
                    {error}
                  </p>
                ))}
              </>
            )}
          </>
        )}
      </Panel>

      <Panel title="Content">
        <KV
          items={Object.entries(counts).map(([key, value]): [string, string] => [
            key,
            String(value),
          ])}
        />
      </Panel>

      <Fold title="Tuning constants">
        <p className="tiny faint">
          Every provisional number the engine reads, exactly as it is defined in tuning.ts.
        </p>
        <Json value={TUNING} />
      </Fold>
    </div>
  );
}

/**
 * Save and load.
 *
 * Manual slots sit alongside the autosave, which the store writes on its own at
 * major transitions.
 */

import { useEffect, useState } from 'react';
import { Btn, Empty, KV, Panel, Row, Sheet } from '../components';
import { store, useGame, useSaves } from '../useStore';
import { dayNumber } from '../../engine/log';
import { SAVE } from '../../engine/tuning';
import type { SaveMeta } from '../../persistence/storage';

function slotLabel(slot: string): string {
  if (slot === SAVE.autosaveSlot) return 'Autosave';
  const trimmed = slot.replace(/^slot/, '');
  return trimmed === slot ? slot : `Slot ${trimmed}`;
}

function timestamp(savedAt: number): string {
  return new Date(savedAt).toLocaleString();
}

function SaveRow({ meta, busy }: { meta: SaveMeta; busy: boolean }) {
  return (
    <Row
      title={`${slotLabel(meta.slot)} · ${meta.captainName}`}
      sub={
        <span>
          Day {dayNumber(meta.hours)} · {meta.locationName} · {meta.crewCount} crew
          <br />
          Seed {meta.seed} · {timestamp(meta.savedAt)}
        </span>
      }
      right={
        <Btn disabled={busy} onClick={() => void store.loadFrom(meta.slot)}>
          Load
        </Btn>
      }
    />
  );
}

export function SaveLoadScreen() {
  const saves = useSaves();
  const state = useGame();
  const [autosaveOpen, setAutosaveOpen] = useState(false);

  useEffect(() => {
    void store.refreshSaves();
  }, []);

  const busy = store.busy;
  const autosave = saves.find((meta) => meta.slot === SAVE.autosaveSlot);
  const manual = saves.filter((meta) => meta.slot !== SAVE.autosaveSlot);

  return (
    <div className="stack">
      <Panel title="Saves" aside={busy ? 'Working' : `${saves.length} stored`}>
        <p className="prose prose--dim">
          The game autosaves on its own at major transitions — arrival, departure, and the
          resolution of anything that changes the run. Manual slots are for the points you want to
          come back to on purpose.
        </p>
      </Panel>

      <Panel title="Write a Save" tight>
        <div className="btn-col">
          {SAVE.manualSlots.map((slot) => {
            const existing = saves.find((meta) => meta.slot === slot);
            return (
              <Btn
                key={slot}
                block
                disabled={busy || !state}
                onClick={() => void store.saveTo(slot)}
                sub={
                  existing
                    ? `Overwrite · Day ${dayNumber(existing.hours)} · ${timestamp(existing.savedAt)}`
                    : 'Empty'
                }
              >
                Save to {slotLabel(slot)}
              </Btn>
            );
          })}
          <Btn
            tone="ghost"
            block
            disabled={!autosave || busy}
            onClick={() => setAutosaveOpen(true)}
            sub={autosave ? `Day ${dayNumber(autosave.hours)} · ${autosave.locationName}` : 'No autosave yet'}
          >
            View Autosave
          </Btn>
        </div>
        {!state && (
          <p className="tiny faint">
            There is no run in progress, so there is nothing to write. Loading still works.
          </p>
        )}
      </Panel>

      <Panel title="Stored Runs" tight>
        {manual.length === 0 ? (
          <Empty>No manual saves yet.</Empty>
        ) : (
          <div className="rows">
            {manual.map((meta) => (
              <SaveRow key={meta.slot} meta={meta} busy={busy} />
            ))}
          </div>
        )}
      </Panel>

      <Sheet open={autosaveOpen} onClose={() => setAutosaveOpen(false)} title="Autosave">
        {!autosave ? (
          <Empty>Nothing has been autosaved yet.</Empty>
        ) : (
          <div className="stack">
            <KV
              items={[
                ['Captain', autosave.captainName],
                ['Seed', autosave.seed],
                ['Day', dayNumber(autosave.hours)],
                ['Location', autosave.locationName],
                ['Crew', autosave.crewCount],
                ['Written', timestamp(autosave.savedAt)],
              ]}
            />
            <Btn
              tone="go"
              block
              disabled={busy}
              onClick={() => {
                setAutosaveOpen(false);
                void store.loadFrom(SAVE.autosaveSlot);
              }}
              sub="Discards anything unsaved in the current run"
            >
              Load Autosave
            </Btn>
          </div>
        )}
      </Sheet>
    </div>
  );
}

/**
 * The start of a run.
 *
 * One decision lives here: take this person and this world, or roll another.
 * The seed system underneath is unchanged and still fully addressable — it is
 * just no longer the subject of the screen. It used to occupy three panels and
 * two paragraphs explaining determinism to somebody who had not met their
 * captain yet.
 *
 * The store has no screen id while `state` is null, so this screen hands off to
 * character generation with local UI state once the captain commits a seed.
 */

import { useEffect, useState } from 'react';
import { Btn, Empty, Panel } from '../components';
import { Portrait } from '../Portrait';
import { store, useDraft } from '../useStore';
import { CharGenScreen } from './CharGenScreen';

export function NewGameScreen() {
  const draft = useDraft();
  const [typed, setTyped] = useState(draft?.seed ?? '');
  const [begun, setBegun] = useState(false);
  // The seed field is a thing you open, not a form the screen is built around.
  const [editing, setEditing] = useState(false);

  const seed = draft?.seed;
  useEffect(() => {
    if (seed) setTyped(seed);
  }, [seed]);

  if (!draft) {
    return (
      <Panel title="New Run">
        <Empty>No run is being prepared. Start one from the title screen.</Empty>
      </Panel>
    );
  }

  if (begun) return <CharGenScreen />;

  const character = draft.protagonist.character;
  const trimmed = typed.trim();
  const dirty = trimmed.length > 0 && trimmed !== draft.seed;

  const commitSeed = () => {
    if (dirty) store.setDraftSeed(trimmed);
    setEditing(false);
  };

  const cancelSeed = () => {
    setTyped(draft.seed);
    setEditing(false);
  };

  return (
    <div className="stack">
      <Panel title="New Run">
        {/* Who you would be. The reason to accept this run or roll another. */}
        <div className="split" style={{ alignItems: 'flex-start' }}>
          <Portrait seed={character.portraitSeed} size="lg" />
          <span className="row__main" style={{ marginLeft: 10 }}>
            <span className="label">Captain</span>
            <span className="value" style={{ display: 'block' }}>
              {character.name} {character.surname}
            </span>
            <span className="label" style={{ marginTop: 6 }}>
              Background
            </span>
            <span className="tiny cyan" style={{ display: 'block' }}>
              {character.lifeHistory.career}
            </span>
          </span>
        </div>

        <div className="divider" />

        {/* The seed, said once, quietly, with its controls beside it. */}
        <div className="split">
          <span className="label">Run seed</span>
          <span className="tiny readout">{draft.seed}</span>
        </div>

        {editing ? (
          <div style={{ marginTop: 8 }}>
            <input
              className="field"
              type="text"
              value={typed}
              spellCheck={false}
              autoFocus
              autoCapitalize="off"
              autoCorrect="off"
              placeholder="Type a seed"
              aria-label="Run seed"
              onChange={(event) => setTyped(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') commitSeed();
                if (event.key === 'Escape') cancelSeed();
              }}
            />
            <div className="btn-row" style={{ marginTop: 6 }}>
              <Btn small wide tone="primary" disabled={!dirty} onClick={commitSeed}>
                Use This Seed
              </Btn>
              <Btn small wide tone="ghost" onClick={cancelSeed}>
                Cancel
              </Btn>
            </div>
          </div>
        ) : (
          <div className="btn-row" style={{ marginTop: 8 }}>
            <Btn small wide onClick={() => store.startNewRun()}>
              Reroll
            </Btn>
            <Btn small wide onClick={() => setEditing(true)}>
              Enter Seed
            </Btn>
          </div>
        )}
      </Panel>

      {/* The dominant control, and nothing competing with it. */}
      <Btn
        tone="primary"
        block
        onClick={() => {
          commitSeed();
          setBegun(true);
        }}
        sub="Meet your captain and begin the run"
      >
        Begin
      </Btn>

      <Btn tone="ghost" block onClick={() => store.quitToTitle()}>
        Back to Title
      </Btn>

      <p className="tiny faint" style={{ textAlign: 'center', margin: '2px 12px 0' }}>
        Each seed builds the same world, captain, ship and starting conditions. What you do with
        them is still yours.
      </p>
    </div>
  );
}

/**
 * Seed entry.
 *
 * The store has no screen id while `state` is null, so this screen hands off to
 * character generation with local UI state once the captain commits a seed.
 */

import { useEffect, useState } from 'react';
import { Btn, Empty, KV, Panel } from '../components';
import { store, useDraft } from '../useStore';
import { CharGenScreen } from './CharGenScreen';

export function NewGameScreen() {
  const draft = useDraft();
  const [typed, setTyped] = useState(draft?.seed ?? '');
  const [begun, setBegun] = useState(false);

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

  const trimmed = typed.trim();
  const dirty = trimmed.length > 0 && trimmed !== draft.seed;

  const commitSeed = () => {
    if (dirty) store.setDraftSeed(trimmed);
  };

  return (
    <div className="stack">
      <Panel title="New Run" aside="Seed">
        <p className="prose">
          The seed is the run. The same seed always produces the same world, the same protagonist,
          the same inherited ship, and the same route between here and the frontier.
        </p>
        <p className="prose prose--dim">
          It does not determine your choices. Who you take aboard, what you spend, when you leave,
          and who you leave behind are yours, captain.
        </p>
      </Panel>

      <Panel title="Current Seed" tight>
        <KV
          items={[
            ['Seed', <span key="seed" className="value readout">{draft.seed}</span>],
            ['Captain', `${draft.protagonist.character.name} ${draft.protagonist.character.surname}`],
            ['Background', draft.protagonist.character.lifeHistory.career],
          ]}
        />
      </Panel>

      <Panel title="Set a Seed">
        <input
          className="field"
          type="text"
          value={typed}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          placeholder="Type a seed"
          aria-label="Run seed"
          onChange={(event) => setTyped(event.target.value)}
          onBlur={commitSeed}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
          }}
        />
        <div className="divider" />
        <div className="btn-row">
          <Btn wide disabled={!dirty} onClick={commitSeed} sub="Rebuild this run from typed text">
            Use Seed
          </Btn>
          <Btn wide onClick={() => store.startNewRun()} sub="Discard and roll a new one">
            Roll Seed
          </Btn>
        </div>
      </Panel>

      <Panel title="Proceed" tight>
        <div className="btn-col">
          <Btn
            tone="primary"
            block
            onClick={() => {
              commitSeed();
              setBegun(true);
            }}
            sub="Allocate attributes and skills for your captain"
          >
            Begin
          </Btn>
          <Btn tone="ghost" block onClick={() => store.quitToTitle()}>
            Back to Title
          </Btn>
        </div>
      </Panel>
    </div>
  );
}

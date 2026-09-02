/**
 * Run over — death or stranding.
 *
 * Reads the ending the engine already wrote and lays out what the run cost.
 */

import { Btn, Chip, Duration, Empty, KV, Panel, Row } from '../components';
import { Portrait } from '../Portrait';
import { store, useGame } from '../useStore';
import { dayNumber } from '../../engine/log';

export function GameOverScreen() {
  const state = useGame();

  if (!state?.ending) {
    return (
      <Panel title="Run Over">
        <Empty>There is no ending to report.</Empty>
      </Panel>
    );
  }

  const ending = state.ending;
  const title = ending.kind === 'stranded' ? 'Stranded' : 'Run Over';

  const characters = Object.values(state.characters);
  const dead = characters.filter((character) => !character.alive);
  const survivors = state.crewIds
    .map((id) => state.characters[id])
    .filter((character) => Boolean(character) && character.alive);

  const visited = Object.values(state.locations).filter((location) => location.visited);
  const totalXp =
    state.crewXp + characters.reduce((sum, character) => sum + character.personalXp, 0);

  return (
    <div className="stack">
      <Panel title={title} aside={`Day ${dayNumber(state.hours)}`}>
        <p className="prose">{ending.text}</p>
        <div className="divider" />
        <p className="prose prose--dim">
          {ending.kind === 'stranded'
            ? 'The ship is still out there. Nobody aboard is in a position to move it.'
            : 'The run ends here. Whatever was still owed on the homeworld stays owed.'}
        </p>
      </Panel>

      <Panel title="Final Report" tight>
        <KV
          items={[
            ['Day reached', dayNumber(state.hours)],
            ['Time elapsed', <Duration key="elapsed" hours={state.hours} />],
            ['Locations visited', `${visited.length} of ${Object.keys(state.locations).length}`],
            ['Crew lost', dead.length],
            ['Crew remaining', survivors.length],
            ['Credits', Math.round(state.resources.credits).toLocaleString()],
            ['Total XP earned', totalXp],
            ['Morale at the end', Math.round(state.morale)],
            ['Seed', <span key="seed" className="readout">{state.seed}</span>],
          ]}
        />
      </Panel>

      <Panel title="Where You Got To" tight>
        {visited.length === 0 ? (
          <Empty>Nowhere. The run ended at the start.</Empty>
        ) : (
          <div className="chips">
            {visited.map((location) => (
              <Chip key={location.id} tone={location.kind === 'travelWorld' ? 'green' : undefined}>
                {location.name}
              </Chip>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Memorial" aside={`${dead.length} lost`} tight>
        {dead.length === 0 ? (
          <Empty>Nobody died. That is its own kind of report.</Empty>
        ) : (
          <div className="rows">
            {dead.map((character) => (
              <Row
                key={character.id}
                left={<Portrait seed={character.portraitSeed} dead />}
                title={
                  <span>
                    {character.name} {character.surname}
                    {character.isPlayer && <span className="amber"> ★</span>}
                  </span>
                }
                sub={character.departedReason ?? 'No record of how it happened.'}
                right={<span className="tiny faint nowrap">{character.age}</span>}
              />
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Again" tight>
        <div className="btn-col">
          <Btn
            tone="primary"
            block
            onClick={() => store.startNewRun()}
            sub="A new seed, a new captain, the same two clocks"
          >
            New Run
          </Btn>
          <Btn tone="ghost" block onClick={() => store.quitToTitle()}>
            Back to Title
          </Btn>
        </div>
      </Panel>
    </div>
  );
}

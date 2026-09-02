/**
 * Travel Center — the V1 completion state.
 *
 * Reaching the frontier ends the build, not the story. This screen reports what
 * the escape cost and says plainly where the game currently stops.
 */

import { Btn, Chip, CrewRow, Duration, Empty, KV, Meter, Panel, ResourceStrip, Row } from '../components';
import { Portrait } from '../Portrait';
import { store, useGame } from '../useStore';
import { dayNumber } from '../../engine/log';
import {
  SYSTEM_LABELS,
  describeShip,
  estimateFuel,
  hullCondition,
  safeCrewCapacity,
  shipConditionLabel,
} from '../../engine/ship';
import { crewMembers, foodConsumptionPerDay } from '../../engine/sim';
import { SHIP_SYSTEM_KINDS } from '../../engine/types';

export function TravelCenterScreen() {
  const state = useGame();

  if (!state) {
    return (
      <Panel title="Travel Center">
        <Empty>There is no run to report on.</Empty>
      </Panel>
    );
  }

  const ship = state.ship;
  const crew = crewMembers(state);
  const lost = Object.values(state.characters).filter((character) => !character.alive);
  const visited = Object.values(state.locations).filter((location) => location.visited);
  const totalXp =
    state.crewXp +
    Object.values(state.characters).reduce((sum, character) => sum + character.personalXp, 0);

  const perDay = foodConsumptionPerDay(state);
  const foodDays = perDay > 0 ? state.resources.food / perDay : Infinity;
  const fuelJumps = ship ? estimateFuel(ship, crew, state.resources.fuel).jumpsRemaining : 0;
  const capacity = ship ? safeCrewCapacity(ship) : 0;

  return (
    <div className="stack">
      <Panel title="Travel Center" aside={`Day ${dayNumber(state.hours)}`}>
        <p className="prose">{state.ending?.text ?? 'You made the frontier.'}</p>
        <div className="divider" />
        <p className="prose">
          You are docked at the Travel Center, captain. The escape worked. The homeworld is behind
          you and the route that mattered is finished.
        </p>
        <p className="prose prose--dim">
          It is not safety. This is a rough frontier world that happens to have a working outbound
          desk. Fuel still costs money, people still get hurt, and the open universe past this dock
          has no map you already own.
        </p>
      </Panel>

      <Panel title="The Crossing" tight>
        <KV
          items={[
            ['Days elapsed', dayNumber(state.hours)],
            ['Time under way', <Duration key="elapsed" hours={state.hours} />],
            ['Locations visited', `${visited.length} of ${Object.keys(state.locations).length}`],
            ['Crew arrived', crew.length],
            ['Crew lost', lost.length],
            ['Total XP earned', totalXp],
            ['Seed', <span key="seed" className="readout">{state.seed}</span>],
          ]}
        />
      </Panel>

      <Panel title="Stores" tight>
        <ResourceStrip
          resources={state.resources}
          crewCount={crew.length}
          crewCapacity={capacity}
          foodDays={foodDays}
          fuelJumps={fuelJumps}
        />
      </Panel>

      <Panel title="Route Behind You" tight>
        {visited.length === 0 ? (
          <Empty>Nothing on record.</Empty>
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

      <Panel title="Surviving Crew" aside={`${crew.length} aboard`} tight>
        {crew.length === 0 ? (
          <Empty>Nobody is left aboard.</Empty>
        ) : (
          <div className="rows">
            {crew.map((character) => (
              <CrewRow key={character.id} character={character} />
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Lost Along the Way" aside={`${lost.length}`} tight>
        {lost.length === 0 ? (
          <Empty>You arrived with everyone you started with.</Empty>
        ) : (
          <div className="rows">
            {lost.map((character) => (
              <Row
                key={character.id}
                left={<Portrait seed={character.portraitSeed} dead />}
                title={`${character.name} ${character.surname}`}
                sub={character.departedReason ?? 'No record of how it happened.'}
                right={<span className="tiny faint nowrap">{character.age}</span>}
              />
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Ship" aside={ship ? describeShip(ship) : 'None'} tight>
        {!ship ? (
          <Empty>You arrived without a ship. That still counts as arriving.</Empty>
        ) : (
          <div className="stack stack--tight">
            <div className="split">
              <span className="value">{ship.name}</span>
              <span className="tiny">{shipConditionLabel(hullCondition(ship))} hull</span>
            </div>
            {SHIP_SYSTEM_KINDS.map((kind) => {
              const system = ship.systems[kind];
              return (
                <div key={kind} className="split" style={{ gap: 8 }}>
                  <span className="statline__name" style={{ minWidth: 0 }}>
                    {SYSTEM_LABELS[kind]}
                  </span>
                  {system.installed ? (
                    <div style={{ width: 96 }}>
                      <Meter value={system.condition} />
                    </div>
                  ) : (
                    <Chip tone="red">Not installed</Chip>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <Panel title="Where V1 Ends" aside="Build note">
        <p className="prose">
          This is the end of the current build. The open-universe campaign — everything past the
          Travel Center desk — is the next one. Your crew, your ship, and the state they arrived in
          are what that campaign is designed to continue from.
        </p>
      </Panel>

      <Panel title="Again" tight>
        <div className="btn-col">
          <Btn
            tone="primary"
            block
            onClick={() => store.startNewRun()}
            sub="A different seed makes a different crossing"
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

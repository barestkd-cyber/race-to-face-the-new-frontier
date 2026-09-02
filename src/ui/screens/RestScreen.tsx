/**
 * Rest.
 *
 * Sleep is the only thing that clears exhaustion, and it is not free: the clock
 * runs, food is eaten, and somewhere dangerous can wake you up.
 */

import { assessDanger, bestAssessor } from '../../engine/assess';
import { crewMembers, daysOfFoodRemaining } from '../../engine/sim';
import { TIME } from '../../engine/tuning';
import { Btn, Chip, CrewRow, Empty, KV, Meter, Panel } from '../components';
import { store, useGame } from '../useStore';

function toneFor(value: number, invert = false): string {
  const score = invert ? 100 - value : value;
  if (score > 60) return 'green';
  if (score > 30) return 'amber';
  return 'red';
}

export function RestScreen() {
  const state = useGame();

  if (!state) {
    return <Empty>No run is loaded.</Empty>;
  }

  const crew = crewMembers(state);
  const location = state.currentLocationId ? state.locations[state.currentLocationId] : undefined;
  const danger = location?.danger ?? state.travel?.danger ?? 0;
  const risk = assessDanger(danger, { assessor: bestAssessor(crew) });
  const foodDays = daysOfFoodRemaining(state);
  const tired = crew.filter((c) => c.rested < 35).length;
  const strained = crew.filter((c) => c.stress >= 60).length;

  return (
    <div className="stack">
      <Panel title="Rest" aside={location ? location.name : 'underway'}>
        <p className="prose">
          Stand the crew down, captain. Stress falls, rested climbs back up, and treated wounds close
          faster while people are off their feet.
        </p>
        <p className="prose prose--dim">
          The cost is time. Rations are eaten at the same rate whether anyone is working or not, and
          the homeworld clock keeps running. Rest can be cut short: a dangerous berth wakes people,
          and if a course is set the leg continues around you and anything that happens on it will
          bring the crew out of their bunks.
        </p>
        <KV
          items={[
            ['Crew', crew.length],
            ['Exhausted', tired],
            ['Under strain', strained],
            ['Food', Number.isFinite(foodDays) ? `${Math.floor(foodDays)} days` : 'stable'],
          ]}
        />
      </Panel>

      <Panel title="Where you are" aside={risk.unsure ? 'unsure' : undefined}>
        {danger <= 0 ? (
          <p className="prose prose--dim">
            Nothing here rates as a threat. Rest should run through uninterrupted.
          </p>
        ) : (
          <>
            <div className="split">
              <span className="label">Danger</span>
              <Chip tone={risk.bars >= 3 ? 'red' : risk.bars === 2 ? 'amber' : 'green'}>
                {risk.label}
                {risk.unsure ? ' (unsure)' : ''}
              </Chip>
            </div>
            <p className="tiny faint">{risk.note}</p>
            <p className="prose prose--dim">
              The longer you sleep somewhere like this, the better the odds something wakes you.
            </p>
          </>
        )}
      </Panel>

      <Panel title="How long">
        <div className="btn-col">
          {TIME.restOptions.map((hours) => (
            <Btn
              key={hours}
              block
              tone={hours === 8 ? 'primary' : 'default'}
              onClick={() => store.rest(hours)}
              sub={
                hours === 8
                  ? 'A normal night. Most of the exhaustion goes.'
                  : hours === 16
                    ? 'Two shifts down. Wounds get real time to close.'
                    : 'A full day out. Costs a day of food and a day of the clock.'
              }
            >
              Rest {hours} hours
            </Btn>
          ))}
        </div>
      </Panel>

      <Panel title="The crew" aside={`${crew.length} aboard`}>
        {crew.length === 0 ? (
          <Empty>There is nobody left to rest.</Empty>
        ) : (
          <div className="rows">
            {crew.map((member) => (
              <CrewRow
                key={member.id}
                character={member}
                right={
                  <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 3, width: 92 }}>
                    <span className={`tiny ${toneFor(member.rested)}`}>
                      Rested {Math.round(member.rested)}
                    </span>
                    <Meter value={member.rested} max={100} />
                    <span className={`tiny ${toneFor(member.stress, true)}`}>
                      Stress {Math.round(member.stress)}
                    </span>
                    <Meter value={100 - member.stress} max={100} />
                  </span>
                }
              />
            ))}
          </div>
        )}
        <p className="tiny faint" style={{ marginTop: 6 }}>
          Below about 35 rested, people start making mistakes on every check they take.
        </p>
      </Panel>

      <Btn
        block
        tone="ghost"
        onClick={() => store.setScreen(state.currentPlaceId ? 'place' : 'cockpit')}
      >
        Not yet
      </Btn>
    </div>
  );
}

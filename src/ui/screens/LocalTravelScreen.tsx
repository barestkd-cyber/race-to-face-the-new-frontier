/**
 * Local travel: everywhere on this world you can walk to, in one list.
 *
 * The world still knows it is made of districts and the venues inside them.
 * The player does not have to operate that hierarchy to reach a clinic. One
 * list, nearest first, each with the real cost of walking there — because the
 * walk is the decision, and the filing system never was.
 */

import { formatDuration } from '../../engine/log';
import {
  currentPlace,
  peopleAt,
  PLACE_KIND_LABELS,
  shipPlace,
  walkOptions,
} from '../../engine/places';
import type { LocationActionKind } from '../../engine/types';
import { Btn, Chip, Empty, Panel } from '../components';
import { store, useGame } from '../useStore';

/** What a place is worth walking to, said in two or three words. */
const DRAW: Partial<Record<LocationActionKind, string>> = {
  trade: 'supplies',
  recruit: 'people looking for a berth',
  findWork: 'work',
  missions: 'work',
  scavenge: 'worth searching',
  repair: 'repairs',
  medical: 'treatment',
  rest: 'a bed',
  study: 'a reading room',
  askForecast: 'news',
  social: 'company',
};

export function LocalTravelScreen() {
  const state = useGame();
  if (!state) return null;

  const location = state.currentLocationId ? state.locations[state.currentLocationId] : undefined;
  if (!location) {
    return (
      <Panel title="Local Travel">
        <Empty>You are between worlds. There is nowhere to walk to.</Empty>
        <Btn block tone="primary" onClick={() => store.setScreen('cockpit')}>
          Back to the Cockpit
        </Btn>
      </Panel>
    );
  }

  const here = currentPlace(state);
  const parked = shipPlace(state);
  const options = walkOptions(state);

  return (
    <div className="stack">
      {/* The way back sits at the top as well as the bottom — this is a list you scroll. */}
      <div className="btn-row">
        {here && (
          <Btn wide onClick={() => store.setScreen('place')}>
            Stay at {here.name}
          </Btn>
        )}
        <Btn wide tone="primary" onClick={() => store.returnToShip()}>
          {parked?.shipHere && here?.id === parked.id ? 'Board Ship' : 'Return to Ship'}
        </Btn>
      </div>

      <Panel title={location.name} aside={`${options.length} places`}>
        <p className="prose prose--dim" style={{ marginTop: 0 }}>
          {here
            ? `You are at ${here.name}. Everywhere below is a walk away, and the clock does not stop for you.`
            : 'Everywhere you can reach on foot from where the ship is berthed.'}
        </p>
      </Panel>

      {options.length === 0 ? (
        <Panel title="Nowhere To Go">
          <Empty>Nothing here is worth the walk.</Empty>
        </Panel>
      ) : (
        <Panel title="Walk To" tight>
          <div className="stack stack--tight">
            {options.map(({ place, hours, district }) => {
              // Who you already know is standing there — the reason to go,
              // named. What is happening inside is still a matter of going.
              const known = peopleAt(state, place.id).filter((p) => p.placeKnown);
              const draws = place.actions
                .map((a) => DRAW[a])
                .filter((d): d is string => Boolean(d));
              const unique = [...new Set(draws)].slice(0, 3);

              return (
                <button
                  key={place.id}
                  type="button"
                  className={[
                    'placecard',
                    place.shipHere ? 'placecard--ship' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => store.goToPlace(place.id)}
                >
                  <span className="placecard__main">
                    <span className="placecard__name">
                      {place.name}
                      {place.shipHere && <span className="amber"> ⌂</span>}
                    </span>
                    <span className="placecard__sub">
                      {unique.length > 0 ? unique.join(' · ') : PLACE_KIND_LABELS[place.kind]}
                    </span>
                    {district && (
                      <span className="placecard__where">in {district.name}</span>
                    )}
                    {known.length > 0 && (
                      <span className="chips" style={{ marginTop: 4 }}>
                        <Chip tone="cyan">
                          {known.length === 1
                            ? `${known[0]!.name} is here`
                            : `${known.length} you know`}
                        </Chip>
                      </span>
                    )}
                  </span>
                  <span className="placecard__time">
                    {formatDuration(hours)}
                    {!place.visited && <div className="amber">unvisited</div>}
                  </span>
                </button>
              );
            })}
          </div>
        </Panel>
      )}
    </div>
  );
}

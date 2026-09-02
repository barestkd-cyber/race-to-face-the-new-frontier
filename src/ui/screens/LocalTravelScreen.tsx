/**
 * Local travel: the districts and venues you can reach on foot.
 *
 * These are places, not actions. You know the shape of your own homeworld, so
 * the districts are listed — but not who is in them, what work is going, or
 * what any merchant has in stock. That is what going there is for.
 */

import { formatDuration } from '../../engine/log';
import {
  childPlaces,
  currentPlace,
  districtsAt,
  PLACE_KIND_LABELS,
  shipPlace,
} from '../../engine/places';
import { Btn, Chip, Empty, Panel } from '../components';
import { store, useGame } from '../useStore';

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
  const districts = districtsAt(state, location.id).filter((p) => p.discovered);
  const parked = shipPlace(state);
  const siblings = here?.parentId
    ? childPlaces(state, here.parentId).filter((p) => p.id !== here.id)
    : [];

  return (
    <div className="stack">
      <Panel title={location.name} aside="Local travel">
        <p className="prose prose--dim">
          {location.kind === 'homeworld'
            ? 'You grew up here, so you know the districts. What is happening in any of them right now is another question.'
            : 'What you can reach on foot from where the ship is berthed.'}
        </p>
        {here && (
          <p className="tiny" style={{ marginTop: 6, marginBottom: 0 }}>
            Currently at <span className="green">{here.name}</span>.
          </p>
        )}
      </Panel>

      <Panel title="Districts" aside={`${districts.length}`}>
        {districts.length === 0 ? (
          <Empty>Nowhere here is worth the walk.</Empty>
        ) : (
          <div className="stack stack--tight">
            {districts.map((district) => {
              const isHere = here?.id === district.id || here?.parentId === district.id;
              const venues = childPlaces(state, district.id);
              return (
                <button
                  key={district.id}
                  type="button"
                  className={[
                    'placecard',
                    isHere ? 'placecard--here' : '',
                    district.shipHere ? 'placecard--ship' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => store.goToPlace(district.id)}
                  disabled={here?.id === district.id}
                >
                  <span className="placecard__main">
                    <span className="placecard__name">
                      {district.name}
                      {district.shipHere && <span className="amber"> ⌂</span>}
                    </span>
                    <span className="placecard__sub">
                      {district.subtitle}
                      {venues.length > 0
                        ? ` · ${venues.length} place${venues.length === 1 ? '' : 's'}`
                        : ''}
                    </span>
                  </span>
                  <span className="placecard__time">
                    {here?.id === district.id ? (
                      <Chip tone="green">here</Chip>
                    ) : (
                      <>
                        {formatDuration(district.travelHours)}
                        {!district.visited && <div className="amber">unvisited</div>}
                      </>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        <p className="tiny faint" style={{ marginTop: 8, marginBottom: 0 }}>
          Getting anywhere takes time, and the clock does not stop for you.
        </p>
      </Panel>

      {/* Venues beside the one you are standing in, so you can move sideways */}
      {here?.parentId && siblings.length > 0 && (
        <Panel title={`Inside ${state.places[here.parentId]?.name ?? 'this district'}`}>
          <div className="stack stack--tight">
            {siblings.map((sibling) => (
                <button
                  key={sibling.id}
                  type="button"
                  className="placecard"
                  onClick={() => store.goToPlace(sibling.id)}
                >
                  <span className="placecard__main">
                    <span className="placecard__name">{sibling.name}</span>
                    <span className="placecard__sub">
                      {PLACE_KIND_LABELS[sibling.kind]} · {sibling.subtitle}
                    </span>
                  </span>
                  <span className="placecard__time">{formatDuration(sibling.travelHours)}</span>
                </button>
              ))}
          </div>
        </Panel>
      )}


      <div className="btn-row">
        {here && (
          <Btn wide onClick={() => store.setScreen('place')}>
            Back to {here.name}
          </Btn>
        )}
        <Btn wide tone="primary" onClick={() => store.returnToShip()}>
          {parked?.shipHere && here?.id === parked.id ? 'Board Ship' : 'Return to Ship'}
        </Btn>
      </div>
    </div>
  );
}

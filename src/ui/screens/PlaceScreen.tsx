/**
 * Where you are standing, and what can actually be done from here.
 *
 * Every action on this screen exists because this particular place contains it.
 * There is no global Trade, no global Recruit, and no way to offer somebody
 * passage who is on the other side of the city.
 */

import { contactAccess, contactsHere, isFamily, relationshipLabel } from '../../engine/actions';
import { safeCrewCapacity } from '../../engine/ship';
import { formatDuration } from '../../engine/log';
import { childPlaces, currentPlace, PLACE_KIND_LABELS } from '../../engine/places';
import { missionsHere } from '../../engine/missions';
import { crewMembers } from '../../engine/sim';
import type { LocationActionKind } from '../../engine/types';
import { Btn, Chip, Empty, Panel, Row } from '../components';
import { Portrait } from '../Portrait';
import { store, useGame } from '../useStore';

interface ActionSpec {
  label: string;
  description: string;
  time: string;
}

/** What each action means when you are standing in front of it. */
const ACTIONS: Record<LocationActionKind, ActionSpec> = {
  trade: {
    label: 'Trade',
    description: 'Buy, sell, and take on supplies.',
    time: '1–3 hours',
  },
  recruit: {
    label: 'Ask About Crew',
    description: 'See who here might be willing to leave with you.',
    time: '3–8 hours',
  },
  findWork: {
    label: 'Look For Work',
    description: 'Paid jobs going right now.',
    time: 'varies',
  },
  missions: {
    label: 'Contracts',
    description: 'Work worth taking a party out for.',
    time: 'varies',
  },
  scavenge: {
    label: 'Search The Site',
    description: 'Work it room by room. You will not see the whole place before you go in.',
    time: '4–12 hours',
  },
  repair: {
    label: 'Repair Work',
    description: 'Put the ship back together, with parts and time or with money.',
    time: 'hours to days',
  },
  medical: {
    label: 'Seek Treatment',
    description: 'Proper care, before an injury turns into something worse.',
    time: '1–5 hours',
  },
  social: {
    label: 'Spend Time Here',
    description: 'Talk to people. Stress falls, and you learn who they are.',
    time: '2–4 hours',
  },
  rest: {
    label: 'Sleep Here',
    description: 'Eight, sixteen, or twenty-four hours.',
    time: '8–24 hours',
  },
  askForecast: {
    label: 'Ask About the Forecasts',
    description:
      'Freight crews and dispatchers hear things first. A sharper read on how long this world has.',
    time: '1½–3 hours',
  },
  depart: {
    label: 'Return to the Ship',
    description: 'Walk back and board.',
    time: '—',
  },
};

export function PlaceScreen() {
  const state = useGame();
  if (!state) return null;

  const place = currentPlace(state);
  if (!place) {
    return (
      <Panel title="Outside">
        <Empty>You are aboard the ship.</Empty>
        <Btn block tone="primary" onClick={() => store.setScreen('cockpit')}>
          Back to the Cockpit
        </Btn>
      </Panel>
    );
  }

  const location = state.locations[place.locationId];
  const inside = childPlaces(state, place.id).filter((p) => p.discovered);
  const people = contactsHere(state);
  const crew = crewMembers(state);
  const missions = missionsHere(state).length;

  // Only offer what this place actually has. Depart is handled separately so it
  // never competes for attention with the real choices.
  const actions = place.actions.filter((a) => a !== 'depart');

  return (
    <div className="stack">
      <Panel title={place.name} aside={PLACE_KIND_LABELS[place.kind]}>
        <div className="tiny cyan">{place.subtitle}</div>
        <p className="prose prose--dim" style={{ marginTop: 6 }}>
          {place.description}
        </p>
        <div className="chips" style={{ marginTop: 8 }}>
          <Chip>{location?.name ?? 'Unknown world'}</Chip>
          {place.danger > 30 && (
            <Chip tone={place.danger > 55 ? 'red' : 'amber'}>unsecured</Chip>
          )}
          {place.shipHere && <Chip tone="amber">your ship is here</Chip>}
        </div>
      </Panel>

      {/* People physically present */}
      {people.length > 0 && (
        <Panel title="People Here" aside={`${people.length}`}>
          <div className="stack stack--tight">
            {people.map((person) => {
              const access = contactAccess(state, person.id);
              const family = isFamily(state, person.id);
              const rel = state.characters[state.playerId]?.relationships[person.id];
              const relLabel = rel ? relationshipLabel(rel.value, rel.familiarity) : null;

              // The offer is a decision, so its costs and its odds sit right
              // on it: a berth, a mouth, and how likely they are to say yes.
              const capacity = state.ship && !state.ship.destroyed ? safeCrewCapacity(state.ship) : 0;
              const aboardAfter = crew.length + 1;
              const likelihood =
                (rel?.value ?? 0) >= 40
                  ? 'they trust you — likely yes'
                  : (rel?.value ?? 0) >= 10
                    ? 'they might — hard to say'
                    : 'they barely know you — a real ask';

              return (
                <div key={person.id} className="panel panel--inset" style={{ marginBottom: 0 }}>
                  <div className="panel__body panel__body--tight">
                    <div className="split">
                      <Portrait seed={person.portraitSeed} size="sm" />
                      <span className="row__main" style={{ marginLeft: 8 }}>
                        <span className="row__title">
                          {person.name} {person.surname}
                        </span>
                        <span className="row__sub">
                          {family ? 'Family' : 'Contact'} · {person.lifeHistory.career}
                        </span>
                      </span>
                      {relLabel && <Chip tone={rel && rel.value >= 30 ? 'green' : undefined}>{relLabel}</Chip>}
                    </div>
                    {access.ok ? (
                      <>
                        <p className="tiny faint" style={{ margin: '6px 0 0' }}>
                          Passage fills {aboardAfter} of {capacity} berths, adds one mouth —{' '}
                          {likelihood}.
                        </p>
                        <div className="btn-row" style={{ marginTop: 6 }}>
                          <Btn small wide onClick={() => store.visitContact(person.id)} sub="2–5 hours">
                            Talk
                          </Btn>
                          <Btn
                            small
                            wide
                            tone="primary"
                            onClick={() => store.offerPassage(person.id)}
                          >
                            Offer Passage
                          </Btn>
                        </div>
                      </>
                    ) : (
                      <p className="tiny faint" style={{ marginTop: 6, marginBottom: 0 }}>
                        {access.reason}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {/* What this place offers */}
      {actions.length > 0 ? (
        <Panel title="Here You Can">
          <div className="rows">
            {actions.map((kind) => {
              const spec = ACTIONS[kind];
              const badge =
                (kind === 'missions' || kind === 'findWork') && missions > 0
                  ? `${missions} offered`
                  : kind === 'recruit' && crew.length < 2
                    ? 'you are alone'
                    : null;
              return (
                <Row
                  key={kind}
                  title={spec.label}
                  sub={spec.description}
                  right={
                    badge ? (
                      <Chip tone="amber">{badge}</Chip>
                    ) : (
                      <span className="tiny faint">{spec.time}</span>
                    )
                  }
                  onClick={() => store.openPlaceAction(kind)}
                />
              );
            })}
          </div>
        </Panel>
      ) : (
        <Panel title="Here You Can">
          <Empty>Nothing here but the way through.</Empty>
        </Panel>
      )}

      {/* Places within this one */}
      {inside.length > 0 && (
        <Panel title="Inside This District" aside={`${inside.length}`}>
          <div className="stack stack--tight">
            {inside.map((child) => (
              <button
                key={child.id}
                type="button"
                className="placecard"
                onClick={() => store.goToPlace(child.id)}
              >
                <span className="placecard__main">
                  <span className="placecard__name">{child.name}</span>
                  <span className="placecard__sub">{child.subtitle}</span>
                </span>
                <span className="placecard__time">
                  {formatDuration(child.travelHours)}
                  {child.visited ? '' : ' · new'}
                </span>
              </button>
            ))}
          </div>
        </Panel>
      )}

      <div className="btn-row">
        <Btn wide onClick={() => store.openLocalTravel()}>
          Go Elsewhere
        </Btn>
        <Btn wide tone="primary" onClick={() => store.returnToShip()}>
          Return to Ship
        </Btn>
      </div>
    </div>
  );
}

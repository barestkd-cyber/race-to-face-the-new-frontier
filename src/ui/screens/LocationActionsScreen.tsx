/**
 * Contextual actions for wherever the ship is docked or landed. Only actions
 * the location actually exposes are shown.
 */

import { CONDITION_LABELS } from '../../engine/world';
import { crewMembers } from '../../engine/sim';
import { isFamily, knownContacts, untreatedWoundCount } from '../../engine/actions';
import { missionsHere } from '../../engine/missions';
import type { LocationActionKind } from '../../engine/types';
import { Btn, Chip, Empty, Panel, Row } from '../components';
import { Portrait } from '../Portrait';
import { store, useGame } from '../useStore';

interface ActionSpec {
  kind: LocationActionKind;
  label: string;
  description: string;
  time: string;
}

const ACTIONS: Record<LocationActionKind, ActionSpec> = {
  trade: {
    kind: 'trade',
    label: 'Trade',
    description: 'Buy and sell, and top the tanks up before a long leg.',
    time: '1–3 hours',
  },
  recruit: {
    kind: 'recruit',
    label: 'Recruit',
    description: 'Ask around for people willing to leave. Finding someone is not the same as hiring them.',
    time: '3–8 hours',
  },
  findWork: {
    kind: 'findWork',
    label: 'Find Work',
    description: 'Paid jobs. Some need one person, some need a party, some need the whole ship.',
    time: 'varies',
  },
  missions: {
    kind: 'missions',
    label: 'Missions',
    description: 'Contracts and sites worth deploying a party to.',
    time: 'varies',
  },
  scavenge: {
    kind: 'scavenge',
    label: 'Scavenge',
    description: 'Work a site room by room. You will not see the whole place before you go in.',
    time: '4–12 hours',
  },
  repair: {
    kind: 'repair',
    label: 'Repair / Resupply',
    description: 'Put the ship back together, with parts and time or with money.',
    time: 'hours to days',
  },
  medical: {
    kind: 'medical',
    label: 'Medical',
    description: 'Treat wounds properly before they turn into something worse.',
    time: '1–5 hours',
  },
  social: {
    kind: 'social',
    label: 'Social / Contacts',
    description: 'Time with the crew. Stress falls, and you learn who these people actually are.',
    time: '2–4 hours',
  },
  rest: {
    kind: 'rest',
    label: 'Rest',
    description: 'Sleep. Eight, sixteen, or twenty-four hours.',
    time: '8–24 hours',
  },
  depart: {
    kind: 'depart',
    label: 'Return to Ship',
    description: 'Back to the cockpit and the navigation display.',
    time: '—',
  },
};

export function LocationActionsScreen() {
  const state = useGame();
  if (!state) return null;

  const location = state.currentLocationId ? state.locations[state.currentLocationId] : undefined;
  if (!location) {
    return (
      <Panel title="Location Actions">
        <Empty>You are not docked anywhere.</Empty>
      </Panel>
    );
  }

  const crew = crewMembers(state);
  const wounded = untreatedWoundCount(state);
  const missions = missionsHere(state).length;
  const player = state.characters[state.playerId];

  // Family only matter while you are somewhere they actually are.
  const contacts =
    location.kind === 'homeworld' && !state.homeworld.ended ? knownContacts(state) : [];

  const badgeFor = (kind: LocationActionKind): string | null => {
    if (kind === 'medical' && wounded > 0) return `${wounded} untreated`;
    if ((kind === 'missions' || kind === 'findWork') && missions > 0) return `${missions} offered`;
    if (kind === 'recruit' && crew.length < 3) return 'shorthanded';
    return null;
  };

  return (
    <div className="stack">
      <Panel title={location.name} aside={CONDITION_LABELS[location.condition]}>
        <p className="prose prose--dim">{location.description}</p>
        <div className="chips" style={{ marginTop: 8 }}>
          <Chip tone="cyan">{location.subtitle}</Chip>
          {location.economyRole && <Chip>{location.economyRole}</Chip>}
          {location.terrain && <Chip>{location.terrain}</Chip>}
          <Chip tone={location.danger > 55 ? 'red' : location.danger > 30 ? 'amber' : 'green'}>
            danger {location.danger}
          </Chip>
        </div>
      </Panel>

      <Panel title="What Would You Like To Do">
        <div className="rows">
          {location.actions.map((kind) => {
            const spec = ACTIONS[kind];
            const badge = badgeFor(kind);
            return (
              <Row
                key={kind}
                title={spec.label}
                sub={spec.description}
                right={
                  <span className="tiny">
                    {badge ? <Chip tone="amber">{badge}</Chip> : <span className="faint">{spec.time}</span>}
                  </span>
                }
                onClick={() => {
                  if (kind === 'depart') {
                    store.setScreen('cockpit');
                  } else {
                    store.openLocationAction(kind);
                  }
                }}
              />
            );
          })}
        </div>
      </Panel>

      {contacts.length > 0 && (
        <Panel title="Family and Contacts" aside={`${contacts.length} here`}>
          <p className="prose prose--dim">
            People you know, still planetside. Anyone left behind when the clocks run out is left
            behind for good.
          </p>
          <div className="rows" style={{ marginTop: 8 }}>
            {contacts.map((contact) => {
              const rel = player?.relationships[contact.id];
              const closeness = rel?.value ?? 0;
              const family = isFamily(state, contact.id);
              return (
                <div key={contact.id} className="panel panel--inset" style={{ marginBottom: 0 }}>
                  <div className="panel__body panel__body--tight">
                    <div className="split">
                      <span>
                        <Portrait seed={contact.portraitSeed} size="sm" />
                      </span>
                      <span className="row__main" style={{ marginLeft: 8 }}>
                        <span className="row__title">
                          {contact.name} {contact.surname}
                        </span>
                        <span className="row__sub">
                          {family ? 'Family' : 'Contact'} · age {contact.age} ·{' '}
                          {contact.lifeHistory.career}
                        </span>
                      </span>
                    </div>
                    <div className="btn-row" style={{ marginTop: 6 }}>
                      <Btn small wide onClick={() => store.visitContact(contact.id)} sub="2–5 hours">
                        Visit
                      </Btn>
                      <Btn
                        small
                        wide
                        tone="primary"
                        onClick={() => store.offerPassage(contact.id)}
                        sub={
                          closeness < (family ? 10 : 45)
                            ? 'They are not ready to go'
                            : 'They will come'
                        }
                      >
                        Offer Passage
                      </Btn>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      <Panel title="Look Around">
        <p className="prose prose--dim">
          Spend a couple of hours seeing what is actually happening here. Opportunities come and go
          on their own schedule.
        </p>
        <Btn block tone="primary" onClick={() => store.lookForOpportunity()} sub="About 1–2 hours">
          See What Is Happening
        </Btn>
      </Panel>

      <Btn block tone="ghost" onClick={() => store.setScreen('cockpit')}>
        Back to the Cockpit
      </Btn>
    </div>
  );
}

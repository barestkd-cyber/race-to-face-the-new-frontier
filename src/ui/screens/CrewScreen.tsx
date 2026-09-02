/**
 * Crew roster.
 *
 * Who is aboard, whether the ship can actually hold them, how the crew is
 * holding together, and who takes command when you are not there to give the
 * order yourself.
 */

import { useState } from 'react';
import { Btn, Chip, CrewRow, Empty, Meter, Panel, Row, Sheet } from '../components';
import { Portrait } from '../Portrait';
import { store, useGame } from '../useStore';
import { safeCrewCapacity } from '../../engine/ship';
import { crewMembers, moraleBand } from '../../engine/sim';
import { conditionLabel } from '../../engine/wounds';
import type { Character } from '../../engine/types';

export function CrewScreen() {
  const state = useGame();
  const [pickingCaptain, setPickingCaptain] = useState(false);

  if (!state) {
    return <Empty>No run is loaded, captain. Start or load a game first.</Empty>;
  }

  const crew = crewMembers(state);

  const ship = state.ship;
  const shipUsable = Boolean(ship && !ship.destroyed);
  const capacity = ship && !ship.destroyed ? safeCrewCapacity(ship) : 0;
  const overBy = Math.max(0, crew.length - capacity);

  const band = moraleBand(state.morale);
  const moraleColor =
    band.key === 'high' || band.key === 'good'
      ? 'var(--green)'
      : band.key === 'strained'
        ? 'var(--amber)'
        : 'var(--red)';
  const moraleTone: 'green' | 'amber' | 'red' =
    band.key === 'high' || band.key === 'good'
      ? 'green'
      : band.key === 'strained'
        ? 'amber'
        : 'red';

  const captain: Character | undefined = state.characters[state.captainId];
  const familyIds = new Set(state.homeworld.familyIds);
  const rescuedIds = new Set(state.homeworld.rescuedFamilyIds);

  const known = Object.values(state.characters)
    .filter((c) => !c.aboard && c.alive)
    .sort((a, b) => Number(familyIds.has(b.id)) - Number(familyIds.has(a.id)));

  return (
    <div className="stack">
      <Panel
        title="Complement"
        aside={`${crew.length} / ${shipUsable ? capacity : '—'}`}
      >
        <div className="split">
          <span className="label">Berths and air</span>
          <span className="value readout">
            {crew.length} / {shipUsable ? capacity : '—'}
          </span>
        </div>
        <div style={{ marginTop: 6 }}>
          <Meter
            value={crew.length}
            max={Math.max(1, capacity)}
            color={overBy > 0 ? 'var(--red)' : 'var(--green)'}
            tall
          />
        </div>
        {!shipUsable ? (
          <p className="prose prose--dim" style={{ marginTop: 8 }}>
            You have no working ship, so there are no berths and no life support to
            share out. Everyone listed here is living on whatever you can improvise.
          </p>
        ) : overBy > 0 ? (
          <p className="prose" style={{ marginTop: 8 }}>
            <span className="red">
              You are {overBy} over safe capacity.
            </span>{' '}
            Quarters and life support only stretch to {capacity}. Every head above
            that adds stress to the whole crew and drags morale down for as long as
            it lasts. Cut the roster, or fit better quarters and life support.
          </p>
        ) : crew.length <= 1 ? (
          <p className="prose" style={{ marginTop: 8 }}>
            <span className="amber">You are currently alone.</span> Safe capacity is the
            lower of quarters and life support, and yours stretches to {capacity}. Those
            empty berths are the difference between a solo run and a crew — but nobody
            signs on from a menu. You will have to go where people are and convince
            them.
          </p>
        ) : (
          <p className="prose prose--dim" style={{ marginTop: 8 }}>
            Safe capacity is the lower of quarters and life support. Stay at or under
            it and the crew sleeps and breathes properly.
          </p>
        )}
      </Panel>

      <Panel title="Crew morale" aside={band.label}>
        <div className="split">
          <span className="label">Morale</span>
          <span className="value readout">{Math.round(state.morale)}</span>
        </div>
        <div style={{ marginTop: 6 }}>
          <Meter value={state.morale} max={100} color={moraleColor} tall />
        </div>
        <div className="chips" style={{ marginTop: 8 }}>
          <Chip tone={moraleTone}>{band.label}</Chip>
          <Chip>Crew XP {state.crewXp}</Chip>
        </div>
        <p className="prose prose--dim" style={{ marginTop: 8 }}>
          Morale shifts every check the crew makes, for better or worse. Crew XP is a
          shared pool: you may spend it raising any one of these people, on top of
          whatever personal XP they have earned themselves.
        </p>
      </Panel>

      <Panel title="Command" aside={captain ? `${captain.name} ${captain.surname}` : 'Vacant'}>
        <p className="prose">
          {captain
            ? `${captain.name} ${captain.surname} has the ship.`
            : 'Nobody currently holds command.'}{' '}
          When you take a party off the ship, the captain runs everything left behind
          and answers whatever happens without you. Their Decision Making, Leadership
          and their own tendencies decide how that goes, so this is not a title.
        </p>
        <div className="btn-row" style={{ marginTop: 8 }}>
          <Btn
            tone="primary"
            wide
            onClick={() => setPickingCaptain(true)}
            disabled={crew.length === 0}
          >
            Set Captain
          </Btn>
          <Btn
            wide
            onClick={() => store.equipBest()}
            disabled={!shipUsable || crew.length === 0}
            sub="Best available gear from the hold"
          >
            Equip Crew From Hold
          </Btn>
        </div>
      </Panel>

      <Panel title="Aboard" aside={`${crew.length}`}>
        {crew.length === 0 ? (
          <Empty>Nobody is aboard.</Empty>
        ) : (
          <div className="rows">
            {crew.map((member) => (
              <CrewRow
                key={member.id}
                character={member}
                onClick={() => store.focusCharacter(member.id)}
              />
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Known, not aboard" aside={`${known.length}`}>
        <p className="prose prose--dim">
          Family and contacts still out there. This is a record, not a roster — you
          cannot offer anyone passage from here. Go to where they are and ask them
          yourself. When the clock runs out, anyone still planetside is lost with
          everything else.
        </p>
        {known.length === 0 ? (
          <Empty>You know nobody outside the crew.</Empty>
        ) : (
          <div className="rows" style={{ marginTop: 8 }}>
            {known.map((person) => (
              <Row
                key={person.id}
                onClick={() => store.focusCharacter(person.id)}
                left={<Portrait seed={person.portraitSeed} size="sm" />}
                title={`${person.name} ${person.surname}`}
                sub={
                  <span>
                    {familyIds.has(person.id) ? 'Family' : 'Contact'} ·{' '}
                    {conditionLabel(person)}
                  </span>
                }
                right={
                  rescuedIds.has(person.id) ? (
                    <Chip tone="green">Aboard</Chip>
                  ) : !person.placeKnown ? (
                    <Chip>Whereabouts unknown</Chip>
                  ) : person.availability === 'working' ? (
                    <Chip tone="amber">On shift</Chip>
                  ) : person.availability === 'unreachable' ? (
                    <Chip tone="red">Not seeing anyone</Chip>
                  ) : person.placeId && state.places[person.placeId] ? (
                    <Chip tone="cyan">{state.places[person.placeId]!.name}</Chip>
                  ) : undefined
                }
              />
            ))}
          </div>
        )}
      </Panel>

      <Sheet
        open={pickingCaptain}
        onClose={() => setPickingCaptain(false)}
        title="Who has the ship"
      >
        <p className="prose prose--dim">
          Pick the person who acts on your behalf when you are away. Choose for
          judgement and steadiness, not for skill with a wrench.
        </p>
        <div className="rows" style={{ marginTop: 8 }}>
          {crew.map((member) => (
            <CrewRow
              key={member.id}
              character={member}
              selected={member.id === state.captainId}
              onClick={() => {
                store.setCaptain(member.id);
                setPickingCaptain(false);
              }}
              right={
                member.id === state.captainId ? (
                  <Chip tone="amber">Captain</Chip>
                ) : (
                  <Chip>Promote</Chip>
                )
              }
            />
          ))}
        </div>
      </Sheet>
    </div>
  );
}

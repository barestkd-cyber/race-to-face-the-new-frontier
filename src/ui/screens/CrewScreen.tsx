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
import {
  berthSecurity,
  canPayShipWatch,
  captainOf,
  crewLeadCandidates,
  crewLeadOf,
} from '../../engine/command';
import { COMMAND } from '../../engine/tuning';
import { crewCapacity } from '../../engine/ship';
import { crewMembers, moraleBand } from '../../engine/sim';
import { conditionLabel } from '../../engine/wounds';
import type { Character } from '../../engine/types';

export function CrewScreen() {
  const state = useGame();
  const [pickingLead, setPickingLead] = useState(false);

  if (!state) {
    return <Empty>No run is loaded, captain. Start or load a game first.</Empty>;
  }

  const crew = crewMembers(state);
  const deployed = Boolean(state.expedition);

  const ship = state.ship;
  const shipUsable = Boolean(ship && !ship.destroyed);
  const capacity = ship && !ship.destroyed ? crewCapacity(ship) : 0;
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

  const captain: Character | undefined = captainOf(state);
  const crewLead: Character | undefined = crewLeadOf(state);
  const leadCandidates = crewLeadCandidates(state);
  const berth = berthSecurity(state);
  const watchAllowed = canPayShipWatch(state);
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
              You are {overBy} over capacity.
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

      {/*
        Two posts, and only two. The chair is not a promotion the player hands
        out — it moves once, when the person in it dies.
      */}
      <Panel title="Command" aside={captain ? `${captain.name} ${captain.surname}` : 'Vacant'}>
        <div className="rows">
          <Row
            title={captain ? `${captain.name} ${captain.surname}` : 'Vacant'}
            sub="Captain — holds the chair until they die"
            right={<Chip tone="amber">Captain</Chip>}
          />
          <Row
            title={crewLead ? `${crewLead.name} ${crewLead.surname}` : 'Nobody yet'}
            sub={
              crewLead
                ? `Crew lead — Leadership ${crewLead.attributes.leadership}`
                : 'Crew lead — the ship has nobody but the captain'
            }
            right={crewLead ? <Chip tone="cyan">Crew Lead</Chip> : <Chip>Vacant</Chip>}
          />
        </div>
        <p className="prose prose--dim" style={{ marginTop: 8 }}>
          One of them stays with the ship whenever a party goes out. If you lead it, the
          crew lead runs everything left behind; if they lead it, you do. They only both
          leave where the berth is genuinely covered.
        </p>
        <p className={berth.secured ? 'tiny green' : 'tiny amber'} style={{ marginBottom: 0 }}>
          {berth.reason}
        </p>
        {!berth.secured && (
          <Btn
            small
            block
            onClick={() => store.payShipWatch()}
            disabled={!watchAllowed.ok}
            sub={watchAllowed.ok ? `${COMMAND.shipWatchCredits} cr, holds for a day` : watchAllowed.reason}
          >
            Pay Somebody To Watch Her
          </Btn>
        )}
        <div className="btn-row" style={{ marginTop: 8 }}>
          <Btn
            tone="primary"
            wide
            onClick={() => setPickingLead(true)}
            disabled={leadCandidates.length === 0 || deployed}
            sub={
              deployed
                ? 'Party away — the post waits until they are back'
                : leadCandidates.length === 0
                  ? 'Nobody aboard but you'
                  : undefined
            }
          >
            Set Crew Lead
          </Btn>
          <Btn
            wide
            onClick={() => store.equipBest()}
            disabled={!shipUsable || crew.length === 0 || deployed}
            sub={deployed ? 'Party away' : 'Best available gear from the hold'}
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
        open={pickingLead}
        onClose={() => setPickingLead(false)}
        title="Who has the ship when you are out"
      >
        <p className="prose prose--dim">
          The crew lead acts on your behalf when you are away, and is the person you can
          send out instead of going yourself. Choose for judgement and steadiness, not
          for skill with a wrench.
        </p>
        <div className="rows" style={{ marginTop: 8 }}>
          {leadCandidates.map((member) => (
            <CrewRow
              key={member.id}
              character={member}
              selected={member.id === state.crewLeadId}
              onClick={() => {
                store.assignCrewLead(member.id);
                setPickingLead(false);
              }}
              right={
                member.id === state.crewLeadId ? (
                  <Chip tone="cyan">Crew Lead</Chip>
                ) : (
                  <Chip>Leadership {member.attributes.leadership}</Chip>
                )
              }
            />
          ))}
        </div>
      </Sheet>
    </div>
  );
}

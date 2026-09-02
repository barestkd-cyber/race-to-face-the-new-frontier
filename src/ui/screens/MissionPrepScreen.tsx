/**
 * Work and sites.
 *
 * Both put a party outside the ship, so both are prepared the same way: pick the
 * job, pick who goes, pick who leads. Only one party can be out at a time.
 */

import { assessDanger, bestAssessor } from '../../engine/assess';
import { canRunMission, missionsHere, partyRules, validateParty } from '../../engine/missions';
import { briefSite } from '../../engine/scavenge';
import { crewMembers } from '../../engine/sim';
import type { MissionDef, MissionKind, ScavengeSite } from '../../engine/types';
import { Btn, Chip, CrewRow, Duration, Empty, KV, Panel, Row } from '../components';
import { store, useGame } from '../useStore';

const KIND_LABELS: Record<MissionKind, string> = {
  solo: 'Solo',
  group: 'Group',
  crew: 'Crew',
};

const KIND_NOTES: Record<MissionKind, string> = {
  solo: 'One person goes out alone. Nobody is coming to help them.',
  group: 'A party goes out together and works as one.',
  crew: 'The ship itself is committed to this, not just the people aboard it.',
};

export function MissionPrepScreen() {
  const state = useGame();

  if (!state) {
    return <Empty>No run is loaded.</Empty>;
  }

  const location = state.currentLocationId ? state.locations[state.currentLocationId] : undefined;

  if (!location) {
    return (
      <Panel title="Work">
        <Empty>You are underway. There is no work to take out here.</Empty>
      </Panel>
    );
  }

  const crew = crewMembers(state);
  const assessor = bestAssessor(crew);
  const missions = missionsHere(state);
  const sites = location.siteIds
    .map((id) => state.sites[id])
    .filter((site): site is ScavengeSite => Boolean(site));

  const prep = state.missionPrep;
  const selectedMission: MissionDef | undefined = prep?.missionId
    ? missions.find((m) => m.id === prep.missionId)
    : undefined;
  const selectedSite: ScavengeSite | undefined = prep?.siteId ? state.sites[prep.siteId] : undefined;

  const chooseMission = (mission: MissionDef): void => {
    store.setMissionPrep({
      missionId: mission.id,
      kind: mission.kind,
      selectedIds: [],
      leaderId: null,
    });
  };

  const chooseSite = (site: ScavengeSite): void => {
    store.setMissionPrep({ siteId: site.id, kind: 'group', selectedIds: [], leaderId: null });
  };

  const toggleMember = (id: string): void => {
    if (!prep) return;
    const has = prep.selectedIds.includes(id);
    const nextIds = has ? prep.selectedIds.filter((x) => x !== id) : [...prep.selectedIds, id];
    const leaderId =
      prep.leaderId && nextIds.includes(prep.leaderId) ? prep.leaderId : (nextIds[0] ?? null);
    store.setMissionPrep({ ...prep, selectedIds: nextIds, leaderId });
  };

  const setLeader = (id: string): void => {
    if (!prep) return;
    store.setMissionPrep({ ...prep, leaderId: id });
  };

  const rules = selectedMission
    ? partyRules(selectedMission, crew.length)
    : selectedSite
      ? {
          min: 1,
          max: Math.max(1, crew.length),
          label:
            crew.length <= 1
              ? 'One person, because there is only one of you.'
              : `Between 1 and ${crew.length} people.`,
        }
      : null;

  const selectedIds = prep?.selectedIds ?? [];
  const validation = selectedMission
    ? validateParty(selectedMission, selectedIds, crew.length)
    : selectedSite
      ? selectedIds.length > 0
        ? { ok: true as const, reason: undefined }
        : { ok: false as const, reason: 'Send at least one person.' }
      : { ok: false as const, reason: 'Pick a job first.' };

  const missionBlock: { ok: boolean; reason?: string } = selectedMission
    ? canRunMission(state, selectedMission)
    : { ok: true };
  const deployed = Boolean(state.expedition);
  const needsLeader = selectedIds.length >= 2;
  const leaderId = prep?.leaderId ?? null;

  return (
    <div className="stack">
      <Panel title="Away work" aside={location.name}>
        <p className="prose">
          Contracts and sites both put people outside the hull, captain. You can only have one party
          out at a time, and while they are gone the ship keeps running without them — time passes,
          food is eaten, and whoever stayed behind handles whatever comes up.
        </p>
      </Panel>

      {deployed && (
        <Panel title="Party already out">
          <p className="prose amber">
            You have people at a site right now. Bring them back before you commit anyone else.
          </p>
          <Btn block tone="primary" onClick={() => store.setScreen('expedition')}>
            Go to the party
          </Btn>
        </Panel>
      )}

      <Panel title="Contracts" aside={`${missions.length} posted`}>
        {missions.length === 0 ? (
          <Empty>Nothing is posted here right now.</Empty>
        ) : (
          <div className="stack stack--tight">
            {missions.map((mission) => {
              const risk = assessDanger(mission.danger, { assessor });
              const missionRules = partyRules(mission, crew.length);
              const expiresIn =
                mission.expiresAtHours !== undefined ? mission.expiresAtHours - state.hours : null;
              const chosen = prep?.missionId === mission.id;
              return (
                <div
                  key={mission.id}
                  className={chosen ? 'panel panel--inset row--selected' : 'panel panel--inset'}
                >
                  <div className="panel__body panel__body--tight">
                    <div className="split">
                      <span className="value">{mission.title}</span>
                      <span className="chips">
                        <Chip tone="cyan">{KIND_LABELS[mission.kind]}</Chip>
                        {mission.accepted && <Chip tone="green">Accepted</Chip>}
                      </span>
                    </div>
                    <p className="prose prose--dim">{mission.description}</p>
                    <p className="tiny faint">{KIND_NOTES[mission.kind]}</p>
                    <KV
                      items={[
                        ['Risk', `${risk.label}${risk.unsure ? ' (unsure)' : ''}`],
                        ['Time', <Duration hours={mission.estimatedHours} />],
                        ['Pay', `${mission.rewardCredits} cr`],
                        ['Party', missionRules.label],
                        [
                          'Expires',
                          expiresIn === null ? (
                            'No deadline'
                          ) : expiresIn <= 0 ? (
                            'Gone'
                          ) : (
                            <Duration hours={expiresIn} />
                          ),
                        ],
                      ]}
                    />
                    <p className="tiny faint">{risk.note}</p>
                    {mission.siteId && (
                      <p className="tiny">
                        This one is tied to a site. You can also work that site directly from below.
                      </p>
                    )}
                    <div className="btn-row">
                      {!mission.accepted && (
                        <Btn
                          wide
                          onClick={() => store.acceptMissionById(mission.id)}
                          disabled={deployed}
                        >
                          Accept
                        </Btn>
                      )}
                      <Btn
                        wide
                        tone={chosen ? 'primary' : 'default'}
                        onClick={() => chooseMission(mission)}
                        disabled={deployed}
                      >
                        {chosen ? 'Selected' : 'Prepare'}
                      </Btn>
                      <Btn
                        wide
                        tone="danger"
                        onClick={() => store.abandonMissionById(mission.id)}
                        disabled={deployed}
                      >
                        Drop
                      </Btn>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <Panel title="Sites" aside={`${sites.length} known`}>
        {sites.length === 0 ? (
          <Empty>Nothing here is worth breaking into.</Empty>
        ) : (
          <div className="stack stack--tight">
            {sites.map((site) => {
              const brief = briefSite(state, site);
              const chosen = prep?.siteId === site.id;
              return (
                <div
                  key={site.id}
                  className={chosen ? 'panel panel--inset row--selected' : 'panel panel--inset'}
                >
                  <div className="panel__body panel__body--tight">
                    <div className="split">
                      <span className="value">{site.name}</span>
                      <span className="chips">
                        {site.exhausted && <Chip tone="red">Stripped</Chip>}
                        <Chip>{`Intel ${site.intel}/3`}</Chip>
                      </span>
                    </div>
                    <p className="prose prose--dim">{site.description}</p>
                    <KV
                      items={[
                        ['Risk', `${brief.risk.label}${brief.risk.unsure ? ' (unsure)' : ''}`],
                        ['Mapped', `${brief.knownNodes} of ${brief.totalNodes} spaces`],
                      ]}
                    />
                    <p className="tiny faint">
                      {brief.risk.note} {brief.note}
                    </p>
                    <Btn
                      block
                      tone={chosen ? 'primary' : 'default'}
                      onClick={() => chooseSite(site)}
                      disabled={deployed || site.exhausted}
                      sub={site.exhausted ? 'Nothing left in there' : undefined}
                    >
                      {chosen ? 'Selected' : 'Prepare a party'}
                    </Btn>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      {prep && rules && (selectedMission || selectedSite) && (
        <Panel
          title="Party"
          aside={`${selectedIds.length}/${rules.max}`}
        >
          <p className="prose">
            {selectedMission ? selectedMission.title : (selectedSite?.name ?? '')} — {rules.label}
          </p>
          <div className="rows">
            {crew.map((member) => {
              const picked = selectedIds.includes(member.id);
              const atCap = !picked && selectedIds.length >= rules.max;
              return (
                <CrewRow
                  key={member.id}
                  character={member}
                  selected={picked}
                  onClick={atCap ? undefined : () => toggleMember(member.id)}
                  right={
                    <span
                      style={{ display: 'inline-flex', flexDirection: 'column', gap: 2, width: 84 }}
                    >
                      <span className="tiny">
                        Rest {Math.round(member.rested)} · Str {Math.round(member.stress)}
                      </span>
                      <span className="chips" style={{ justifyContent: 'flex-end' }}>
                        {picked && <Chip tone="amber">Going</Chip>}
                        {leaderId === member.id && picked && <Chip tone="cyan">Leads</Chip>}
                        {atCap && <Chip>Full</Chip>}
                      </span>
                    </span>
                  }
                />
              );
            })}
          </div>

          {needsLeader && (
            <>
              <div className="divider" />
              <span className="label">Mission leader</span>
              <p className="tiny">
                The leader is fixed for the whole job. On group checks their Leadership pulls the
                weakest member of the party up toward the rest, so put your steadiest hand here.
              </p>
              <div className="rows">
                {selectedIds.map((id) => {
                  const member = state.characters[id];
                  if (!member) return null;
                  return (
                    <Row
                      key={id}
                      onClick={() => setLeader(id)}
                      selected={leaderId === id}
                      title={`${member.name} ${member.surname}`}
                      sub={`Leadership ${member.attributes.leadership}`}
                      right={leaderId === id ? <Chip tone="cyan">Leader</Chip> : undefined}
                    />
                  );
                })}
              </div>
            </>
          )}

          <div className="divider" />
          {!validation.ok && <p className="prose amber">{validation.reason}</p>}
          {!missionBlock.ok && <p className="prose red">{missionBlock.reason}</p>}

          {selectedMission ? (
            <Btn
              block
              tone="go"
              disabled={deployed || !validation.ok || !missionBlock.ok}
              onClick={() => store.runMission(selectedMission, selectedIds, leaderId)}
              sub="Runs the whole job in one go. You find out how it went afterwards."
            >
              Send them out
            </Btn>
          ) : selectedSite ? (
            <Btn
              block
              tone="go"
              disabled={deployed || !validation.ok || selectedSite.exhausted}
              onClick={() =>
                store.startExpedition(selectedSite.id, selectedIds, leaderId ?? selectedIds[0])
              }
              sub="You will work the site space by space, and can pull out at the way in or the way out."
            >
              Deploy to the site
            </Btn>
          ) : null}

          <Btn block tone="ghost" onClick={() => store.setMissionPrep(null)}>
            Clear the party
          </Btn>
        </Panel>
      )}

      <Btn block tone="ghost" onClick={() => store.setScreen(state.currentPlaceId ? 'place' : 'cockpit')}>
        Back
      </Btn>
    </div>
  );
}

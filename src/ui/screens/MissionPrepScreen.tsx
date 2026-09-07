/**
 * Work and sites.
 *
 * Both put a party outside the ship, so both are prepared the same way: pick the
 * job, pick who goes, pick who leads. Only one party can be out at a time.
 */

import { useEffect, useMemo } from 'react';
import { assessDanger, bestAssessor } from '../../engine/assess';
import { problemsFor, recommend } from '../../engine/advice';
import { canPayShipWatch, commandRuleFor, whoHasTheShip } from '../../engine/command';
import { COMMAND, MISSIONS } from '../../engine/tuning';
import { availableAttacks } from '../../engine/inventory';

import {
  canRunMission,
  missionPrimarySkill,
  missionsHere,
  partyRules,
  validateParty,
} from '../../engine/missions';
import { briefSite } from '../../engine/scavenge';
import { workingCrew } from '../../engine/sim';
import {
  SKILL_LABELS,
  type Character,
  type MissionDef,
  type MissionKind,
  type ScavengeSite,
  type SkillKey,
} from '../../engine/types';
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

  const crew = workingCrew(state);
  const assessor = bestAssessor(crew);
  const missions = missionsHere(state);
  const sites = location.siteIds
    .map((id) => state.sites[id])
    .filter((site): site is ScavengeSite => Boolean(site));

  const prep = state.missionPrep;
  // Walked into the ruin itself: this screen is about THAT ruin, and nothing
  // else on this world is selectable from inside it.
  const locked = Boolean(prep?.lockedToSite);
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
          // Scavenging is still an away party and obeys the same ceiling as
          // any other; it must not become a second party-size system.
          max: Math.min(MISSIONS.groupMaxCapacity, Math.max(1, crew.length)),
          label:
            crew.length <= 1
              ? 'One person, because there is only one of you.'
              : `Alone, or up to ${Math.min(MISSIONS.groupMaxCapacity, crew.length)} together.`,
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

  // Somebody has to be left holding the ship. The captain or the crew lead —
  // not both out, unless the berth is genuinely covered.
  const command = commandRuleFor(state, selectedIds);
  const holding = whoHasTheShip(state, selectedIds);
  const deployed = Boolean(state.expedition);
  const needsLeader = selectedIds.length >= 2;

  /** What this job actually runs on, shown per person so nobody picks blind. */
  const jobSkill: SkillKey = selectedMission
    ? missionPrimarySkill(selectedMission)
    : 'scavenging';

  /**
   * The audit's dead brother: a melee-only party walking into rifle country
   * with no warning. One line here is the difference.
   */
  const loadoutWarning = useMemo(() => {
    if (selectedIds.length === 0) return null;
    const party = selectedIds
      .map((id) => state.characters[id])
      .filter((c): c is Character => Boolean(c));
    const anyRanged = party.some((member) =>
      availableAttacks(member, state.ship).some((attack) =>
        attack.ranges.some((range) => range === 'medium' || range === 'long'),
      ),
    );
    if (anyRanged) return null;
    return 'Nobody in this party is carrying a ranged weapon.';
  }, [selectedIds, state.characters, state.ship]);

  /**
   * If the game already knows who is going, it does not ask.
   *
   * A party of one out of a crew of one was never a decision — it was a
   * sentence explaining there was no decision, followed by a disabled button
   * waiting to be un-disabled by hand. When the composition is forced, fill it.
   * The moment a genuine alternative exists, the choice comes back.
   */
  const forced = rules !== null && crew.length > 0 && crew.length <= rules.min;
  useEffect(() => {
    if (!prep || !rules) return;
    if (deployed) return;
    const everyone = crew.map((c) => c.id);
    const needsFill = forced && selectedIds.length !== everyone.length;
    // The captain leads unless the player says otherwise.
    const captain = state.captainId && everyone.includes(state.captainId) ? state.captainId : null;
    const ids = needsFill ? everyone : selectedIds;
    const wantLeader =
      ids.length >= 2 && (!prep.leaderId || !ids.includes(prep.leaderId))
        ? (captain && ids.includes(captain) ? captain : (ids[0] ?? null))
        : prep.leaderId;
    if (needsFill || wantLeader !== prep.leaderId) {
      store.setMissionPrep({ ...prep, selectedIds: ids, leaderId: wantLeader ?? null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prep?.missionId, prep?.siteId, forced, crew.length, deployed]);

  // The party panel is above the listings now, so "Prepare" answers upward.
  useEffect(() => {
    if (!prep?.missionId && !prep?.siteId) return;
    document.getElementById('party-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [prep?.missionId, prep?.siteId]);
  const leaderId = prep?.leaderId ?? null;

  /** Who the game would send, and what is wrong with them. */
  const advice = recommend(crew, jobSkill, { label: 'this work' });

  /** The best Leadership among the people actually going. */
  const steadiest = selectedIds
    .map((id) => state.characters[id])
    .filter((c): c is Character => Boolean(c))
    .sort((a, b) => b.attributes.leadership - a.attributes.leadership)[0];

  return (
    <div className="stack">
      {/*
        The decision, and the button that commits it, come before the reading.
        This panel used to sit at the bottom of three screens of description on
        a phone, so choosing a job meant scrolling past everything twice.
      */}
      {prep && rules && (selectedMission || selectedSite) && (
        <Panel
          title="Party"
          aside={`${selectedIds.length}/${rules.max}`}
          id="party-panel"
        >
          <p className="prose">
            {selectedMission ? selectedMission.title : (selectedSite?.name ?? '')} — {rules.label}
          </p>
          <p className="tiny faint" style={{ marginTop: 2 }}>
            This work runs on <span className="cyan">{SKILL_LABELS[jobSkill]}</span>.{' '}
            {advice.best ? advice.line : 'Nobody aboard can take this on.'}
          </p>
          {forced && (
            <p className="tiny faint" style={{ marginTop: 2 }}>
              There is only one way to field this, so it is already set.
            </p>
          )}
          <div className="rows">
            {crew.map((member) => {
              const picked = selectedIds.includes(member.id);
              const atCap = !picked && selectedIds.length >= rules.max;
              const jobValue = member.skills[jobSkill] ?? 0;
              return (
                <CrewRow
                  key={member.id}
                  character={member}
                  selected={picked}
                  onClick={atCap ? undefined : () => toggleMember(member.id)}
                  right={
                    <span
                      style={{ display: 'inline-flex', flexDirection: 'column', gap: 2, width: 112 }}
                    >
                      <span
                        className={jobValue >= 40 ? 'tiny green' : jobValue >= 15 ? 'tiny' : 'tiny amber'}
                        style={{ textAlign: 'right' }}
                      >
                        {SKILL_LABELS[jobSkill]} {jobValue}
                      </span>
                      {/* Numbers only when they are a problem. Otherwise silence. */}
                      {problemsFor(member).length > 0 && (
                        <span className="tiny amber" style={{ textAlign: 'right' }}>
                          {problemsFor(member).join(', ')}
                        </span>
                      )}
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

          {loadoutWarning && (
            <div style={{ marginTop: 8 }}>
              <p className="tiny amber" style={{ marginBottom: 6 }}>
                {loadoutWarning} Whatever is out there will not wait for you to fetch it.
              </p>
              <Btn
                small
                block
                onClick={() => store.equipSelected(selectedIds)}
                sub="Best weapons and armor in the hold, shared out"
              >
                Equip Party From Hold
              </Btn>
            </div>
          )}

          {needsLeader && (
            <>
              <div className="divider" />
              <span className="label">Mission leader</span>
              <p className="tiny">
                The leader is fixed for the whole job. On group checks their Leadership pulls the
                weakest member of the party up toward the rest.
                {steadiest && leaderId !== steadiest.id
                  ? ` ${steadiest.name} has the steadiest hand here.`
                  : ' The captain has it unless you say otherwise.'}
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
          {holding && command.ok && (
            <p className="tiny green" style={{ marginBottom: 6 }}>
              {holding}
            </p>
          )}
          {!command.ok && (
            <>
              <p className="prose amber" style={{ marginBottom: 6 }}>
                {command.reason}
              </p>
              {canPayShipWatch(state).ok && (
                <Btn
                  small
                  block
                  onClick={() => store.payShipWatch()}
                  sub={`${COMMAND.shipWatchCredits} cr — somebody sits with her for a day`}
                >
                  Pay Somebody To Watch Her
                </Btn>
              )}
            </>
          )}
          {!validation.ok && <p className="prose amber">{validation.reason}</p>}
          {!missionBlock.ok && <p className="prose red">{missionBlock.reason}</p>}

          {selectedMission ? (
            <Btn
              block
              tone="go"
              disabled={deployed || !validation.ok || !missionBlock.ok || !command.ok}
              onClick={() => store.runMission(selectedMission, selectedIds, leaderId)}
              sub="Runs the whole job in one go. You find out how it went afterwards."
            >
              Send them out
            </Btn>
          ) : selectedSite ? (
            <Btn
              block
              tone="go"
              disabled={deployed || !validation.ok || !command.ok || selectedSite.exhausted}
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

      <Panel title={locked ? (selectedSite?.name ?? 'This site') : 'Away work'} aside={location.name}>
        <p className="prose">
          {locked
            ? 'You are standing in it. Pick who goes in with you — anywhere else on this world means walking there first.'
            : prep && (selectedMission || selectedSite)
              ? 'One party out at a time. While they are gone the ship runs without them.'
              : 'Contracts and sites both put people outside the hull, captain. You can only have one party out at a time, and while they are gone the ship keeps running without them — time passes, food is eaten, and whoever stayed behind handles whatever comes up.'}
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

      {!locked && (
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
              // A job needing two people, offered to a captain who is alone,
              // with a live Accept button, taught the player that walking
              // somewhere might do nothing. Say what it needs instead.
              const shortHanded = crew.length < missionRules.min;
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
                        {shortHanded && <Chip tone="amber">Needs {missionRules.min}</Chip>}
                      </span>
                    </div>
                    <p className="prose prose--dim">{mission.description}</p>
                    {chosen && <p className="tiny faint">{KIND_NOTES[mission.kind]}</p>}
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
                    {chosen && <p className="tiny faint">{risk.note}</p>}
                    {chosen && mission.siteId && (
                      <p className="tiny">
                        This one is tied to a site. You can also work that site directly from below.
                      </p>
                    )}
                    {shortHanded ? (
                      <p className="tiny amber" style={{ marginBottom: 0 }}>
                        This one takes {missionRules.min} people and you have{' '}
                        {crew.length}. It keeps until you have the hands for it.
                      </p>
                    ) : (
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
                        {mission.accepted && (
                          <Btn
                            wide
                            tone="danger"
                            onClick={() => store.abandonMissionById(mission.id)}
                            disabled={deployed}
                          >
                            Drop
                          </Btn>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
      )}

      {!locked && (
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
                    {chosen && (
                      <p className="tiny faint">
                        {brief.risk.note} {brief.note}
                      </p>
                    )}
                    {/*
                      Three uncertainty readings used to sit here unexplained.
                      One line each, and only the part the player can act on —
                      and only on the site they are actually looking at.
                    */}
                    {chosen && (
                    <p className="tiny faint">
                      <span className="cyan">Intel</span> is what you have learned by
                      going in before — it rises every time you work the place.{' '}
                      <span className="cyan">Mapped</span> is how much of the floorplan
                      you have walked. The rest you find out inside.
                    </p>
                    )}
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
      )}


      <Btn block tone="ghost" onClick={() => store.setScreen(state.currentPlaceId ? 'place' : 'cockpit')}>
        Back
      </Btn>
    </div>
  );
}

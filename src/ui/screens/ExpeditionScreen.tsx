/**
 * Inside a site.
 *
 * The map is not handed over up front. Obvious routes show themselves; the rest
 * are found by looking, and some of them are never found at all.
 */

import { itemName } from '../../engine/inventory';
import {
  availableRoutes,
  canExitHere,
  currentNode,
  expeditionParty,
  siteProgress,
} from '../../engine/scavenge';
import { CHECK_OUTCOME_LABELS, SKILL_LABELS } from '../../engine/types';
import { Btn, Chip, CrewRow, Duration, Empty, KV, Panel } from '../components';
import { store, useGame } from '../useStore';

export function ExpeditionScreen() {
  const state = useGame();

  if (!state) {
    return <Empty>No run is loaded.</Empty>;
  }

  const expedition = state.expedition;
  const site = expedition ? state.sites[expedition.siteId] : undefined;

  if (!expedition || !site) {
    return (
      <Panel title="Site">
        <Empty>Nobody is deployed. Pick a site from the work board first.</Empty>
        <Btn block tone="ghost" onClick={() => store.setScreen('missionPrep')}>
          Back to the board
        </Btn>
      </Panel>
    );
  }

  const progress = siteProgress(state);
  const here = currentNode(state);
  const party = expeditionParty(state);
  const routes = availableRoutes(state);
  const canLeave = canExitHere(state);
  const result = expedition.lastResult;

  const loot = new Map<string, number>();
  for (const entry of expedition.carried) {
    loot.set(entry.itemId, (loot.get(entry.itemId) ?? 0) + entry.qty);
  }
  const lootLines = [...loot.entries()];

  return (
    <div className="stack">
      <Panel title={site.name} aside={`${progress.cleared}/${progress.total} worked`}>
        <p className="prose prose--dim">{site.description}</p>
        <KV
          items={[
            ['Standing in', here ? here.label : 'Unknown'],
            ['Mapped', `${progress.known} of ${progress.total} spaces`],
            ['Worked', `${progress.cleared} of ${progress.total}`],
            ['Out since', <Duration hours={state.hours - expedition.startedAtHours} />],
          ]}
        />
        {here && <p className="prose">{here.description}</p>}
      </Panel>

      {result && (
        <Panel title="Last of it" aside={result.check ? CHECK_OUTCOME_LABELS[result.check.outcome] : undefined}>
          <p className="prose">{result.text}</p>
          {result.lines.map((line, i) => (
            <p key={i} className="prose prose--dim">
              {line}
            </p>
          ))}
        </Panel>
      )}

      <Panel title="Party" aside={`${party.length} out`}>
        {party.length === 0 ? (
          <Empty>Nobody is still standing down here.</Empty>
        ) : (
          <div className="rows">
            {party.map((member) => (
              <CrewRow
                key={member.id}
                character={member}
                right={
                  <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 2, width: 84 }}>
                    <span className="tiny">
                      {Math.round(member.health)}/{Math.round(member.maxHealth)}
                    </span>
                    <span className="chips" style={{ justifyContent: 'flex-end' }}>
                      {expedition.leaderId === member.id && <Chip tone="cyan">Leads</Chip>}
                    </span>
                  </span>
                }
              />
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Ways on" aside={`${routes.length} known`}>
        {routes.length === 0 ? (
          <Empty>
            Nothing leads on from here that you can see. If there is more, it is behind something
            you have not spotted.
          </Empty>
        ) : (
          <div className="stack stack--tight">
            {routes.map((node) => (
              <button
                key={node.id}
                type="button"
                className={
                  node.cleared
                    ? 'nodecard nodecard--cleared'
                    : node.id === expedition.currentNodeId
                      ? 'nodecard nodecard--current'
                      : 'nodecard'
                }
                onClick={() => store.moveToNode(node.id)}
              >
                <span className="split">
                  <span className="value">{node.label}</span>
                  <span className="chips">
                    {node.cleared && <Chip>Worked</Chip>}
                    {node.hazard && <Chip tone="red">Hazard</Chip>}
                    {node.check && <Chip tone="amber">Check</Chip>}
                  </span>
                </span>
                <span className="tiny">
                  <Duration hours={node.hours} /> to get through and search
                </span>
                {node.check && (
                  <span className="tiny amber">
                    {SKILL_LABELS[node.check.skill]} — {node.check.description}
                  </span>
                )}
                {node.hazard && <span className="tiny red">Known hazard: {node.hazard.label}</span>}
              </button>
            ))}
          </div>
        )}
        <p className="tiny faint" style={{ marginTop: 6 }}>
          Only what you can see is listed. Concealed ways through are found by Perception and
          Exploration as you move, so a space that looks like a dead end may not be one.
        </p>
      </Panel>

      <Panel title="Carrying" aside={`${expedition.carriedCredits} cr`}>
        {lootLines.length === 0 && expedition.carriedCredits === 0 ? (
          <Empty>Empty-handed so far.</Empty>
        ) : (
          <KV
            items={[
              ...lootLines.map(([id, qty]): [string, string] => [itemName(id), `x${qty}`]),
              ['Credits', `${expedition.carriedCredits}`],
            ]}
          />
        )}
        <p className="tiny faint">
          None of this is yours until it is aboard. If the party is wiped out, it stays here.
        </p>
      </Panel>

      {canLeave ? (
        <Btn
          block
          tone="primary"
          onClick={() => store.leaveSite()}
          sub="Everything you are carrying goes into the hold and the credits are banked."
        >
          Leave the site
        </Btn>
      ) : (
        <Panel title="No way out here">
          <p className="prose prose--dim">
            You cannot get out from where you are standing. Work your way back to the entrance, or
            find the way out.
          </p>
        </Panel>
      )}
    </div>
  );
}

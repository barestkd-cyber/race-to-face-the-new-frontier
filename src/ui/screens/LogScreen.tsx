/**
 * The log.
 *
 * Everything the run has recorded, newest first, filtered by kind.
 */

import { useState } from 'react';
import { LOG_KIND_LABELS, stardayLabel } from '../../engine/log';
import type { LogKind } from '../../engine/types';
import { Btn, Empty, LogFeed, Panel } from '../components';
import { useGame } from '../useStore';

const KINDS: LogKind[] = [
  'system',
  'travel',
  'event',
  'combat',
  'trade',
  'crew',
  'medical',
  'mission',
  'warning',
  'milestone',
];

export function LogScreen() {
  const state = useGame();
  const [filter, setFilter] = useState<LogKind | 'all'>('all');

  if (!state) {
    return <Empty>No run is loaded.</Empty>;
  }

  const entries = filter === 'all' ? state.log : state.log.filter((entry) => entry.kind === filter);
  const countOf = (kind: LogKind): number => state.log.filter((e) => e.kind === kind).length;

  return (
    <div className="stack">
      <Panel title="Ship's log" aside={`Starday ${stardayLabel(state.hours)}`}>
        <p className="prose prose--dim">
          Everything recorded since you left, newest first. {state.log.length} entries held; older
          ones are dropped once the buffer is full.
        </p>
      </Panel>

      <Panel title="Filter" aside={`${entries.length} shown`}>
        <div className="btn-row">
          <Btn
            tone={filter === 'all' ? 'primary' : 'ghost'}
            onClick={() => setFilter('all')}
            sub={String(state.log.length)}
          >
            All
          </Btn>
          {KINDS.map((kind) => {
            const count = countOf(kind);
            return (
              <Btn
                key={kind}
                tone={filter === kind ? 'primary' : 'ghost'}
                disabled={count === 0}
                onClick={() => setFilter(kind)}
                sub={String(count)}
              >
                {LOG_KIND_LABELS[kind]}
              </Btn>
            );
          })}
        </div>
      </Panel>

      <Panel title={filter === 'all' ? 'All entries' : LOG_KIND_LABELS[filter]}>
        {entries.length === 0 ? (
          <Empty>Nothing logged under that heading yet.</Empty>
        ) : (
          <LogFeed entries={entries} />
        )}
      </Panel>
    </div>
  );
}

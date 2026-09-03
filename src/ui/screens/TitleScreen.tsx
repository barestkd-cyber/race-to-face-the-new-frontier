/**
 * Title screen — the front door.
 *
 * No live game state exists here, so the save list is rendered inline in a
 * Sheet rather than navigated to.
 */

import { useEffect, useState } from 'react';
import { Btn, Empty, Panel, Row, Sheet } from '../components';
import { store, useSaves } from '../useStore';
import { dayNumber } from '../../engine/log';
import { SAVE } from '../../engine/tuning';

/** Fixed starfield so the title plate does not flicker between renders. */
const STARS: [number, number, number][] = [
  [12, 14, 1], [31, 8, 1], [48, 22, 1], [66, 11, 2], [79, 31, 1],
  [95, 6, 1], [108, 24, 1], [126, 9, 1], [141, 19, 2], [158, 5, 1],
  [172, 27, 1], [188, 13, 1], [201, 33, 1], [216, 10, 2], [229, 21, 1],
  [22, 74, 1], [57, 88, 1], [90, 79, 1], [149, 86, 1], [193, 77, 2],
  [7, 44, 1], [232, 62, 1], [119, 92, 1], [40, 60, 1],
];

function slotLabel(slot: string): string {
  if (slot === SAVE.autosaveSlot) return 'Autosave';
  const trimmed = slot.replace(/^slot/, '');
  return trimmed === slot ? slot : `Slot ${trimmed}`;
}

export function TitleScreen() {
  const saves = useSaves();
  const [loadOpen, setLoadOpen] = useState(false);

  useEffect(() => {
    void store.refreshSaves();
  }, []);

  const autosave = saves.find((meta) => meta.slot === SAVE.autosaveSlot);
  const busy = store.busy;

  return (
    <div className="stack">
      <div className="viewport">
        <svg
          className="viewport__svg"
          viewBox="0 0 240 100"
          role="img"
          aria-label="Race to Face the New Frontier"
        >
          <g shapeRendering="crispEdges" fill="var(--ink-faint)">
            {STARS.map(([x, y, size], index) => (
              <rect key={index} x={x} y={y} width={size} height={size} />
            ))}
          </g>

          <g shapeRendering="crispEdges">
            <rect x={168} y={80} width={38} height={7} fill="var(--hull-light)" />
            <rect x={168} y={80} width={38} height={1} fill="var(--bevel-light)" />
            <rect x={206} y={82} width={6} height={3} fill="var(--hull-light)" />
            <rect x={200} y={81} width={4} height={2} fill="var(--cyan-dim)" />
            <rect x={162} y={79} width={6} height={9} fill="var(--hull-light)" />
            <rect x={158} y={82} width={4} height={3} fill="var(--amber)" />
          </g>

          <text
            x={120}
            y={31}
            textAnchor="middle"
            fontSize={11}
            letterSpacing={3}
            fontFamily="inherit"
            fill="var(--amber)"
          >
            RACE TO FACE THE
          </text>
          <text
            x={120}
            y={62}
            textAnchor="middle"
            fontSize={26}
            fontWeight={700}
            fontFamily="inherit"
            fill="var(--ink-bright)"
          >
            NEW FRONTIER
          </text>
          <text
            x={120}
            y={78}
            textAnchor="middle"
            fontSize={7}
            letterSpacing={4}
            fontFamily="inherit"
            fill="var(--ink-faint)"
          >
            TWO CLOCKS. ONE SHIP.
          </text>
        </svg>
      </div>

      <Panel title="The Situation" aside="Briefing">
        <p className="prose">
          The homeworld is failing on two separate schedules. The air processing that made the
          place liveable is losing ground faster than replacements can be built, and the crust
          underneath has started to move. Nobody knows which one finishes first, and the forecasts
          that claim otherwise are guessing.
        </p>
        <p className="prose prose--dim">
          You inherit a ship you did not choose, a crew you did not pick, and a route that ends at
          the Travel Center on the far frontier. Every leg costs fuel, food, and people. Get there
          before the clocks run out, captain.
        </p>
      </Panel>

      <Panel title="Begin" tight>
        <div className="btn-col">
          <Btn
            tone="primary"
            block
            onClick={() => store.startNewRun()}
            sub="Roll a fresh seed and build a captain"
          >
            New Run
          </Btn>
          <Btn
            tone="go"
            block
            disabled={!autosave || busy}
            onClick={() => void store.loadFrom(SAVE.autosaveSlot)}
            sub={
              autosave
                ? `Day ${dayNumber(autosave.hours)} · ${autosave.captainName} · ${autosave.locationName}`
                : 'No autosave found'
            }
          >
            Continue
          </Btn>
          <Btn
            block
            disabled={saves.length === 0 || busy}
            onClick={() => setLoadOpen(true)}
            sub={saves.length === 0 ? 'No saved runs' : `${saves.length} saved run${saves.length === 1 ? '' : 's'}`}
          >
            Load
          </Btn>
        </div>
      </Panel>


      <Sheet open={loadOpen} onClose={() => setLoadOpen(false)} title="Saved Runs">
        {saves.length === 0 ? (
          <Empty>Nothing saved yet.</Empty>
        ) : (
          <div className="rows">
            {saves.map((meta) => (
              <Row
                key={meta.slot}
                title={`${slotLabel(meta.slot)} · ${meta.captainName}`}
                sub={
                  <span>
                    Day {dayNumber(meta.hours)} · {meta.locationName} · {meta.crewCount} crew
                    <br />
                    Seed {meta.seed} · {new Date(meta.savedAt).toLocaleString()}
                  </span>
                }
                right={
                  <Btn
                    disabled={busy}
                    onClick={() => {
                      setLoadOpen(false);
                      void store.loadFrom(meta.slot);
                    }}
                  >
                    Load
                  </Btn>
                }
              />
            ))}
          </div>
        )}
      </Sheet>
    </div>
  );
}

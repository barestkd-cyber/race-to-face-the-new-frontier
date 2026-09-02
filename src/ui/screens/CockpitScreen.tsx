/**
 * The cockpit: the shell the whole game is played from.
 *
 * The windshield is the world. The instruments are status. Management of the
 * things physically with you — crew, ship, yourself, your possessions — lives
 * on the dashboard. Everything else is reached by going somewhere.
 *
 * When the ship is on the ground the windshield shows the ground. The star map
 * is a deliberate act, not the default view.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { untreatedWoundCount } from '../../engine/actions';
import { assessDanger, bestAssessor, scanCompletenessLabel } from '../../engine/assess';
import { formatDuration, stardayLabel } from '../../engine/log';
import { currentPlace, shipPlace } from '../../engine/places';
import {
  estimateFuel,
  hasRoom,
  hullCondition,
  isFlyable,
  medicalFacility,
  safeCrewCapacity,
  sensorIntel,
  shipConditionLabel,
  SYSTEM_LABELS,
} from '../../engine/ship';
import { crewMembers, daysOfFoodRemaining, moraleBand } from '../../engine/sim';
import { estimateLeg, travelProgress } from '../../engine/travel';
import { ONBOARDING } from '../../engine/tuning';
import { estimateTerminalDay, reachableFrom } from '../../engine/world';
import type { LocationId, TimeSpeed } from '../../engine/types';
import { Btn, Chip, LogFeed, Meter, Panel, ResourceStrip, Row, Segments } from '../components';
import { LocalView } from '../LocalView';
import { StarMap } from '../StarMap';
import { store, useGame } from '../useStore';

const SPEEDS: { key: TimeSpeed; label: string }[] = [
  { key: 'normal', label: '▶' },
  { key: 'fast', label: '▶▶' },
  { key: 'veryFast', label: '▶▶▶' },
];

export function CockpitScreen() {
  const state = useGame();
  const [selectedId, setSelectedId] = useState<LocationId | null>(null);
  const [view, setView] = useState<'world' | 'navigation'>('world');
  const lastTickRef = useRef<number>(0);

  const travelling = Boolean(state?.travel && !state.travel.paused);
  const blocked = Boolean(state?.activeEvent || state?.combat);

  useEffect(() => {
    if (!travelling || blocked) return;
    lastTickRef.current = performance.now();

    const id = window.setInterval(() => {
      const now = performance.now();
      const delta = Math.min(0.5, (now - lastTickRef.current) / 1000);
      lastTickRef.current = now;
      store.tickTravel(delta);
    }, 100);

    const onVisibility = () => {
      if (!document.hidden) lastTickRef.current = performance.now();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [travelling, blocked]);

  const crew = useMemo(() => (state ? crewMembers(state) : []), [state]);

  if (!state) return null;

  const location = state.currentLocationId ? state.locations[state.currentLocationId] : undefined;
  const here = currentPlace(state);
  const parked = shipPlace(state);
  const underway = Boolean(state.travel);

  // Under way there is nothing to look at but the map.
  const showMap = underway || view === 'navigation';

  const destinations = underway
    ? []
    : reachableFrom(state.currentLocationId, state.locations, state.routeIds);
  const selected = selectedId ? state.locations[selectedId] : undefined;
  const legEstimate = selected ? estimateLeg(state, selected.id) : null;

  const fuel = estimateFuel(state.ship, crew, state.resources.fuel);
  const capacity = state.ship ? safeCrewCapacity(state.ship) : 0;
  const morale = moraleBand(state.morale);
  const hull = hullCondition(state.ship);

  const assessor = bestAssessor(crew);
  const intel = sensorIntel(state.ship);
  const risk = selected
    ? assessDanger(selected.danger, { assessor, relevantSkill: 'navigation', intel })
    : null;

  const wounded = untreatedWoundCount(state);
  const medBay = medicalFacility(state.ship);

  // You can only sleep aboard if you are aboard and there are bunks to sleep in.
  const canRestAboard =
    !here &&
    !state.expedition &&
    Boolean(state.ship && !state.ship.destroyed && hasRoom(state.ship, 'quarters'));

  const clock = estimateTerminalDay(state.homeworld, state.hours);
  const inHomeRegion =
    !state.homeworld.ended && (location?.kind === 'homeworld' || location?.kind === 'moon');

  const step = state.onboardingStep;

  return (
    <div className="cockpit-shell">
      {/* ---------------- The world ---------------- */}
      <div className="cockpit-shell__view stack stack--tight">
        <div className="topbar" style={{ padding: 0 }}>
          <div className="topbar__slot">
            <span className="label">Starday</span>
            <span className="topbar__title readout">{stardayLabel(state.hours)}</span>
          </div>
          <div className="topbar__slot topbar__slot--grow">
            <span className="label">{underway ? 'Under way' : 'Location'}</span>
            <span className="topbar__title">
              {underway
                ? `→ ${state.locations[state.travel!.toId]?.name ?? 'destination'}`
                : (parked?.name ?? location?.name ?? 'Deep space')}
            </span>
          </div>
        </div>

        <div className={showMap ? 'viewport' : 'scene'}>
          {showMap ? (
            <StarMap state={state} selectedId={selectedId} onSelect={setSelectedId} />
          ) : (
            <>
              <LocalView
                seed={state.seed}
                locationKind={location?.kind ?? 'homeworld'}
                hours={state.hours}
                decay={100 - state.homeworld.infrastructure}
              />
              <div className="scene__caption">
                <div className="scene__where">{parked?.name ?? location?.name ?? 'Unknown'}</div>
                <div className="scene__sub">
                  {location?.name}
                  {here ? ` · you are at ${here.name}` : ' · aboard'}
                </div>
              </div>
            </>
          )}
        </div>

        {/* The one thing to do from here, and the way to switch what you look at */}
        {!underway && (
          <div className="btn-row">
            {!showMap ? (
              <>
                <Btn
                  wide
                  tone="go"
                  onClick={() => store.stepOutside()}
                  disabled={Boolean(state.expedition) || !parked}
                  sub={state.expedition ? 'A party is deployed' : undefined}
                >
                  Step Outside
                </Btn>
                <Btn wide onClick={() => setView('navigation')} disabled={!isFlyable(state.ship)}>
                  Plot a Course
                </Btn>
              </>
            ) : (
              <Btn block tone="ghost" onClick={() => { setView('world'); setSelectedId(null); }}>
                Back to the Windshield
              </Btn>
            )}
          </div>
        )}

        {/*
          Sleeping happens in the quarters of the ship you are standing in.
          It is reachable because you are aboard, not from a global menu.
        */}
        {canRestAboard && (
          <Btn
            block
            onClick={() => store.setScreen('rest')}
            sub={underway ? 'The ship flies itself for a while' : 'In your own quarters'}
          >
            Stand Down and Rest
          </Btn>
        )}

        {/*
          Only surfaced when somebody is actually hurt and there is somewhere
          aboard to treat them. Without a med bay it is field care at a place
          that has a clinic, or nothing.
        */}
        {!here && wounded > 0 && (
          <Btn
            block
            tone={medBay ? 'primary' : 'default'}
            onClick={() => store.setScreen('medical')}
            sub={
              medBay
                ? `${wounded} untreated · ${medBay.kind === 'medicalWard' ? 'Medical Ward' : 'Med Bay'} aboard`
                : `${wounded} untreated · no med bay, field care only`
            }
          >
            Treat Wounded
          </Btn>
        )}

        <p className="rotate-nudge">Turn the phone sideways for a wider windshield.</p>
      </div>

      {/* ---------------- Instruments and context ---------------- */}
      <div className="cockpit-shell__panel">
        {!underway && <Onboarding step={step} capacity={capacity} />}

        <ResourceStrip
          resources={state.resources}
          crewCount={crew.length}
          crewCapacity={capacity}
          foodDays={daysOfFoodRemaining(state)}
          fuelJumps={fuel.jumpsRemaining}
        />

        {inHomeRegion && (
          <Panel title="Homeworld Forecast" aside={clock.urgency.toUpperCase()}>
            <p className="prose">{clock.text}</p>
            <div className="split" style={{ marginTop: 6 }}>
              <span className="tiny dim">Day {clock.elapsedDays} elapsed</span>
              <Chip
                tone={
                  clock.urgency === 'critical' || clock.urgency === 'urgent'
                    ? 'red'
                    : clock.urgency === 'pressing'
                      ? 'amber'
                      : 'green'
                }
              >
                {clock.urgency}
              </Chip>
            </div>
          </Panel>
        )}

        {underway && state.travel && (
          <Panel title="Under Way" aside={`${Math.round(travelProgress(state) * 100)}%`}>
            <div className="split">
              <span className="tiny">
                {state.locations[state.travel.fromId]?.name ?? 'Origin'} →{' '}
                <span className="amber">
                  {state.locations[state.travel.toId]?.name ?? 'Destination'}
                </span>
              </span>
              <span className="tiny dim">
                {formatDuration(Math.max(0, state.travel.totalHours - state.travel.elapsedHours))} left
              </span>
            </div>
            <div style={{ marginTop: 6 }}>
              <Meter value={travelProgress(state) * 100} color="var(--cyan)" tall />
            </div>
            <div className="split" style={{ marginTop: 8 }}>
              <span className="label">Speed</span>
              <div className="btn-row" style={{ flexWrap: 'nowrap' }}>
                {SPEEDS.map((speed) => (
                  <Btn
                    key={speed.key}
                    small
                    tone={state.speed === speed.key ? 'primary' : 'default'}
                    onClick={() => store.setSpeed(speed.key)}
                  >
                    {speed.label}
                  </Btn>
                ))}
              </div>
            </div>
            {state.travel.paused && (
              <div style={{ marginTop: 8 }}>
                <Btn block tone="go" onClick={() => store.resumeTravel()}>
                  Resume
                </Btn>
              </div>
            )}
            {state.flags['drifting'] === true && (
              <p className="tiny red" style={{ marginTop: 6, marginBottom: 0 }}>
                Fuel exhausted. The ship is drifting and this leg will take three times as long.
              </p>
            )}
          </Panel>
        )}

        {/* Destination detail, only while actually plotting */}
        {showMap && !underway && (
          selected ? (
            <Panel
              title="Selected Destination"
              aside={risk ? scanCompletenessLabel(risk.quality) : ''}
            >
              <div className="value">{selected.name}</div>
              <div className="tiny dim">{selected.subtitle}</div>

              {legEstimate && (
                <div className="grid2" style={{ marginTop: 8 }}>
                  <div>
                    <span className="label">Travel</span>
                    <div className="value readout">{formatDuration(legEstimate.hours)}</div>
                  </div>
                  <div>
                    <span className="label">Fuel</span>
                    <div className={legEstimate.affordable ? 'value readout' : 'value readout red'}>
                      {Math.ceil(legEstimate.fuelCost)}
                    </div>
                  </div>
                </div>
              )}

              {risk && (
                <div style={{ marginTop: 8 }}>
                  <span className="label">Risk</span>
                  <div className="split">
                    <span
                      className={
                        risk.lowIndex >= 2 ? 'value red' : risk.lowIndex === 1 ? 'value amber' : 'value green'
                      }
                    >
                      {risk.label}
                    </span>
                    <span className="tiny faint">{risk.unsure ? '(unsure)' : ''}</span>
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <Segments value={risk.lowIndex + 1} max={4} count={4} color="var(--amber)" />
                  </div>
                  <p className="tiny faint" style={{ marginTop: 4, marginBottom: 0 }}>
                    {risk.note}
                  </p>
                </div>
              )}

              <div style={{ marginTop: 10 }}>
                <Btn
                  block
                  tone="primary"
                  disabled={!isFlyable(state.ship) || Boolean(state.expedition) || Boolean(here)}
                  onClick={() => {
                    store.setCourse(selected.id);
                    setSelectedId(null);
                    setView('world');
                  }}
                  sub={
                    here
                      ? 'You are not aboard'
                      : !isFlyable(state.ship)
                        ? 'The ship cannot fly in this condition'
                        : legEstimate && !legEstimate.affordable
                          ? 'Not enough fuel — you will drift'
                          : undefined
                  }
                >
                  Set Course
                </Btn>
              </div>
            </Panel>
          ) : (
            <Panel title="Navigation">
              <p className="prose prose--dim">
                {destinations.length > 0
                  ? 'Choose somewhere on the display. Every leg costs fuel, food, and time you may not have.'
                  : 'Nowhere to go from here.'}
              </p>
            </Panel>
          )
        )}

        {/* Instrumentation */}
        <div className="grid2">
          <Panel title="Hull" aside={shipConditionLabel(hull)} tight>
            <div className="center">
              <span className={hull > 60 ? 'value green' : hull > 30 ? 'value amber' : 'value red'}>
                {Math.round(hull)}%
              </span>
            </div>
            <Meter value={hull} />
          </Panel>
          <Panel title="Crew Morale" aside={morale.label} tight>
            <div className="center">
              <span className="value">{Math.round(state.morale)}</span>
            </div>
            <Meter value={state.morale} />
          </Panel>
        </div>

        {state.ship &&
          Object.values(state.ship.systems).some((s) => s.installed && s.condition < 30) && (
            <Panel title="System Warnings">
              <div className="rows">
                {Object.values(state.ship.systems)
                  .filter((s) => s.installed && s.condition < 30)
                  .map((system) => (
                    <Row
                      key={system.kind}
                      title={SYSTEM_LABELS[system.kind]}
                      sub={shipConditionLabel(system.condition)}
                      danger
                      right={<span className="red value">{Math.round(system.condition)}%</span>}
                      onClick={() => store.setScreen('ship')}
                    />
                  ))}
              </div>
            </Panel>
          )}

        <Panel
          title="Log"
          aside={
            <button className="btn btn--sm btn--ghost" onClick={() => store.setScreen('log')}>
              All
            </button>
          }
        >
          <LogFeed entries={state.log} limit={4} />
        </Panel>
      </div>
    </div>
  );
}

/**
 * One prompt at a time, pointing at one control, cleared by using it. This
 * teaches the grammar of the game — possessions, ship, crew, world — and then
 * stops.
 */
function Onboarding({ step, capacity }: { step: number; capacity: number }) {
  switch (step) {
    case ONBOARDING.INVENTORY:
      return (
        <Hint aside="Your possessions">
          You grabbed what you could on the way out. See what actually made it aboard —
          it is under <span className="amber">Pack</span>.
        </Hint>
      );
    case ONBOARDING.SHIP:
      return (
        <Hint aside="Your ship">
          This hull is the whole plan for getting off this world. Look over what you
          have been left — <span className="amber">Ship</span>.
        </Hint>
      );
    case ONBOARDING.CREW:
      return (
        <Hint aside="Your crew">
          Safe capacity is {capacity}. A ship with empty berths is opportunity, if you
          can convince anyone to come. Check <span className="amber">Crew</span>.
        </Hint>
      );
    case ONBOARDING.TRAVEL:
      return (
        <Hint aside="The world">
          Nothing out there comes to you. Step outside and go and find it.
        </Hint>
      );
    default:
      return null;
  }
}

export function Hint({ children, aside }: { children: React.ReactNode; aside?: string }) {
  return (
    <div className="hint">
      <div className="hint__body">
        {aside && <div className="hint__aside">{aside}</div>}
        <div className="hint__text">{children}</div>
      </div>
      <button
        type="button"
        className="btn btn--sm btn--ghost"
        onClick={() => store.skipOnboarding()}
        title="Stop showing these"
      >
        Skip
      </button>
    </div>
  );
}

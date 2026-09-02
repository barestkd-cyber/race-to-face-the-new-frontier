/**
 * The cockpit. Home base for the whole game: where you are, what you have,
 * where you can go, and how bad it looks from here.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  assessDanger,
  bestAssessor,
  scanCompletenessLabel,
} from '../../engine/assess';
import { formatDuration, stardayLabel } from '../../engine/log';
import {
  estimateFuel,
  hullCondition,
  isFlyable,
  safeCrewCapacity,
  sensorIntel,
  shipConditionLabel,
  SYSTEM_LABELS,
} from '../../engine/ship';
import { crewMembers, daysOfFoodRemaining, moraleBand } from '../../engine/sim';
import { estimateLeg, travelProgress } from '../../engine/travel';
import { estimateTerminalDay, reachableFrom } from '../../engine/world';
import type { LocationId, TimeSpeed } from '../../engine/types';
import { Btn, Chip, LogFeed, Meter, Panel, ResourceStrip, Row, Segments } from '../components';
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
  const lastTickRef = useRef<number>(0);

  // Travel ticker. Meaningful events and arrival pause it from inside the
  // engine, so this only has to keep feeding it real time.
  const travelling = Boolean(state?.travel && !state.travel.paused);
  const blocked = Boolean(state?.activeEvent || state?.combat);

  useEffect(() => {
    if (!travelling || blocked) return;
    lastTickRef.current = performance.now();

    const id = window.setInterval(() => {
      // Browsers throttle timers in a backgrounded tab, so the elapsed real
      // time between ticks is the source of truth rather than the interval.
      // The clamp means a phone that was in another app for ten minutes
      // resumes where it left off instead of fast-forwarding the crew through
      // a week of events they never got to see.
      const now = performance.now();
      const delta = Math.min(0.5, (now - lastTickRef.current) / 1000);
      lastTickRef.current = now;
      store.tickTravel(delta);
    }, 100);

    // Coming back from another app must not hand the first tick a stale delta.
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
  const destinations = state.travel
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

  const clock = estimateTerminalDay(state.homeworld, state.hours);
  const inHomeRegion =
    !state.homeworld.ended &&
    (location?.kind === 'homeworld' || location?.kind === 'moon' || (state.travel?.danger ?? 0) === 0);

  const objective = state.travel
    ? `En route to ${state.locations[state.travel.toId]?.name ?? 'destination'}`
    : location?.kind === 'travelWorld'
      ? 'Reached the New Frontier'
      : 'Reach the New Frontier';

  return (
    <div className="stack">
      {/* Status header */}
      <div className="topbar" style={{ padding: 0 }}>
        <div className="topbar__slot">
          <span className="label">Starday</span>
          <span className="topbar__title readout">{stardayLabel(state.hours)}</span>
        </div>
        <div className="topbar__slot topbar__slot--grow">
          <span className="label">Objective</span>
          <span className="topbar__title">{objective}</span>
        </div>
      </div>

      <ResourceStrip
        resources={state.resources}
        crewCount={crew.length}
        crewCapacity={capacity}
        foodDays={daysOfFoodRemaining(state)}
        fuelJumps={fuel.jumpsRemaining}
      />

      {/* The windshield */}
      <div className="viewport">
        <StarMap state={state} selectedId={selectedId} onSelect={setSelectedId} />
      </div>

      {/* Homeworld clock — the pressure that defines the opening */}
      {inHomeRegion && (
        <Panel
          title="Homeworld Forecast"
          aside={clock.urgency === 'critical' ? 'CRITICAL' : clock.urgency.toUpperCase()}
        >
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
          <p className="tiny faint" style={{ marginTop: 6, marginBottom: 0 }}>
            Infrastructure holding at {Math.round(state.homeworld.infrastructure)}%. Better forecasts
            narrow this window; nobody can give you the day.
          </p>
        </Panel>
      )}

      {/* Travel in progress */}
      {state.travel && (
        <Panel
          title="Under Way"
          aside={`${Math.round(travelProgress(state) * 100)}%`}
        >
          <div className="split">
            <span className="tiny">
              {state.locations[state.travel.fromId]?.name ?? 'Origin'} →{' '}
              <span className="amber">{state.locations[state.travel.toId]?.name ?? 'Destination'}</span>
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
              Fuel exhausted. The ship is on ballistic drift and this leg will take three times as
              long.
            </p>
          )}
        </Panel>
      )}

      {/* Destination detail */}
      {!state.travel && selected && (
        <Panel title="Selected Destination" aside={risk ? scanCompletenessLabel(risk.quality) : ''}>
          <div className="value">{selected.name}</div>
          <div className="tiny dim">
            {selected.kind === 'temporary' ? 'Unregistered signal' : selected.subtitle}
          </div>
          <p className="prose prose--dim" style={{ marginTop: 6 }}>
            {selected.description}
          </p>

          {legEstimate && (
            <div className="grid2" style={{ marginTop: 8 }}>
              <div>
                <span className="label">Travel Estimate</span>
                <div className="value readout">{formatDuration(legEstimate.hours)}</div>
              </div>
              <div>
                <span className="label">Fuel Cost</span>
                <div className={legEstimate.affordable ? 'value readout' : 'value readout red'}>
                  {Math.ceil(legEstimate.fuelCost)}
                </div>
              </div>
            </div>
          )}

          {risk && (
            <div style={{ marginTop: 8 }}>
              <span className="label">Risk Estimate</span>
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

          {selected.facts.length > 0 && (
            <ul className="tiny dim" style={{ margin: '8px 0 0', paddingLeft: 16 }}>
              {selected.facts.map((fact, index) => (
                <li key={index}>{fact}</li>
              ))}
            </ul>
          )}

          <div style={{ marginTop: 10 }}>
            <Btn
              block
              tone="primary"
              disabled={!isFlyable(state.ship) || Boolean(state.expedition)}
              onClick={() => {
                store.setCourse(selected.id);
                setSelectedId(null);
              }}
              sub={
                !isFlyable(state.ship)
                  ? 'The ship cannot fly in this condition'
                  : state.expedition
                    ? 'A party is still deployed'
                    : legEstimate && !legEstimate.affordable
                      ? 'Not enough fuel — you will drift'
                      : undefined
              }
            >
              Set Course
            </Btn>
          </div>
        </Panel>
      )}

      {/* Where you are now */}
      {!state.travel && location && (
        <Panel title="Current Location" aside={location.condition.replace(/([A-Z])/g, ' $1')}>
          <div className="value">{location.name}</div>
          <div className={location.kind === 'homeworld' ? 'tiny red' : 'tiny cyan'}>
            {location.subtitle}
          </div>
          <div style={{ marginTop: 10 }}>
            <Btn
              block
              tone="go"
              onClick={() => store.setScreen('locationActions')}
              disabled={Boolean(state.expedition)}
              sub={state.expedition ? 'A party is deployed' : undefined}
            >
              Location Actions
            </Btn>
          </div>
          {!selected && destinations.length > 0 && (
            <p className="tiny faint" style={{ marginTop: 8, marginBottom: 0 }}>
              Tap a destination on the display to plot a course.
            </p>
          )}
        </Panel>
      )}

      {/* Deployed party reminder */}
      {state.expedition && (
        <Panel title="Party Deployed">
          <p className="prose">
            A party is inside{' '}
            <span className="amber">{state.sites[state.expedition.siteId]?.name ?? 'a site'}</span>.
            The ship carries on without them.
          </p>
          <Btn block tone="primary" onClick={() => store.setScreen('expedition')}>
            Rejoin the Party
          </Btn>
        </Panel>
      )}

      {/* Instruments */}
      <div className="grid2">
        <Panel title="Hull" aside={shipConditionLabel(hull)} tight>
          <div className="center">
            <span className={hull > 60 ? 'value green' : hull > 30 ? 'value amber' : 'value red'}>
              {Math.round(hull)}%
            </span>
          </div>
          <Meter value={hull} />
        </Panel>

        <Panel title="Fuel" aside={`${fuel.jumpsRemaining} jumps`} tight>
          <div className="center">
            <span className="value">
              {Math.round(
                state.resources.fuelCapacity > 0
                  ? (state.resources.fuel / state.resources.fuelCapacity) * 100
                  : 0,
              )}
              %
            </span>
          </div>
          <Segments
            value={state.resources.fuel}
            max={state.resources.fuelCapacity}
            count={12}
          />
        </Panel>
      </div>

      <div className="grid2">
        <Panel title="Crew Morale" aside={morale.label} tight>
          <div className="center">
            <span className="value">{Math.round(state.morale)}</span>
          </div>
          <Meter value={state.morale} />
        </Panel>

        <Panel title="Life Support" aside={state.ship?.systems.lifeSupport.installed ? 'On' : 'None'} tight>
          <div className="center">
            <span className="value">
              {Math.round(state.ship?.systems.lifeSupport.condition ?? 0)}%
            </span>
          </div>
          <Meter value={state.ship?.systems.lifeSupport.condition ?? 0} />
        </Panel>
      </div>

      {/* Failing systems get called out rather than buried in the ship screen */}
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

      {/* Recent log */}
      <Panel
        title="Event Log"
        aside={<button className="btn btn--sm btn--ghost" onClick={() => store.setScreen('log')}>All</button>}
      >
        <LogFeed entries={state.log} limit={6} />
      </Panel>
    </div>
  );
}

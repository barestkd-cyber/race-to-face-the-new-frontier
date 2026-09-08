/**
 * The cockpit.
 *
 * It answers three questions and stops: where am I, what can I do, is anything
 * urgent. It is not a dashboard — every subsystem has its own screen, and the
 * cockpit's job is to be the place you look out of.
 *
 * The windshield is the navigation interface. Landed, it has two modes and the
 * player switches between them: the ground under the ship, and the space
 * around it. Choosing a destination happens in the windshield in both modes,
 * which is why there is no longer a Step Outside button and no Plot a Course
 * button — those were two taps in front of the same list.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { untreatedWoundCount } from '../../engine/actions';
import { assessDanger, bestAssessor, scanCompletenessLabel } from '../../engine/assess';
import { formatDuration, stardayLabel } from '../../engine/log';
import {
  currentPlace,
  peopleAt,
  PLACE_KIND_LABELS,
  shipPlace,
  walkOptions,
} from '../../engine/places';
import {
  estimateFuel,
  hasRoom,
  isFlyable,
  medicalFacility,
  crewCapacity,
  sensorIntel,
} from '../../engine/ship';
import { sensorsUnreliable } from '../../engine/planet';
import { crewMembers, daysOfFoodRemaining } from '../../engine/sim';
import { situationReport, type SituationGo, type SituationLine } from '../../engine/situation';
import { estimateLeg, travelProgress } from '../../engine/travel';
import { ONBOARDING } from '../../engine/tuning';
import { reachableFrom } from '../../engine/world';
import type { GameState, LocationActionKind, LocationId, TimeSpeed } from '../../engine/types';
import { Btn, Chip, Meter, Panel, ResourceLine } from '../components';
import { LocalView } from '../LocalView';
import { StarMap } from '../StarMap';
import { store, useGame } from '../useStore';

const SPEEDS: { key: TimeSpeed; label: string }[] = [
  { key: 'normal', label: '▶' },
  { key: 'fast', label: '▶▶' },
  { key: 'veryFast', label: '▶▶▶' },
];

/** What a place is worth walking to, said in two or three words. */
const DRAW: Partial<Record<LocationActionKind, string>> = {
  trade: 'supplies',
  recruit: 'berth seekers',
  findWork: 'work',
  missions: 'work',
  scavenge: 'worth searching',
  repair: 'repairs',
  medical: 'treatment',
  rest: 'a bed',
  study: 'a reading room',
  askForecast: 'news',
  social: 'company',
};

/** What the local mode is called, in the words of the world you are on. */
function localModeLabel(state: GameState): string {
  const location = state.currentLocationId ? state.locations[state.currentLocationId] : undefined;
  switch (location?.kind) {
    case 'homeworld':
      return 'Explore Homeworld';
    case 'moon':
      return 'Explore Moon';
    case 'tradeStation':
    case 'transitStation':
      return 'Explore Station';
    case 'temporary':
      return 'Explore Site';
    default:
      return 'Explore Planet';
  }
}

export function CockpitScreen() {
  const state = useGame();
  const [selectedId, setSelectedId] = useState<LocationId | null>(null);
  const [mode, setMode] = useState<'local' | 'space'>('local');
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

  // Under way there is nothing to look at but the space around you. What the
  // windshield does out there is a later question, and this is not it.
  const view = underway ? 'space' : mode;

  const destinations = underway
    ? []
    : reachableFrom(state.currentLocationId, state.locations, state.routeIds);
  const selected = selectedId ? state.locations[selectedId] : undefined;
  const legEstimate = selected ? estimateLeg(state, selected.id) : null;

  const walkable = underway ? [] : walkOptions(state);

  const fuel = estimateFuel(state.ship, crew, state.resources.fuel);
  const capacity = state.ship ? crewCapacity(state.ship) : 0;

  const assessor = bestAssessor(crew);
  // A haunted world, or geology that swamps a magnetometer, makes the array
  // worth less than the window. The reading gets vaguer, never confidently
  // wrong — poor assessment is imprecise, not a lie.
  const intel = sensorsUnreliable(selected) ? 0 : sensorIntel(state.ship);
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

  const step = state.onboardingStep;
  // Everything worth interrupting for, as clauses. The cockpit prints these;
  // the screens they point at carry the full sentence.
  const alerts = situationReport(state).filter((line) => line.id !== 'quiet');

  /** Situation lines carry their own way of being acted on. */
  const runSituation = (go: SituationGo): void => {
    switch (go) {
      case 'outside':
        setMode('local');
        break;
      case 'map':
        setMode('space');
        break;
      case 'expedition':
        store.setScreen('expedition');
        break;
      default:
        store.setScreen(go);
    }
  };

  return (
    <div className="cockpit-shell">
      {/* ------------- Where am I, and what is aboard ------------- */}
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

        <ResourceLine
          resources={state.resources}
          crewCount={crew.length}
          crewCapacity={capacity}
          foodDays={daysOfFoodRemaining(state)}
          fuelDays={fuel.daysRemaining}
        />

        {/* ------------- The windshield ------------- */}
        <div className="windshield">
          <div className={view === 'space' ? 'viewport' : 'scene'}>
            {view === 'space' ? (
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

          {/*
            The display selector. This is the ship's navigation panel, not a
            menu: it changes what the glass in front of you is showing.
          */}
          {!underway && (
            <div className="windshield__modes">
              <button
                type="button"
                className={view === 'local' ? 'modebtn modebtn--on' : 'modebtn'}
                onClick={() => setMode('local')}
              >
                {localModeLabel(state)}
              </button>
              <button
                type="button"
                className={view === 'space' ? 'modebtn modebtn--on' : 'modebtn'}
                onClick={() => setMode('space')}
              >
                Space Travel Options
              </button>
            </div>
          )}

          {/* What the selected display is actually showing. */}
          {!underway && (
            <div
              className={
                view === 'space' && selected
                  ? 'windshield__list windshield__list--short'
                  : 'windshield__list'
              }
            >
              {view === 'local' ? (
                <LocalDestinations state={state} options={walkable} />
              ) : (
                <SpaceDestinations
                  state={state}
                  destinations={destinations}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                />
              )}
            </div>
          )}
        </div>

        {/* Selected space destination: the numbers that decide the leg. */}
        {view === 'space' && !underway && selected && (
          <Panel
            title={selected.name}
            aside={risk ? scanCompletenessLabel(risk.quality) : ''}
            tight
          >
            <div className="tiny dim">{selected.subtitle}</div>

            {legEstimate && (
              <div className="grid2" style={{ marginTop: 6 }}>
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

            {/* The word is the reading. A bar beside it would be the same
                thing twice, and the cockpit has no room for that. */}
            {risk && (
              <div className="split" style={{ marginTop: 6 }}>
                <span className="label">Risk</span>
                <span
                  className={
                    risk.lowIndex >= 2 ? 'tiny red' : risk.lowIndex === 1 ? 'tiny amber' : 'tiny green'
                  }
                >
                  {risk.label}
                  {risk.unsure ? ' (unsure)' : ''}
                </span>
              </div>
            )}

            <div style={{ marginTop: 8 }}>
              <Btn
                block
                tone="primary"
                disabled={!isFlyable(state.ship) || Boolean(state.expedition) || Boolean(here)}
                onClick={() => {
                  store.setCourse(selected.id);
                  setSelectedId(null);
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
        )}
      </div>

      {/* ------------- What you can do, and what is urgent ------------- */}
      <div className="cockpit-shell__panel">
        {underway && state.travel && (
          <Panel title="Under Way" aside={`${Math.round(travelProgress(state) * 100)}%`} tight>
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

        {!underway && <Onboarding step={step} />}

        <Alerts lines={alerts} onGo={runSituation} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// What the windshield is showing
// ---------------------------------------------------------------------------

/**
 * Everywhere on this world you can walk to, in the glass.
 *
 * From aboard, the first row is the ground the ship is standing on — stepping
 * outside is the shortest walk on the list rather than a separate button.
 */
function LocalDestinations({
  state,
  options,
}: {
  state: GameState;
  options: ReturnType<typeof walkOptions>;
}) {
  if (options.length === 0) {
    return <p className="windshield__empty">Nothing out there worth the walk.</p>;
  }

  return (
    <div className="stack stack--tight">
      {options.map(({ place, hours, district }) => {
        const known = peopleAt(state, place.id).filter((p) => p.placeKnown);
        const draws = place.actions.map((a) => DRAW[a]).filter((d): d is string => Boolean(d));
        const unique = [...new Set(draws)].slice(0, 2);

        return (
          <button
            key={place.id}
            type="button"
            className={['placecard', place.shipHere ? 'placecard--ship' : ''].filter(Boolean).join(' ')}
            onClick={() => store.goToPlace(place.id)}
          >
            <span className="placecard__main">
              <span className="placecard__name">
                {place.name}
                {place.shipHere && <span className="amber"> ⌂</span>}
              </span>
              <span className="placecard__sub">
                {unique.length > 0 ? unique.join(' · ') : PLACE_KIND_LABELS[place.kind]}
                {district ? ` · ${district.name}` : ''}
              </span>
              {known.length > 0 && (
                <span className="chips" style={{ marginTop: 3 }}>
                  <Chip tone="cyan">
                    {known.length === 1 ? `${known[0]!.name} is here` : `${known.length} you know`}
                  </Chip>
                </span>
              )}
            </span>
            <span className="placecard__time">
              {formatDuration(hours)}
              {!place.visited && <div className="amber">unvisited</div>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Everywhere the ship can reach from here, in the same glass. */
function SpaceDestinations({
  state,
  destinations,
  selectedId,
  onSelect,
}: {
  state: GameState;
  destinations: ReturnType<typeof reachableFrom>;
  selectedId: LocationId | null;
  onSelect: (id: LocationId) => void;
}) {
  if (destinations.length === 0) {
    return <p className="windshield__empty">Nowhere to go from here.</p>;
  }

  return (
    <div className="stack stack--tight">
      {destinations.map((destination) => {
        const leg = estimateLeg(state, destination.id);
        return (
          <button
            key={destination.id}
            type="button"
            className={[
              'placecard',
              destination.id === selectedId ? 'placecard--on' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => onSelect(destination.id)}
          >
            <span className="placecard__main">
              <span className="placecard__name">{destination.name}</span>
              <span className="placecard__sub">{destination.subtitle}</span>
            </span>
            <span className="placecard__time">
              {leg ? formatDuration(leg.hours) : '—'}
              {leg && !leg.affordable && <div className="red">fuel short</div>}
              {!destination.visited && leg?.affordable && <div className="amber">unvisited</div>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Anything urgent
// ---------------------------------------------------------------------------

/**
 * The alerts, as lines rather than paragraphs.
 *
 * Nothing here is a permanent gauge. Hull, morale and flight readiness appear
 * only once they have crossed into something the player has to answer, and the
 * full explanation lives on the screen the line points at.
 */
function Alerts({
  lines,
  onGo,
}: {
  lines: SituationLine[];
  onGo: (go: SituationGo) => void;
}) {
  if (lines.length === 0) return null;

  return (
    <div className="alerts">
      {lines.map((line) => (
        <button
          key={line.id}
          type="button"
          className={[
            'alert',
            line.tone === 'bad' ? 'alert--bad' : line.tone === 'warn' ? 'alert--warn' : '',
            line.action ? '' : 'alert--flat',
          ]
            .filter(Boolean)
            .join(' ')}
          disabled={!line.action}
          onClick={() => line.action && onGo(line.action.go)}
        >
          <span className="alert__label">{line.label}</span>
          <span className="alert__text">{line.short}</span>
          {line.action && <span className="alert__go">{line.action.label} ›</span>}
        </button>
      ))}
    </div>
  );
}

/**
 * Two beats, and only two, and neither of them stays.
 *
 * Not a tour of the screens — a statement of what the player is out here to
 * do. Everything else introduces itself at the moment it first carries a
 * decision.
 */
function Onboarding({ step }: { step: number }) {
  switch (step) {
    case ONBOARDING.OUTSIDE:
      return (
        <Hint aside="Where the game is">
          Nothing out there comes to you. Everyone you might carry off this world is on
          that list.
        </Hint>
      );
    case ONBOARDING.GOALS:
      return (
        <Hint aside="What you are here to do">
          Find the people you will not leave behind. Find anyone worth a berth. Get
          stores and a hull that will hold. Then go, before the clock decides for you.
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

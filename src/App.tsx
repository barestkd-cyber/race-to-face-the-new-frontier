/**
 * App shell.
 *
 * The dashboard holds exactly four things, and they are all information about
 * what is physically with you: your crew, your ship, yourself, and what you are
 * carrying. Everything else in the game is reached by being somewhere.
 *
 * Utilities — saving, the log, debug, quitting — live behind one unobtrusive
 * control rather than competing with gameplay for dashboard space.
 */

import { useEffect, useState, type ComponentType } from 'react';
import { stardayLabel } from './engine/log';
import { currentPlace } from './engine/places';
import { ONBOARDING } from './engine/tuning';
import type { ScreenId } from './engine/types';
import { Btn, Panel, Row, Sheet } from './ui/components';
import { Portrait } from './ui/Portrait';
import { store, useGame, useDraft, useToasts } from './ui/useStore';

import { CockpitScreen } from './ui/screens/CockpitScreen';
import { PlaceScreen } from './ui/screens/PlaceScreen';
import { LocalTravelScreen } from './ui/screens/LocalTravelScreen';
import { EventScreen } from './ui/screens/EventScreen';
import { CombatScreen } from './ui/screens/CombatScreen';
import { TitleScreen } from './ui/screens/TitleScreen';
import { NewGameScreen } from './ui/screens/NewGameScreen';
import { CharGenScreen } from './ui/screens/CharGenScreen';
import { ShipRevealScreen } from './ui/screens/ShipRevealScreen';
import { SaveLoadScreen } from './ui/screens/SaveLoadScreen';
import { GameOverScreen } from './ui/screens/GameOverScreen';
import { TravelCenterScreen } from './ui/screens/TravelCenterScreen';
import { CrewScreen } from './ui/screens/CrewScreen';
import { CharacterScreen } from './ui/screens/CharacterScreen';
import { ShipScreen } from './ui/screens/ShipScreen';
import { InventoryScreen } from './ui/screens/InventoryScreen';
import { MedicalScreen } from './ui/screens/MedicalScreen';
import { TradeScreen } from './ui/screens/TradeScreen';
import { RecruitSearchScreen } from './ui/screens/RecruitSearchScreen';
import { RecruitCandidateScreen } from './ui/screens/RecruitCandidateScreen';
import { MissionPrepScreen } from './ui/screens/MissionPrepScreen';
import { ExpeditionScreen } from './ui/screens/ExpeditionScreen';
import { RestScreen } from './ui/screens/RestScreen';
import { LogScreen } from './ui/screens/LogScreen';
import { DebugScreen } from './ui/screens/DebugScreen';

const SCREENS: Record<ScreenId, ComponentType> = {
  title: TitleScreen,
  newGame: NewGameScreen,
  charGen: CharGenScreen,
  shipReveal: ShipRevealScreen,
  cockpit: CockpitScreen,
  localTravel: LocalTravelScreen,
  place: PlaceScreen,
  crew: CrewScreen,
  character: CharacterScreen,
  ship: ShipScreen,
  inventory: InventoryScreen,
  trade: TradeScreen,
  recruitSearch: RecruitSearchScreen,
  recruitCandidate: RecruitCandidateScreen,
  missionPrep: MissionPrepScreen,
  expedition: ExpeditionScreen,
  combat: CombatScreen,
  medical: MedicalScreen,
  event: EventScreen,
  log: LogScreen,
  rest: RestScreen,
  saveLoad: SaveLoadScreen,
  debug: DebugScreen,
  travelCenter: TravelCenterScreen,
  gameOver: GameOverScreen,
};

/** Screens that take over the frame entirely. */
const MODAL_SCREENS = new Set<ScreenId>([
  'title',
  'newGame',
  'charGen',
  'shipReveal',
  'event',
  'combat',
  'gameOver',
  'travelCenter',
]);

export function App() {
  const state = useGame();
  const draft = useDraft();
  const toasts = useToasts();
  const [menuOpen, setMenuOpen] = useState(false);

  const screen: ScreenId = state ? state.screen : draft ? 'newGame' : 'title';
  const Screen = SCREENS[screen] ?? CockpitScreen;
  const showFrame = Boolean(state) && !MODAL_SCREENS.has(screen);

  useEffect(() => {
    if (!state) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [state]);

  const step = state?.onboardingStep ?? ONBOARDING.DONE;
  const here = state ? currentPlace(state) : null;

  return (
    <div className="app">
      <main className="app__body">
        <Screen />
      </main>

      {showFrame && state && (
        <nav className="navbar">
          {/* Home. Standing somewhere returns you there; aboard returns you to the shell. */}
          <NavButton
            label={here ? 'Here' : 'Cockpit'}
            icon={here ? '⚑' : '🛰'}
            active={screen === 'cockpit' || screen === 'place' || screen === 'localTravel'}
            onClick={() => store.setScreen(here ? 'place' : 'cockpit')}
          />
          <NavButton
            label="Crew"
            icon="👥"
            active={screen === 'crew'}
            hint={step === ONBOARDING.CREW}
            onClick={() => store.setScreen('crew')}
          />
          <NavButton
            label="Ship"
            icon="🚀"
            active={screen === 'ship'}
            hint={step === ONBOARDING.SHIP}
            disabled={!state.ship || state.ship.destroyed}
            onClick={() => store.setScreen('ship')}
          />
          <NavButton
            label="Self"
            icon="🧍"
            active={screen === 'character'}
            onClick={() => store.focusCharacter(state.playerId)}
          />
          <NavButton
            label="Pack"
            icon="🎒"
            active={screen === 'inventory'}
            hint={step === ONBOARDING.INVENTORY}
            onClick={() => store.setScreen('inventory')}
          />
          <NavButton label="⋯" icon="☰" active={menuOpen} onClick={() => setMenuOpen(true)} />
        </nav>
      )}

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Utilities">
        {state && (
          <div className="rows">
            <Row
              title="Journal"
              sub={`Everything logged, up to starday ${stardayLabel(state.hours)}`}
              onClick={() => {
                setMenuOpen(false);
                store.setScreen('log');
              }}
            />
            <Row
              title="Save / Load"
              sub="The game also autosaves at major transitions"
              onClick={() => {
                setMenuOpen(false);
                void store.refreshSaves();
                store.setScreen('saveLoad');
              }}
            />
            <Row
              title="Debug Inspector"
              sub="Rolls, targets, modifiers, hidden truth, simulation"
              onClick={() => {
                setMenuOpen(false);
                store.setScreen('debug');
              }}
            />
            <Row
              title="Quit to Title"
              sub="Anything since the last save is lost"
              danger
              onClick={() => {
                setMenuOpen(false);
                store.quitToTitle();
              }}
            />
          </div>
        )}
      </Sheet>

      {/*
        A death is acknowledged before anything else happens — after combat has
        said its piece, and never on top of an open event.
      */}
      {state &&
        state.pendingFarewells.length > 0 &&
        !state.combat &&
        !state.activeEvent &&
        screen !== 'gameOver' && <Farewell entry={state.pendingFarewells[0]!} />}

      {toasts.length > 0 && (
        <div className="toasts">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="toast"
              onClick={() => store.dismissToast(toast.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') store.dismissToast(toast.id);
              }}
            >
              {toast.title && <div className="toast__title">{toast.title}</div>}
              {toast.lines.slice(0, 8).map((line, index) => (
                <div key={index} className="toast__line">
                  {line}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** One quiet beat for a death: a face, a cause, a line, and Carry On. */
function Farewell({ entry }: { entry: import('./engine/types').FarewellEntry }) {
  const FAMILY_LINES = [
    'You grew up in the same rooms. There is no version of this you were ready for.',
    'The whole point of the ship was carrying the people you could not lose.',
    'You will keep flying. That is not the same as being all right.',
  ];
  const CREW_LINES = [
    'They signed on knowing the odds. Knowing them is not the same as beating them.',
    'They trusted you with where they stood. Remember where that was.',
    'The berth is empty now. The work they did is not.',
  ];
  const lines = entry.relation === 'family' ? FAMILY_LINES : CREW_LINES;
  const line = lines[entry.portraitSeed % lines.length]!;

  return (
    <div className="farewell" role="alertdialog" aria-label={`${entry.name} ${entry.surname} is gone`}>
      <div className="farewell__card">
        <Portrait seed={entry.portraitSeed} size="lg" />
        <div className="farewell__name">
          {entry.name} {entry.surname}
        </div>
        <div className="farewell__cause">
          {entry.relation === 'family' ? 'Family · ' : ''}
          {entry.cause}
        </div>
        <p className="farewell__line">{line}</p>
        <Btn block tone="primary" onClick={() => store.dismissFarewell()}>
          Carry On
        </Btn>
      </div>
    </div>
  );
}

function NavButton({
  label,
  icon,
  active,
  disabled,
  hint,
  onClick,
}: {
  label: string;
  icon: string;
  active?: boolean;
  disabled?: boolean;
  hint?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={[
        'navbtn',
        active ? 'navbtn--active' : '',
        hint && !active ? 'navbtn--hint' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="navbtn__icon" aria-hidden="true">
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}

/** Rendered when a screen throws, so one bad render cannot lose the run. */
export function ScreenError({ error, onReset }: { error: Error; onReset: () => void }) {
  return (
    <div className="app">
      <main className="app__body">
        <Panel title="Something Broke">
          <p className="prose">
            A screen failed to render. Your run is still in memory and the autosave is intact.
          </p>
          <pre className="tiny faint" style={{ whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
            {error.message}
          </pre>
          <Btn block tone="primary" onClick={onReset}>
            Back to the Cockpit
          </Btn>
        </Panel>
      </main>
    </div>
  );
}

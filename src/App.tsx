/**
 * App shell: persistent cockpit frame, screen routing, bottom navigation and
 * transient notices. The frame stays put; only the body changes.
 */

import { useEffect, useState, type ComponentType } from 'react';
import { stardayLabel } from './engine/log';
import { untreatedWoundCount } from './engine/actions';
import type { ScreenId } from './engine/types';
import { Btn, Panel, Row, Sheet } from './ui/components';
import { store, useGame, useDraft, useToasts } from './ui/useStore';

import { CockpitScreen } from './ui/screens/CockpitScreen';
import { LocationActionsScreen } from './ui/screens/LocationActionsScreen';
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
  locationActions: LocationActionsScreen,
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

/** Screens that take over the whole frame — no navigation out of them. */
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

  // Before a run exists there is no GameState to hold a screen id, so the
  // pre-run flow is driven by whether a draft exists. NewGameScreen owns the
  // handoff into character generation itself.
  const screen: ScreenId = state ? state.screen : draft ? 'newGame' : 'title';
  const Screen = SCREENS[screen] ?? CockpitScreen;

  const showFrame = Boolean(state) && !MODAL_SCREENS.has(screen);

  // Warn before a refresh drops an unsaved run.
  useEffect(() => {
    if (!state) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [state]);

  return (
    <div className="app">
      <main className="app__body">
        <Screen />
      </main>

      {showFrame && state && (
        <nav className="navbar">
          <NavButton
            label="Nav"
            icon="🛰"
            active={screen === 'cockpit'}
            onClick={() => store.setScreen('cockpit')}
          />
          <NavButton
            label="Here"
            icon="⚓"
            active={screen === 'locationActions'}
            disabled={!state.currentLocationId || Boolean(state.expedition)}
            onClick={() => store.setScreen('locationActions')}
          />
          <NavButton
            label="Crew"
            icon="👥"
            active={screen === 'crew' || screen === 'character'}
            onClick={() => store.setScreen('crew')}
          />
          <NavButton
            label="Ship"
            icon="🚀"
            active={screen === 'ship'}
            disabled={!state.ship || state.ship.destroyed}
            onClick={() => store.setScreen('ship')}
          />
          <NavButton
            label="Pack"
            icon="🎒"
            active={screen === 'inventory'}
            onClick={() => store.setScreen('inventory')}
          />
          <NavButton label="More" icon="☰" active={menuOpen} onClick={() => setMenuOpen(true)} />
        </nav>
      )}

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Ship's Menu">
        {state && (
          <div className="rows">
            <Row
              title="Rest"
              sub="Eight, sixteen or twenty-four hours"
              onClick={() => {
                setMenuOpen(false);
                store.setScreen('rest');
              }}
            />
            <Row
              title="Medical"
              sub={
                untreatedWoundCount(state) > 0
                  ? `${untreatedWoundCount(state)} untreated wounds`
                  : 'Nobody needs treatment'
              }
              onClick={() => {
                setMenuOpen(false);
                store.setScreen('medical');
              }}
            />
            <Row
              title="Missions and Sites"
              sub="Contracts, work, and places worth searching"
              onClick={() => {
                setMenuOpen(false);
                store.setScreen('missionPrep');
              }}
            />
            <Row
              title="Event Log"
              sub={`Starday ${stardayLabel(state.hours)}`}
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

function NavButton({
  label,
  icon,
  active,
  disabled,
  onClick,
}: {
  label: string;
  icon: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={active ? 'navbtn navbtn--active' : 'navbtn'}
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

/**
 * Action-meter combat.
 *
 * Meters fill on their own. When one of your people is ready the fight stops
 * for input; enemies act by themselves. There is no grid and no turn order to
 * memorise — position is a range band, and what you can do comes from your
 * weapon, your skill, and where you are standing.
 */

import { useEffect } from 'react';
import {
  attacksFor,
  availableActions,
  characterFor,
  effectiveRange,
  livingEnemies,
  RANGE_LABELS,
} from '../../engine/combat';
import { conditionLabel, isIncapacitated } from '../../engine/wounds';
import { COMBAT } from '../../engine/tuning';
import type { CombatAction, Combatant } from '../../engine/types';
import { Btn, Chip, Empty, Meter, Panel } from '../components';
import { Portrait } from '../Portrait';
import { store, useGame } from '../useStore';

export function CombatScreen() {
  const state = useGame();

  // Keep the meters moving whenever nobody is waiting on the player.
  useEffect(() => {
    if (!state?.combat) return;
    if (state.combat.resolution) return;
    if (state.combat.activeId) return;
    const id = window.setTimeout(() => store.advanceCombat(), 120);
    return () => window.clearTimeout(id);
  }, [state?.combat, state?.combat?.activeId, state?.combat?.resolution]);

  if (!state) return null;
  const combat = state.combat;

  if (!combat) {
    return (
      <Panel title="Combat">
        <Empty>The fight is over.</Empty>
      </Panel>
    );
  }

  const crew = combat.combatants.filter((c) => !c.hostile);
  const hostiles = combat.combatants.filter((c) => c.hostile);
  const active = combat.activeId
    ? combat.combatants.find((c) => c.id === combat.activeId)
    : undefined;

  if (combat.resolution) {
    return (
      <div className="stack">
        <Panel title={combat.title} aside={combat.resolution.toUpperCase()}>
          <p className="prose">
            {combat.resolution === 'victory'
              ? 'The fight is over and you are still standing.'
              : combat.resolution === 'fled'
                ? 'You broke contact and got clear.'
                : combat.resolution === 'defeat'
                  ? 'You were overrun.'
                  : 'The fight broke off without resolution.'}
          </p>
        </Panel>

        <Panel title="After Action">
          <div className="logfeed">
            {combat.log.slice(-12).map((line, index) => (
              <div key={index} className="logline">
                <span className="logline__text">{line}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Your People">
          <div className="stack stack--tight">
            {crew.map((combatant) => (
              <CombatantCard key={combatant.id} state={state} combatant={combatant} />
            ))}
          </div>
        </Panel>

        <Btn block tone="primary" onClick={() => store.closeCombat()}>
          Continue
        </Btn>
      </div>
    );
  }

  return (
    <div className="stack">
      <Panel title={combat.title} aside={`Round ${combat.round}`}>
        <p className="tiny dim" style={{ margin: 0 }}>
          {active
            ? `${active.name} is ready.`
            : 'Meters filling — nobody is ready to act yet.'}
        </p>
      </Panel>

      <Panel title="Hostiles" tight>
        <div className="stack stack--tight">
          {hostiles.map((combatant) => (
            <CombatantCard key={combatant.id} state={state} combatant={combatant} />
          ))}
        </div>
      </Panel>

      <Panel title="Your People" tight>
        <div className="stack stack--tight">
          {crew.map((combatant) => (
            <CombatantCard key={combatant.id} state={state} combatant={combatant} />
          ))}
        </div>
      </Panel>

      {active && <ActionPanel state={state} active={active} />}

      {combat.log.length > 0 && (
        <Panel title="Blow by Blow">
          <div className="logfeed">
            {combat.log
              .slice(-8)
              .reverse()
              .map((line, index) => (
                <div key={index} className="logline">
                  <span className="logline__text">{line}</span>
                </div>
              ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

function CombatantCard({
  state,
  combatant,
}: {
  state: NonNullable<ReturnType<typeof useGame>>;
  combatant: Combatant;
}) {
  const character = characterFor(state, combatant);
  if (!character) return null;

  const down = !character.alive || isIncapacitated(character) || combatant.fled;
  const isActive = state.combat?.activeId === combatant.id;

  return (
    <div
      className={[
        'combatant',
        combatant.hostile ? 'combatant--hostile' : '',
        isActive ? 'combatant--active' : '',
        down ? 'combatant--down' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Portrait seed={combatant.portraitSeed} size="sm" dead={!character.alive} />
      <div className="combatant__body">
        <div className="split">
          <span className="row__title">{combatant.name}</span>
          <span className="tiny dim">{RANGE_LABELS[combatant.range]}</span>
        </div>
        <Meter value={character.health} max={character.maxHealth} />
        <div className="split" style={{ marginTop: 2 }}>
          <span className="tiny dim">
            {combatant.fled ? 'Fled' : conditionLabel(character)}
            {combatant.inCover ? ' · in cover' : ''}
          </span>
          <span className="tiny faint">
            {Math.min(COMBAT.meterMax, Math.max(0, Math.round(combatant.meter)))}/{COMBAT.meterMax}
          </span>
        </div>
        <div style={{ marginTop: 2 }}>
          <Meter
            value={Math.min(COMBAT.meterMax, Math.max(0, combatant.meter))}
            max={COMBAT.meterMax}
            color={isActive ? 'var(--amber)' : 'var(--cyan)'}
          />
        </div>
      </div>
    </div>
  );
}

function ActionPanel({
  state,
  active,
}: {
  state: NonNullable<ReturnType<typeof useGame>>;
  active: Combatant;
}) {
  const actions = availableActions(state, active);
  const attacks = attacksFor(state, active);
  const enemies = livingEnemies(state, active);
  const nearest = enemies[0];
  const range = nearest ? effectiveRange(active, nearest) : active.range;

  const grouped: { heading: string; items: CombatAction[] }[] = [
    { heading: 'Attack', items: actions.filter((a) => a.kind === 'attack' || a.kind === 'strike') },
    {
      heading: 'Move and Position',
      items: actions.filter((a) => ['closeDistance', 'createDistance', 'cover'].includes(a.kind)),
    },
    {
      heading: 'Other',
      items: actions.filter((a) => ['firstAid', 'escape', 'readyWeapon', 'context'].includes(a.kind)),
    },
  ];

  return (
    <Panel title={`${active.name} — Your Move`} aside={`Range: ${RANGE_LABELS[range]}`}>
      {attacks.length === 0 && <Empty>No usable attacks.</Empty>}

      {grouped.map((group) =>
        group.items.length === 0 ? null : (
          <div key={group.heading} style={{ marginBottom: 10 }}>
            <span className="label">{group.heading}</span>
            <div className="stack stack--tight" style={{ marginTop: 4 }}>
              {group.items.map((action, index) => (
                <Btn
                  key={`${action.kind}-${index}`}
                  block
                  tone={action.kind === 'attack' || action.kind === 'strike' ? 'danger' : 'default'}
                  disabled={!action.available}
                  onClick={() => store.combatAction(action, action.targetId)}
                  sub={action.available ? action.hint : action.reason}
                >
                  {action.label}
                </Btn>
              ))}
            </div>
          </div>
        ),
      )}

      {enemies.length > 1 && (
        <div>
          <span className="label">Target</span>
          <div className="chips" style={{ marginTop: 4 }}>
            {enemies.map((enemy) => (
              <Chip key={enemy.id} tone="red">
                {enemy.name}
              </Chip>
            ))}
          </div>
          <p className="tiny faint" style={{ marginTop: 4, marginBottom: 0 }}>
            Attacks go to the nearest standing hostile.
          </p>
        </div>
      )}
    </Panel>
  );
}

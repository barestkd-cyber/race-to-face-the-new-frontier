/**
 * Character sheet.
 *
 * The deepest screen in the game: everything you are allowed to know about one
 * person, folded away so a phone shows one thing at a time. Nothing here is
 * computed locally — costs, caps and condition all come from the engine.
 */

import type { ReactNode } from 'react';
import { Btn, Chip, Duration, Empty, Fold, KV, Meter, Panel, Pips, Row } from '../components';
import { Portrait } from '../Portrait';
import { store, useGame } from '../useStore';
import { TRAIT_DEFS } from '../../content/traits';
import {
  conditionLabel as itemConditionLabel,
  equippedStack,
  getItem,
  slotsUsed,
  type EquipSlot,
} from '../../engine/inventory';
import { quoteAttributeUpgrade, quoteSkillUpgrade, skillCapLabel } from '../../engine/progression';
import { WOUNDS } from '../../engine/tuning';
import { conditionLabel, SEVERITY_LABELS } from '../../engine/wounds';
import {
  ATTRIBUTE_LABELS,
  BODY_REGION_LABELS,
  FACETS,
  SKILL_GROUPS,
  SKILL_LABELS,
  type AttributeKey,
  type SkillKey,
  type WoundSeverity,
} from '../../engine/types';

const EQUIP_SLOTS: { slot: EquipSlot; label: string; note: string }[] = [
  { slot: 'weapon', label: 'Weapon', note: 'Two-handed or heavy, carried ready.' },
  { slot: 'sidearm', label: 'Sidearm', note: 'One-handed backup.' },
  { slot: 'armor', label: 'Armor', note: 'Worn protection.' },
  { slot: 'tool', label: 'Tool', note: 'Equipment that lends a skill bonus.' },
];

const SEVERITY_TONE: Record<WoundSeverity, 'amber' | 'red' | undefined> = {
  minor: undefined,
  serious: 'amber',
  critical: 'red',
  mortal: 'red',
};

function titleCase(value: string): string {
  return value.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// One raisable stat
// ---------------------------------------------------------------------------

function RaiseRow({
  name,
  value,
  pipsMax,
  detail,
  cost,
  affordable,
  capped,
  reason,
  onRaise,
}: {
  name: string;
  value: number;
  pipsMax?: number;
  detail?: string;
  cost: number;
  affordable: boolean;
  capped: boolean;
  reason?: string;
  onRaise: () => void;
}) {
  return (
    <div style={{ padding: '6px 0', borderBottom: '1px solid var(--seam)' }}>
      <div className="split">
        <span className="statline__name">{name}</span>
        <span className="statline__val">{Math.round(value)}</span>
      </div>
      <div className="split" style={{ marginTop: 4, gap: 8 }}>
        {pipsMax !== undefined ? (
          <Pips value={value} max={pipsMax} />
        ) : (
          <span className="tiny faint readout">{detail}</span>
        )}
        {capped ? (
          <Chip tone="amber">Capped</Chip>
        ) : (
          <Btn onClick={onRaise} disabled={!affordable} title={reason}>
            Raise {cost}
          </Btn>
        )}
      </div>
      {pipsMax !== undefined && detail && <div className="tiny faint">{detail}</div>}
      {!capped && !affordable && reason && <div className="tiny faint">{reason}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export function CharacterScreen() {
  const state = useGame();

  if (!state) {
    return <Empty>No run is loaded, captain. Start or load a game first.</Empty>;
  }

  const character = state.focusCharacterId ? state.characters[state.focusCharacterId] : undefined;
  if (!character) {
    return <Empty>Nobody is selected. Pick someone from the roster.</Empty>;
  }

  const isCaptain = state.captainId === character.id;
  const untreated = character.wounds.filter((w) => !w.treated).length;
  const packUsed = slotsUsed(character.backpack);

  const relationships = Object.entries(character.relationships)
    .map(([id, rel]) => ({ id, rel, other: state.characters[id] }))
    .filter((entry) => Boolean(entry.other))
    .sort((a, b) => b.rel.familiarity - a.rel.familiarity);

  const surfaced = character.traitKnowledge.filter((k) => k.known > 0);

  return (
    <div className="stack">
      {/* -- Identity ------------------------------------------------------ */}
      <Panel title="Personnel file" aside={isCaptain ? 'Captain' : titleCase(character.role)}>
        <div className="split" style={{ alignItems: 'flex-start' }}>
          <Portrait seed={character.portraitSeed} size="lg" dead={!character.alive} />
          <span className="row__main">
            <span className="value" style={{ display: 'block' }}>
              {character.name} {character.surname}
            </span>
            <span className="tiny">
              Age {character.age} · {character.pronouns} · {titleCase(character.role)}
            </span>
            <span className="chips" style={{ marginTop: 6 }}>
              {character.isPlayer && <Chip tone="amber">You</Chip>}
              {isCaptain && <Chip tone="cyan">Captain</Chip>}
              {!character.aboard && <Chip>Not aboard</Chip>}
              {!character.alive && <Chip tone="red">Dead</Chip>}
              {character.owedTerms && <Chip tone="amber">Terms owed</Chip>}
            </span>
          </span>
        </div>
        {character.owedTerms && (
          <p className="prose prose--dim" style={{ marginTop: 8 }}>
            Still owed: {character.owedTerms}
          </p>
        )}
        <div className="btn-row" style={{ marginTop: 8 }}>
          <Btn tone="ghost" wide onClick={() => store.back()}>
            Back
          </Btn>
        </div>
      </Panel>

      {/* -- Condition ----------------------------------------------------- */}
      <Fold title="Condition" defaultOpen>
        <div className="split">
          <span className="label">Health</span>
          <span className="value readout">
            {Math.round(character.health)} / {Math.round(character.maxHealth)}
          </span>
        </div>
        <div style={{ marginTop: 4 }}>
          <Meter value={character.health} max={character.maxHealth} tall />
        </div>
        <div className="chips" style={{ marginTop: 8 }}>
          <Chip
            tone={
              character.health / Math.max(1, character.maxHealth) > 0.6
                ? 'green'
                : character.health / Math.max(1, character.maxHealth) > 0.3
                  ? 'amber'
                  : 'red'
            }
          >
            {conditionLabel(character)}
          </Chip>
          {untreated > 0 && <Chip tone="red">{untreated} untreated</Chip>}
        </div>

        <div className="divider" />

        <div className="split">
          <span className="label">Stress</span>
          <span className="value readout">{Math.round(character.stress)} / 100</span>
        </div>
        <div style={{ marginTop: 4 }}>
          <Meter
            value={character.stress}
            max={100}
            color={
              character.stress > 70
                ? 'var(--red)'
                : character.stress > 40
                  ? 'var(--amber)'
                  : 'var(--green)'
            }
          />
        </div>
        <p className="tiny faint">
          Above 40, stress starts eating into every check they make.
        </p>

        <div className="split" style={{ marginTop: 8 }}>
          <span className="label">Rested</span>
          <span className="value readout">{Math.round(character.rested)} / 100</span>
        </div>
        <div style={{ marginTop: 4 }}>
          <Meter value={character.rested} max={100} />
        </div>
        <p className="tiny faint">Below 35 they are working exhausted and it shows.</p>

        {character.hungerDays > 0 && (
          <p className="prose" style={{ marginTop: 8 }}>
            <span className="red">
              Hungry for {character.hungerDays.toFixed(1)} days.
            </span>{' '}
            Wounds close slower and health does not come back while the crew is not
            eating.
          </p>
        )}
      </Fold>

      {/* -- Wounds -------------------------------------------------------- */}
      <Fold title={`Wounds (${character.wounds.length})`} defaultOpen={untreated > 0}>
        {character.wounds.length === 0 ? (
          <Empty>No open wounds. There is nothing here to treat.</Empty>
        ) : (
          <div className="stack stack--tight">
            {character.wounds.map((wound) => {
              const septic = wound.infection >= WOUNDS.infectionSepticAt;
              const facts: [string, ReactNode][] = [];
              if (wound.bleeding > 0) {
                facts.push([
                  'Bleeding',
                  <span className="red">{wound.bleeding.toFixed(2)} health per hour</span>,
                ]);
              }
              if (wound.infection > 0) {
                facts.push([
                  'Infection',
                  <span className={septic ? 'red' : 'amber'}>
                    {Math.round(wound.infection)}%
                  </span>,
                ]);
              }
              facts.push(['Age', <Duration hours={wound.ageHours} />]);
              facts.push(['Heals in', <Duration hours={Math.max(0, wound.healHours)} />]);
              return (
                <div key={wound.id} className="panel panel--inset panel--flush">
                  <div className="panel__body panel__body--tight">
                    <div className="split">
                      <span className="row__title">
                        {BODY_REGION_LABELS[wound.region]} — {wound.label}
                      </span>
                    </div>
                    <div className="chips" style={{ marginTop: 4 }}>
                      <Chip tone={SEVERITY_TONE[wound.severity]}>
                        {SEVERITY_LABELS[wound.severity]}
                      </Chip>
                      <Chip>{wound.damageType}</Chip>
                      {wound.treated ? (
                        <Chip tone="green">Treated</Chip>
                      ) : (
                        <Chip tone="red">Untreated</Chip>
                      )}
                      {septic && <Chip tone="red">Septic</Chip>}
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <KV items={facts} />
                    </div>
                    {septic && (
                      <p className="prose" style={{ marginTop: 6 }}>
                        <span className="red">This wound is septic.</span> It will keep
                        draining health for as long as it stays open. It needs proper
                        treatment, not time.
                      </p>
                    )}
                    {wound.severity === 'mortal' && (
                      <p className="prose" style={{ marginTop: 6 }}>
                        <span className="red">This is a mortal wound.</span>{' '}
                        {wound.lethalInHours !== undefined && !wound.treated ? (
                          <>
                            Without surgery it kills {character.name} in{' '}
                            <Duration hours={Math.max(0, wound.lethalInHours)} />.
                          </>
                        ) : (
                          <>It has been stabilised, but it will take a long time to close.</>
                        )}
                      </p>
                    )}
                    {!wound.treated && !septic && wound.severity !== 'mortal' && (
                      <p className="tiny faint" style={{ marginTop: 6 }}>
                        Left alone it will close on its own, slowly and badly, and it can
                        turn septic first.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Fold>

      {/* -- Attributes ---------------------------------------------------- */}
      <Fold title="Attributes">
        <p className="prose prose--dim">
          Attributes magnify skill; they never replace it. Raising one costs XP from
          this person first, then the shared crew pool.
        </p>
        {Object.entries(FACETS).map(([facetKey, facet]) => (
          <div key={facetKey} style={{ marginTop: 10 }}>
            <span className="label">{facet.label}</span>
            {facet.attributes.map((key: AttributeKey) => {
              const quote = quoteAttributeUpgrade(state, character, key);
              return (
                <RaiseRow
                  key={key}
                  name={ATTRIBUTE_LABELS[key]}
                  value={character.attributes[key]}
                  pipsMax={15}
                  cost={quote.cost}
                  affordable={quote.affordable}
                  capped={quote.capped}
                  reason={quote.reason}
                  detail={quote.source === 'crew' ? 'Paid from crew XP' : undefined}
                  onRaise={() => store.raiseAttribute(character.id, key)}
                />
              );
            })}
          </div>
        ))}
      </Fold>

      {/* -- Skills -------------------------------------------------------- */}
      <Fold title="Skills">
        <p className="prose prose--dim">
          Each skill has a potential grade and a hard ceiling. Grade and any knowledge
          specialisation are fixed for life — training moves the number, not the
          ceiling.
        </p>
        {Object.entries(SKILL_GROUPS).map(([groupKey, group]) => (
          <div key={groupKey} style={{ marginTop: 10 }}>
            <span className="label">{group.label}</span>
            {group.skills.map((key: SkillKey) => {
              const quote = quoteSkillUpgrade(state, character, key);
              return (
                <RaiseRow
                  key={key}
                  name={SKILL_LABELS[key]}
                  value={character.skills[key]}
                  detail={skillCapLabel(character, key)}
                  cost={quote.cost}
                  affordable={quote.affordable}
                  capped={quote.capped}
                  reason={quote.reason}
                  onRaise={() => store.raiseSkill(character.id, key)}
                />
              );
            })}
          </div>
        ))}
      </Fold>

      {/* -- Traits -------------------------------------------------------- */}
      <Fold title="Traits">
        <p className="prose prose--dim">
          Traits are tendencies, not morality. None of them is good or bad on its own;
          what matters is when it fires and who is standing nearby. You learn them by
          watching someone work, not by reading a file.
        </p>
        {surfaced.length === 0 ? (
          <Empty>
            Nothing has surfaced yet. Spend time with this person and their habits will
            show themselves.
          </Empty>
        ) : (
          <div className="stack stack--tight" style={{ marginTop: 8 }}>
            {surfaced.map((knowledge) => {
              if (knowledge.known === 1) {
                return (
                  <div key={knowledge.trait} className="panel panel--inset panel--flush">
                    <div className="panel__body panel__body--tight">
                      <span className="row__title faint">
                        Something you have noticed but cannot name yet
                      </span>
                    </div>
                  </div>
                );
              }
              const def = TRAIT_DEFS[knowledge.trait];
              return (
                <div key={knowledge.trait} className="panel panel--inset panel--flush">
                  <div className="panel__body panel__body--tight">
                    <span className="row__title">{def.label}</span>
                    <p className="prose" style={{ marginTop: 4 }}>
                      {def.description}
                    </p>
                    <p className="tiny" style={{ marginTop: 4 }}>
                      {def.behaviour}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {state.debug.revealHidden && (
          <div style={{ marginTop: 10 }}>
            <Panel title="Debug — true traits" flush>
              <div className="chips">
                {character.traits.length === 0 ? (
                  <span className="tiny faint">None.</span>
                ) : (
                  character.traits.map((key) => (
                    <Chip key={key} tone="cyan">
                      {TRAIT_DEFS[key].label}
                    </Chip>
                  ))
                )}
              </div>
              <p className="tiny faint" style={{ marginTop: 6 }}>
                Debug output. This is the hidden truth, not something the crew has told
                you.
              </p>
            </Panel>
          </div>
        )}
      </Fold>

      {/* -- Relationships ------------------------------------------------- */}
      <Fold title={`Relationships (${relationships.length})`}>
        {relationships.length === 0 ? (
          <Empty>They have no standing relationships with anyone you know.</Empty>
        ) : (
          <div className="stack stack--tight">
            {relationships.map(({ id, rel, other }) => (
              <div key={id} className="panel panel--inset panel--flush">
                <div className="panel__body panel__body--tight">
                  <div className="split">
                    <span className="row__title">
                      {other.name} {other.surname}
                    </span>
                    <Chip>{titleCase(rel.kind)}</Chip>
                  </div>
                  <div className="split" style={{ marginTop: 4 }}>
                    <span className="tiny faint">Hostile</span>
                    <span className="tiny faint">Devoted</span>
                  </div>
                  <Meter
                    value={rel.value + 100}
                    max={200}
                    color={
                      rel.value > 20
                        ? 'var(--green)'
                        : rel.value < -20
                          ? 'var(--red)'
                          : 'var(--amber)'
                    }
                  />
                  <div className="split" style={{ marginTop: 4 }}>
                    <span className="tiny">
                      Standing <span className="readout">{Math.round(rel.value)}</span>
                    </span>
                    <span className="tiny">
                      Familiarity <span className="readout">{Math.round(rel.familiarity)}</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Fold>

      {/* -- Life history -------------------------------------------------- */}
      <Fold title="Life history">
        {character.lifeHistory.notes.length === 0 ? (
          <Empty>Nothing on record about where they came from.</Empty>
        ) : (
          character.lifeHistory.notes.map((note, index) => (
            <p key={index} className="prose" style={{ marginTop: index === 0 ? 0 : 6 }}>
              {note}
            </p>
          ))
        )}
      </Fold>

      {/* -- Equipment ----------------------------------------------------- */}
      <Fold title="Equipment">
        <div className="rows">
          {EQUIP_SLOTS.map(({ slot, label, note }) => {
            const stack = equippedStack(character, slot, state.ship);
            const def = stack ? getItem(stack.itemId) : undefined;
            return (
              <Row
                key={slot}
                title={
                  <span>
                    <span className="label">{label}</span>{' '}
                    {def ? def.name : <span className="faint">Empty</span>}
                  </span>
                }
                sub={
                  stack && def ? (
                    <span>
                      {itemConditionLabel(stack.condition)} · {Math.round(stack.condition)}% ·{' '}
                      {def.description}
                    </span>
                  ) : (
                    <span>{note}</span>
                  )
                }
                right={
                  stack ? (
                    <Btn
                      tone="ghost"
                      onClick={() => store.unequipSlot(character.id, slot)}
                    >
                      Unequip
                    </Btn>
                  ) : undefined
                }
              />
            );
          })}
        </div>
      </Fold>

      {/* -- Backpack ------------------------------------------------------ */}
      <Fold title={`Backpack (${packUsed}/${character.backpackSlots})`}>
        <div className="split">
          <span className="label">Slots used</span>
          <span className="value readout">
            {packUsed} / {character.backpackSlots}
          </span>
        </div>
        <div style={{ marginTop: 4 }}>
          <Meter
            value={packUsed}
            max={Math.max(1, character.backpackSlots)}
            color={packUsed >= character.backpackSlots ? 'var(--red)' : 'var(--green)'}
          />
        </div>
        <p className="tiny faint" style={{ marginTop: 4 }}>
          Bulky gear cannot go in a pack at all; it stays in the hold.
        </p>
        {character.backpack.length === 0 ? (
          <Empty>The pack is empty.</Empty>
        ) : (
          <div className="rows" style={{ marginTop: 8 }}>
            {character.backpack.map((stack) => {
              const def = getItem(stack.itemId);
              return (
                <Row
                  key={stack.uid}
                  title={`${def?.name ?? stack.itemId}${stack.qty > 1 ? ` ×${stack.qty}` : ''}`}
                  sub={`${itemConditionLabel(stack.condition)} · ${titleCase(def?.category ?? 'unknown')}`}
                  right={<span className="tiny readout">{Math.round(stack.condition)}%</span>}
                />
              );
            })}
          </div>
        )}
      </Fold>

      {/* -- XP ------------------------------------------------------------ */}
      <Panel title="Experience">
        <KV
          items={[
            ['Personal XP', <span className="value readout">{character.personalXp}</span>],
            ['Crew XP pool', <span className="value readout">{state.crewXp}</span>],
          ]}
        />
        <p className="prose prose--dim" style={{ marginTop: 8 }}>
          Personal XP belongs to this person alone. The crew pool is shared and can be
          spent on them as well, so a specialist you need is worth funding out of it.
        </p>
      </Panel>
    </div>
  );
}

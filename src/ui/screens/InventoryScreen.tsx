/**
 * Inventory.
 *
 * Two containers side by side: the ship's hold, and one crew member's pack.
 * The hold is where bulk lives; a pack is what someone actually has on them
 * when a corridor goes wrong.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { Btn, Chip, Empty, Meter, Panel, Row } from '../components';
import { store, useGame } from '../useStore';
import {
  backpackFree,
  conditionLabel,
  describeAttack,
  equippedStack,
  getItem,
  isBulky,
  slotFor,
  slotsUsed,
  stackWeight,
} from '../../engine/inventory';
import { crewMembers } from '../../engine/sim';
import { SKILL_LABELS, type Character, type ItemDef, type ItemStack } from '../../engine/types';

function titleCase(value: string): string {
  return value.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
}

/** Desktop gets two columns; a phone stacks them. */
function useWideLayout(): boolean {
  const [wide, setWide] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 860px)').matches,
  );
  useEffect(() => {
    const query = window.matchMedia('(min-width: 860px)');
    const onChange = () => setWide(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return wide;
}

// ---------------------------------------------------------------------------
// What a thing is worth knowing about
// ---------------------------------------------------------------------------

function ItemProfile({ def }: { def: ItemDef }) {
  const rows: ReactNode[] = [];

  if (def.attacks && def.attacks.length > 0) {
    rows.push(
      <div key="attacks">
        <span className="label">Attacks</span>
        {def.attacks.map((attack, index) => (
          <div key={`${attack.name}-${index}`} className="tiny">
            {describeAttack(attack)}
            {attack.ammoId && (
              <span className="faint">
                {' '}
                · uses {attack.ammoPerShot ?? 1} × {getItem(attack.ammoId)?.name ?? attack.ammoId}
              </span>
            )}
          </div>
        ))}
      </div>,
    );
  }

  if (def.protection) {
    const entries = Object.entries(def.protection);
    if (entries.length > 0) {
      rows.push(
        <div key="protection">
          <span className="label">Protection</span>
          <div className="chips">
            {entries.map(([damageType, value]) => (
              <Chip key={damageType} tone="cyan">
                {damageType} {value}
              </Chip>
            ))}
          </div>
        </div>,
      );
    }
  }

  if (def.toolBonus && def.toolBonus.length > 0) {
    rows.push(
      <div key="tool">
        <span className="label">While equipped</span>
        <div className="chips">
          {def.toolBonus.map((bonus) => (
            <Chip key={bonus.skill} tone="green">
              {SKILL_LABELS[bonus.skill]} +{bonus.value}
            </Chip>
          ))}
        </div>
      </div>,
    );
  }

  if (def.foodDays) {
    rows.push(
      <div key="food" className="tiny">
        Feeds the crew for {def.foodDays} crew-day{def.foodDays === 1 ? '' : 's'} each.
      </div>,
    );
  }
  if (def.medicineUnits) {
    rows.push(
      <div key="medicine" className="tiny">
        Worth {def.medicineUnits} unit{def.medicineUnits === 1 ? '' : 's'} of medicine each.
      </div>,
    );
  }
  if (def.repairParts) {
    rows.push(
      <div key="parts" className="tiny">
        Strips down for roughly {def.repairParts} repair part
        {def.repairParts === 1 ? '' : 's'} each, less if it is worn.
      </div>,
    );
  }
  if (def.properties && def.properties.length > 0) {
    rows.push(
      <div key="properties" className="chips">
        {def.properties.map((property) => (
          <Chip key={property}>{property}</Chip>
        ))}
      </div>,
    );
  }

  if (rows.length === 0) return null;
  return (
    <div className="stack stack--tight" style={{ marginTop: 6 }}>
      {rows}
    </div>
  );
}

function StackCard({
  stack,
  actions,
}: {
  stack: ItemStack;
  actions: ReactNode;
}) {
  const def = getItem(stack.itemId);
  const bulky = isBulky(stack.itemId);

  return (
    <div className="panel panel--inset panel--flush">
      <div className="panel__body panel__body--tight">
        <div className="split">
          <span className="row__title">
            {def?.name ?? stack.itemId}
            {stack.qty > 1 && <span className="dim"> ×{stack.qty}</span>}
          </span>
          <span className="tiny readout">{Math.round(stack.condition)}%</span>
        </div>
        <div className="chips" style={{ marginTop: 4 }}>
          <Chip
            tone={
              stack.condition >= 75 ? 'green' : stack.condition >= 32 ? 'amber' : 'red'
            }
          >
            {conditionLabel(stack.condition)}
          </Chip>
          <Chip>{titleCase(def?.category ?? 'unknown')}</Chip>
          <Chip>{stackWeight(stack).toFixed(1)} wt</Chip>
          {bulky && <Chip tone="amber">Bulky</Chip>}
          {stack.loaded !== undefined && <Chip>Loaded {stack.loaded}</Chip>}
        </div>
        {def && (
          <p className="prose prose--dim" style={{ marginTop: 6 }}>
            {def.description}
          </p>
        )}
        {def && <ItemProfile def={def} />}
        {bulky && (
          <p className="tiny faint" style={{ marginTop: 4 }}>
            Too bulky for a pack. It stays in the hold.
          </p>
        )}
        <div className="btn-row" style={{ marginTop: 8 }}>
          {actions}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export function InventoryScreen() {
  const state = useGame();
  const wide = useWideLayout();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (!state) {
    return <Empty>No run is loaded, captain. Start or load a game first.</Empty>;
  }

  const crew = crewMembers(state);
  const selected: Character | undefined = crew.find((c) => c.id === selectedId) ?? crew[0];
  const ship = state.ship;
  const holdUsable = Boolean(ship && !ship.destroyed);

  const packUsed = selected ? slotsUsed(selected.backpack) : 0;
  const packFree = selected ? backpackFree(selected) : 0;

  return (
    <div className="stack">
      <Panel title="Whose pack" aside={selected ? `${packUsed}/${selected.backpackSlots}` : 'None'}>
        {crew.length === 0 ? (
          <Empty>There is nobody aboard to carry anything.</Empty>
        ) : (
          <>
            <div className="scroll-x">
              <div className="btn-row" style={{ flexWrap: 'nowrap' }}>
                {crew.map((member) => (
                  <Btn
                    key={member.id}
                    tone={member.id === selected?.id ? 'primary' : 'ghost'}
                    onClick={() => setSelectedId(member.id)}
                    sub={`${slotsUsed(member.backpack)}/${member.backpackSlots}`}
                  >
                    {member.name}
                  </Btn>
                ))}
              </div>
            </div>
            {selected && (
              <>
                <div className="split" style={{ marginTop: 8 }}>
                  <span className="label">Pack slots used</span>
                  <span className="value readout">
                    {packUsed} / {selected.backpackSlots}
                  </span>
                </div>
                <div style={{ marginTop: 4 }}>
                  <Meter
                    value={packUsed}
                    max={Math.max(1, selected.backpackSlots)}
                    color={packFree === 0 ? 'var(--red)' : 'var(--green)'}
                  />
                </div>
                <p className="tiny faint" style={{ marginTop: 4 }}>
                  A stack takes one slot however many are in it. Bulky items cannot be
                  packed at all.
                </p>
              </>
            )}
          </>
        )}
      </Panel>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: wide ? '1fr 1fr' : '1fr',
          gap: 8,
          alignItems: 'start',
        }}
      >
        {/* -- The hold ---------------------------------------------------- */}
        <Panel
          title="Ship's hold"
          aside={holdUsable && ship ? `${ship.cargo.length} stacks` : 'None'}
        >
          {!holdUsable || !ship ? (
            <Empty>You have no working hold. Everything has to be carried.</Empty>
          ) : ship.cargo.length === 0 ? (
            <Empty>The hold is empty.</Empty>
          ) : (
            <div className="stack stack--tight" style={{ maxHeight: 520, overflowY: 'auto' }}>
              {ship.cargo.map((stack) => {
                const def = getItem(stack.itemId);
                const bulky = isBulky(stack.itemId);
                const equippable = slotFor(stack.itemId) !== null;
                const strippable = (def?.repairParts ?? 0) > 0;
                const takeBlocked = !selected || bulky || packFree <= 0;
                return (
                  <StackCard
                    key={stack.uid}
                    stack={stack}
                    actions={
                      <>
                        <Btn
                          wide
                          disabled={takeBlocked}
                          title={
                            !selected
                              ? 'Nobody is selected.'
                              : bulky
                                ? 'Too bulky to backpack.'
                                : packFree <= 0
                                  ? 'That pack is full.'
                                  : undefined
                          }
                          onClick={() => selected && store.takeFromHold(selected.id, stack.uid)}
                        >
                          Take
                        </Btn>
                        {equippable && (
                          <Btn
                            wide
                            tone="go"
                            disabled={!selected}
                            onClick={() => selected && store.equipStack(selected.id, stack.uid)}
                          >
                            Equip
                          </Btn>
                        )}
                        {strippable && (
                          <Btn
                            wide
                            tone="danger"
                            onClick={() => store.strip(stack.uid)}
                            sub={`about ${Math.round((def?.repairParts ?? 0) * stack.qty)} parts`}
                          >
                            Strip For Parts
                          </Btn>
                        )}
                      </>
                    }
                  />
                );
              })}
            </div>
          )}
        </Panel>

        {/* -- The pack ---------------------------------------------------- */}
        <Panel
          title={selected ? `${selected.name}'s pack` : 'Pack'}
          aside={selected ? `${packUsed}/${selected.backpackSlots}` : '—'}
        >
          {!selected ? (
            <Empty>Select a crew member to see what they are carrying.</Empty>
          ) : selected.backpack.length === 0 ? (
            <Empty>The pack is empty.</Empty>
          ) : (
            <div className="stack stack--tight" style={{ maxHeight: 520, overflowY: 'auto' }}>
              {selected.backpack.map((stack) => {
                const equippable = slotFor(stack.itemId) !== null;
                return (
                  <StackCard
                    key={stack.uid}
                    stack={stack}
                    actions={
                      <>
                        <Btn
                          wide
                          disabled={!holdUsable}
                          title={holdUsable ? undefined : 'There is no hold to stow it in.'}
                          onClick={() => store.stowInHold(selected.id, stack.uid)}
                        >
                          Stow
                        </Btn>
                        {equippable && (
                          <Btn
                            wide
                            tone="go"
                            onClick={() => store.equipStack(selected.id, stack.uid)}
                          >
                            Equip
                          </Btn>
                        )}
                      </>
                    }
                  />
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      {selected && (
        <Panel title="Carried on the person" flush>
          <div className="rows">
            {(['weapon', 'sidearm', 'armor', 'tool'] as const).map((slot) => {
              const stack = equippedStack(selected, slot, ship);
              const def = stack ? getItem(stack.itemId) : undefined;
              return (
                <Row
                  key={slot}
                  title={
                    <span>
                      <span className="label">{titleCase(slot)}</span>{' '}
                      {def ? def.name : <span className="faint">Empty</span>}
                    </span>
                  }
                  sub={
                    stack
                      ? `${conditionLabel(stack.condition)} · ${Math.round(stack.condition)}%`
                      : 'Nothing equipped in this slot.'
                  }
                  right={
                    stack ? (
                      <Btn tone="ghost" onClick={() => store.unequipSlot(selected.id, slot)}>
                        Unequip
                      </Btn>
                    ) : undefined
                  }
                />
              );
            })}
          </div>
        </Panel>
      )}
    </div>
  );
}

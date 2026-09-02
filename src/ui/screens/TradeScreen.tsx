/**
 * Trade.
 *
 * Two jobs: bulk resupply before a long leg, and picking over the merchant's
 * stock item by item. Evaluation is what the player is really buying here — the
 * deal read is shown on every line, because that is the whole point of the stat.
 */

import type { ReactNode } from 'react';
import { useState } from 'react';
import { priceContext, resupplyUnitPrice, type ResupplyKind } from '../../engine/actions';
import {
  bandForMultiplier,
  buyPrice,
  dealQuality,
  dealRatio,
  sellPrice,
  DEAL_LABELS,
  SCARCITY_LABELS,
  type DealQuality,
  type ScarcityBand,
} from '../../engine/economy';
import { conditionLabel, getItem, itemName } from '../../engine/inventory';
import { estimateFuel } from '../../engine/ship';
import {
  crewMembers,
  daysOfFoodRemaining,
  foodConsumptionPerDay,
  foodProductionPerDay,
} from '../../engine/sim';
import { CHECK_OUTCOME_LABELS, type ItemStack } from '../../engine/types';
import { Btn, Chip, Duration, Empty, KV, Panel, Row, Sheet, Stepper } from '../components';
import { store, useGame } from '../useStore';

type ChipTone = 'amber' | 'green' | 'red' | 'cyan' | undefined;

function dealTone(quality: DealQuality): ChipTone {
  if (quality === 'excellent' || quality === 'good') return 'green';
  if (quality === 'fair') return undefined;
  if (quality === 'poor') return 'amber';
  return 'red';
}

function scarcityTone(band: ScarcityBand): ChipTone {
  if (band === 'surplus' || band === 'abundant') return 'green';
  if (band === 'normal') return undefined;
  if (band === 'scarce') return 'amber';
  return 'red';
}

function daysLabel(days: number): string {
  return Number.isFinite(days) ? `${Math.floor(days)}d` : 'stable';
}

export function TradeScreen() {
  const state = useGame();
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [amounts, setAmounts] = useState<Record<ResupplyKind, number>>({
    fuel: 20,
    food: 10,
    medicine: 4,
    repairParts: 10,
  });

  if (!state) {
    return <Empty>No run is loaded.</Empty>;
  }

  const trade = state.trade;
  const ctx = priceContext(state);
  const market = ctx?.location.market;

  if (!trade || !ctx || !market) {
    return (
      <Panel title="Market">
        <Empty>Nobody is trading at this berth.</Empty>
        <Btn block tone="ghost" onClick={() => store.closeTrade()}>
          Leave
        </Btn>
      </Panel>
    );
  }

  const location = ctx.location;
  const buying = trade.mode === 'buy';
  const crew = crewMembers(state);
  const ship = state.ship;
  const cargo: ItemStack[] = ship && !ship.destroyed ? ship.cargo : [];
  const listed: ItemStack[] = buying ? market.stock : cargo;

  const unitPriceOf = (stack: ItemStack): number =>
    buying
      ? buyPrice(stack.itemId, ctx, stack.condition, 1)
      : sellPrice(stack.itemId, ctx, stack.condition, 1);

  const selected = selectedUid ? listed.find((s) => s.uid === selectedUid) : undefined;

  const switchMode = (mode: 'buy' | 'sell'): void => {
    setSelectedUid(null);
    store.setTradeMode(mode);
  };

  const openStack = (stack: ItemStack): void => {
    setSelectedUid(stack.uid);
    setQty(1);
  };

  const setAmount = (kind: ResupplyKind, next: number): void => {
    setAmounts((previous) => {
      const updated: Record<ResupplyKind, number> = { ...previous };
      updated[kind] = next;
      return updated;
    });
  };

  const commit = (): void => {
    if (!selected) return;
    const take = Math.max(1, Math.min(qty, selected.qty));
    if (buying) store.buy(selected.uid, take);
    else store.sell(selected.uid, take);
    setSelectedUid(null);
  };

  // -- Resupply -------------------------------------------------------------

  const fuelNow = estimateFuel(ship, crew, state.resources.fuel);
  const fuelSpace = Math.max(0, Math.round(state.resources.fuelCapacity - state.resources.fuel));
  const foodPerDay = foodConsumptionPerDay(state) - foodProductionPerDay(state);
  const foodDaysNow = daysOfFoodRemaining(state);

  const resupplyRows: {
    kind: ResupplyKind;
    label: string;
    unit: string;
    max: number;
    impact: (amount: number) => ReactNode;
  }[] = [
    {
      kind: 'fuel',
      label: 'Fuel',
      unit: 'per unit',
      max: fuelSpace,
      impact: (amount) => {
        const after = estimateFuel(ship, crew, state.resources.fuel + amount);
        return (
          <>
            Range <Duration hours={fuelNow.hoursRemaining} /> → <Duration hours={after.hoursRemaining} />
            {' · '}
            {after.jumpsRemaining} jumps · tank {Math.round(state.resources.fuel)}/
            {Math.round(state.resources.fuelCapacity)}
          </>
        );
      },
    },
    {
      kind: 'food',
      label: 'Food',
      unit: 'per crew-day',
      max: 400,
      impact: (amount) => {
        const after = foodPerDay > 0 ? (state.resources.food + amount) / foodPerDay : Infinity;
        return (
          <>
            Days of food {daysLabel(foodDaysNow)} → {daysLabel(after)} · {crew.length} mouths,{' '}
            {foodPerDay.toFixed(1)} per day
          </>
        );
      },
    },
    {
      kind: 'medicine',
      label: 'Medicine',
      unit: 'per unit',
      max: 100,
      impact: (amount) => (
        <>
          Stores {Math.round(state.resources.medicine)} → {Math.round(state.resources.medicine) + amount}{' '}
          units. A serious wound takes one to three.
        </>
      ),
    },
    {
      kind: 'repairParts',
      label: 'Repair Parts',
      unit: 'per part',
      max: 400,
      impact: (amount) => (
        <>
          Stores {Math.round(state.resources.repairParts)} →{' '}
          {Math.round(state.resources.repairParts) + amount} parts.
        </>
      ),
    },
  ];

  const swing = Math.round(trade.priceModifier * 100);

  return (
    <div className="stack">
      <Panel title="Market" aside={location.name}>
        <p className="prose prose--dim">
          {location.subtitle}. Prices here move with what the place has and what it is short of.
        </p>
        <div className="btn-row" style={{ marginTop: 6 }}>
          <Btn wide tone={buying ? 'primary' : 'ghost'} onClick={() => switchMode('buy')}>
            Buy
          </Btn>
          <Btn wide tone={!buying ? 'primary' : 'ghost'} onClick={() => switchMode('sell')}>
            Sell
          </Btn>
        </div>
        <div className="divider" />
        <KV
          items={[
            ['Credits', Math.floor(state.resources.credits).toLocaleString()],
            ['Merchant', market.merchantAttitude >= 0 ? 'Amenable' : 'Cool'],
            [
              'Terms',
              trade.negotiated
                ? swing > 0
                  ? `Improved ${swing}%`
                  : swing < 0
                    ? `Worse by ${Math.abs(swing)}%`
                    : 'Unchanged'
                : 'Not discussed',
            ],
          ]}
        />
        {trade.negotiated && trade.lastCheck && (
          <p className="tiny faint" style={{ marginTop: 4 }}>
            Negotiation: {CHECK_OUTCOME_LABELS[trade.lastCheck.outcome]}. That swing is already in
            every price below.
          </p>
        )}
        <Btn
          block
          onClick={() => store.negotiateTrade()}
          disabled={trade.negotiated}
          sub={trade.negotiated ? 'You only get one run at the terms' : 'Costs about an hour'}
        >
          Negotiate
        </Btn>
      </Panel>

      <Panel title="Resupply" aside="bulk">
        <p className="prose prose--dim">
          Top up before a long leg, captain. This is bought by the unit and goes straight into the
          tanks and stores rather than the hold.
        </p>
        {resupplyRows.map((row) => {
          const unit = resupplyUnitPrice(state, row.kind);
          const amount = Math.max(0, Math.min(row.max, amounts[row.kind]));
          const cost = unit * amount;
          const affordable = cost > 0 && cost <= state.resources.credits;
          return (
            <div key={row.kind} className="panel panel--inset" style={{ marginTop: 6 }}>
              <div className="panel__body panel__body--tight">
                <div className="split">
                  <span className="value">{row.label}</span>
                  <span className="tiny">
                    {unit > 0 ? `${unit} cr ${row.unit}` : 'not sold here'}
                  </span>
                </div>
                <Stepper
                  value={amount}
                  min={0}
                  max={row.max}
                  step={row.kind === 'medicine' ? 1 : 5}
                  onChange={(next) => setAmount(row.kind, next)}
                  label="Amount"
                />
                <p className="tiny" style={{ marginTop: 2 }}>
                  {row.impact(amount)}
                </p>
                <Btn
                  block
                  tone="go"
                  disabled={unit <= 0 || amount <= 0 || !affordable}
                  onClick={() => store.resupplyResource(row.kind, amount)}
                  sub={
                    amount <= 0
                      ? 'Choose an amount'
                      : !affordable
                        ? `You have ${Math.floor(state.resources.credits)} credits`
                        : 'Loading takes about half an hour'
                  }
                >
                  Buy {amount} — {cost} cr
                </Btn>
              </div>
            </div>
          );
        })}
      </Panel>

      <Panel title={buying ? 'On offer' : 'Your hold'} aside={`${listed.length} lines`}>
        {listed.length === 0 ? (
          <Empty>
            {buying
              ? 'The shelves are bare. Come back when they have restocked.'
              : 'There is nothing in the hold worth putting in front of them.'}
          </Empty>
        ) : (
          <div className="rows">
            {listed.map((stack) => {
              const unit = unitPriceOf(stack);
              const quality = dealQuality(dealRatio(stack.itemId, unit, buying), buying);
              const band = bandForMultiplier(market.scarcity[stack.itemId] ?? 1);
              return (
                <Row
                  key={stack.uid}
                  onClick={() => openStack(stack)}
                  selected={stack.uid === selectedUid}
                  title={itemName(stack.itemId)}
                  sub={
                    <span>
                      {conditionLabel(stack.condition)} ·{' '}
                      {buying ? `${stack.qty} in stock` : `${stack.qty} in the hold`}
                    </span>
                  }
                  right={
                    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 3 }}>
                      <span className="value">{unit} cr</span>
                      <span className="chips" style={{ justifyContent: 'flex-end' }}>
                        <Chip tone={dealTone(quality)}>{DEAL_LABELS[quality]}</Chip>
                      </span>
                      <span className="chips" style={{ justifyContent: 'flex-end' }}>
                        <Chip tone={scarcityTone(band)}>{SCARCITY_LABELS[band]}</Chip>
                      </span>
                    </span>
                  }
                />
              );
            })}
          </div>
        )}
        <p className="tiny faint" style={{ marginTop: 6 }}>
          The deal read compares the asking price against what the item is actually worth. How sharp
          that read is depends on the Evaluation of whoever is standing at the counter.
        </p>
      </Panel>

      <Btn block tone="ghost" onClick={() => store.closeTrade()}>
        Leave the market
      </Btn>

      <Sheet
        open={Boolean(selected)}
        onClose={() => setSelectedUid(null)}
        title={selected ? itemName(selected.itemId) : 'Deal'}
      >
        {selected ? (
          <TradeDeal
            stack={selected}
            unit={unitPriceOf(selected)}
            buying={buying}
            scarcity={market.scarcity[selected.itemId] ?? 1}
            credits={state.resources.credits}
            qty={qty}
            onQty={setQty}
            onConfirm={commit}
          />
        ) : (
          <Empty>That line is gone.</Empty>
        )}
      </Sheet>
    </div>
  );
}

function TradeDeal({
  stack,
  unit,
  buying,
  scarcity,
  credits,
  qty,
  onQty,
  onConfirm,
}: {
  stack: ItemStack;
  unit: number;
  buying: boolean;
  scarcity: number;
  credits: number;
  qty: number;
  onQty: (next: number) => void;
  onConfirm: () => void;
}) {
  const def = getItem(stack.itemId);
  const quality = dealQuality(dealRatio(stack.itemId, unit, buying), buying);
  const band = bandForMultiplier(scarcity);
  const take = Math.max(1, Math.min(qty, stack.qty));
  const total = unit * take;
  const affordable = !buying || total <= credits;

  return (
    <div className="stack">
      {def && <p className="prose prose--dim">{def.description}</p>}
      <KV
        items={[
          ['Condition', `${conditionLabel(stack.condition)} (${Math.round(stack.condition)})`],
          ['Available', stack.qty],
          ['Unit price', `${unit} cr`],
          ['Deal', DEAL_LABELS[quality]],
          ['Local supply', SCARCITY_LABELS[band]],
          ['Base value', `${def?.basePrice ?? 0} cr`],
        ]}
      />
      <div className="chips">
        <Chip tone={dealTone(quality)}>{DEAL_LABELS[quality]}</Chip>
        <Chip tone={scarcityTone(band)}>{SCARCITY_LABELS[band]}</Chip>
      </div>
      <Stepper value={take} min={1} max={stack.qty} onChange={onQty} label="Quantity" />
      <div className="split">
        <span className="label">Total</span>
        <span className="value">{total} cr</span>
      </div>
      <Btn
        block
        tone={buying ? 'primary' : 'go'}
        disabled={!affordable}
        onClick={onConfirm}
        sub={
          affordable
            ? buying
              ? 'Goes into the hold'
              : 'Paid on the spot'
            : `You have ${Math.floor(credits)} credits`
        }
      >
        {buying ? 'Buy' : 'Sell'} {take}
      </Btn>
    </div>
  );
}

# Race to Face the New Frontier — V1

A character-driven 2D space-survival RPG. Mobile-first, offline, no backend.

You inherit a worn ship on a homeworld with two separate extinction clocks
running. You do not know which one finishes first. Every day you stay is a day
you can use, and a day that might kill the run.

```bash
npm install
npm run dev
```

Then open the address Vite prints. Portrait phone layout is authoritative;
desktop expands the same hierarchy.

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Typecheck, then production build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run typecheck` | TypeScript only |
| `npm test` | Engine test suite |

## Where things live

```
src/
  engine/      All mechanics. The engine owns every outcome.
    tuning.ts     EVERY provisional constant, in one file
    types.ts      The domain contract
    check.ts      The universal d100 check system
    wounds.ts     Health, wounds, treatment
    combat.ts     Action-meter combat
    captain.ts    The autonomous base ship
    simulate.ts   Headless campaign driver / playtest harness
    engine.test.ts
  content/     Pure data. No logic.
    events/       195 authored events across nine scopes
    items.ts      93 items
    siteArchetypes*.ts, encounters.ts, lifepaths.ts, traits.ts
  state/       The store the UI talks to
  persistence/ Save layer (IndexedDB → localStorage → memory)
  ui/          Screens and components. Renders state, dispatches actions.
```

Two rules hold the codebase together:

1. **The engine owns mechanics.** A screen reads state and dispatches an
   action. It never computes an outcome.
2. **Numbers live in `tuning.ts`.** No magic numbers in components, and no
   gameplay constant defined twice.

## Tuning

`src/engine/tuning.ts` is the whole balance surface — the homeworld clock,
check modifiers and outcome bands, wound thresholds, armor behaviour, fuel and
food rates, morale and stress, XP costs, market multipliers, and starting
generation. Change a value there and it propagates everywhere.

The Debug Inspector (More → Debug Inspector) exposes the full tuning dump, the
check inspector showing every roll and modifier, hidden truth (the real terminal
day, real hidden traits), and a simulation harness that plays batches of
headless runs so balance questions can be answered without playing fifty games
by hand.

## Determinism

Every run has a seed. World, protagonist, ship, family, route, moon economies
and site layouts are pure functions of it. Live rolls run off a separate stream
whose cursor is persisted, so a loaded save continues the same sequence.

## What V1 is for

> Build the game so we can discover what is wrong with the game.

See `PLAYTEST.md` for measured baseline numbers and the constants most likely to
need changing first.

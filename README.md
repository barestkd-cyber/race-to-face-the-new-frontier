# Race to Face the New Frontier — V1

A character-driven 2D space-survival RPG. Mobile-first, offline, no backend.

You inherit a worn ship on a homeworld with two separate extinction clocks
running. You do not know which one finishes first. Every day you stay is a day
you can use, and a day that might kill the run.

**Play it now:** <https://barestkd-cyber.github.io/race-to-face-the-new-frontier/>

Or run it yourself:

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
| `npm run build:single` | One self-contained HTML file, no server needed |

## Where things live

```
src/
  engine/      All mechanics. The engine owns every outcome.
    tuning.ts     EVERY provisional constant, in one file
    types.ts      The domain contract
    check.ts      The universal d100 check system
    places.ts     The walkable world inside a location
    access.ts     What you may physically do from where you stand
    situation.ts  What matters right now, said in sentences
    lifeStory.ts  The captain's generated life: age, trade, two events
    personality.ts  The one personality system: roll, reactions, visibility
    tags.ts       Semantic tags — how the world tells personality what happened
    command.ts    Captain, crew lead, who holds the ship, and succession
    advice.ts     Who is best at a job, and what is wrong with them
    development.ts  One development decision instead of twenty +1 taps
    study.ts      Knowledge specialization, earned in hours
    wounds.ts     Health, wounds, treatment
    combat.ts     Action-meter combat
    captain.ts    The autonomous base ship
    assess.ts     Imperfect information — what a character can tell
    glossary.ts   Plain-language gloss for every attribute and skill
    simulate.ts   Headless campaign driver / playtest harness
    engine.test.ts
  content/     Pure data. No logic.
    events/       195 authored events across nine scopes
    items.ts      93 items
    names.ts      3,600 names, split by sex, plus alien pools
    professions.ts  250 working lives, for the captain
    lifeEvents.ts   500 influential events, 175/175/150 good/bad/mixed
    personality.ts  247 canonical traits, each with its own mechanics
    siteArchetypes*.ts, encounters.ts, lifepaths.ts, traits.ts
  state/       The store the UI talks to
  persistence/ Save layer (IndexedDB → localStorage → memory)
  ui/          Screens and components. Renders state, dispatches actions.
docs/          The hosted build, served by GitHub Pages
public/        Files served as-is, including the opening video
```

Four rules hold this together. The first two are about code, the last two are
about design, and breaking either pair shows up immediately in play.

1. **The engine owns mechanics.** A screen reads state and dispatches an
   action. It never computes an outcome.
2. **Numbers live in `tuning.ts`.** No magic numbers in components, and no
   gameplay constant defined twice.
3. **Information may be global; actions require physical access.** You can read
   your ship's condition from anywhere. Repairing it, or taking a rifle out of
   the hold, means being at the ship. Enforced in `access.ts`, asked by every
   screen, so there is one answer rather than a per-button opinion.
4. **Actions are reached by going somewhere.** There is no global Trade or
   Recruit. A location contains places, and a place contains what it plausibly
   contains: you recruit at a shelter because that is where people are, and you
   offer a relative passage by standing where they actually are.

And one rule about what reaches the player:

5. **The captain is the protagonist, and stays captain until they die.** The
   chair is not a role you hand to whichever recruit rolled better numbers —
   everything the captain is and has done has to keep mattering. It moves once,
   when the person in it dies, and the successor keeps the character they
   already are. The crew lead is the one reassignable command post, and the
   reason an away party never leaves the ship to run itself: captain out, crew
   lead aboard; crew lead out, captain aboard; both out only where the berth is
   covered. See `command.ts`.
6. **The player develops the protagonist. The simulation develops the crew.**
   Directed advancement belongs to the captain. Everyone else spends their own
   experience on themselves, in whatever direction their work has taken them.
   The player still steers it by deciding who studies, who goes out, and what
   they do when they get there.
7. **Remove chores, preserve decisions.** If the game already knows the answer,
   it does not ask — a party with only one possible composition fills itself, a
   forced leader is the captain, and gear the crew obviously wants is one
   button. If a number has a threshold that changes what a player should do,
   the game says the sentence rather than making them watch the number.
   `situation.ts` is the shape of that: it reads the simulation and speaks.
   None of it removes agency, and none of it plays a turn for the player.

## One personality system

Every character rolls one to seven traits from `content/personality.ts` and
nothing else. Each of those 247 traits carries its own favoured tags, opposed
tags, intensity and rule, straight from the Part IV matrix. Nothing translates
a trait into a shared behaviour class before it resolves — Brave, Fearless,
Steady Under Fire and Protective Courage all care about danger and all four
come out differently.

The join between personality and the world is semantic tags. `tags.ts` reads
tags off what a choice actually does — a choice that wounds somebody is
`danger` and `physical_risk`, one that pays is `wealth` — so every authored
event reaches personality without a trait name appearing anywhere in content,
and without an event id appearing anywhere in personality code. Content can add
its own tags on a choice for the things structure cannot see.

Six channels, and no trait uses all of them: morale, stress, autonomous option
weighting, relationship reactions, player-choice friction, and how long a
reaction lasts. Personality never chooses for the player; it says what a choice
will cost the captain, and four traits and only four can refuse outright.

Visibility is separate from mechanics. The captain knows all of theirs, family
are mostly known, a stranger's are hidden — and hidden traits still work.

## One answer per question

Three screens used to describe the same ship three different ways. Anything
the player might reconcile in their head belongs in one function that every
screen calls:

- `flightReadiness(ship)` — can she fly, in the same condition words the Ship
  screen and the cockpit both print. The permission itself is still `isFlyable`.
- `walkEstimateHours(state, place)` — the time on the travel card is the time
  the clock charges, because `walkTo` asks the same function.
- `treatmentFacility(state)` — the room the treatment actually happens in,
  whether that is a med bay aboard or the clinic you are standing in.
- `recommend(pool, skill)` — who is best at this, and what is wrong with them.

## Two axes that are easy to confuse

**Potential** is how far a raw skill can ever be trained — C caps at 70, B at
85, A at 100, fixed for life.

**Knowledge specialization** is how deeply the skill has been studied, and it
multiplies what that training delivers without touching the cap. A raw 70 at
×1.20 performs at 84. It is earned in study hours, in a room, by somebody who
could have been doing something else — the one part of a person that grows by
deliberate will rather than dice.

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
need changing first, and `DEFERRED.md` for systems deliberately left unbuilt.

The build is now past broad design passes. Development is owner-led manual
auditing: play from the beginning, stop at anything wrong or confusing, fix
that specific thing, resume. Short cycles, no speculative redesign.

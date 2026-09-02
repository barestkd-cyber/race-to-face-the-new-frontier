# Playtest notes — V1 baseline

What the build actually does right now, measured rather than guessed, plus the
constants most likely to need changing first.

Everything here is reproducible: **More → Debug Inspector → Run Simulation
Batch** plays headless campaigns and prints the same numbers. `npm test` runs
the same harness as a regression suite.

---

## 1. The headline finding

**Difficulty is dominated by how carefully the player reads events, not by
combat.**

This was not obvious and it took a wrong turn to find. An early harness picked
event options at random and reported an 8% win rate, which pointed at combat
being too lethal. It was not. Only ~3.5 fights happen per run, and the two most
common encounters are the two safest ones. But ~17 events fire per run, and a
chooser that walks into every reckless branch bleeds crew steadily.

Teaching the harness to choose the way a person does — prefer checks the crew
can actually pass, weigh the downside, do not gamble with wounded people —
moved the win rate from **8% to 33%** with no change to the game.

That is a good property. Choices matter more than stats, which is what the
design is for. It also means playtest feedback about difficulty should always
be read alongside *how* the person was playing.

---

## 2. Measured baseline

40 headless runs per playstyle, current tuning — **you start alone**:

| Playstyle | Victory | Death | Avg days | Locations | Hires |
| --- | --- | --- | --- | --- | --- |
| **Balanced** (treat wounds, resupply, hire, push on) | **25%** | 70% | 98 | 3.0 / 7 | 3.3 |
| **Explore** (grind every location) | 8% | 90% | 72 | 3.0 / 7 | 2.1 |
| **Rush** (beeline, never recruits) | 3% | 98% | 36 | 2.1 / 7 | 0.0 |

Two shapes worth noting. Lingering is punished — the homeworld clock should make
"one more day" a real gamble. And **beelining alone is close to impossible**:
the rush bot never hires anyone and wins 3% of the time. Since the player starts
solo, recruiting is not an optional system, it is the first objective.

### Combat, by encounter

12 isolated fights each, played with crude tactics by a starting crew.

| Encounter | Survival | Wipes | Avg actions |
| --- | --- | --- | --- |
| `enc_scavenger_pair` | 100% | 0/12 | 45 |
| `enc_hull_vermin` | 100% | 0/12 | 61 |
| `enc_desperate_looters` | 100% | 0/12 | 79 |
| `enc_maintenance_drones` | 96% | 0/12 | 71 |
| `enc_hostile_fauna` | 94% | 0/12 | 66 |
| `enc_mutinous_workers` | 90% | 0/12 | 75 |
| `enc_scavenger_gang` | 80% | 0/12 | 70 |
| `enc_rogue_drone` | 68% | 2/12 | 26 |
| `enc_derelict_squatters` | 58% | 0/12 | 49 |
| `enc_smuggler_ambush` | 57% | 1/12 | 23 |
| `enc_security_patrol` | 54% | 0/12 | 44 |
| `enc_pirate_boarders` | 54% | 1/12 | 35 |
| `enc_claim_jumpers` | 47% | 3/12 | 29 |
| `enc_pirate_raiders` | 35% | 4/12 | 10 |
| `enc_lone_gunman` | 20% | 7/12 | 5 |

Note the action counts. Hard fights end fast because someone dies. Easy fights
drag because an untrained crew genuinely cannot fight — Skill 0 is near-zero
capability by design, so a couple of people with no combat training take a long
time to kill five rats. That is coherent, but "the easy fights are boring" is a
fair criticism and worth watching.

Those numbers were measured with a multi-person crew. Solo, every fight is
harder, which is the point of hiring.

---

## 3. Deviations from the spec, and why

Flagged in `tuning.ts` at each constant.

### Fuel pricing and tank capacity — **changed**

The spec suggested ~10 credits of fuel per travel hour. With legs measured in
days that priced a single leg at 1,300–3,400 credits against a starting purse of
380–2,200, and put a full Small tank at **four days of range when the first leg
is three to six days**. No leg was completable.

Now `baseUnitsPerHour` 1.25 → 0.32, `creditsPerUnit` 8 → 5, Small tank 140 →
180. A full tank covers ~19 days and the final leg costs ~550 credits of fuel.
**Raise `creditsPerUnit` back toward 8** once income is tuned; that is the dial
for making fuel bite.

### The wound lifecycle — **fixed**

`healHours` only counted down on *treated* wounds, so an untreated scratch was
permanent, accrued infection forever, and past 60 infection re-armed bleeding
at a rate that never decayed — about 22 health per day, indefinitely. Crews
arrived at every fight already dying, and `enc_hull_vermin` (100% survival in
isolation) was wiping parties.

Now bleeding clots (mortal wounds excepted, which keep their deadline),
untreated wounds close slowly and badly, and infection drains health on a
visible clock that recedes with food and rest.

### Starting loadout — **fixed**

Equipment slots started empty, so crew fought bare-fisted against rifles with a
pistol sitting in the hold. Auto-equip now runs at game start, on recruitment,
and from **Crew → Equip Crew From Hold** — and it weighs a weapon by the
*character's skill with it*, because a knife in untrained hands is worse than
their own fists.

### Starting crew → **exactly 1, always**

Owner decision, and the right one. Safe capacity is never below 1, so a solo
start is **never in violation on any hull** — measured across 400 generated
starts, 100% now begin at or under capacity. Every additional body is then a
choice made against a cost the crew screen shows you.

An earlier attempt at 3–4 crew (mine, to buy survivability) put **60% of runs
over capacity at hour zero**, which was worse than the problem it solved.

### Recruitment — **retuned, and this is the interesting one**

Starting alone did not make the game harder so much as it *exposed* that
recruitment was already undertuned. Three spare crew had been hiding it. Over
120 Homeworld searches:

| | Before | After |
| --- | --- | --- |
| Candidates per search | 1.53 | **2.17** |
| Avg starting willingness | 39 | **55** |
| Join threshold | 70 | **60** |
| Conversion | 19% | **47%** |
| **Hires per search** | **0.29** | **1.02** |

The old gap was arithmetic: candidates started 31 points below the threshold,
and three maxed persuasion attempts average about +33. You needed near-perfect
rolls just to *reach* the bar, so hiring was luck rather than a plan. Only 18 of
40 runs ever recruited anyone; 21 died still alone.

Three changes together (`baseWillingness` 18–62 → 35–75, `joinThreshold` 70 →
60, and a fatter `candidateCountWeights` distribution) took the balanced win
rate from 5% back to 25% with the solo start intact. Money was never the
obstacle — zero candidates had unaffordable terms in either sample.

### Encounter size now scales with the party

A swarm template could field eight bodies. Against a small party that is not a
hard fight, it is a long one — and crew size swings from one to six over a
campaign.

---

## 4. What to tune first

1. **`RECRUIT` as a whole, now that it is load-bearing.** Just retuned to roughly
   one hire per search. Since the player starts alone, this single system gates
   Group Missions, the autonomous base ship, and any redundancy against a bad
   encounter. If it feels too generous or still too slow, it is the
   highest-leverage thing in the file.
2. **`WOUNDS.healthLoss`** (11 / 25 / 40 / 58). Already compressed once: at
   minor = 6 a knife fight took sixty exchanges. The top end is what makes
   `enc_lone_gunman` a 20% survival proposition. This is the main lever on
   "combat too lethal".
3. **`CHECK.minTarget` = 5 and Skill 0.** The spec locks Skill 0 as near-zero
   capability, which is why untrained crew flail. Correct in principle, but it
   is what makes low-tier fights drag. Consider whether an *Assisted* or
   *Improvised* context should grant a floor above 5.
4. **`HOMEWORLD_CLOCK` band weights.** Terminal days observed from 7 to 48. A
   day-7 roll removes the entire Homeworld phase the opening is built around,
   which now also means no time to hire anyone. The 10% weight on the 7–13 band
   may be too punishing for a first run.
5. **`FUEL.creditsPerUnit` = 5.** Deliberately below the spec anchor to make the
   route affordable. Push it up once income is tuned.
6. **`TRAVEL.meaningfulEventsPerDay` = 0.55.** "Travel interrupts too often" is
   an explicit success criterion; this is the dial.
7. **Event wound severities in content.** Authors were given 21–95 with 81–95 as
   mortal. Events are where most casualties actually come from, so this table is
   worth a pass with fresh eyes.

---

## 5. Known gaps

- **Combat does not resume across a save.** Loading mid-fight returns you to the
  cockpit with the fight abandoned. Deliberate — the state surface was not worth
  it for V1.
- **The shipless path is thin.** Losing the base ship while a party survives
  correctly continues the run and sets a `shipless` flag, but there is no
  authored content for acquiring a replacement hull, so the route cannot be
  finished from there.
- **Mission vessels and hangars** are modelled (`canCarryMissionVessel`) but no
  V1 ship is large enough to use one.
- **AI narration is not wired up.** All prose is authored or templated and the
  game is fully playable offline, which was the requirement.
- **Crew Missions** resolve as one abstract check rather than a nested
  ship-scale sequence.
- **Family can be brought aboard but not otherwise helped.** Passage and visits
  work; there is no content for evacuating them any other way.

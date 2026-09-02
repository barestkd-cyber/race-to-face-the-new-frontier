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

40 headless runs per playstyle, current tuning:

| Playstyle | Victory | Death | Avg days | Locations | Fights |
| --- | --- | --- | --- | --- | --- |
| **Balanced** (treat wounds, resupply, hire, push on) | **33%** | 63% | 108 | 3.3 / 7 | 3.5 |
| **Rush** (beeline, minimal upkeep) | 36% | 60% | 84 | 3.6 / 7 | 3.5 |
| **Explore** (grind every location) | 8% | 80% | 153 | 3.6 / 7 | 4.2 |

Lingering is punished, which is the intended shape: the homeworld clock should
make "one more day" a real gamble.

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
capability by design, so two people with no combat training take a long time to
kill five rats. That is coherent, but "the easy fights are boring" is a fair
criticism and worth watching.

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

### Starting crew 2–3 → **3–4**

Two people could not absorb one bad encounter, and a Group Mission needs two
while somebody stays with the ship. This can start you over safe Quarters
capacity on a poor hull, which is a real cost rather than an oversight.

### Encounter size now scales with the party

A swarm template could field eight bodies. Against two people that is not a hard
fight, it is a long one — and crew size swings from two to six over a campaign.

---

## 4. What to tune first

1. **`WOUNDS.healthLoss`** (11 / 25 / 40 / 58). Already compressed once: at
   minor = 6 a knife fight took sixty exchanges. The top end is what makes
   `enc_lone_gunman` a 20% survival proposition. This is the main lever on
   "combat too lethal".
2. **`CHECK.minTarget` = 5 and Skill 0.** The spec locks Skill 0 as near-zero
   capability, which is why untrained crew flail. Correct in principle, but it
   is what makes low-tier fights drag. Consider whether an *Assisted* or
   *Improvised* context should grant a floor above 5.
3. **`HOMEWORLD_CLOCK` band weights.** Terminal days observed from 7 to 48. A
   day-7 roll removes the entire Homeworld phase the opening is built around.
   The 10% weight on the 7–13 band may be too punishing for a first run.
4. **`FUEL.creditsPerUnit` = 5.** Deliberately below the spec anchor to make the
   route affordable. Push it up once income is tuned.
5. **`TRAVEL.meaningfulEventsPerDay` = 0.55.** "Travel interrupts too often" is
   an explicit success criterion; this is the dial.
6. **`RECRUIT.joinThreshold` = 70.** Recruitment is the main answer to
   attrition, so how hard it is to hire is load-bearing.
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

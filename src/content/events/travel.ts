/**
 * Travel events — things that happen in transit between locations.
 *
 * Pure data. Routine events auto-resolve into the log; everything else
 * interrupts the leg and asks the captain for a decision.
 */

import type { GameEventDef } from '../../engine/types';

export const TRAVEL_EVENTS: GameEventDef[] = [
  // -------------------------------------------------------------------------
  // Routine — auto-resolve, no interruption
  // -------------------------------------------------------------------------
  {
    id: 'trv-coolant-weep',
    scope: ['travel'],
    title: 'Coolant Weep',
    body: 'A bead of coolant forms on the number two junction every few minutes and boils off before it reaches the deck. It is not an emergency today. It will be one in a week.',
    weight: 12,
    routine: true,
    conditions: { requiresShip: true },
    tags: ['maintenance', 'engineering'],
    choices: [
      {
        id: 'seal-it',
        label: 'Seal it on the watch',
        hint: 'One hour, a little stock',
        effects: { hours: 1 },
        result: {
          text: 'A fresh gasket, a wrap of sealing tape, and the drip stops. The junction is logged for a proper fix later.',
          effects: {
            repairParts: -1,
            systems: { engines: 2 },
            crewXp: 3,
            log: 'Coolant junction resealed during the watch.',
          },
        },
      },
      {
        id: 'log-it',
        label: 'Log it and move on',
        hint: 'Free now, worse later',
        result: {
          text: 'The drip keeps its slow rhythm. Within a day nobody notices it any more, which is the actual problem.',
          effects: { systems: { engines: -3 }, log: 'Coolant weep left unrepaired.' },
        },
      },
    ],
  },

  {
    id: 'trv-watch-rotation-drift',
    scope: ['travel'],
    title: 'The Watch Has Drifted',
    body: 'Two people are sleeping through the same hours and nobody is on the bridge between third and fourth watch. It has been that way for three days and no one wanted to be the one to say it.',
    weight: 11,
    routine: true,
    conditions: { minCrew: 3 },
    tags: ['crew', 'routine-order'],
    choices: [
      {
        id: 'rewrite-board',
        label: 'Rewrite the watch board',
        hint: 'Half an hour, some grumbling',
        effects: { hours: 0.5 },
        result: {
          text: 'You redraw the rotation on the galley board. Two people lose their good hours and say so, loudly, then go stand their watch.',
          effects: { morale: -2, crewStress: -3, crewXp: 2, log: 'Watch rotation rebalanced.' },
        },
      },
      {
        id: 'leave-it',
        label: 'Leave them to sort it out',
        hint: 'Costs nothing but sleep',
        result: {
          text: 'They sort it out badly. The gap gets covered by whoever is most tired, and everyone is a little worse for it.',
          effects: { crewStress: 4, morale: -1, log: 'Watch gaps covered informally.' },
        },
      },
    ],
  },

  {
    id: 'trv-galley-argument',
    scope: ['travel'],
    title: 'Galley Argument',
    body: 'Voices in the galley, then the flat sound of a cup set down too hard. It is about who ate whose portion, which means it is about something else. Nobody has thrown anything.',
    weight: 12,
    routine: true,
    conditions: { minCrew: 3 },
    tags: ['crew', 'friction'],
    choices: [
      {
        id: 'step-in',
        label: 'Step in early',
        hint: 'Half an hour of your time',
        effects: { hours: 0.5 },
        result: {
          text: 'You stand in the hatch until both of them run out of things to say. They mutter apologies at the floor and go back to work.',
          effects: { morale: 2, crewStress: -2, personalXp: 6, log: 'Galley argument defused.' },
        },
      },
      {
        id: 'let-it-burn',
        label: 'Let them finish it themselves',
        hint: 'They will, one way or another',
        result: {
          text: 'It ends on its own, colder than it started. The two of them work opposite watches for a while.',
          effects: { morale: -3, crewStress: 3, log: 'Galley argument left to burn out.' },
        },
      },
    ],
  },

  {
    id: 'trv-gunnery-drill',
    scope: ['travel'],
    title: 'Gunnery Drill',
    body: 'The turret cycle test is overdue and the empty hours between waypoints are the only time to run it. Dry-firing the mount eats power and wakes anyone sleeping aft.',
    weight: 9,
    routine: true,
    conditions: { requiresShip: true },
    tags: ['drill', 'ship-weapons'],
    choices: [
      {
        id: 'run-drill',
        label: 'Run the drill',
        hint: 'Two hours, some power',
        effects: { hours: 2 },
        result: {
          text: 'Three cycles, two jams, one clean run. The mount tracks better by the end and the gunner stops flinching at the recoil clang.',
          effects: {
            systems: { power: -2, shields: 1 },
            crewXp: 8,
            personalXp: 10,
            crewStress: 2,
            log: 'Gunnery drill completed.',
          },
        },
      },
      {
        id: 'skip-drill',
        label: 'Skip it, let them sleep',
        hint: 'Rest now, rust later',
        result: {
          text: 'The turret stays cold. The off-watch gets four uninterrupted hours, which they clearly needed.',
          effects: { crewStress: -3, morale: 1, log: 'Gunnery drill postponed.' },
        },
      },
    ],
  },

  {
    id: 'trv-cargo-shift',
    scope: ['travel'],
    title: 'Something Moved in the Hold',
    body: 'A dull thump from the cargo bay during a course correction. A strap has gone slack and a crate has walked half a metre out of its block. Nothing is broken yet.',
    weight: 11,
    routine: true,
    conditions: { requiresShip: true },
    tags: ['cargo', 'maintenance'],
    choices: [
      {
        id: 'restow',
        label: 'Restow the bay properly',
        hint: 'Two hours of hard work',
        effects: { hours: 2 },
        result: {
          text: 'Everything comes off the deck, gets blocked, and goes back down under fresh straps. Slow, dull, and correct.',
          effects: { crewStress: 3, crewXp: 4, log: 'Cargo bay restowed and secured.' },
        },
      },
      {
        id: 'tighten-strap',
        label: 'Just tighten the strap',
        hint: 'Ten minutes',
        result: {
          text: 'The strap goes tight and the crate stops walking. The next hard burn will find whatever else is loose down there.',
          effects: { hull: -1, log: 'Loose cargo strap retensioned.' },
        },
      },
    ],
  },

  {
    id: 'trv-improvised-meal',
    scope: ['travel'],
    title: 'Something Better Than Rations',
    body: 'Someone found a way to make the protein blocks taste like anything at all, and is asking whether it is worth burning an hour of galley power to do it for everyone.',
    weight: 10,
    routine: true,
    conditions: { minCrew: 2 },
    tags: ['galley', 'morale'],
    choices: [
      {
        id: 'let-them-cook',
        label: 'Let them cook',
        hint: 'One hour, a little extra food',
        effects: { hours: 1 },
        result: {
          text: 'It is not good, exactly, but it is hot and it is different, and people sit and eat together instead of taking trays to their bunks.',
          effects: {
            food: -1,
            systems: { power: -1 },
            morale: 5,
            crewStress: -4,
            personalXp: 8,
            log: 'A proper hot meal in the galley.',
          },
        },
      },
      {
        id: 'ration-discipline',
        label: 'Not while we are counting days',
        hint: 'Saves stores, costs goodwill',
        result: {
          text: 'You say no and give the honest reason. They nod, and everyone eats out of a foil pouch standing up.',
          effects: { morale: -3, log: 'Extra galley ration denied.' },
        },
      },
    ],
  },

  {
    id: 'trv-passing-hail',
    scope: ['travel'],
    title: 'Passing Hail',
    body: 'A bulk freighter crosses your track thirty thousand kilometres out and puts a lazy voice hail on the open channel. They want to know where you are from. They are not going to slow down either way.',
    weight: 12,
    routine: true,
    tags: ['contact', 'traffic'],
    choices: [
      {
        id: 'answer-hail',
        label: 'Answer them',
        hint: 'Twenty minutes of talk',
        effects: { hours: 0.5 },
        result: {
          text: 'You trade names, tonnage, and two pieces of route gossip. Their navigator mentions a debris drift you had not charted.',
          effects: { morale: 2, personalXp: 6, log: 'Traded route gossip with a passing freighter.' },
        },
      },
      {
        id: 'stay-dark',
        label: 'Stay quiet',
        hint: 'Nobody learns your name',
        result: {
          text: 'The channel stays open for a while, then closes. Whoever they were, they now know a ship that does not answer hails runs this lane.',
          effects: { morale: -1, log: 'Ignored a passing freighter hail.' },
        },
      },
    ],
  },

  {
    id: 'trv-condensate-loss',
    scope: ['travel'],
    title: 'Condensate Loss',
    body: 'The reclamation loop has been venting a little more than it recovers. It is within tolerance for an old ship, but the tally at the end of the week is a real number of missing litres.',
    weight: 10,
    routine: true,
    conditions: { requiresShip: true },
    tags: ['life-support', 'attrition'],
    choices: [
      {
        id: 'purge-and-reset',
        label: 'Purge and reset the loop',
        hint: 'Ninety minutes, small loss',
        effects: { hours: 1.5 },
        result: {
          text: 'The purge dumps what is in the line and the loop comes back within spec. The tally stops growing.',
          effects: {
            food: -1,
            systems: { lifeSupport: 3 },
            crewXp: 3,
            log: 'Reclamation loop purged and reset.',
          },
        },
      },
      {
        id: 'accept-loss',
        label: 'Accept the loss',
        hint: 'Keeps the hours',
        result: {
          text: 'You write the number down and keep flying. It is a small number. It will be a bigger one next week.',
          effects: { food: -2, systems: { lifeSupport: -2 }, log: 'Reclamation losses accepted this leg.' },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Technical failures
  // -------------------------------------------------------------------------
  {
    id: 'trv-fuel-line-hammer',
    scope: ['travel', 'technical'],
    title: 'Water Hammer in the Feed Line',
    body: 'A hard knock runs down the length of the ship every time the injectors cycle, and the pressure trace has a spike in it that should not be there. Left alone, the line will split. Fixing it properly means shutting down the mains and coasting.',
    weight: 10,
    conditions: { requiresShip: true },
    tags: ['breakdown', 'engineering'],
    choices: [
      {
        id: 'full-shutdown',
        label: 'Shut down and repack the line',
        hint: 'Six hours coasting, no thrust',
        effects: { hours: 6 },
        check: { skill: 'mechanicalEngineering', secondarySkill: 'electricalEngineering', participation: 'duo' },
        outcomes: {
          exceptional: {
            text: 'The line comes apart clean, the accumulator gets repacked, and the reassembly runs quieter than it has since you inherited the ship.',
            effects: { repairParts: -6, systems: { engines: 12, power: 4 }, fuel: 2, crewXp: 25, personalXp: 30 },
          },
          success: {
            text: 'The knock is gone. The accumulator bladder was hard as a stone and had been for years.',
            effects: { repairParts: -8, systems: { engines: 8 }, crewXp: 18, personalXp: 20 },
          },
          partial: {
            text: 'The hammer softens to a tick. It will hold, but the line wants a proper yard and a proper part.',
            effects: { repairParts: -8, systems: { engines: 3 }, crewStress: 4, crewXp: 10 },
          },
          failure: {
            text: 'Two hours in, a fitting strips and the repack turns into a rebuild with the wrong parts. You put it back together no better than you found it.',
            effects: { repairParts: -10, systems: { engines: -3 }, crewStress: 8, morale: -3 },
          },
          criticalFailure: {
            text: 'The line lets go while it is still pressurised. Hot fuel sprays the bay, someone gets caught across the forearm, and you lose most of a tank cleaning it up.',
            effects: {
              repairParts: -10,
              fuel: -8,
              systems: { engines: -10 },
              wound: { severityScore: 46, damageType: 'burn' },
              crewStress: 12,
              morale: -6,
            },
          },
        },
      },
      {
        id: 'clamp-and-throttle',
        label: 'Clamp it and throttle back',
        hint: 'Two hours, slower burn',
        effects: { hours: 2 },
        check: { skill: 'mechanicalEngineering', participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'A clamp, a shim, and a new throttle profile. The knock vanishes and you barely lose any speed for it.',
            effects: { repairParts: -2, systems: { engines: 4 }, fuel: -1, crewXp: 10, personalXp: 15 },
          },
          success: {
            text: 'The clamp holds the spike down. You fly the rest of the leg at reduced power and burn extra fuel for the trouble.',
            effects: { repairParts: -3, fuel: -3, systems: { engines: 1 }, crewXp: 8, personalXp: 10 },
          },
          partial: {
            text: 'The knock returns whenever you push the throttle. Everyone learns to fly gently.',
            effects: { repairParts: -3, fuel: -4, systems: { engines: -2 }, crewStress: 3 },
          },
          failure: {
            text: 'The clamp slips within the hour. You are back where you started and short the parts you spent.',
            effects: { repairParts: -4, systems: { engines: -5 }, crewStress: 5, morale: -2 },
          },
          criticalFailure: {
            text: 'The clamp bites the wrong side of the joint and cracks it. Fuel loss goes from an annoyance to a number you have to say out loud.',
            effects: { repairParts: -4, fuel: -10, systems: { engines: -12 }, crewStress: 10, morale: -5 },
          },
        },
      },
      {
        id: 'run-it',
        label: 'Run it and hope',
        hint: 'No time cost, real risk',
        result: {
          text: 'You keep the burn profile and let the ship knock. It holds. Something in the feed assembly is quietly getting worse the whole time.',
          effects: {
            systems: { engines: -8 },
            fuel: -4,
            crewStress: 6,
            morale: -3,
            log: 'Feed line hammer ignored; engine wear accumulating.',
          },
        },
      },
    ],
  },

  {
    id: 'trv-power-bus-fault',
    scope: ['travel', 'technical'],
    title: 'Bus Fault, Deck Two',
    body: 'Half of deck two drops into emergency lighting and the fault indicator will not stay latched. Somewhere behind a wall panel a bus bar is arcing against a bracket. The smell reaches the bridge before the alarm does.',
    weight: 9,
    conditions: { requiresShip: true },
    tags: ['breakdown', 'electrical'],
    choices: [
      {
        id: 'trace-and-rebuild',
        label: 'Kill the bus and trace it properly',
        hint: 'Four hours in the dark',
        effects: { hours: 4 },
        check: { skill: 'electricalEngineering', participation: 'individual', criticalRisk: true },
        outcomes: {
          exceptional: {
            text: 'The arc scar is found in twenty minutes and the rest of the time goes into re-dressing every run behind that panel. Deck two comes back brighter than before.',
            effects: { repairParts: -4, systems: { power: 14, lifeSupport: 4 }, personalXp: 35, crewXp: 12 },
          },
          success: {
            text: 'Bracket removed, bar re-insulated, panel closed. The lights come up and stay up.',
            effects: { repairParts: -5, systems: { power: 9 }, personalXp: 22, crewXp: 8 },
          },
          partial: {
            text: 'You find the arc but not what is chafing the run. The bus holds under half load and trips whenever the galley and the pumps come on together.',
            effects: { repairParts: -5, systems: { power: 3 }, crewStress: 5, personalXp: 12 },
          },
          failure: {
            text: 'Four hours of pulled panels and the fault moves every time you get close to it. Deck two stays on emergency lighting.',
            effects: { repairParts: -3, systems: { power: -4 }, crewStress: 8, morale: -3 },
          },
          criticalFailure: {
            text: 'The bus was not as dead as the panel claimed. The flash throws your engineer across the corridor and takes out a run of feeders on the way.',
            effects: {
              repairParts: -6,
              systems: { power: -14, lifeSupport: -6 },
              wound: { severityScore: 55, damageType: 'burn' },
              crewStress: 14,
              morale: -7,
            },
          },
        },
      },
      {
        id: 'isolate-deck',
        label: 'Isolate deck two and route around it',
        hint: 'One hour, live with the loss',
        effects: { hours: 1 },
        check: { skill: 'computers', secondarySkill: 'electricalEngineering', participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'You reroute so cleanly that only the affected compartment notices, and you tag the fault for the next yard with a diagnostic trace worth money.',
            effects: { systems: { power: 2 }, items: [{ itemId: 'data_core', qty: 1 }], personalXp: 20 },
          },
          success: {
            text: 'Deck two runs off the secondary ring at reduced draw. Cold showers and dim corridors, but nothing is burning.',
            effects: { systems: { power: -2 }, crewStress: 4, personalXp: 12 },
          },
          partial: {
            text: 'The reroute works and then browns out twice a shift. Nobody trusts a light switch for the rest of the leg.',
            effects: { systems: { power: -5 }, crewStress: 6, morale: -2, personalXp: 8 },
          },
          failure: {
            text: 'The isolation cuts the wrong segment and takes the aft heaters with it. Deck two is dark and cold now.',
            effects: { systems: { power: -8, lifeSupport: -4 }, crewStress: 8, morale: -4 },
          },
          criticalFailure: {
            text: 'The routing change stacks load onto an already-hot section. Something behind the wall lets go with a bang and the arc scar spreads.',
            effects: { systems: { power: -16, lifeSupport: -6 }, hull: -4, crewStress: 12, morale: -6 },
          },
        },
      },
      {
        id: 'pull-the-breaker',
        label: 'Pull the breaker and leave it until port',
        hint: 'Free, and everyone will feel it',
        result: {
          text: 'Deck two goes dark for the rest of the leg. Two crew move their bunks into the corridor and nobody sleeps well.',
          effects: {
            systems: { power: -4, lifeSupport: -3 },
            crewStress: 9,
            morale: -5,
            log: 'Deck two isolated and left dark for the remainder of the leg.',
          },
        },
      },
    ],
  },

  {
    id: 'trv-water-recycler-taint',
    scope: ['travel', 'technical'],
    title: 'Something in the Water',
    body: 'The reclaimed water has taken on a faint sweetness that nobody can place, and two people have complained of headaches. The recycler reads nominal, which is worse than if it read a fault.',
    weight: 8,
    conditions: { requiresShip: true, minCrew: 3 },
    tags: ['life-support', 'contamination'],
    choices: [
      {
        id: 'assay-it',
        label: 'Assay the loop before anyone drinks again',
        hint: 'Three hours, hard rationing meanwhile',
        effects: { hours: 3 },
        check: { skill: 'medicalResearch', secondarySkill: 'medicalDiagnostics', participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'A degraded filter membrane is leaching plasticiser into the loop. You identify it, flush it, and write down enough to spot it early next time.',
            effects: {
              items: [{ itemId: 'life_support_filter', qty: 1, condition: 60 }],
              systems: { lifeSupport: 10 },
              personalXp: 35,
              crewXp: 10,
            },
          },
          success: {
            text: 'Filter breakdown, not biology. A flush and a swapped element clear it within the shift.',
            effects: { systems: { lifeSupport: 7 }, repairParts: -2, personalXp: 20, crewXp: 6 },
          },
          partial: {
            text: 'You rule out anything that will kill anyone, but the taste stays. Everyone drinks it with a face on.',
            effects: { systems: { lifeSupport: 2 }, morale: -2, crewStress: 3, personalXp: 12 },
          },
          failure: {
            text: 'The assay comes back ambiguous twice. You are no wiser and three hours poorer, and people are already thirsty.',
            effects: { crewStress: 7, morale: -3, food: -1 },
          },
          criticalFailure: {
            text: 'You clear the loop as safe. Within a day two of the crew are bringing up everything they eat.',
            effects: { medicine: -3, crewStress: 12, morale: -6, systems: { lifeSupport: -6 } },
          },
        },
      },
      {
        id: 'swap-filters-blind',
        label: 'Swap every filter and flush',
        hint: 'Two hours, costs stock',
        requires: { minRepairParts: 3 },
        effects: { hours: 2 },
        check: { skill: 'mechanicalEngineering', participation: 'duo' },
        outcomes: {
          exceptional: {
            text: 'Every element out, loop flushed twice, everything back in wet and clean. The sweetness is gone by the evening meal.',
            effects: { repairParts: -5, systems: { lifeSupport: 12 }, morale: 3, crewXp: 18 },
          },
          success: {
            text: 'The swap works. Whatever it was went out with the old elements.',
            effects: { repairParts: -5, systems: { lifeSupport: 8 }, crewXp: 12 },
          },
          partial: {
            text: 'Better, not fixed. The taste comes back faintly by the end of the leg.',
            effects: { repairParts: -5, systems: { lifeSupport: 3 }, crewStress: 3, crewXp: 8 },
          },
          failure: {
            text: 'You use up good filter stock and the loop comes back exactly as it was. Someone points out you never found the cause.',
            effects: { repairParts: -6, morale: -4, crewStress: 6 },
          },
          criticalFailure: {
            text: 'A seal is left cross-threaded and the loop dumps most of its charge into the bilge before anyone notices.',
            effects: { repairParts: -6, food: -4, systems: { lifeSupport: -12 }, crewStress: 12, morale: -6 },
          },
        },
      },
      {
        id: 'bottled-only',
        label: 'Bottled stores only until port',
        hint: 'Safe, and expensive in stores',
        result: {
          text: 'The loop is locked out and the crew drinks from sealed stock. The headaches stop. The food tally drops faster than anyone likes.',
          effects: {
            food: -5,
            crewStress: 3,
            morale: -2,
            log: 'Water loop locked out; crew on bottled stores.',
          },
        },
      },
    ],
  },

  {
    id: 'trv-sensor-ghost',
    scope: ['travel', 'technical'],
    title: 'Sensor Ghost',
    body: 'A contact appears eleven light-seconds off the bow, holds for forty seconds, and is gone. It has done this four times in six hours, always at the same bearing relative to your heading. Either something is shadowing you, or your array is lying.',
    weight: 10,
    conditions: { requiresShip: true },
    tags: ['sensors', 'uncertainty'],
    choices: [
      {
        id: 'run-diagnostics',
        label: 'Tear into the array software',
        hint: 'Three hours at the terminal',
        effects: { hours: 3 },
        check: { skill: 'computers', secondarySkill: 'electricalEngineering', participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'A timing fault in the return-gating code, inherited from whoever patched this array last. You fix it and the array gets sharper than it has been in years.',
            effects: { systems: { sensors: 15 }, personalXp: 35, crewXp: 10, morale: 3 },
          },
          success: {
            text: 'Ghost gating. The array was folding its own noise back into the return. Cleared.',
            effects: { systems: { sensors: 8 }, personalXp: 22 },
          },
          partial: {
            text: 'You suppress the ghost by narrowing the return window, which also narrows what you can see.',
            effects: { systems: { sensors: -3 }, personalXp: 12, crewStress: 3 },
          },
          failure: {
            text: 'Three hours and the contact still comes and goes. Nobody on the bridge is willing to call it nothing.',
            effects: { crewStress: 6, morale: -2 },
          },
          criticalFailure: {
            text: 'A bad flash of the return filter takes the array offline entirely. You are flying deaf until someone rebuilds it.',
            effects: { systems: { sensors: -18 }, crewStress: 10, morale: -5 },
          },
        },
      },
      {
        id: 'go-quiet-and-look',
        label: 'Go passive and watch the bearing',
        hint: 'Four hours running dark',
        effects: { hours: 4 },
        check: { skill: 'navigation', secondarySkill: 'stealth', participation: 'duo' },
        outcomes: {
          exceptional: {
            text: 'Passive returns pull a real object out of the noise: a tumbling drone hull on a parallel track, dead and drifting. You take it aboard for parts.',
            effects: {
              items: [{ itemId: 'sensor_module', qty: 1, condition: 45 }, { itemId: 'salvage_scrap', qty: 3 }],
              repairParts: 12,
              personalXp: 30,
              crewXp: 12,
            },
          },
          success: {
            text: 'Nothing on passive. Whatever the array was seeing, it was not out there.',
            effects: { systems: { sensors: 3 }, personalXp: 15, crewStress: -2 },
          },
          partial: {
            text: 'The bearing stays empty, but the ghost returns twice while you watch. You still do not know what it is.',
            effects: { crewStress: 4, personalXp: 8 },
          },
          failure: {
            text: 'Four hours of dark and nothing learned. Running silent this long has everyone jumpy and behind on work.',
            effects: { crewStress: 8, morale: -3 },
          },
          criticalFailure: {
            text: 'Running passive, you miss a debris drift until it is scraping the hull. The ghost was never the problem.',
            effects: { hull: -12, systems: { sensors: -6 }, crewStress: 12, morale: -4 },
          },
        },
      },
      {
        id: 'burn-off-bearing',
        label: 'Change heading and burn',
        hint: 'Costs fuel, buys certainty of a sort',
        effects: { hours: 2, fuel: -5 },
        result: {
          text: 'You put four hours of hard vector between you and the bearing. The contact does not follow. Neither does the answer.',
          effects: { crewStress: -2, morale: 1, log: 'Course changed to shake an unidentified sensor return.' },
        },
      },
      {
        id: 'ignore-ghost',
        label: 'Call it noise and keep flying',
        hint: 'Free, and it stays in the back of everyone’s mind',
        result: {
          text: 'You log it as an array artefact. The bridge watch keeps glancing at that bearing anyway.',
          effects: { crewStress: 5, log: 'Recurring sensor return logged as noise.' },
        },
      },
    ],
  },

  {
    id: 'trv-micrometeorite-swarm',
    scope: ['travel', 'technical'],
    title: 'Grit Front',
    body: 'The forward array picks up a dispersed particulate front across your track, too wide to go around without burning a day of fuel. Individually the grains are nothing. There are a great many of them.',
    weight: 10,
    conditions: { requiresShip: true },
    tags: ['hazard', 'piloting'],
    choices: [
      {
        id: 'thread-it',
        label: 'Thread the thin lane at speed',
        hint: 'One hour, hard flying',
        effects: { hours: 1 },
        check: { skill: 'piloting', secondarySkill: 'navigation', participation: 'individual', criticalRisk: true },
        outcomes: {
          exceptional: {
            text: 'The pilot finds a seam nobody else saw and rides it through. You come out the far side without a single new pit in the plating.',
            effects: { personalXp: 40, crewXp: 12, morale: 5, fuel: -1 },
          },
          success: {
            text: 'A dozen sharp raps down the length of the hull and you are through. Paint damage and a proud pilot.',
            effects: { hull: -3, personalXp: 25, morale: 2, fuel: -2 },
          },
          partial: {
            text: 'You come out with a scoured forward face and a sensor window frosted to uselessness.',
            effects: { hull: -8, systems: { sensors: -8 }, crewStress: 6, personalXp: 12 },
          },
          failure: {
            text: 'The lane closes as you enter it. Two minutes of continuous impact noise that nobody aboard will forget.',
            effects: { hull: -16, systems: { sensors: -6, shields: -6 }, crewStress: 12, morale: -4 },
          },
          criticalFailure: {
            text: 'A grain finds a weld seam at closing speed. The bay decompresses through a hole the size of a thumbnail before the patch goes on.',
            effects: {
              hull: -26,
              systems: { lifeSupport: -10, sensors: -8 },
              wound: { severityScore: 42, damageType: 'pierce' },
              crewStress: 16,
              morale: -8,
            },
          },
        },
      },
      {
        id: 'shields-and-crawl',
        label: 'Angle the shields and crawl through',
        hint: 'Six hours, heavy power draw',
        effects: { hours: 6 },
        check: { skill: 'shipWeapons', secondarySkill: 'electricalEngineering', attributes: ['perception', 'steadiness'], participation: 'duo' },
        outcomes: {
          exceptional: {
            text: 'The shield facing is walked around the ship by hand, grain by grain. Six long hours and not a mark on the hull.',
            effects: { systems: { power: -6, shields: 3 }, crewXp: 25, personalXp: 30, crewStress: 5 },
          },
          success: {
            text: 'The angled facing eats almost all of it. A few impacts on the flanks and nothing structural.',
            effects: { hull: -2, systems: { power: -8 }, crewXp: 15, crewStress: 5 },
          },
          partial: {
            text: 'The emitter overheats halfway through and you take the second half of the front bare.',
            effects: { hull: -10, systems: { power: -10, shields: -10 }, crewStress: 9 },
          },
          failure: {
            text: 'The facing never holds alignment. Six hours of grinding noise, a drained bus, and a scoured hull anyway.',
            effects: { hull: -14, systems: { power: -12, shields: -8 }, crewStress: 12, morale: -4 },
          },
          criticalFailure: {
            text: 'The emitter cooks itself off its mount and the discharge earths through the forward frame. Now you have two problems and one of them is on fire.',
            effects: {
              hull: -18,
              systems: { power: -16, shields: -25 },
              repairParts: -12,
              crewStress: 16,
              morale: -7,
            },
          },
        },
      },
      {
        id: 'go-around',
        label: 'Burn around the whole front',
        hint: 'Ten hours and a lot of fuel',
        effects: { hours: 10, fuel: -12 },
        result: {
          text: 'You go the long way. It costs a serious bite of the tank and puts you behind schedule, and not one grain touches the ship.',
          effects: { crewStress: -3, morale: 2, log: 'Detoured around a particulate front at fuel cost.' },
        },
      },
    ],
  },

  {
    id: 'trv-radiation-front',
    scope: ['travel', 'technical'],
    title: 'Hard Radiation Front',
    body: 'A flare front off the local primary is going to overtake you in about ninety minutes. Your shielding was adequate when the ship was new. It is not new. The crew is watching you decide.',
    weight: 8,
    conditions: { requiresShip: true },
    tags: ['hazard', 'radiation'],
    choices: [
      {
        id: 'shelter-in-core',
        label: 'Everyone into the core, ride it out',
        hint: 'Eight hours packed into one compartment',
        effects: { hours: 8 },
        check: { skill: 'navigation', secondarySkill: 'firstAid', attributes: ['reasoning', 'composure'], participation: 'group' },
        outcomes: {
          exceptional: {
            text: 'You put the heaviest mass of the ship between the crew and the front and hold it there through the whole passage. Dosimeters barely move.',
            effects: { crewStress: 6, crewXp: 25, morale: 4, personalXp: 25 },
          },
          success: {
            text: 'Eight hours shoulder to shoulder in the core. Everyone takes a dose, nobody takes a bad one.',
            effects: { crewStress: 10, medicine: -1, crewXp: 15 },
          },
          partial: {
            text: 'The attitude drifts twice and the aft quarter takes it unshielded. Two people are going to be sick for a few days.',
            effects: { crewStress: 14, medicine: -3, morale: -3, crewXp: 8 },
          },
          failure: {
            text: 'You hold the wrong facing for most of the passage. Everyone comes out grey and nauseated and the med stock takes the hit.',
            effects: { crewStress: 18, medicine: -5, morale: -7, food: -2 },
          },
          criticalFailure: {
            text: 'The shelter plan puts the crew alongside a compartment nobody thought to check for shielding gaps. One of them takes a dose that is going to matter.',
            effects: {
              crewStress: 20,
              medicine: -6,
              morale: -10,
              wound: { severityScore: 62, damageType: 'burn' },
            },
          },
        },
      },
      {
        id: 'outrun-it',
        label: 'Burn hard and try to outrun it',
        hint: 'Two hours, heavy fuel cost',
        effects: { hours: 2, fuel: -10 },
        check: { skill: 'piloting', participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'A full-power run along the front’s trailing edge. You stay ahead of it the whole way and pick up time on the leg.',
            effects: { systems: { engines: -3 }, personalXp: 35, morale: 5, crewStress: -2 },
          },
          success: {
            text: 'You stay ahead of the worst of it. The tail end washes over you at a dose the med kit can shrug off.',
            effects: { systems: { engines: -5 }, medicine: -1, personalXp: 20, crewStress: 4 },
          },
          partial: {
            text: 'Not quite fast enough. The front catches you at half strength and the engines are hot and unhappy afterwards.',
            effects: { systems: { engines: -10 }, medicine: -3, crewStress: 10, personalXp: 10 },
          },
          failure: {
            text: 'You burn most of the reserve and the front takes you anyway, with the engines already stressed.',
            effects: { fuel: -5, systems: { engines: -14 }, medicine: -4, crewStress: 14, morale: -6 },
          },
          criticalFailure: {
            text: 'The sustained burn cracks a thrust liner and you eat the front at full strength while limping. It is the worst hour of the voyage so far.',
            effects: {
              fuel: -6,
              systems: { engines: -25, power: -8 },
              medicine: -6,
              crewStress: 20,
              morale: -12,
              wound: { severityScore: 58, damageType: 'burn' },
            },
          },
        },
      },
      {
        id: 'dose-and-drive',
        label: 'Dose the crew and keep the schedule',
        hint: 'Costs medicine, keeps the hours',
        requires: { minMedicine: 4 },
        effects: { medicine: -4 },
        result: {
          text: 'Blockers all round, watches shortened, and the ship keeps its heading straight through. Everybody is fine. Nobody feels fine.',
          effects: {
            crewStress: 12,
            morale: -4,
            log: 'Crew dosed with blockers and flew through a radiation front.',
          },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Contacts and distress
  // -------------------------------------------------------------------------
  {
    id: 'trv-drifting-lifepod',
    scope: ['travel'],
    title: 'A Pod, Still Warm',
    body: 'A single-occupant lifepod tumbling slowly on your track, transponder dead, thermal signature weak but present. It has been out here long enough that the beacon batteries gave up. Someone is still alive inside.',
    weight: 7,
    conditions: { requiresShip: true },
    tags: ['rescue', 'stranger'],
    choices: [
      {
        id: 'recover-and-treat',
        label: 'Match velocity and bring the pod aboard',
        hint: 'Five hours, fuel, and med stock',
        effects: { hours: 5, fuel: -3 },
        check: { skill: 'piloting', secondarySkill: 'firstAid', participation: 'duo' },
        outcomes: {
          exceptional: {
            text: 'A clean grapple and a fast extraction. The occupant is dehydrated and half-frozen but conscious inside the hour, and turns out to know one end of a toolkit from the other.',
            effects: { medicine: -2, morale: 7, recruit: true, crewXp: 25, personalXp: 30 },
          },
          success: {
            text: 'You get the pod in and the occupant out. They will need a few days in a bunk before they are worth anything, but they are alive and grateful.',
            effects: { medicine: -3, food: -2, morale: 5, recruit: true, crewXp: 15 },
          },
          partial: {
            text: 'The recovery is rough and the pod damages your bay door on the way in. Your passenger survives and can barely stand.',
            effects: { medicine: -4, food: -3, hull: -5, morale: 2, crewStress: 6, crewXp: 8 },
          },
          failure: {
            text: 'The grapple slips twice and the pod tumbles harder each time. By the time you have it aboard, the occupant is gone.',
            effects: { medicine: -2, fuel: -2, morale: -6, crewStress: 10 },
          },
          criticalFailure: {
            text: 'The pod strikes the frame on the final approach and splits. You seal the bay in time and lose the pod, the occupant, and a good deal of what was in the compartment.',
            effects: {
              hull: -14,
              medicine: -2,
              systems: { lifeSupport: -8 },
              morale: -10,
              crewStress: 16,
            },
          },
        },
      },
      {
        id: 'crack-it-in-place',
        label: 'Suit up and open it in place',
        hint: 'Three hours, more dangerous, no bay risk',
        effects: { hours: 3, fuel: -1 },
        check: { skill: 'exploration', secondarySkill: 'mechanicalEngineering', participation: 'duo', criticalRisk: true },
        outcomes: {
          exceptional: {
            text: 'The pod comes open on the second try and your party walks the occupant back across the tether like it was a drill.',
            effects: { medicine: -2, morale: 6, recruit: true, crewXp: 20, personalXp: 25 },
          },
          success: {
            text: 'Hatch cracked, occupant transferred, pod cut loose. They are in a bunk and breathing.',
            effects: { medicine: -3, food: -2, morale: 4, recruit: true, crewXp: 12 },
          },
          partial: {
            text: 'The transfer takes far longer than planned and the occupant’s suit fails partway. You save them. It is close.',
            effects: { medicine: -5, morale: 1, crewStress: 10, wound: { severityScore: 34, damageType: 'burn' } },
          },
          failure: {
            text: 'The hatch mechanism is fused. You cannot open it without cutting, and cutting will vent it. You cut the pod loose.',
            effects: { morale: -7, crewStress: 12 },
          },
          criticalFailure: {
            text: 'The pod’s emergency bolts fire while your people are on it. One of the party goes tumbling with a cracked faceplate before the tether stops them.',
            effects: {
              medicine: -4,
              morale: -9,
              crewStress: 18,
              wound: { severityScore: 66, damageType: 'blunt' },
            },
          },
        },
      },
      {
        id: 'relay-position',
        label: 'Relay the position and keep flying',
        hint: 'Twenty minutes, and you will think about it later',
        effects: { hours: 0.5 },
        result: {
          text: 'You put the pod’s vector on the emergency band for whoever comes next. The channel does not answer. The bridge is very quiet for the rest of the watch.',
          effects: {
            morale: -6,
            crewStress: 8,
            flag: { key: 'passed_lifepod', value: true },
            log: 'Relayed a lifepod position and continued the leg.',
          },
        },
      },
    ],
  },

  {
    id: 'trv-civilian-mayday',
    scope: ['travel'],
    title: 'Mayday on the Open Band',
    body: 'A family hauler is broadcasting in the clear: reactor scram, no thrust, four people aboard and life support on batteries. They are eleven hours off your track. They can hear you answer.',
    weight: 8,
    conditions: { requiresShip: true },
    tags: ['distress', 'moral-cost'],
    choices: [
      {
        id: 'divert-and-fix',
        label: 'Divert and put an engineer aboard',
        hint: 'Twelve hours and a lot of fuel',
        effects: { hours: 12, fuel: -10 },
        check: { skill: 'electricalEngineering', secondarySkill: 'mechanicalEngineering', participation: 'duo' },
        outcomes: {
          exceptional: {
            text: 'The scram was a failed interlock, not a reactor fault. Your engineer has them under power in two hours and the family pays in the only currency they have: everything they can spare.',
            effects: {
              repairParts: -4,
              credits: 900,
              items: [{ itemId: 'fuel_canister', qty: 2 }, { itemId: 'preserved_meal', qty: 4 }],
              morale: 10,
              crewXp: 30,
              personalXp: 35,
            },
          },
          success: {
            text: 'You get their reactor latched and their heaters back on. They give you what they can and mean every word of the thanks.',
            effects: { repairParts: -6, credits: 400, food: 4, morale: 8, crewXp: 20, personalXp: 20 },
          },
          partial: {
            text: 'You cannot restart the reactor, but you can keep them breathing. You give them batteries, filters, and a tow toward the lane.',
            effects: {
              repairParts: -8,
              food: -4,
              morale: 5,
              crewStress: 6,
              crewXp: 12,
            },
          },
          failure: {
            text: 'Twelve hours and a fuel bill for nothing you could fix. You leave them your spare filters and a promise to relay their position.',
            effects: { repairParts: -4, medicine: -1, morale: -2, crewStress: 8 },
          },
          criticalFailure: {
            text: 'The reactor was never the problem. It was the containment, and it lets go while your engineer is in the compartment. You get them back. Barely.',
            effects: {
              repairParts: -6,
              medicine: -5,
              morale: -8,
              crewStress: 18,
              wound: { severityScore: 68, damageType: 'burn' },
            },
          },
        },
      },
      {
        id: 'sell-them-supplies',
        label: 'Divert, but sell them what they need',
        hint: 'Twelve hours, hard bargain, the crew is listening',
        effects: { hours: 12, fuel: -10 },
        check: { skill: 'negotiation', participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'They have more aboard than they let on and they part with it rather than die. You leave them alive, supplied, and quietly furious.',
            effects: {
              credits: 1400,
              items: [{ itemId: 'trade_machine_parts', qty: 2 }],
              food: -3,
              repairParts: -4,
              morale: -5,
              personalXp: 25,
              flag: { key: 'hard_bargain_mayday', value: true },
            },
          },
          success: {
            text: 'They pay what you ask. Your own crew watches the transfer without saying anything, which says plenty.',
            effects: { credits: 800, food: -3, repairParts: -4, morale: -6, personalXp: 15, flag: { key: 'hard_bargain_mayday', value: true } },
          },
          partial: {
            text: 'They talk you down to something closer to fair. You break even on the fuel and nobody feels good.',
            effects: { credits: 300, food: -3, repairParts: -3, morale: -3, personalXp: 8 },
          },
          failure: {
            text: 'They have nothing worth taking and you cannot make yourself leave. You hand over the supplies for nothing and burn the fuel for less.',
            effects: { food: -4, repairParts: -4, morale: -2, crewStress: 5 },
          },
          criticalFailure: {
            text: 'The negotiation is still going when their batteries go. You spend the next four hours doing an emergency transfer for free, and two of your crew will not look at you.',
            effects: { food: -6, repairParts: -6, medicine: -2, morale: -12, crewStress: 14 },
          },
        },
      },
      {
        id: 'relay-only',
        label: 'Relay the mayday onward',
        hint: 'Half an hour, no diversion',
        effects: { hours: 0.5 },
        result: {
          text: 'You rebroadcast their position with your own array behind it, which is more reach than they had. Then you keep your heading. The channel keeps calling for a while.',
          effects: { morale: -4, crewStress: 6, log: 'Relayed a civilian mayday without diverting.' },
        },
      },
      {
        id: 'silence-the-channel',
        label: 'Close the channel',
        hint: 'Costs nothing you can measure',
        result: {
          text: 'The band goes quiet on the bridge. Somebody reopens it two hours later, listens, and closes it again without a word.',
          effects: {
            morale: -8,
            crewStress: 9,
            flag: { key: 'ignored_mayday', value: true },
            log: 'A civilian mayday was ignored.',
          },
        },
      },
    ],
  },

  {
    id: 'trv-merchant-courier',
    scope: ['travel', 'social'],
    title: 'Courier Under Sail',
    body: 'A fast courier matches your vector and offers a bulk trade over the open channel. They are hauling more than they can move at the next port and they would rather sell it cheap out here than dock heavy. Their prices look too good.',
    weight: 9,
    conditions: { requiresShip: true },
    tags: ['trade', 'merchant'],
    choices: [
      {
        id: 'haggle-hard',
        label: 'Meet them and bargain',
        hint: 'Three hours alongside',
        effects: { hours: 3 },
        check: { skill: 'negotiation', secondarySkill: 'persuasion', participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'You find the reason they are desperate and price accordingly. They still smile when the transfer closes, which tells you they were desperate indeed.',
            effects: {
              credits: -350,
              food: 12,
              fuel: 8,
              items: [{ itemId: 'repair_kit', qty: 2 }, { itemId: 'antibiotics', qty: 2 }],
              personalXp: 30,
              morale: 4,
            },
          },
          success: {
            text: 'A fair haul at an unfair price, in your favour. Stores go up and the credit balance goes down less than it should have.',
            effects: {
              credits: -500,
              food: 10,
              fuel: 5,
              items: [{ itemId: 'repair_kit', qty: 1 }],
              personalXp: 18,
              morale: 2,
            },
          },
          partial: {
            text: 'You get the goods at something like list price. Not a win, not a loss, three hours gone.',
            effects: { credits: -700, food: 8, fuel: 4, personalXp: 8 },
          },
          failure: {
            text: 'They read you before you read them. The crates are lighter than the manifest and you notice after they have burned away.',
            effects: { credits: -700, food: 4, morale: -4, crewStress: 4 },
          },
          criticalFailure: {
            text: 'Half the food crates are spoiled stock relabelled, and one of the fuel canisters is water. The courier is well past hailing range by the time you open them.',
            effects: { credits: -800, food: 2, morale: -8, crewStress: 8, flag: { key: 'cheated_by_courier', value: true } },
          },
        },
      },
      {
        id: 'inspect-first',
        label: 'Inspect the cargo before you pay',
        hint: 'Five hours, slower but safer',
        effects: { hours: 5 },
        check: { skill: 'scavenging', attributes: ['perception', 'evaluation'], participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'You catch two relabelled crates and use them as leverage on the rest. The courier reprices the whole lot rather than argue.',
            effects: { credits: -300, food: 10, fuel: 6, items: [{ itemId: 'medkit_basic', qty: 1 }], personalXp: 28 },
          },
          success: {
            text: 'Everything checks out except one crate, which you decline. Clean deal at a fair price.',
            effects: { credits: -600, food: 9, fuel: 5, personalXp: 15 },
          },
          partial: {
            text: 'You spot nothing wrong, which either means nothing is wrong or you missed it. You buy a reduced lot to limit the exposure.',
            effects: { credits: -350, food: 5, fuel: 2, personalXp: 8 },
          },
          failure: {
            text: 'The inspection drags and the courier loses patience, closes the hatch, and burns off with a comment about time-wasters.',
            effects: { morale: -3, crewStress: 4 },
          },
          criticalFailure: {
            text: 'Your inspector damages a pressurised crate during the walkthrough. You pay for it and get nothing.',
            effects: { credits: -400, morale: -5, crewStress: 6 },
          },
        },
      },
      {
        id: 'sell-instead',
        label: 'Offer to sell them something instead',
        hint: 'Two hours, thins your stores',
        requires: { minRepairParts: 20 },
        effects: { hours: 2 },
        check: { skill: 'negotiation', participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'They need spares more than they let on and pay a port price out here in the dark.',
            effects: { repairParts: -20, credits: 1100, personalXp: 25, morale: 3 },
          },
          success: {
            text: 'A clean sale of surplus stock at a decent margin.',
            effects: { repairParts: -20, credits: 700, personalXp: 14 },
          },
          partial: {
            text: 'They lowball you and you take it because the crates are already open.',
            effects: { repairParts: -20, credits: 420, personalXp: 6 },
          },
          failure: {
            text: 'They inspect, sniff, and decline. Two hours gone and your parts back in the locker.',
            effects: { crewStress: 3 },
          },
          criticalFailure: {
            text: 'They take the parts aboard for inspection and simply do not send them back, then burn away while you are still on the channel.',
            effects: { repairParts: -20, morale: -7, crewStress: 10 },
          },
        },
      },
      {
        id: 'wave-off',
        label: 'Wave them off',
        hint: 'Nothing gained, nothing risked',
        result: {
          text: 'You decline and hold your vector. The crew argues about it for a day, mostly about the food.',
          effects: { morale: -2, log: 'Declined a courier trade in transit.' },
        },
      },
    ],
  },

  {
    id: 'trv-old-debt-hail',
    scope: ['travel', 'social'],
    title: 'They Knew This Ship',
    body: 'A low-tonnage runner hails {ship} by an older name and asks for the previous owner by first name. When you say the previous owner is dead, the voice on the other end goes quiet, then says he was owed.',
    weight: 6,
    conditions: { once: true, requiresShip: true },
    tags: ['legacy', 'debt'],
    choices: [
      {
        id: 'pay-the-debt',
        label: 'Pay what he says he is owed',
        hint: 'Costs credits, closes it',
        requires: { minCredits: 600 },
        effects: { hours: 2, credits: -600 },
        result: {
          text: 'He takes the transfer, reads out an account number that has not been used in a decade, and tells you two things about the ship your inherited manual never mentioned.',
          effects: {
            systems: { engines: 5 },
            morale: 3,
            personalXp: 20,
            flag: { key: 'old_debt_settled', value: true },
            log: 'Settled a debt owed by the ship’s previous owner.',
          },
        },
      },
      {
        id: 'talk-him-down',
        label: 'Get the story out of him first',
        hint: 'Three hours of careful talking',
        effects: { hours: 3 },
        check: { skill: 'persuasion', secondarySkill: 'negotiation', participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'The debt was settled years ago and he knows it. What he actually wanted was to talk about a man he flew with. By the end he is giving you route notes for free.',
            effects: {
              morale: 6,
              personalXp: 35,
              items: [{ itemId: 'antique_navcomp', qty: 1, condition: 55 }],
              flag: { key: 'old_debt_settled', value: true },
            },
          },
          success: {
            text: 'Half the debt was real. You pay that half and he calls it square, and tells you where the previous owner used to hide things aboard.',
            effects: {
              credits: -250,
              items: [{ itemId: 'personal_effects', qty: 1 }],
              morale: 3,
              personalXp: 20,
              flag: { key: 'old_debt_settled', value: true },
            },
          },
          partial: {
            text: 'You get a name, a date, and no resolution. He signs off saying he will find you at a station somewhere.',
            effects: { crewStress: 4, personalXp: 10, flag: { key: 'old_debt_open', value: true } },
          },
          failure: {
            text: 'He decides you are lying about the death and says so at length before cutting the channel.',
            effects: { morale: -3, crewStress: 6, flag: { key: 'old_debt_open', value: true } },
          },
          criticalFailure: {
            text: 'The conversation gives him your heading, your tonnage, and the fact you are carrying more than you should. He passes it on to someone.',
            effects: {
              crewStress: 10,
              morale: -5,
              flag: { key: 'marked_by_runners', value: true },
              log: 'Route details leaked to an unknown party during a hail.',
            },
          },
        },
      },
      {
        id: 'cut-channel',
        label: 'Tell him the debt died with the man',
        hint: 'Free, and he will remember it',
        result: {
          text: 'You say it plainly and close the channel. He does not hail again. Somebody on your crew who knew the previous owner takes it badly.',
          effects: {
            morale: -4,
            crewStress: 5,
            flag: { key: 'old_debt_refused', value: true },
            log: 'Refused a claimed debt against the ship’s previous owner.',
          },
        },
      },
    ],
  },

  {
    id: 'trv-last-broadcast',
    scope: ['travel', 'social'],
    title: 'The Last Broadcast',
    body: 'The homeworld relay comes through thin and delayed, carrying a civil bulletin nobody was meant to hear this far out. It is a list of districts. Somebody on this ship grew up in one of them. The channel will stay open for about an hour.',
    weight: 6,
    conditions: { once: true, minCrew: 2 },
    tags: ['homeworld', 'grief'],
    choices: [
      {
        id: 'pipe-it-through',
        label: 'Pipe it to the whole ship',
        hint: 'One hour, no hiding from it',
        effects: { hours: 1 },
        result: {
          text: 'Everyone hears the list at the same time. Two people cry, one leaves the compartment, and afterward nobody has to be told anything twice for a week.',
          effects: {
            morale: -8,
            crewStress: 12,
            crewXp: 15,
            flag: { key: 'heard_last_broadcast', value: true },
            log: 'The homeworld bulletin was played to the whole crew.',
          },
        },
      },
      {
        id: 'tell-them-privately',
        label: 'Take each of them aside',
        hint: 'Four hours and all of your composure',
        effects: { hours: 4 },
        check: { skill: 'persuasion', attributes: ['socialAwareness', 'composure'], participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'You sit with each of them, one at a time, and you get it right every time. The ship is quieter afterwards, and closer.',
            effects: { morale: 6, crewStress: -4, personalXp: 45, crewXp: 20, flag: { key: 'heard_last_broadcast', value: true } },
          },
          success: {
            text: 'It goes as well as it can. Grief with company is still grief, but it is not the same thing as grief alone.',
            effects: { morale: 2, crewStress: 4, personalXp: 30, flag: { key: 'heard_last_broadcast', value: true } },
          },
          partial: {
            text: 'You handle most of it well and one of it badly, and the one you handled badly is the one who needed it most.',
            effects: { morale: -4, crewStress: 9, personalXp: 15, flag: { key: 'heard_last_broadcast', value: true } },
          },
          failure: {
            text: 'You run out of words on the second conversation and the rest hear it secondhand anyway, in the worst possible order.',
            effects: { morale: -9, crewStress: 14, personalXp: 8, flag: { key: 'heard_last_broadcast', value: true } },
          },
          criticalFailure: {
            text: 'You lead with the wrong district and someone spends four hours believing something that turns out to be untrue. They do not forgive it quickly.',
            effects: { morale: -13, crewStress: 18, flag: { key: 'heard_last_broadcast', value: true } },
          },
        },
      },
      {
        id: 'log-and-bury',
        label: 'Log it and say nothing',
        hint: 'Free until it is not',
        result: {
          text: 'You archive the bulletin and close the channel. It sits in the log for anyone who goes looking, and eventually somebody will.',
          effects: {
            crewStress: 6,
            flag: { key: 'buried_last_broadcast', value: true },
            log: 'A homeworld bulletin was archived without being shared.',
          },
        },
      },
    ],
  },

  {
    id: 'trv-refugee-convoy',
    scope: ['travel', 'social'],
    title: 'The Convoy',
    body: 'Nine hulls in loose formation, most of them not built for this distance, all of them running for the same lane you are. They ask to shelter in your sensor shadow and share your navigation solution. One of them is trailing atmosphere.',
    weight: 6,
    conditions: { once: true, requiresShip: true },
    tags: ['refugees', 'convoy'],
    choices: [
      {
        id: 'lead-them',
        label: 'Take the lead and shepherd them through',
        hint: 'Sixteen hours at their speed',
        effects: { hours: 16, fuel: -6 },
        check: { skill: 'navigation', secondarySkill: 'piloting', attributes: ['reasoning', 'leadership'], participation: 'group' },
        outcomes: {
          exceptional: {
            text: 'All nine hulls make the lane. Two of the captains empty their lockers into your hold on the way past, and one of their people asks to come with you instead.',
            effects: {
              food: 8,
              repairParts: 25,
              credits: 500,
              morale: 12,
              recruit: true,
              crewXp: 35,
              personalXp: 40,
              flag: { key: 'convoy_shepherded', value: true },
            },
          },
          success: {
            text: 'Eight of nine make the lane. The ninth is towed the last stretch by two of the others. They give you what they can spare.',
            effects: { food: 5, repairParts: 12, morale: 9, crewXp: 22, personalXp: 25, flag: { key: 'convoy_shepherded', value: true } },
          },
          partial: {
            text: 'You get most of them through and lose the leaking hull on the second day. Everyone knew it was coming and it does not help.',
            effects: { food: 3, morale: 2, crewStress: 10, crewXp: 12, flag: { key: 'convoy_shepherded', value: true } },
          },
          failure: {
            text: 'The formation breaks up under a course correction the smaller hulls cannot hold. They scatter and you spend a day chasing stragglers you never find.',
            effects: { fuel: -4, morale: -6, crewStress: 14 },
          },
          criticalFailure: {
            text: 'Your solution puts the convoy across a debris drift. Two hulls do not come out the other side and everyone on the band heard it happen.',
            effects: {
              fuel: -4,
              hull: -8,
              morale: -14,
              crewStress: 20,
              flag: { key: 'convoy_disaster', value: true },
            },
          },
        },
      },
      {
        id: 'give-solution',
        label: 'Give them the solution and go on ahead',
        hint: 'Two hours, no escort',
        effects: { hours: 2 },
        result: {
          text: 'You hand over the navigation package and pull ahead. Their thanks come through as you burn away, and then the channel is just nine ships talking to each other.',
          effects: {
            morale: 3,
            crewXp: 8,
            log: 'Shared a navigation solution with a refugee convoy.',
          },
        },
      },
      {
        id: 'take-the-leak',
        label: 'Take the leaking ship’s people aboard only',
        hint: 'Four hours, and your stores will feel it',
        effects: { hours: 4 },
        check: { skill: 'firstAid', secondarySkill: 'persuasion', participation: 'duo' },
        outcomes: {
          exceptional: {
            text: 'Eleven people transferred without a casualty, and one of them is a hull tech who starts working before anyone asks.',
            effects: { food: -8, medicine: -2, morale: 9, recruit: true, crewXp: 25, personalXp: 30 },
          },
          success: {
            text: 'You get them all across. Your ship is crowded, loud, and short on food for a while.',
            effects: { food: -10, medicine: -3, morale: 6, crewStress: 8, crewXp: 15 },
          },
          partial: {
            text: 'Most of them get across before the transfer tube fails. The rest go back to a ship you both know is not going to make it.',
            effects: { food: -6, medicine: -3, morale: -3, crewStress: 12 },
          },
          failure: {
            text: 'The transfer never gets properly established. You end up passing across supplies through a tether instead and watching them fall behind.',
            effects: { food: -6, medicine: -3, morale: -7, crewStress: 12 },
          },
          criticalFailure: {
            text: 'The docking collar tears under load with people in the tube. You seal your side. You had to seal your side.',
            effects: {
              hull: -12,
              food: -4,
              medicine: -4,
              morale: -15,
              crewStress: 20,
              systems: { lifeSupport: -8 },
            },
          },
        },
      },
      {
        id: 'decline-convoy',
        label: 'Decline and hold your speed',
        hint: 'You are not built to be a convoy',
        result: {
          text: 'You tell them plainly you cannot hold their speed and you do not have the stores. Nobody argues. They just keep calling for a while.',
          effects: { morale: -5, crewStress: 6, log: 'Declined to escort a refugee convoy.' },
        },
      },
    ],
  },

  {
    id: 'trv-stowaway',
    scope: ['travel', 'social'],
    title: 'The Fourth Set of Footprints',
    body: 'Food stock is short and the condensate tally is wrong in the direction that means a person. {actor} finds a bedroll behind the aft cargo netting and a kid of about nineteen who has been eating your reserve for six days.',
    weight: 6,
    conditions: { once: true, requiresShip: true, minCrew: 2 },
    tags: ['stowaway', 'crew'],
    choices: [
      {
        id: 'put-them-to-work',
        label: 'Put them on the roster',
        hint: 'Another mouth, another pair of hands',
        effects: { hours: 1 },
        result: {
          text: 'They eat like they have not in a while and then work like they are afraid to stop. Whatever they were running from, they are not going back to it.',
          effects: {
            food: -4,
            morale: 3,
            recruit: true,
            crewXp: 10,
            flag: { key: 'stowaway_kept', value: true },
            log: 'A stowaway was found and taken onto the crew roster.',
          },
        },
      },
      {
        id: 'interrogate',
        label: 'Find out who they really are first',
        hint: 'Two hours, and they are terrified',
        effects: { hours: 2 },
        check: { skill: 'persuasion', attributes: ['socialAwareness', 'evaluation'], participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'The story comes out whole: a bonded apprenticeship, a dead guarantor, and a name on a list. They also know more about power systems than half your crew.',
            effects: {
              food: -3,
              morale: 5,
              recruit: true,
              personalXp: 35,
              flag: { key: 'stowaway_kept', value: true },
            },
          },
          success: {
            text: 'They tell you enough. Nothing about it is dangerous to you and most of it is sad.',
            effects: { food: -3, morale: 2, recruit: true, personalXp: 20, flag: { key: 'stowaway_kept', value: true } },
          },
          partial: {
            text: 'You get half a story and the half you get does not fit together. You keep them, and you keep watching them.',
            effects: { food: -3, crewStress: 6, recruit: true, personalXp: 10, flag: { key: 'stowaway_suspect', value: true } },
          },
          failure: {
            text: 'They shut down completely and will not say a word. The crew splits into two camps about what to do with them.',
            effects: { food: -3, morale: -4, crewStress: 8, flag: { key: 'stowaway_silent', value: true } },
          },
          criticalFailure: {
            text: 'You push too hard and they bolt for the airlock cycle panel. It takes two people to stop them and someone gets an elbow in the mouth.',
            effects: {
              food: -3,
              morale: -7,
              crewStress: 14,
              wound: { severityScore: 24, damageType: 'blunt' },
              flag: { key: 'stowaway_silent', value: true },
            },
          },
        },
      },
      {
        id: 'brig-until-port',
        label: 'Lock them up until the next port',
        hint: 'Costs food, costs goodwill',
        result: {
          text: 'They spend the rest of the leg in a locked compartment with a ration and a bucket. Half your crew thinks it is correct and the other half stops speaking at meals.',
          effects: {
            food: -3,
            morale: -6,
            crewStress: 8,
            flag: { key: 'stowaway_confined', value: true },
            log: 'Stowaway confined for the remainder of the leg.',
          },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Hostiles and salvage
  // -------------------------------------------------------------------------
  {
    id: 'trv-pirate-interdiction',
    scope: ['travel', 'hostile'],
    title: 'Cut Off',
    body: 'Two hulls come out of the shadow of a debris field on an intercept that has clearly been set up for hours. They do not hail. They do not need to. The lead ship is already lining up on your engine bell.',
    weight: 7,
    conditions: { minDanger: 30, requiresShip: true },
    tags: ['pirates', 'hostile'],
    choices: [
      {
        id: 'run-for-it',
        label: 'Full burn, break contact',
        hint: 'Two hours of hard flying, heavy fuel',
        effects: { hours: 2, fuel: -8 },
        check: { skill: 'piloting', secondarySkill: 'navigation', participation: 'individual', criticalRisk: true },
        outcomes: {
          exceptional: {
            text: 'The pilot takes the ship down into the debris field they came out of and loses them in it. The lead hull clips something on the way in.',
            effects: { systems: { engines: -4 }, morale: 8, personalXp: 45, crewXp: 15 },
          },
          success: {
            text: 'You out-burn them. They chase for forty minutes, decide you are not worth the fuel, and turn off.',
            effects: { systems: { engines: -6 }, morale: 4, personalXp: 25, crewStress: 6 },
          },
          partial: {
            text: 'You break the intercept but they get a burst across the flank on the way out.',
            effects: { hull: -12, systems: { engines: -8, shields: -6 }, crewStress: 12, personalXp: 12 },
          },
          failure: {
            text: 'They anticipate the vector. The lead hull comes alongside and you are looking at a boarding tube.',
            effects: { hull: -8, crewStress: 14, combat: 'enc_pirate_boarders' },
          },
          criticalFailure: {
            text: 'The burn overloads a thrust assembly and the ship yaws hard. They are alongside before anyone gets to a weapon locker.',
            effects: {
              hull: -14,
              systems: { engines: -18 },
              crewStress: 18,
              morale: -6,
              combat: 'enc_pirate_boarders',
            },
          },
        },
      },
      {
        id: 'fight-them-off',
        label: 'Bring the mount to bear',
        hint: 'One hour, and it becomes a gunfight',
        effects: { hours: 1 },
        check: { skill: 'shipWeapons', participation: 'duo', criticalRisk: true },
        outcomes: {
          exceptional: {
            text: 'Two clean hits on the lead hull\'s drive section. The second ship watches its partner tumble and does not follow you.',
            effects: { systems: { power: -4 }, morale: 10, credits: 300, personalXp: 45, crewXp: 20 },
          },
          success: {
            text: 'You put enough fire across their bow to make it a bad trade. They peel off, complaining, on an open channel.',
            effects: { hull: -5, systems: { power: -4 }, morale: 6, personalXp: 28, crewXp: 12 },
          },
          partial: {
            text: 'You damage the lead hull and the second one puts a raiding party across your midships.',
            effects: { hull: -10, crewStress: 12, combat: 'enc_pirate_raiders' },
          },
          failure: {
            text: 'The mount jams on the third cycle. They close the distance while your gunner is still swearing at it.',
            effects: { hull: -12, systems: { shields: -8 }, crewStress: 14, combat: 'enc_pirate_raiders' },
          },
          criticalFailure: {
            text: 'A feed explosion in the mount housing takes the turret and the gunner with it, and they board anyway.',
            effects: {
              hull: -18,
              systems: { power: -10, shields: -14 },
              wound: { severityScore: 70, damageType: 'burn' },
              crewStress: 20,
              morale: -8,
              combat: 'enc_pirate_boarders',
            },
          },
        },
      },
      {
        id: 'pay-toll',
        label: 'Open a channel and offer cargo',
        hint: 'Costs stores, may cost more',
        effects: { hours: 1 },
        check: { skill: 'negotiation', attributes: ['composure', 'socialAwareness'], participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'You sound bored, expensive, and connected. They take a token cut of the hold and tell you which lanes to avoid for the next month.',
            effects: { repairParts: -15, morale: 3, personalXp: 35, flag: { key: 'pirate_toll_paid', value: true } },
          },
          success: {
            text: 'They take a real bite of the hold and let you go. Nobody is hurt and nobody is happy.',
            effects: { repairParts: -40, food: -6, credits: -400, morale: -5, personalXp: 20, flag: { key: 'pirate_toll_paid', value: true } },
          },
          partial: {
            text: 'They take more than agreed and take their time about it, walking through your ship while your crew stands with their hands where they can be seen.',
            effects: { repairParts: -60, food: -10, credits: -800, morale: -9, crewStress: 16 },
          },
          failure: {
            text: 'The offer reads as weakness. They come across anyway, and now they know you were not going to shoot.',
            effects: { crewStress: 16, morale: -6, combat: 'enc_pirate_boarders' },
          },
          criticalFailure: {
            text: 'They agree, dock, and board with weapons drawn while the transfer is still running.',
            effects: { hull: -6, crewStress: 20, morale: -10, combat: 'enc_pirate_boarders' },
          },
        },
      },
    ],
  },

  {
    id: 'trv-scavenger-shadow',
    scope: ['travel', 'hostile'],
    title: 'Following at Distance',
    body: 'A small hull has been sitting eight hours behind you on the same vector since the last waypoint. It has not hailed and it has not closed. It is waiting for you to do something tiring, like sleep.',
    weight: 8,
    conditions: { minDanger: 20, requiresShip: true },
    tags: ['pursuit', 'tension'],
    choices: [
      {
        id: 'lose-them-dark',
        label: 'Go dark and change vector',
        hint: 'Five hours cold and quiet',
        effects: { hours: 5, fuel: -3 },
        check: { skill: 'stealth', secondarySkill: 'piloting', attributes: ['perception', 'discipline'], participation: 'group' },
        outcomes: {
          exceptional: {
            text: 'Reactor to minimum, heat dumped away from their arc, one long cold coast. When you come back up they are eleven hours the wrong way.',
            effects: { morale: 6, crewXp: 30, personalXp: 25, crewStress: 4 },
          },
          success: {
            text: 'They lose you in the coast. It is cold, dark, and boring, and it works.',
            effects: { crewStress: 8, crewXp: 18, morale: 2 },
          },
          partial: {
            text: 'They lose you for six hours and then find you again. Now they know you are hiding something.',
            effects: { crewStress: 12, morale: -3, crewXp: 8 },
          },
          failure: {
            text: 'The heat dump gives you away in the first hour. They close to visual range and sit there, watching.',
            effects: { crewStress: 15, morale: -5 },
          },
          criticalFailure: {
            text: 'You go dark long enough for life support to complain, and while you are recovering they come alongside fast.',
            effects: { systems: { lifeSupport: -10, power: -6 }, crewStress: 18, combat: 'enc_scavenger_gang' },
          },
        },
      },
      {
        id: 'turn-and-face',
        label: 'Come about and make them talk',
        hint: 'Two hours, forces the issue',
        effects: { hours: 2, fuel: -2 },
        check: { skill: 'persuasion', secondarySkill: 'shipWeapons', attributes: ['charisma', 'composure'], participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'You turn into them with the mount tracking and ask what they want. They want to trade, it turns out, and they were afraid of you.',
            effects: {
              credits: 250,
              items: [{ itemId: 'salvage_scrap', qty: 4 }, { itemId: 'power_cell', qty: 1, condition: 70 }],
              morale: 5,
              personalXp: 30,
            },
          },
          success: {
            text: 'They break off rather than explain themselves. The vector behind you is empty by the next watch.',
            effects: { morale: 4, personalXp: 18, crewStress: -2 },
          },
          partial: {
            text: 'They hold position and say nothing at all. Neither of you moves for three hours, then they drift off.',
            effects: { crewStress: 8, personalXp: 8 },
          },
          failure: {
            text: 'They read the turn as a threat and it becomes one. Boarding lines come out.',
            effects: { crewStress: 14, combat: 'enc_scavenger_gang' },
          },
          criticalFailure: {
            text: 'Turning to face them costs you your speed advantage, and they had friends waiting on the far bearing.',
            effects: { hull: -8, crewStress: 18, morale: -6, combat: 'enc_scavenger_gang' },
          },
        },
      },
      {
        id: 'ignore-shadow',
        label: 'Keep flying, post extra watch',
        hint: 'No time cost, everyone sleeps badly',
        result: {
          text: 'You double the bridge watch and change nothing else. The shadow stays exactly where it is for two more days and then is gone.',
          effects: {
            crewStress: 11,
            morale: -3,
            log: 'An unidentified hull shadowed the ship for two days.',
          },
        },
      },
    ],
  },

  {
    id: 'trv-rogue-drone',
    scope: ['travel', 'hostile'],
    title: 'Automated and Unfriendly',
    body: 'A survey drone the size of a lifeboat comes out of a parking orbit it should not have left, locks onto your hull, and begins station-keeping thirty metres off the beam. Its transponder is a defunct corporate registry. It is trying to attach.',
    weight: 7,
    conditions: { requiresShip: true },
    tags: ['drone', 'hostile'],
    choices: [
      {
        id: 'spoof-it',
        label: 'Talk to it in its own language',
        hint: 'One hour at the terminal',
        effects: { hours: 1 },
        check: { skill: 'computers', participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'You feed it a decommissioning order from a registry that stopped existing years ago, and it obediently unspools its own memory into your buffer before shutting down.',
            effects: {
              dataCores: 2,
              items: [{ itemId: 'sensor_module', qty: 1, condition: 65 }],
              personalXp: 40,
              morale: 5,
            },
          },
          success: {
            text: 'A hold command in the right handshake format. It backs off to a hundred metres and waits there for a ship that will never come.',
            effects: { personalXp: 25, crewStress: -2 },
          },
          partial: {
            text: 'The handshake half-lands. It stops trying to attach and starts a continuous scanning sweep that plays merry hell with your array.',
            effects: { systems: { sensors: -8 }, personalXp: 12, crewStress: 6 },
          },
          failure: {
            text: 'It rejects the handshake, escalates its own threat posture, and attaches to the hull.',
            effects: { hull: -4, crewStress: 12, combat: 'enc_rogue_drone' },
          },
          criticalFailure: {
            text: 'Your handshake gives it your systems address. It gets into the ship\'s network on its way to the hull.',
            effects: {
              hull: -6,
              systems: { power: -8, sensors: -10 },
              crewStress: 16,
              combat: 'enc_rogue_drone',
            },
          },
        },
      },
      {
        id: 'shoot-it',
        label: 'Shoot it off the beam',
        hint: 'Half an hour, close range',
        effects: { hours: 0.5 },
        check: { skill: 'shipWeapons', participation: 'individual', criticalRisk: true },
        outcomes: {
          exceptional: {
            text: 'One shot through the drone\'s power section. It goes inert and drifts, and there is a great deal left worth cutting out of it.',
            effects: {
              hours: 2,
              items: [{ itemId: 'salvage_scrap', qty: 6 }, { itemId: 'power_cell', qty: 2, condition: 55 }],
              repairParts: 18,
              personalXp: 35,
              morale: 5,
            },
          },
          success: {
            text: 'It comes apart at thirty metres. A few fragments rattle off the plating and that is the end of it.',
            effects: { hull: -3, repairParts: 6, personalXp: 20 },
          },
          partial: {
            text: 'You disable its drive but not its intent. It attaches anyway, dead but clamped, and has to be cut off by hand.',
            effects: { hours: 3, hull: -6, repairParts: 4, crewStress: 8 },
          },
          failure: {
            text: 'You miss at thirty metres, which everyone aboard will hear about, and it clamps on.',
            effects: { hull: -5, morale: -4, crewStress: 12, combat: 'enc_rogue_drone' },
          },
          criticalFailure: {
            text: 'The drone was carrying survey charges. It comes apart against the hull instead of away from it.',
            effects: {
              hull: -22,
              systems: { hull: -10, sensors: -12 },
              wound: { severityScore: 48, damageType: 'blunt' },
              crewStress: 18,
              morale: -7,
            },
          },
        },
      },
      {
        id: 'manoeuvre-away',
        label: 'Out-manoeuvre it',
        hint: 'Two hours, costs fuel',
        effects: { hours: 2, fuel: -4 },
        check: { skill: 'piloting', participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'The pilot walks the ship out of the drone\'s manoeuvre envelope in three moves. It gives up and returns to its parking orbit.',
            effects: { personalXp: 30, morale: 4 },
          },
          success: {
            text: 'You open the distance and it cannot follow. Fuel spent, nothing broken.',
            effects: { personalXp: 18 },
          },
          partial: {
            text: 'It tracks you for an hour before losing interest, and you burn more fuel than planned shaking it.',
            effects: { fuel: -3, crewStress: 6, personalXp: 8 },
          },
          failure: {
            text: 'It matches everything you do. Eventually it attaches, and you are dealing with it on the hull.',
            effects: { hull: -4, crewStress: 12, combat: 'enc_rogue_drone' },
          },
          criticalFailure: {
            text: 'A hard evasive burn strains the frame and it catches you mid-manoeuvre anyway.',
            effects: {
              hull: -10,
              systems: { engines: -10 },
              crewStress: 16,
              combat: 'enc_rogue_drone',
            },
          },
        },
      },
    ],
  },

  {
    id: 'trv-hull-vermin',
    scope: ['travel'],
    title: 'Something in the Ducts',
    body: 'The insulation in the aft ducting has been chewed and there is a smell in the compartment that is not machinery. Whatever came aboard at the last port has been breeding in the warm space above the engine bay. The bite marks on the cable runs are large.',
    weight: 8,
    conditions: { requiresShip: true },
    tags: ['infestation', 'ship'],
    choices: [
      {
        id: 'clear-the-ducts',
        label: 'Open the ducts and clear them out',
        hint: 'Four hours in a crawlspace',
        effects: { hours: 4 },
        check: { skill: 'exploration', secondarySkill: 'closeQuarters', attributes: ['perception', 'agility'], participation: 'trio' },
        outcomes: {
          exceptional: {
            text: 'The nest is found, sealed, and vented in one clean sweep. You even recover the cable stock they had been dragging in there.',
            effects: { repairParts: 8, systems: { power: 4 }, crewXp: 25, morale: 4 },
          },
          success: {
            text: 'The nest goes out the aft lock. Two of your people need a shower and a stiff drink.',
            effects: { repairParts: -3, systems: { power: 2 }, crewXp: 15, crewStress: 5 },
          },
          partial: {
            text: 'You get most of them. The chewing noise comes back four days later, quieter and further forward.',
            effects: { repairParts: -4, systems: { power: -3 }, crewStress: 8 },
          },
          failure: {
            text: 'They scatter deeper into the ship. Now they are somewhere you cannot reach without pulling panels in the quarters.',
            effects: { food: -4, systems: { power: -6, lifeSupport: -4 }, crewStress: 10, morale: -4 },
          },
          criticalFailure: {
            text: 'Cornered in the crawlspace, they come out at your people all at once.',
            effects: { food: -3, crewStress: 14, combat: 'enc_hull_vermin' },
          },
        },
      },
      {
        id: 'poison-the-stores',
        label: 'Bait the ducts and seal the compartment',
        hint: 'Two hours, costs food and medicine',
        requires: { minMedicine: 2 },
        effects: { hours: 2, medicine: -2, food: -3 },
        check: { skill: 'medicalResearch', secondarySkill: 'cooking', participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'The bait mix works better than it has any right to. Nothing moves in the ducts within a day and nothing dies where you cannot reach it.',
            effects: { systems: { power: 3 }, personalXp: 30, morale: 4 },
          },
          success: {
            text: 'The compartment goes quiet by the second day. There is a smell for a while afterwards.',
            effects: { morale: -1, personalXp: 18, crewStress: 3 },
          },
          partial: {
            text: 'Half of them take the bait. The rest learn to avoid it and get bolder about the galley.',
            effects: { food: -3, crewStress: 7, personalXp: 8 },
          },
          failure: {
            text: 'They ignore the bait entirely and eat two more cable runs while you wait for it to work.',
            effects: { food: -3, systems: { power: -8 }, crewStress: 8, morale: -3 },
          },
          criticalFailure: {
            text: 'The bait gets into the galley stores. Two crew spend a night being violently ill and the infestation is untouched.',
            effects: {
              food: -6,
              medicine: -3,
              systems: { power: -6 },
              crewStress: 14,
              morale: -7,
            },
          },
        },
      },
      {
        id: 'live-with-it',
        label: 'Seal the compartment and live with it',
        hint: 'Free, and it will get worse',
        result: {
          text: 'The aft ducting gets welded shut and put on the list for the next yard. Something scratches at the seal every night around third watch.',
          effects: {
            food: -3,
            systems: { power: -5, lifeSupport: -3 },
            crewStress: 8,
            morale: -3,
            log: 'Infested ducting sealed off rather than cleared.',
          },
        },
      },
    ],
  },

  {
    id: 'trv-derelict-hauler',
    scope: ['travel', 'scavenge'],
    title: 'Cold Hauler',
    body: 'A mid-tonnage hauler, dark and tumbling slowly, hull intact and no distress beacon. Its cargo doors are still sealed. Whatever happened aboard happened long enough ago that the ice on the ports is thick.',
    weight: 8,
    conditions: { requiresShip: true },
    tags: ['derelict', 'salvage'],
    choices: [
      {
        id: 'full-salvage',
        label: 'Board it and strip what you can',
        hint: 'Eight hours, suits and lamps',
        effects: { hours: 8, fuel: -2 },
        check: { skill: 'scavenging', secondarySkill: 'exploration', participation: 'trio', criticalRisk: true },
        outcomes: {
          exceptional: {
            text: 'The hold is full and the crew quarters were left in a hurry. You come back with more than the ship will comfortably carry.',
            effects: {
              repairParts: 70,
              credits: 900,
              items: [
                { itemId: 'engine_coupling', qty: 1, condition: 70 },
                { itemId: 'trade_machine_parts', qty: 3 },
                { itemId: 'medkit_field', qty: 1 },
              ],
              morale: 8,
              crewXp: 35,
            },
          },
          success: {
            text: 'A good haul out of the engineering spaces and about half the hold. The rest is frozen solid to the deck.',
            effects: {
              repairParts: 40,
              credits: 350,
              items: [{ itemId: 'hull_patch', qty: 2 }, { itemId: 'salvage_scrap', qty: 5 }],
              morale: 4,
              crewXp: 22,
            },
          },
          partial: {
            text: 'You get the accessible spaces cleared before a bulkhead shifts and everyone decides eight hours is enough.',
            effects: { repairParts: 18, items: [{ itemId: 'salvage_scrap', qty: 3 }], crewStress: 8, crewXp: 12 },
          },
          failure: {
            text: 'The hauler was picked clean years ago and the ice hid the cut marks. Eight hours and a fuel bill for scrap.',
            effects: { repairParts: 5, crewStress: 10, morale: -4 },
          },
          criticalFailure: {
            text: 'Somebody has been living aboard, and they were waiting in the dark of the cargo run.',
            effects: {
              crewStress: 18,
              morale: -6,
              loseCrew: true,
              combat: 'enc_derelict_squatters',
            },
          },
        },
      },
      {
        id: 'scan-before-boarding',
        label: 'Scan it thoroughly first',
        hint: 'Three hours, then decide',
        effects: { hours: 3 },
        check: { skill: 'computers', secondarySkill: 'navigation', attributes: ['perception', 'reasoning'], participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'You map the interior before anyone suits up, including two warm bodies in the forward section and a sealed hold worth boarding for.',
            effects: {
              hours: 5,
              repairParts: 35,
              credits: 500,
              items: [{ itemId: 'data_core', qty: 1 }],
              personalXp: 35,
              crewXp: 20,
              morale: 5,
            },
          },
          success: {
            text: 'The scan says empty, cold, and safe. You board with confidence and take what is worth taking.',
            effects: { hours: 5, repairParts: 28, items: [{ itemId: 'salvage_scrap', qty: 4 }], personalXp: 22, crewXp: 12 },
          },
          partial: {
            text: 'The scan is inconclusive and the return off the hold reads strange. You take the engineering spaces only and leave.',
            effects: { hours: 3, repairParts: 14, personalXp: 10, crewStress: 5 },
          },
          failure: {
            text: 'Three hours of returns you cannot interpret. Nobody wants to board on that basis, so you do not.',
            effects: { crewStress: 6, morale: -3 },
          },
          criticalFailure: {
            text: 'The scan pings something aboard that then pings you back, and a boarding tube comes out of the derelict\'s flank.',
            effects: { hull: -6, crewStress: 16, combat: 'enc_derelict_squatters' },
          },
        },
      },
      {
        id: 'cut-the-hold-only',
        label: 'Cut into the hold from outside only',
        hint: 'Four hours, no interior entry',
        effects: { hours: 4 },
        check: { skill: 'explosives', secondarySkill: 'mechanicalEngineering', participation: 'duo' },
        outcomes: {
          exceptional: {
            text: 'A shaped cut through the door frame, clean enough to leave the cargo intact. The hold comes out onto your deck in six loads.',
            effects: {
              repairParts: 45,
              items: [{ itemId: 'trade_ore_crate', qty: 2 }, { itemId: 'trade_volatiles', qty: 1 }],
              credits: 200,
              personalXp: 35,
              crewXp: 15,
            },
          },
          success: {
            text: 'The door comes off. Half the hold is worth having and you take it without setting foot in the ship proper.',
            effects: { repairParts: 25, items: [{ itemId: 'trade_ore_crate', qty: 1 }], personalXp: 20, crewXp: 10 },
          },
          partial: {
            text: 'The cut goes crooked and vents part of the hold to space before you can secure it. You save what did not blow out.',
            effects: { repairParts: 12, crewStress: 7, personalXp: 10 },
          },
          failure: {
            text: 'The frame is thicker than it looked and your charge does not open it. You are out four hours and the charge.',
            effects: { repairParts: -6, crewStress: 6, morale: -3 },
          },
          criticalFailure: {
            text: 'The hold was carrying volatiles. The cut finds them, and the flash comes back down the line at your people.',
            effects: {
              hull: -14,
              crewStress: 18,
              morale: -8,
              wound: { severityScore: 72, damageType: 'burn' },
            },
          },
        },
      },
      {
        id: 'mark-and-go',
        label: 'Mark the position and keep flying',
        hint: 'Twenty minutes, sell the coordinates later',
        effects: { hours: 0.5 },
        result: {
          text: 'You log a good fix on it and move on. Coordinates for an unclaimed hull are worth something at a station, if nobody beats you there.',
          effects: {
            items: [{ itemId: 'data_core', qty: 1 }],
            morale: -1,
            log: 'Logged a derelict hauler’s position without boarding.',
          },
        },
      },
    ],
  },

  {
    id: 'trv-drifting-ordnance',
    scope: ['travel'],
    title: 'Old Ordnance',
    body: 'A cluster of drifting munitions from some border action nobody remembers sits directly on your track, still under power and still hunting. Their seekers are half dead. Half is enough.',
    weight: 5,
    conditions: { minDanger: 25, requiresShip: true },
    tags: ['hazard', 'ordnance'],
    choices: [
      {
        id: 'disarm-them',
        label: 'Suit up and disarm the nearest',
        hint: 'Three hours, and it is exactly as dangerous as it sounds',
        effects: { hours: 3 },
        check: { skill: 'explosives', secondarySkill: 'weaponsmithing', participation: 'individual', criticalRisk: true },
        outcomes: {
          exceptional: {
            text: 'Four rounds disarmed and stripped. Warheads vented, guidance packages boxed, and there is a great deal of good material in a military seeker head.',
            effects: {
              repairParts: 40,
              credits: 800,
              items: [{ itemId: 'sensor_module', qty: 1, condition: 80 }, { itemId: 'plasma_charge', qty: 3 }],
              personalXp: 50,
              morale: 7,
            },
          },
          success: {
            text: 'Two disarmed, one vented, and the cluster is no longer a hazard to anyone using this lane.',
            effects: {
              repairParts: 18,
              items: [{ itemId: 'energy_cell', qty: 3 }],
              personalXp: 30,
              morale: 4,
            },
          },
          partial: {
            text: 'One disarmed. The rest go active on approach and have to be left, which means the lane stays dangerous.',
            effects: { repairParts: 8, crewStress: 12, personalXp: 15 },
          },
          failure: {
            text: 'The seeker on the second round wakes up mid-procedure. Your specialist gets clear and the ship takes the fragment pattern.',
            effects: { hull: -16, systems: { sensors: -8 }, crewStress: 16, morale: -6 },
          },
          criticalFailure: {
            text: 'The round detonates on the tether. There is nothing to recover and nothing anyone could have done differently in the last two seconds.',
            effects: {
              hull: -20,
              systems: { hull: -12, shields: -10 },
              crewStress: 20,
              morale: -15,
              loseCrew: true,
            },
          },
        },
      },
      {
        id: 'shoot-the-cluster',
        label: 'Detonate the cluster from range',
        hint: 'One hour, spends power and makes a mess',
        effects: { hours: 1 },
        check: { skill: 'shipWeapons', participation: 'duo' },
        outcomes: {
          exceptional: {
            text: 'A single hit sets off the whole cluster in a sympathetic chain, well outside anything that matters.',
            effects: { systems: { power: -5 }, personalXp: 30, crewXp: 15, morale: 6 },
          },
          success: {
            text: 'Three rounds cook off at safe distance and the fourth goes inert. The lane is clear.',
            effects: { systems: { power: -6 }, hull: -2, personalXp: 20, crewXp: 10, morale: 3 },
          },
          partial: {
            text: 'Two detonate, one comes toward you before it dies, and the debris field it leaves scours your forward plating.',
            effects: { hull: -10, systems: { power: -6, sensors: -6 }, crewStress: 10 },
          },
          failure: {
            text: 'The shot wakes them all up. You spend the next hour outrunning ordnance older than your crew.',
            effects: { hull: -14, fuel: -6, systems: { power: -8 }, crewStress: 16, morale: -5 },
          },
          criticalFailure: {
            text: 'One of them makes it to terminal. The hull takes the whole pattern amidships and the compartment behind it is not usable any more.',
            effects: {
              hull: -28,
              systems: { hull: -14, lifeSupport: -10, power: -10 },
              wound: { severityScore: 64, damageType: 'pierce' },
              crewStress: 20,
              morale: -10,
            },
          },
        },
      },
      {
        id: 'route-around-ordnance',
        label: 'Go the long way around',
        hint: 'Eight hours, real fuel',
        effects: { hours: 8, fuel: -9 },
        result: {
          text: 'You leave the cluster where it is and go a long way around it. Somebody flags the position for the next ship through, which is all you can do.',
          effects: { crewStress: -2, log: 'Detoured around drifting ordnance.' },
        },
      },
    ],
  },

  {
    id: 'trv-deep-signal-cache',
    scope: ['travel', 'technical'],
    title: 'The Repeating Fragment',
    body: 'A tight-beam repeater is broadcasting a compressed archive on a band nobody uses commercially. It has been repeating the same forty-second packet for what the timestamps suggest is eleven years. It is not a distress call. It is a data cache someone parked and never came back for.',
    weight: 6,
    conditions: { once: true, requiresShip: true },
    tags: ['data', 'mystery'],
    choices: [
      {
        id: 'decrypt-it',
        label: 'Pull the archive and crack it',
        hint: 'Six hours at the terminal',
        effects: { hours: 6 },
        check: { skill: 'computers', attributes: ['reasoning', 'learning'], participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'Survey data: three unlisted fuel bodies and a full geological workup on two of them. Somebody was going to make a fortune off this and never got the chance.',
            effects: {
              dataCores: 3,
              fuel: 6,
              credits: 400,
              personalXp: 50,
              morale: 7,
              flag: { key: 'deep_cache_decoded', value: true },
            },
          },
          success: {
            text: 'Most of the archive opens. Survey data, partial and dated, but the fuel body coordinates check out against your own charts.',
            effects: {
              dataCores: 2,
              fuel: 3,
              personalXp: 32,
              morale: 4,
              flag: { key: 'deep_cache_decoded', value: true },
            },
          },
          partial: {
            text: 'You get the wrapper open and the payload stays encrypted. What you can read is an index, which is worth something to the right buyer.',
            effects: { dataCores: 1, personalXp: 18 },
          },
          failure: {
            text: 'Six hours of nothing. The compression scheme is proprietary and the company that owned it is gone, along with anyone who could tell you how it works.',
            effects: { crewStress: 5, morale: -2, personalXp: 8 },
          },
          criticalFailure: {
            text: 'The archive was seeded with a wiper. It takes your navigation cache with it before the terminal is pulled off the network.',
            effects: {
              systems: { sensors: -10, power: -4 },
              dataCores: -1,
              crewStress: 12,
              morale: -6,
            },
          },
        },
      },
      {
        id: 'grab-the-repeater',
        label: 'Recover the repeater hardware itself',
        hint: 'Four hours and a spacewalk',
        effects: { hours: 4, fuel: -2 },
        check: { skill: 'electricalEngineering', secondarySkill: 'exploration', participation: 'duo' },
        outcomes: {
          exceptional: {
            text: 'The unit comes off its anchor intact, still under power, with a decade of stored transmission logs and a very good antenna assembly.',
            effects: {
              dataCores: 2,
              items: [{ itemId: 'sensor_module', qty: 1, condition: 85 }, { itemId: 'power_cell', qty: 2 }],
              systems: { sensors: 6 },
              personalXp: 40,
              crewXp: 18,
            },
          },
          success: {
            text: 'You get the unit aboard. The archive is still locked but the hardware is better than anything you own.',
            effects: {
              dataCores: 1,
              items: [{ itemId: 'sensor_module', qty: 1, condition: 60 }],
              personalXp: 25,
              crewXp: 12,
            },
          },
          partial: {
            text: 'The anchor bolts are welded by a decade of cold. You cut the antenna free and leave the rest.',
            effects: { items: [{ itemId: 'salvage_scrap', qty: 3 }], personalXp: 12, crewStress: 5 },
          },
          failure: {
            text: 'The unit is anchored to a chunk of rock and neither will move. Four hours outside for nothing.',
            effects: { crewStress: 8, morale: -3 },
          },
          criticalFailure: {
            text: 'The repeater\'s power cell has been in a failure state for years and nobody noticed until it was in someone\'s hands.',
            effects: {
              crewStress: 14,
              morale: -6,
              wound: { severityScore: 52, damageType: 'burn' },
            },
          },
        },
      },
      {
        id: 'log-the-band',
        label: 'Record the packet and move on',
        hint: 'Half an hour, sell the recording later',
        effects: { hours: 0.5 },
        result: {
          text: 'You capture the packet clean and file it. Somebody at a station with better equipment will pay for a copy, and you will never know what was in it.',
          effects: { dataCores: 1, log: 'Recorded an unattended data cache broadcast.' },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Crew and supply pressure
  // -------------------------------------------------------------------------
  {
    id: 'trv-crew-fever',
    scope: ['travel', 'medical'],
    title: 'Fever Aboard',
    body: 'One of the crew has been running a temperature for two days and has now stopped being able to hide it. It could be anything from an inner-ear infection to something that came aboard in a cargo crate. In a closed hull, the difference matters within about a day.',
    weight: 9,
    conditions: { minCrew: 3 },
    tags: ['illness', 'medical'],
    choices: [
      {
        id: 'full-workup',
        label: 'Full diagnostic workup',
        hint: 'Four hours, uses supplies',
        effects: { hours: 4 },
        check: { skill: 'medicalDiagnostics', secondarySkill: 'medicalResearch', participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'A gut infection from a bad water batch, identified precisely. Targeted treatment, forty-eight hours of rest, and the whole crew gets a prophylactic that catches two more cases before they start.',
            effects: { medicine: -2, crewStress: -4, morale: 6, personalXp: 40, crewXp: 15 },
          },
          success: {
            text: 'Bacterial, treatable, and not airborne. They will be on light duty for three days and that is the end of it.',
            effects: { medicine: -3, crewStress: 2, morale: 3, personalXp: 25 },
          },
          partial: {
            text: 'You narrow it to two possibilities and treat for both, which costs twice as much medicine and works about as well.',
            effects: { medicine: -5, crewStress: 6, personalXp: 14 },
          },
          failure: {
            text: 'The workup is inconclusive. You treat symptoms and hope, and the fever keeps climbing through the night.',
            effects: { medicine: -4, crewStress: 12, morale: -5, personalXp: 6 },
          },
          criticalFailure: {
            text: 'You treat for the wrong thing entirely and the reaction is worse than the illness. By morning they cannot stand.',
            effects: {
              medicine: -6,
              crewStress: 16,
              morale: -9,
              wound: { severityScore: 58, damageType: 'stun' },
            },
          },
        },
      },
      {
        id: 'quarantine',
        label: 'Quarantine them and wait it out',
        hint: 'Costs nothing but a bunk and everyone’s nerves',
        effects: { hours: 1 },
        check: { skill: 'firstAid', attributes: ['composure', 'discipline'], participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'Isolation, fluids, and a strict hand protocol. They break the fever in thirty hours and nobody else gets it.',
            effects: { medicine: -1, crewStress: 4, morale: 3, personalXp: 25 },
          },
          success: {
            text: 'They ride it out in the sealed compartment. Unpleasant, effective, and cheap.',
            effects: { medicine: -1, crewStress: 7, personalXp: 15 },
          },
          partial: {
            text: 'The fever breaks late and one other person catches it before the isolation is properly enforced.',
            effects: { medicine: -3, crewStress: 12, morale: -3, personalXp: 8 },
          },
          failure: {
            text: 'Whatever it is, it does not care about your compartment seal. Three people are sick by the end of the leg.',
            effects: { medicine: -5, food: -3, crewStress: 16, morale: -7 },
          },
          criticalFailure: {
            text: 'It goes through the ship. Half the crew is down at once and the watches are being stood by people who should be in bed.',
            effects: {
              medicine: -7,
              food: -4,
              crewStress: 20,
              morale: -12,
              systems: { lifeSupport: -5 },
            },
          },
        },
      },
      {
        id: 'push-through',
        label: 'Dose them and keep them working',
        hint: 'Keeps the schedule, costs the person',
        requires: { minMedicine: 2 },
        effects: { medicine: -2 },
        result: {
          text: 'Fever suppressants and a full watch rotation. They get through it, badly, and the rest of the crew watches you decide that the schedule mattered more.',
          effects: {
            crewStress: 14,
            morale: -8,
            wound: { severityScore: 30, damageType: 'stun' },
            log: 'A sick crew member was kept on duty.',
          },
        },
      },
    ],
  },

  {
    id: 'trv-ration-shortfall',
    scope: ['travel'],
    title: 'The Tally Does Not Match',
    body: 'The food count at the start of the leg and the food count now do not agree, and the gap is bigger than spoilage explains. There are enough crew-days left to reach the next port only if nobody eats properly between here and there.',
    weight: 9,
    conditions: { minCrew: 3 },
    tags: ['shortage', 'rations'],
    choices: [
      {
        id: 'stretch-the-stores',
        label: 'Have the galley stretch what is left',
        hint: 'Three hours of real cooking',
        effects: { hours: 3 },
        check: { skill: 'cooking', attributes: ['memory', 'evaluation'], participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'Bulked with culture stock, portioned by watch load, and made to taste like a decision rather than a shortage. Nobody goes hungry and everybody notices the effort.',
            effects: { food: 5, morale: 8, crewStress: -5, personalXp: 35 },
          },
          success: {
            text: 'The stores go further than the tally said they would. Thin meals, but three a day.',
            effects: { food: 3, morale: 3, personalXp: 20 },
          },
          partial: {
            text: 'It stretches, and it tastes like it. People eat because they have to.',
            effects: { food: 1, morale: -2, crewStress: 4, personalXp: 10 },
          },
          failure: {
            text: 'Two batches spoil in the attempt. You are worse off than when you started.',
            effects: { food: -3, morale: -5, crewStress: 8 },
          },
          criticalFailure: {
            text: 'The culture stock was already turning and the whole batch goes bad. Half the remaining reserve goes out the waste lock.',
            effects: { food: -7, medicine: -2, morale: -10, crewStress: 14 },
          },
        },
      },
      {
        id: 'find-the-thief',
        label: 'Find out where it went',
        hint: 'Two hours, and it will not be pleasant',
        effects: { hours: 2 },
        check: { skill: 'persuasion', secondarySkill: 'scavenging', attributes: ['socialAwareness', 'perception'], participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'A cracked seal on a pallet, not a person. You recover most of what was written off as missing and the crew stops looking sideways at each other.',
            effects: { food: 6, morale: 6, crewStress: -4, personalXp: 35 },
          },
          success: {
            text: 'Somebody has been eating extra and admits it before you have to accuse them. It is handled quietly.',
            effects: { food: 1, morale: -1, crewStress: 3, personalXp: 20 },
          },
          partial: {
            text: 'You do not find it. What you do find is that three people already suspect each other.',
            effects: { morale: -5, crewStress: 9, personalXp: 8 },
          },
          failure: {
            text: 'The search turns into an accusation and the accusation turns out to be wrong. The person you named does not forget it.',
            effects: { morale: -8, crewStress: 12 },
          },
          criticalFailure: {
            text: 'Two crew go for each other over it in the galley and it takes three more to pull them apart.',
            effects: {
              morale: -12,
              crewStress: 18,
              wound: { severityScore: 26, damageType: 'blunt' },
            },
          },
        },
      },
      {
        id: 'hard-ration',
        label: 'Put everyone on hard rations now',
        hint: 'Certain, and hated',
        effects: { hours: 0.5 },
        result: {
          text: 'Two meals a day, measured out. It will get the ship to port with margin. Everybody understands it and nobody likes you for it.',
          effects: {
            food: 4,
            morale: -7,
            crewStress: 10,
            log: 'Hard rationing imposed for the remainder of the leg.',
          },
        },
      },
      {
        id: 'burn-hard-for-port',
        label: 'Burn hard and get there sooner',
        hint: 'Spends fuel instead of food',
        requires: { minFuel: 10 },
        effects: { fuel: -10, hours: 1 },
        result: {
          text: 'You trade tank for time. The engines run hot the rest of the way and the food problem becomes a smaller one.',
          effects: {
            systems: { engines: -6 },
            crewStress: 4,
            morale: 2,
            log: 'Burned hard to shorten the leg and preserve food stores.',
          },
        },
      },
    ],
  },

  {
    id: 'trv-route-dispute',
    scope: ['travel', 'social'],
    title: 'Two Charts, One Bridge',
    body: 'Your navigator wants the marked lane. Somebody else aboard has flown this region before and says the marked lane has been wrong for two years. They are arguing on the bridge in front of the watch and both of them are certain.',
    weight: 9,
    conditions: { minCrew: 3, requiresShip: true },
    tags: ['crew', 'navigation'],
    choices: [
      {
        id: 'work-it-out',
        label: 'Make them work the problem together',
        hint: 'Three hours, awkward for everyone',
        effects: { hours: 3 },
        check: { skill: 'navigation', secondarySkill: 'persuasion', attributes: ['reasoning', 'leadership'], participation: 'duo' },
        outcomes: {
          exceptional: {
            text: 'Between the two of them they find a third route neither had considered, shorter than both. They are insufferable about it for a week.',
            effects: { fuel: 8, morale: 7, crewXp: 30, personalXp: 30 },
          },
          success: {
            text: 'They reconcile the charts and take the lane that survives the argument. It is the right one.',
            effects: { fuel: 2, morale: 4, crewXp: 18, personalXp: 18 },
          },
          partial: {
            text: 'They agree on a compromise route that is nobody\'s first choice and slightly worse than either.',
            effects: { fuel: -3, crewStress: 5, crewXp: 8 },
          },
          failure: {
            text: 'Three hours of two people talking past each other. You end up picking one at random and the loser sulks.',
            effects: { fuel: -4, morale: -5, crewStress: 10 },
          },
          criticalFailure: {
            text: 'The compromise solution has an error in it that nobody catches until you are well committed to a lane with a debris drift in it.',
            effects: {
              fuel: -6,
              hull: -10,
              systems: { sensors: -6 },
              morale: -8,
              crewStress: 16,
            },
          },
        },
      },
      {
        id: 'back-navigator',
        label: 'Back your navigator, publicly',
        hint: 'Fast, and it closes a door',
        effects: { hours: 0.5 },
        result: {
          text: 'You take the marked lane and say so in front of everyone. Your navigator stands a little straighter. The other one stops offering opinions.',
          effects: {
            morale: -2,
            crewStress: 3,
            crewXp: 6,
            flag: { key: 'backed_navigator', value: true },
            log: 'Captain backed the navigator in a route dispute.',
          },
        },
      },
      {
        id: 'back-the-veteran',
        label: 'Take the unmarked route',
        hint: 'One hour, and your navigator will remember',
        effects: { hours: 1, fuel: -2 },
        check: { skill: 'piloting', secondarySkill: 'navigation', participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'The old route is clear, fast, and shorter than the charts admit. Your navigator quietly updates their own files.',
            effects: { fuel: 9, morale: 5, personalXp: 30, crewXp: 12 },
          },
          success: {
            text: 'The unmarked lane works. Nobody says anything about it, which is its own kind of statement.',
            effects: { fuel: 3, personalXp: 18, morale: 1 },
          },
          partial: {
            text: 'The route is fine until it is not, and the last stretch costs back everything it saved.',
            effects: { fuel: -3, crewStress: 6, personalXp: 8 },
          },
          failure: {
            text: 'The lane closed years ago for a reason. You back out of it having lost most of a day.',
            effects: { fuel: -6, hours: 6, morale: -6, crewStress: 10 },
          },
          criticalFailure: {
            text: 'You take the ship into a region with an uncharted density gradient and the hull complains all the way through.',
            effects: {
              fuel: -8,
              hull: -14,
              systems: { engines: -8, sensors: -8 },
              morale: -9,
              crewStress: 16,
            },
          },
        },
      },
    ],
  },
];

/**
 * Technical events — the ship breaking, wearing, and occasionally being fixed.
 * Pure data; no logic.
 */

import type { GameEventDef } from '../../engine/types';

export const TECHNICAL_EVENTS: GameEventDef[] = [
  // -------------------------------------------------------------------------
  {
    id: 'tec-coolant-leak',
    scope: ['technical'],
    title: 'Green on the Deck Plates',
    body:
      'A slow green weep has been collecting under the port heat exchanger for longer than anyone noticed, and the reservoir is down a third. {actor} found it by stepping in it. Coolant pressure is holding for now, {captain}, but the engines will not run hot for long without it, and {ship} has nowhere to pull over out here past {location}.',
    weight: 12,
    conditions: { requiresShip: true },
    tags: ['engines', 'coolant', 'leak'],
    choices: [
      {
        id: 'proper-repair',
        label: 'Shut the loop down and repair the line properly',
        hint: 'Long, cold, and it holds.',
        requires: { minRepairParts: 1 },
        check: {
          skill: 'mechanicalEngineering',
          secondarySkill: 'weaponsmithing',
          participation: 'duo',
        },
        effects: { hours: 9, repairParts: -1 },
        outcomes: {
          exceptional: {
            text: 'You find two more hairline cracks upstream while the loop is drained and replace the whole run. The exchanger comes back cleaner than it has been since you inherited it.',
            effects: { systems: { engines: 16 }, morale: 5, crewXp: 12 },
          },
          success: {
            text: 'New section, new seals, pressure test good. The deck plates are dry for the first time in weeks.',
            effects: { systems: { engines: 11 }, crewXp: 7 },
          },
          partial: {
            text: 'The weep stops but the pressure sits a little low. It will need looking at again.',
            effects: { systems: { engines: 5 }, crewStress: 2 },
          },
          failure: {
            text: 'You get the line back together and it weeps again within the hour. Nine hours and a repair kit for nothing.',
            effects: { systems: { engines: -3 }, morale: -4, crewStress: 5 },
          },
          criticalFailure: {
            text: 'The loop is repressurised with a fitting half-seated and lets go across the compartment. Hot coolant, a scalded forearm, and half the reservoir gone.',
            effects: {
              systems: { engines: -12 },
              fuel: -2,
              crewStress: 10,
              wound: { severityScore: 38, damageType: 'burn' },
            },
          },
        },
      },
      {
        id: 'seal-and-run',
        label: 'Wrap the weep and keep the engines below eighty percent',
        hint: 'Fast. Buys days, not weeks.',
        check: { skill: 'mechanicalEngineering', participation: 'individual' },
        effects: { hours: 3 },
        outcomes: {
          exceptional: {
            text: 'The wrap and clamp you improvise is better than the original fitting. It will outlast the run.',
            effects: { systems: { engines: 7 }, crewXp: 8 },
          },
          success: {
            text: 'Sealed, clamped, and holding at reduced load. Somebody checks it every watch.',
            effects: { systems: { engines: 3 }, crewStress: 2 },
          },
          partial: {
            text: 'It holds if nobody asks the engines for anything sudden. That is now a standing order.',
            effects: { crewStress: 4, flag: { key: 'engines_derated', value: true } },
          },
          failure: {
            text: 'The clamp will not bite on a corroded pipe. You are still losing coolant, just slower.',
            effects: { systems: { engines: -5 }, crewStress: 6 },
          },
          criticalFailure: {
            text: 'The wrap traps heat where the pipe was thinnest and the section fails outright. The loop dumps into the bilge.',
            effects: { systems: { engines: -16 }, repairParts: -1, morale: -6, crewStress: 11 },
          },
        },
      },
      {
        id: 'top-up',
        label: 'Top the reservoir off from stores and deal with it later',
        hint: 'Spends a coolant flask out of the spares bin. Solves nothing.',
        requires: { minRepairParts: 1 },
        effects: { hours: 1, repairParts: -1 },
        result: {
          text: 'You crack a coolant flask into the reservoir and bring pressure back to nominal. The leak is exactly where it was, and now you have one less flask.',
          effects: { systems: { engines: 4 }, crewStress: 3 },
        },
      },
      {
        id: 'ignore',
        label: 'Log it and keep flying',
        hint: 'Free.',
        effects: { hours: 1 },
        result: {
          text: 'It goes in the maintenance log under things to do at the next port. The engines run hot all week and everyone hears them doing it.',
          effects: { systems: { engines: -8 }, morale: -4, crewStress: 5 },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'tec-power-bus-fault',
    scope: ['technical'],
    title: 'The Lights Go Amber',
    body:
      'Half the deck drops to emergency lighting for four seconds and comes back. It happens again nineteen minutes later. {actor} has the main bus panel open and is looking at forty years of somebody else’s wiring, some of which is not on any diagram aboard {ship}.',
    weight: 12,
    conditions: { requiresShip: true },
    tags: ['power', 'wiring', 'intermittent'],
    choices: [
      {
        id: 'trace-it',
        label: 'Trace the fault properly, panel by panel',
        hint: 'Very long. Finds the real problem.',
        check: {
          skill: 'electricalEngineering',
          secondarySkill: 'computers',
          participation: 'duo',
        },
        effects: { hours: 14 },
        outcomes: {
          exceptional: {
            text: 'You find a corroded junction behind a bulkhead nobody has opened in a decade, and while you are in there you redraw the diagram properly. The bus is cleaner than the day you got the ship.',
            effects: { systems: { power: 18, sensors: 4 }, morale: 6, crewXp: 14 },
          },
          success: {
            text: 'Corroded junction, cut out and rebuilt. The lights stay white for the rest of the leg.',
            effects: { systems: { power: 12 }, crewXp: 8 },
          },
          partial: {
            text: 'You find one fault and fix it. The flicker is down to once a day, which suggests there is a second one.',
            effects: { systems: { power: 5 }, crewStress: 3 },
          },
          failure: {
            text: 'Fourteen hours in the crawlways and the fault refuses to happen while anyone is watching it.',
            effects: { crewStress: 7, morale: -3 },
          },
          criticalFailure: {
            text: 'You isolate the wrong leg and take the bus down live. The restart browns out the whole deck and something in the sensor rack does not come back.',
            effects: { systems: { power: -14, sensors: -12 }, repairParts: -1, crewStress: 12 },
          },
        },
      },
      {
        id: 'reroute',
        label: 'Reroute the critical loads onto the intact leg',
        hint: 'Quick. Everything runs on one bus now.',
        check: { skill: 'electricalEngineering', participation: 'individual' },
        effects: { hours: 4 },
        outcomes: {
          exceptional: {
            text: 'You rebalance the whole distribution board in an afternoon and shed the loads nobody needs. The remaining leg carries it comfortably.',
            effects: { systems: { power: 9, lifeSupport: 3 }, crewXp: 10 },
          },
          success: {
            text: 'Life support, the galley, and the bridge come off the bad leg. The flicker is now somebody else’s problem in the cargo bay.',
            effects: { systems: { power: 5 }, crewStress: -2 },
          },
          partial: {
            text: 'The reroute works and the single leg runs warm. You will not be able to draw much extra.',
            effects: { systems: { power: 2 }, crewStress: 3 },
          },
          failure: {
            text: 'Two circuits will not come across without a breaker you do not have. The critical loads are still exposed.',
            effects: { systems: { power: -4 }, crewStress: 6 },
          },
          criticalFailure: {
            text: 'An overloaded breaker welds itself shut and the cascade takes the port bus off entirely. Emergency lighting for eleven hours.',
            effects: { systems: { power: -15, lifeSupport: -6 }, morale: -7, crewStress: 13 },
          },
        },
      },
      {
        id: 'swap-cell',
        label: 'Drop in a fresh power cell and stabilise the rail',
        hint: 'Costs a power cell. Masks the fault.',
        requires: { minRepairParts: 1 },
        effects: { hours: 2, repairParts: -1 },
        result: {
          text: 'A fresh power cell holds the rail up through the dips and the lights stay on. Whatever is actually wrong is still there, waiting.',
          effects: { systems: { power: 7 }, crewStress: -2 },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'tec-scrubber-failing',
    scope: ['technical'],
    title: 'Something in the Air',
    body:
      'The carbon dioxide reading has been creeping up all week and the number is now high enough that people are getting headaches on the third watch. Two of the four scrubber cartridges are past saturation and the media in the others is grey. Life support on {ship} is not failing yet, {captain} — it is failing slowly, which is the kind you can still do something about.',
    weight: 12,
    conditions: { requiresShip: true },
    tags: ['life-support', 'atmosphere', 'filters'],
    choices: [
      {
        id: 'replace-media',
        label: 'Replace the filter media from stores',
        hint: 'Uses a life support filter.',
        requires: { minRepairParts: 1 },
        effects: { hours: 4, repairParts: -1 },
        result: {
          text: 'Four hours of unpleasant work with a mask on, a fresh life support filter out of the spares bin, and the readings drop back into the green by the evening watch. The headaches are gone by morning.',
          effects: { systems: { lifeSupport: 15 }, morale: 6, crewStress: -6 },
        },
      },
      {
        id: 'regenerate',
        label: 'Bake the saturated cartridges and reuse them',
        hint: 'Costs power and time. No stores spent.',
        check: {
          skill: 'mechanicalEngineering',
          secondarySkill: 'medicalResearch',
          participation: 'duo',
        },
        effects: { hours: 8 },
        outcomes: {
          exceptional: {
            text: 'You rig a bake cycle off the exchanger waste heat and drive the cartridges back to near-new capacity. It costs almost nothing and you now know how to do it again.',
            effects: {
              systems: { lifeSupport: 14 },
              morale: 6,
              crewXp: 14,
              flag: { key: 'scrubber_regen_known', value: true },
            },
          },
          success: {
            text: 'Two cartridges come back to roughly seventy percent capacity. The readings fall and the headaches ease.',
            effects: { systems: { lifeSupport: 9 }, crewStress: -4, crewXp: 8 },
          },
          partial: {
            text: 'One cartridge takes, one cracks. Net gain, but you have lost a cartridge you will not get back.',
            effects: { systems: { lifeSupport: 4 }, crewStress: 2 },
          },
          failure: {
            text: 'The bake runs too cool and the media comes out no better than it went in, having eaten eight hours of power.',
            effects: { systems: { lifeSupport: -3, power: -5 }, crewStress: 6 },
          },
          criticalFailure: {
            text: 'The cycle runs away and the media sinters into a solid brick, taking the cartridge housing with it. You are down to two scrubbers.',
            effects: { systems: { lifeSupport: -16 }, repairParts: -1, morale: -7, crewStress: 12 },
          },
        },
      },
      {
        id: 'ration-air',
        label: 'Seal the unused compartments and cut the atmosphere volume',
        hint: 'Everyone lives in half the ship.',
        effects: { hours: 3 },
        result: {
          text: 'You close off the aft hold, the spare quarters, and the workshop. The scrubbers cope with the smaller volume, and six people are now living in four compartments.',
          effects: { systems: { lifeSupport: 8 }, morale: -6, crewStress: 6 },
        },
      },
      {
        id: 'ride-it',
        label: 'Ride it out until the next port',
        hint: 'Free. Everyone stays tired.',
        effects: { hours: 1 },
        result: {
          text: 'You post the readings so nobody is surprised and tell them to sleep with the vents open. The headaches get worse before they get better.',
          effects: { systems: { lifeSupport: -7 }, morale: -6, crewStress: 9 },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'tec-fuel-contamination',
    scope: ['technical'],
    title: 'Sludge in the Prefilter',
    body:
      'The prefilter came out of the fuel line looking like it had been dredged out of a harbour. Whatever you bought at the last stop was cut with something, and it is now sitting in the bottom of both tanks aboard {ship}. The engines are running, unevenly, and {actor} does not want to be the one who says how long that lasts.',
    weight: 10,
    conditions: { requiresShip: true },
    tags: ['fuel', 'contamination', 'engines'],
    choices: [
      {
        id: 'polish-the-fuel',
        label: 'Rig a polishing loop and clean the tanks in place',
        hint: 'Very long. Recovers most of the fuel.',
        check: {
          skill: 'mechanicalEngineering',
          secondarySkill: 'electricalEngineering',
          participation: 'trio',
        },
        effects: { hours: 16 },
        outcomes: {
          exceptional: {
            text: 'The improvised centrifuge loop runs all night and pulls out nearly everything. You lose almost no fuel and you have a rig you can use again.',
            effects: {
              fuel: -1,
              systems: { engines: 12 },
              crewXp: 16,
              morale: 5,
              flag: { key: 'fuel_polisher_built', value: true },
            },
          },
          success: {
            text: 'Sixteen hours of pumping fuel in circles through a stack of filters, and the burn runs smooth again.',
            effects: { fuel: -3, systems: { engines: 8 }, crewXp: 9 },
          },
          partial: {
            text: 'You get the worst of it out. The engines still cough under load and the filters need changing twice as often.',
            effects: { fuel: -4, systems: { engines: 2 }, crewStress: 4 },
          },
          failure: {
            text: 'The rig clogs solid four hours in and you spend the rest of the time taking it apart. The tanks are as dirty as they were.',
            effects: { fuel: -2, repairParts: -1, systems: { engines: -5 }, crewStress: 8 },
          },
          criticalFailure: {
            text: 'A transfer hose parts under pressure in a compartment with no ventilation. You lose fuel across the deck and somebody takes a lungful of it.',
            effects: {
              fuel: -6,
              systems: { engines: -9 },
              medicine: -1,
              crewStress: 13,
              wound: { severityScore: 33, damageType: 'burn' },
            },
          },
        },
      },
      {
        id: 'dump-the-bad-tank',
        label: 'Dump the worst tank and run on the good one',
        hint: 'Expensive in fuel. Certain.',
        effects: { hours: 4, fuel: -8 },
        result: {
          text: 'You vent the port tank and cross-feed everything from starboard. The engines clear up immediately and your range just got considerably shorter.',
          effects: { systems: { engines: 10 }, morale: -3, crewStress: 3 },
        },
      },
      {
        id: 'change-filters-often',
        label: 'Run it dirty and change filters every watch',
        hint: 'Burns repair parts and crew hours.',
        requires: { minRepairParts: 2 },
        effects: { hours: 6, repairParts: -2 },
        result: {
          text: 'Somebody is elbow-deep in the fuel plumbing every six hours for the rest of the leg. It works, and it is nobody’s idea of a good week.',
          effects: { systems: { engines: 3 }, morale: -4, crewStress: 7 },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'tec-sensor-drift',
    scope: ['technical'],
    title: 'The Scope Is Lying',
    body:
      'The forward array has started putting contacts where there are none and losing ones that are. {actor} caught it comparing the returns against a known beacon at {location} and finding an eleven-degree bearing error. Until it is fixed, everything {ship} sees is a suggestion rather than a fact.',
    weight: 11,
    conditions: { requiresShip: true },
    tags: ['sensors', 'calibration', 'navigation'],
    choices: [
      {
        id: 'recalibrate',
        label: 'Recalibrate the array against fixed references',
        hint: 'Careful software work.',
        check: {
          skill: 'computers',
          secondarySkill: 'navigation',
          participation: 'duo',
        },
        effects: { hours: 7 },
        outcomes: {
          exceptional: {
            text: 'You rebuild the calibration table from first principles against three beacons and find that the factory figures were wrong to begin with. The array is now better than specification.',
            effects: { systems: { sensors: 17 }, crewXp: 14, morale: 4 },
          },
          success: {
            text: 'Bearing error down to under a degree and the ghost contacts gone. The scope can be trusted again.',
            effects: { systems: { sensors: 12 }, crewXp: 8 },
          },
          partial: {
            text: 'Calibrated in the forward arc, still drifting on the beam. You will have to remember which half to believe.',
            effects: { systems: { sensors: 5 }, crewStress: 3 },
          },
          failure: {
            text: 'Seven hours and the drift is unchanged, which suggests the problem is in the hardware, not the table.',
            effects: { crewStress: 6, morale: -3 },
          },
          criticalFailure: {
            text: 'You write a corrupted calibration table into the live array and lose the backup with it. The scope is now confidently, precisely wrong.',
            effects: { systems: { sensors: -18 }, crewStress: 12, morale: -6 },
          },
        },
      },
      {
        id: 'replace-module',
        label: 'Pull the drifting module and fit a spare',
        hint: 'Uses a sensor module.',
        requires: { minRepairParts: 1 },
        check: { skill: 'electricalEngineering', participation: 'individual' },
        effects: { hours: 5, repairParts: -1 },
        outcomes: {
          exceptional: {
            text: 'The swap goes cleanly and the old module turns out to be salvageable once you reflow two joints. Two working modules for the price of one.',
            effects: {
              systems: { sensors: 15 },
              items: [{ itemId: 'sensor_module', qty: 1, condition: 55 }],
              crewXp: 12,
            },
          },
          success: {
            text: 'New module in, aligned, and reading true. The old one goes in the scrap bin.',
            effects: { systems: { sensors: 13 }, items: [{ itemId: 'salvage_scrap', qty: 1 }], crewXp: 6 },
          },
          partial: {
            text: 'It reads true but the mount is not quite square, so the alignment will wander again eventually.',
            effects: { systems: { sensors: 7 }, crewStress: 2 },
          },
          failure: {
            text: 'The connector pins are corroded into the socket and you have to leave the old module in place. A repair kit gone for nothing.',
            effects: { systems: { sensors: -3 }, crewStress: 6 },
          },
          criticalFailure: {
            text: 'You break a pin off in the backplane getting the old module out. Now nothing will seat in that slot at all.',
            effects: { systems: { sensors: -16 }, repairParts: -1, morale: -6, crewStress: 11 },
          },
        },
      },
      {
        id: 'fly-by-eye',
        label: 'Post a lookout and fly on visual and dead reckoning',
        hint: 'No parts, plenty of hours.',
        effects: { hours: 6 },
        result: {
          text: 'Somebody sits at the forward port with a handheld scanner for the whole leg while the navigator works the plot by hand. It is slow, tiring, and honest.',
          effects: { crewStress: 7, morale: -3, crewXp: 5 },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'tec-reactor-instability',
    scope: ['technical'],
    title: 'A Wobble in the Core',
    body:
      'The reactor output has developed a periodic dip — small, regular, and getting less small. The governor is compensating and the compensation is what worries you, {captain}. If it goes far enough, the safeties will drop the core and {ship} becomes a very cold room somewhere past {location}.',
    weight: 9,
    conditions: { requiresShip: true },
    tags: ['reactor', 'power', 'dangerous'],
    choices: [
      {
        id: 'tune-the-governor',
        label: 'Tune the governor and rebalance the feed',
        hint: 'Skilled, careful, and safe if you are good.',
        check: {
          skill: 'electricalEngineering',
          secondarySkill: 'computers',
          participation: 'duo',
          modifiers: [{ label: 'Live core', value: -8 }],
        },
        effects: { hours: 10 },
        outcomes: {
          exceptional: {
            text: 'You find the harmonic, damp it in the control loop, and clean up two other margins while you are in there. Output is flatter than it has been in years.',
            effects: { systems: { power: 18, engines: 5 }, morale: 6, crewXp: 16 },
          },
          success: {
            text: 'The dip flattens out and the governor stops fighting itself. The lights stop breathing.',
            effects: { systems: { power: 13 }, crewStress: -3, crewXp: 9 },
          },
          partial: {
            text: 'Better, not fixed. The dip is there if you watch the trace long enough, and somebody now watches the trace.',
            effects: { systems: { power: 5 }, crewStress: 4 },
          },
          failure: {
            text: 'Ten hours of adjustment and the wobble is exactly where it started. Whatever is causing it is mechanical.',
            effects: { systems: { power: -4 }, crewStress: 8, morale: -4 },
          },
          criticalFailure: {
            text: 'A tuning change drives the loop into oscillation and the safeties drop the core. Eleven hours on batteries, in the cold, restarting from nothing.',
            effects: {
              systems: { power: -20, lifeSupport: -8 },
              fuel: -3,
              morale: -9,
              crewStress: 15,
            },
          },
        },
      },
      {
        id: 'controlled-vent',
        label: 'Vent and purge the primary loop under controlled conditions',
        hint: 'Risky procedure, decisive result.',
        check: {
          skill: 'explosives',
          secondarySkill: 'mechanicalEngineering',
          attributes: ['steadiness', 'discipline'],
          participation: 'trio',
          criticalRisk: true,
        },
        effects: { hours: 6 },
        outcomes: {
          exceptional: {
            text: 'Timed, sequenced, and executed exactly. The purge clears the contamination that was causing the dip and the core comes back clean on the first restart.',
            effects: { systems: { power: 20 }, morale: 8, crewXp: 18 },
          },
          success: {
            text: 'The vent goes as planned and the restart is smooth. The trace is flat.',
            effects: { systems: { power: 14 }, fuel: -1, crewXp: 10 },
          },
          partial: {
            text: 'The purge works and the restart takes three attempts. Everyone stands in a very cold compartment for two hours.',
            effects: { systems: { power: 7 }, fuel: -2, crewStress: 7 },
          },
          failure: {
            text: 'The vent sequence aborts halfway and you have to bring it back up on the contaminated loop. Nothing gained, fuel spent.',
            effects: { systems: { power: -6 }, fuel: -3, crewStress: 10 },
          },
          criticalFailure: {
            text: 'The purge line lets go at the wrong end of the sequence. Superheated vapour into an occupied compartment, and the core scrams behind it.',
            effects: {
              systems: { power: -22, hull: -8 },
              fuel: -4,
              medicine: -2,
              morale: -10,
              crewStress: 16,
              wound: { severityScore: 58, damageType: 'burn' },
            },
          },
        },
      },
      {
        id: 'derate',
        label: 'Derate the core and accept the lower output',
        hint: 'Safe. Everything runs slower.',
        effects: { hours: 2 },
        result: {
          text: 'You pull the core back to sixty percent, where the wobble disappears. Engines, shields, and the galley all get less, and nothing drops the core.',
          effects: {
            systems: { power: 4, engines: -6, shields: -6 },
            morale: -4,
            flag: { key: 'reactor_derated', value: true },
          },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'tec-structural-fatigue',
    scope: ['technical'],
    title: 'A Crack Where There Should Not Be One',
    body:
      'Someone chasing a rattle behind the frame-eleven bulkhead has found a hairline crack running along a weld, about forty centimetres of it. {actor} says it is old. {actor} also says it is longer than the last time anybody looked, which nobody can confirm because nobody has looked.',
    weight: 10,
    conditions: { requiresShip: true },
    tags: ['hull', 'welding', 'fatigue'],
    choices: [
      {
        id: 'weld-and-plate',
        label: 'Stop-drill the crack, weld it, and plate over it',
        hint: 'Proper repair, real hours.',
        requires: { minRepairParts: 2 },
        check: {
          skill: 'mechanicalEngineering',
          secondarySkill: 'weaponsmithing',
          participation: 'duo',
        },
        effects: { hours: 12, repairParts: -2 },
        outcomes: {
          exceptional: {
            text: 'Stop-drilled, ground out, welded in three passes, and doubled with a plate that is better than the original structure. That frame will outlive the rest of the ship.',
            effects: { systems: { hull: 20 }, morale: 6, crewXp: 16 },
          },
          success: {
            text: 'The crack is arrested and the plate is sound. It passes a dye check and a hard look.',
            effects: { systems: { hull: 14 }, crewXp: 9 },
          },
          partial: {
            text: 'The weld holds and the plate is a little proud, which will chafe on the insulation. Good enough.',
            effects: { systems: { hull: 7 }, crewStress: 2 },
          },
          failure: {
            text: 'The weld will not take on metal this fatigued and you end up with a patch you do not trust over a crack you cannot see.',
            effects: { systems: { hull: -4 }, crewStress: 7, morale: -3 },
          },
          criticalFailure: {
            text: 'Heat from the welding rig runs the crack another twenty centimetres before anyone notices. The frame is worse than when you started and you have used your plate.',
            effects: {
              systems: { hull: -16 },
              morale: -7,
              crewStress: 12,
              wound: { severityScore: 29, damageType: 'burn' },
            },
          },
        },
      },
      {
        id: 'patch-only',
        label: 'Slap a hull patch over it and move on',
        hint: 'One hour, one patch.',
        requires: { minRepairParts: 1 },
        effects: { hours: 2, repairParts: -1 },
        result: {
          text: 'A hull patch goes on over the crack without any of the preparation that would make it a repair. It looks fine. It is not fine, and everyone who understands metal knows it.',
          effects: { systems: { hull: 6 }, morale: -2, crewStress: 3 },
        },
      },
      {
        id: 'brace-it',
        label: 'Brace the frame with what is in the hold',
        hint: 'No parts. Relies on ingenuity.',
        check: {
          skill: 'mechanicalEngineering',
          attributes: ['reasoning', 'strength'],
          participation: 'trio',
        },
        effects: { hours: 8 },
        outcomes: {
          exceptional: {
            text: 'A brace built out of cargo rail and two salvaged struts, and it carries the load off the cracked weld entirely. Nobody would call it pretty.',
            effects: { systems: { hull: 12 }, morale: 5, crewXp: 14 },
          },
          success: {
            text: 'The brace takes the flex out of the frame and the crack stops working. It stays in place permanently.',
            effects: { systems: { hull: 8 }, crewXp: 8 },
          },
          partial: {
            text: 'The brace helps under steady load and does nothing at all in a hard burn.',
            effects: { systems: { hull: 3 }, crewStress: 3 },
          },
          failure: {
            text: 'You cannot get a load path that works without cutting into a bulkhead you need. Eight hours, one bent strut.',
            effects: { crewStress: 7, morale: -3 },
          },
          criticalFailure: {
            text: 'The brace concentrates the load exactly where it should not, and a section of frame deforms audibly during the next burn.',
            effects: { systems: { hull: -14 }, repairParts: -1, morale: -7, crewStress: 12 },
          },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'tec-nav-software-fault',
    scope: ['technical'],
    title: 'The Plot Will Not Close',
    body:
      'The navigation computer has begun returning solutions that do not converge — each one slightly different, none of them wrong enough to be obviously wrong. The last three plots out of {location} would have put {ship} four hours and a lot of fuel off the mark. Somewhere under forty years of patches, something has rotted.',
    weight: 10,
    conditions: { requiresShip: true },
    tags: ['computers', 'navigation', 'software'],
    choices: [
      {
        id: 'debug-it',
        label: 'Go into the code and find what is rotting',
        hint: 'Long, tedious, and permanent if it works.',
        check: {
          skill: 'computers',
          secondarySkill: 'navigation',
          participation: 'individual',
          modifiers: [{ label: 'Undocumented legacy patches', value: -6 }],
        },
        effects: { hours: 11 },
        outcomes: {
          exceptional: {
            text: 'You find an ephemeris table that has been silently overflowing since the last calendar rollover, fix it, and clean out six dead patches while you are in there. The plot closes on the first try.',
            effects: { systems: { sensors: 10 }, fuel: 2, crewXp: 16, morale: 5 },
          },
          success: {
            text: 'One bad table, corrected. Solutions converge again and the fuel estimates stop being creative.',
            effects: { systems: { sensors: 6 }, fuel: 1, crewXp: 9 },
          },
          partial: {
            text: 'You find the fault and can only work around it. Every plot now needs a manual correction that somebody has to remember.',
            effects: { crewStress: 4, crewXp: 5 },
          },
          failure: {
            text: 'Eleven hours reading somebody else’s undocumented code and you come out knowing only that it is worse than you thought.',
            effects: { crewStress: 8, morale: -4 },
          },
          criticalFailure: {
            text: 'A change you make propagates into the stored route library and corrupts it. Every archived plot aboard is now suspect.',
            effects: { systems: { sensors: -12 }, fuel: -3, crewStress: 13, morale: -7 },
          },
        },
      },
      {
        id: 'rollback',
        label: 'Roll back to the oldest archive build',
        hint: 'Fast. Loses every improvement since.',
        check: { skill: 'computers', participation: 'individual' },
        effects: { hours: 3 },
        outcomes: {
          exceptional: {
            text: 'The old build loads clean and turns out to be more honest than the current one about its own error bars. You keep it.',
            effects: { systems: { sensors: 8 }, crewXp: 10 },
          },
          success: {
            text: 'Rolled back, restarted, converging. It is slower and it is correct.',
            effects: { systems: { sensors: 4 }, crewStress: -2 },
          },
          partial: {
            text: 'It runs, but half the ship’s custom waypoints are gone and the navigator has to re-enter them from memory.',
            effects: { crewStress: 5, morale: -3 },
          },
          failure: {
            text: 'The archive build will not talk to the current sensor firmware. You put the broken version back.',
            effects: { crewStress: 7 },
          },
          criticalFailure: {
            text: 'The rollback wipes the working partition halfway through and the machine will not boot. The navigator is doing everything by hand until you find a port with a technician.',
            effects: { systems: { sensors: -18 }, morale: -8, crewStress: 14 },
          },
        },
      },
      {
        id: 'hand-plot',
        label: 'Plot the next legs by hand',
        hint: 'No software risk. Enormous time cost.',
        effects: { hours: 9 },
        result: {
          text: 'Charts, tables, and a stylus, the way it was done before anyone aboard was born. The plots are good. The navigator is destroyed.',
          effects: { crewStress: 9, morale: -2, crewXp: 8 },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'tec-shield-emitter-arc',
    scope: ['technical'],
    title: 'The Emitter That Sings',
    body:
      'Number two shield emitter has started drawing an arc across its housing whenever the field is brought up, and the whole assembly makes a noise like a struck wire. It has scorched the mount twice. Nobody wants to run the shields on {ship} while it does that, and nobody wants to run without shields either.',
    weight: 10,
    conditions: { requiresShip: true },
    tags: ['shields', 'arcing', 'emitter'],
    choices: [
      {
        id: 'rebuild-emitter',
        label: 'Strip the emitter down and rebuild the standoff',
        hint: 'Precision work with the field cold.',
        check: {
          skill: 'electricalEngineering',
          secondarySkill: 'weaponsmithing',
          participation: 'duo',
        },
        effects: { hours: 9 },
        outcomes: {
          exceptional: {
            text: 'You find carbon tracking across a cracked insulator, replace it with machined stock from the workshop, and the emitter comes up silent and even. Better than the day it was installed.',
            effects: { systems: { shields: 18 }, crewXp: 15, morale: 5 },
          },
          success: {
            text: 'Cleaned, re-standoff, tested at full field. No arc, no noise.',
            effects: { systems: { shields: 13 }, crewXp: 8 },
          },
          partial: {
            text: 'The arc is gone at low field and comes back at full. You can have shields or you can have all of them.',
            effects: { systems: { shields: 5 }, crewStress: 3 },
          },
          failure: {
            text: 'Reassembled, and it sings exactly as before. Nine hours to confirm you cannot fix it with what is aboard.',
            effects: { crewStress: 7, morale: -3 },
          },
          criticalFailure: {
            text: 'A stored charge in the emitter capacitor bank finds a path through the person holding the housing. The bank is dead and so, very nearly, is somebody.',
            effects: {
              systems: { shields: -20, power: -6 },
              medicine: -2,
              morale: -9,
              crewStress: 15,
              wound: { severityScore: 62, damageType: 'burn' },
            },
          },
        },
      },
      {
        id: 'swap-emitter',
        label: 'Fit the spare emitter',
        hint: 'Uses a shield emitter.',
        requires: { minRepairParts: 1 },
        effects: { hours: 4, repairParts: -1 },
        result: {
          text: 'The spare shield emitter goes in without argument and the field comes up clean and quiet. You are now out of spare emitters.',
          effects: { systems: { shields: 16 }, morale: 4, items: [{ itemId: 'salvage_scrap', qty: 1 }] },
        },
      },
      {
        id: 'run-three',
        label: 'Isolate number two and run on three emitters',
        hint: 'Immediate. Weaker field, permanent gap.',
        effects: { hours: 2 },
        result: {
          text: 'You cut the feed to number two and rebalance the remaining three. The field comes up thin on the port quarter, and everyone learns to turn that side away from trouble.',
          effects: { systems: { shields: -9 }, crewStress: 2, flag: { key: 'shield_gap_port', value: true } },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'tec-thruster-misalignment',
    scope: ['technical'],
    title: 'She Pulls to Starboard',
    body:
      '{ship} has developed a persistent yaw that the attitude system is quietly trimming out on every burn, which means fuel. {actor} noticed it in the trim log before anyone felt it in the seat. Somewhere in the manoeuvring cluster a mount has shifted, and every hour you fly like this costs you range.',
    weight: 11,
    conditions: { requiresShip: true },
    tags: ['engines', 'thrusters', 'alignment'],
    choices: [
      {
        id: 'shim-and-align',
        label: 'Get outside and realign the cluster',
        hint: 'EVA work, cold and slow.',
        check: {
          skill: 'mechanicalEngineering',
          secondarySkill: 'piloting',
          participation: 'duo',
          criticalRisk: true,
        },
        effects: { hours: 10 },
        outcomes: {
          exceptional: {
            text: 'You find the shifted mount, shim it true, and while you are out there straighten a second one that was two degrees off and nobody had noticed. She flies straight for the first time since you inherited her.',
            effects: { systems: { engines: 16 }, fuel: 3, morale: 7, crewXp: 16 },
          },
          success: {
            text: 'Mount reshimmed and locked. The trim log goes flat and the fuel curve improves immediately.',
            effects: { systems: { engines: 11 }, fuel: 2, crewXp: 9 },
          },
          partial: {
            text: 'Better, not true. The autotrim still works, just less hard.',
            effects: { systems: { engines: 4 }, fuel: 1, crewStress: 3 },
          },
          failure: {
            text: 'The mount bolts are seized and you run the suit down to reserve trying. Back inside with nothing to show.',
            effects: { crewStress: 9, morale: -3 },
          },
          criticalFailure: {
            text: 'A tether snags during the return and somebody comes back in hard against the hull. Suit integrity held. The shoulder did not.',
            effects: {
              systems: { engines: -6 },
              medicine: -1,
              morale: -8,
              crewStress: 14,
              wound: { severityScore: 46, damageType: 'blunt' },
            },
          },
        },
      },
      {
        id: 'fly-around-it',
        label: 'Have the pilot fly around the problem',
        hint: 'No repair. Relies entirely on the hands at the stick.',
        check: {
          skill: 'piloting',
          attributes: ['handEye', 'discipline'],
          participation: 'individual',
        },
        effects: { hours: 4 },
        outcomes: {
          exceptional: {
            text: 'The pilot builds a manual trim schedule that beats the autotrim outright and hands it to the next watch on a card. You are burning less fuel than before the mount shifted.',
            effects: { fuel: 3, crewXp: 14, morale: 5 },
          },
          success: {
            text: 'Hand-flown burns with the yaw compensated on the stick. It works and it costs concentration.',
            effects: { fuel: 1, crewStress: 4, crewXp: 8 },
          },
          partial: {
            text: 'The pilot can hold her straight on the long burns and not on the short ones.',
            effects: { crewStress: 5 },
          },
          failure: {
            text: 'Four hours of fighting the yaw by hand and the fuel figures are no better than letting the autotrim do it.',
            effects: { fuel: -2, crewStress: 8 },
          },
          criticalFailure: {
            text: 'An overcorrection during a course change puts a lateral load through the frame that nothing was designed for. Something in the cargo bay comes off its restraints.',
            effects: { systems: { hull: -10, engines: -5 }, fuel: -3, crewStress: 11, morale: -5 },
          },
        },
      },
      {
        id: 'accept-the-burn',
        label: 'Let the autotrim handle it and pay the fuel',
        hint: 'Nothing to do. Everything costs more.',
        effects: { hours: 1, fuel: -4 },
        result: {
          text: 'The attitude system trims out the yaw on every burn, quietly and expensively, all the way to the next port.',
          effects: { crewStress: 2 },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'tec-turret-feed-jam',
    scope: ['technical'],
    title: 'The Turret Will Not Cycle',
    body:
      'A dry test on the dorsal mount ends with a feed jam that takes ten minutes to clear by hand. Do that in an actual engagement and {ship} is an unarmed target. {actor} thinks the feed pawl is worn; nobody wants to find out during something worse than a test.',
    weight: 10,
    conditions: { requiresShip: true },
    tags: ['weapons', 'maintenance', 'turret'],
    choices: [
      {
        id: 'rebuild-feed',
        label: 'Strip the feed mechanism and make the worn parts',
        hint: 'Workshop hours. Real fix.',
        check: {
          skill: 'weaponsmithing',
          secondarySkill: 'mechanicalEngineering',
          participation: 'individual',
        },
        effects: { hours: 8 },
        outcomes: {
          exceptional: {
            text: 'You cut a new pawl and spring from stock, fit them, and the mount cycles a hundred rounds without a hiccup. You make a spare while the setup is still on the bench.',
            effects: {
              systems: { shields: 3 },
              items: [{ itemId: 'salvage_scrap', qty: 1 }],
              morale: 6,
              crewXp: 16,
            },
          },
          success: {
            text: 'New pawl, new spring, clean cycling. The mount is reliable again.',
            effects: { morale: 5, crewXp: 9 },
          },
          partial: {
            text: 'It cycles reliably at low rate and still hesitates when driven hard.',
            effects: { crewStress: 3, crewXp: 5 },
          },
          failure: {
            text: 'Eight hours and the part you made is out of tolerance. The mount jams exactly as before.',
            effects: { repairParts: -1, crewStress: 7, morale: -4 },
          },
          criticalFailure: {
            text: 'A spring under tension lets go while the mechanism is open. It takes a fingertip’s worth of somebody with it, and the feed is in pieces on the deck.',
            effects: {
              repairParts: -1,
              medicine: -1,
              morale: -7,
              crewStress: 12,
              wound: { severityScore: 41, damageType: 'slash' },
            },
          },
        },
      },
      {
        id: 'clean-and-shim',
        label: 'Clean, shim, and lubricate the existing feed',
        hint: 'Two hours. Buys engagements, not years.',
        check: { skill: 'weaponsmithing', participation: 'individual' },
        effects: { hours: 3 },
        outcomes: {
          exceptional: {
            text: 'Stripped, degreased, shimmed to spec, and reassembled. It runs like something that was cared for.',
            effects: { morale: 5, crewXp: 10 },
          },
          success: {
            text: 'Clean and shimmed. It cycles properly for now.',
            effects: { morale: 3, crewXp: 5 },
          },
          partial: {
            text: 'It jams once in twenty instead of once in five. That is an improvement and it is not a fix.',
            effects: { crewStress: 3 },
          },
          failure: {
            text: 'The shim will not hold and the jam rate is unchanged. The gunner is not reassured.',
            effects: { morale: -3, crewStress: 5 },
          },
          criticalFailure: {
            text: 'Over-shimmed, the mechanism binds solid. The dorsal mount is out of action until somebody rebuilds it from scratch.',
            effects: { morale: -6, crewStress: 9, repairParts: -1 },
          },
        },
      },
      {
        id: 'crew-drill',
        label: 'Leave the mount and drill the crew on clearing jams fast',
        hint: 'Trains people instead of fixing metal.',
        check: {
          skill: 'shipWeapons',
          attributes: ['proprioception', 'discipline'],
          participation: 'trio',
        },
        effects: { hours: 5 },
        outcomes: {
          exceptional: {
            text: 'By the end of the afternoon three people can clear that jam blind in under forty seconds. The mount is still worn and the crew is no longer helpless.',
            effects: { morale: 8, crewXp: 15, crewStress: -3 },
          },
          success: {
            text: 'Everyone who might sit in that seat now knows the drill. Clearing time is down to a minute and a half.',
            effects: { morale: 4, crewXp: 9 },
          },
          partial: {
            text: 'Two of them get it. The third keeps fumbling the pawl release.',
            effects: { crewXp: 4, crewStress: 2 },
          },
          failure: {
            text: 'Five hours of drill and the times are no better, because the mechanism is too worn to be consistent.',
            effects: { morale: -3, crewStress: 6 },
          },
          criticalFailure: {
            text: 'Somebody drills the clearing procedure with a live feed. There is a very loud noise and a hole in a bulkhead that was not there this morning.',
            effects: { systems: { hull: -12 }, morale: -8, crewStress: 13, repairParts: -1 },
          },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'tec-jury-rig-gives',
    scope: ['technical'],
    title: 'The Fix That Was Going to Hold',
    body:
      'The repair somebody was proud of two weeks ago has just let go at exactly the wrong hour of the night watch. Wire, tape, and a bracket that was never meant to carry that load, now scattered across the deck of {ship}. {actor} is standing over it looking like they would rather be anywhere else.',
    weight: 9,
    conditions: { requiresShip: true, once: true },
    tags: ['jury-rig', 'failure', 'repair'],
    choices: [
      {
        id: 'do-it-right',
        label: 'Do it properly this time, whatever it takes',
        hint: 'Parts and a long shift.',
        requires: { minRepairParts: 2 },
        check: {
          skill: 'mechanicalEngineering',
          secondarySkill: 'electricalEngineering',
          participation: 'trio',
        },
        effects: { hours: 13, repairParts: -2 },
        outcomes: {
          exceptional: {
            text: 'Three of you take it back to bare metal and rebuild the whole assembly the way it should have been done in the yard. It will not be an issue again.',
            effects: { systems: { power: 10, engines: 8, hull: 6 }, morale: 8, crewXp: 18 },
          },
          success: {
            text: 'Rebuilt from the mounting up, tested twice, signed off by two people. It holds.',
            effects: { systems: { power: 7, engines: 5 }, morale: 5, crewXp: 11 },
          },
          partial: {
            text: 'Rebuilt, but with one component you had to improvise again. Better, and not entirely trustworthy.',
            effects: { systems: { power: 3 }, crewStress: 4 },
          },
          failure: {
            text: 'Thirteen hours, two repair kits, and it fails the pressure test. Back to the jury rig.',
            effects: { systems: { power: -6 }, morale: -6, crewStress: 10 },
          },
          criticalFailure: {
            text: 'In taking the old fix apart you find out why it was jury-rigged in the first place: the mounting behind it is rotten through. Now you know, and now it is open.',
            effects: { systems: { power: -12, hull: -10 }, morale: -8, crewStress: 14 },
          },
        },
      },
      {
        id: 'rig-again',
        label: 'Rig it again, better',
        hint: 'Cheap. Same category of solution.',
        check: { skill: 'mechanicalEngineering', participation: 'individual' },
        effects: { hours: 4 },
        outcomes: {
          exceptional: {
            text: 'The second rig is genuinely clever — load-bearing where it needs to be, slack where it needs to be. It may well outlast the ship.',
            effects: { systems: { power: 8, engines: 4 }, morale: 6, crewXp: 12 },
          },
          success: {
            text: 'Back together, stronger than last time, and marked in the log so the next person knows what they are looking at.',
            effects: { systems: { power: 5 }, crewXp: 6 },
          },
          partial: {
            text: 'It holds. Nobody is prepared to say for how long.',
            effects: { systems: { power: 2 }, crewStress: 4 },
          },
          failure: {
            text: 'The second rig fails the first load test. You are four hours down and back where you started.',
            effects: { systems: { power: -5 }, crewStress: 8, morale: -4 },
          },
          criticalFailure: {
            text: 'The rig fails under load with somebody underneath it. A bracket comes down on a shoulder and the system is worse than before.',
            effects: {
              systems: { power: -11 },
              medicine: -1,
              crewStress: 12,
              wound: { severityScore: 43, damageType: 'blunt' },
            },
          },
        },
      },
      {
        id: 'shut-it-down',
        label: 'Shut that system down entirely until a real port',
        hint: 'Lose the capability, keep the ship.',
        effects: { hours: 2 },
        result: {
          text: 'You isolate it, tag it out, and write the tag in large letters. The ship is measurably worse and nothing else is going to break because of this.',
          effects: { systems: { power: -6, engines: -4 }, morale: -4, crewStress: -3 },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'tec-ghost-in-the-log',
    scope: ['technical'],
    title: 'Someone Else’s Code',
    body:
      'While chasing an unrelated fault, {actor} finds a process on the ship’s systems that nobody wrote and nobody scheduled. It wakes every eleven hours, reads the navigation log, and goes back to sleep. It has been doing this since before you inherited {ship}, {captain}.',
    weight: 8,
    conditions: { requiresShip: true, once: true },
    tags: ['computers', 'mystery', 'security'],
    choices: [
      {
        id: 'take-it-apart',
        label: 'Take the process apart and find out what it is for',
        hint: 'Careful, curious, and slow.',
        check: {
          skill: 'computers',
          attributes: ['reasoning', 'learning'],
          participation: 'individual',
          modifiers: [{ label: 'Deliberately obfuscated', value: -10 }],
        },
        effects: { hours: 10 },
        outcomes: {
          exceptional: {
            text: 'It is a courier stub — the previous owner was being paid to log routes for somebody. You strip it out, keep the encryption keys, and the keys turn out to be worth something.',
            effects: {
              credits: 900,
              dataCores: 1,
              crewXp: 18,
              morale: 5,
              flag: { key: 'ghost_process_solved', value: true },
            },
          },
          success: {
            text: 'A dormant route-reporting stub, removed cleanly. Whatever it was reporting to has not answered in years.',
            effects: { systems: { sensors: 5 }, crewXp: 11, flag: { key: 'ghost_process_solved', value: true } },
          },
          partial: {
            text: 'You understand about half of it and disable the half you understand. The rest sits there, inert, watching.',
            effects: { crewXp: 6, crewStress: 4 },
          },
          failure: {
            text: 'Ten hours and it is still opaque. You now know it is deliberately obfuscated, which is not a comforting thing to learn.',
            effects: { crewStress: 8, morale: -4 },
          },
          criticalFailure: {
            text: 'Your probing trips a dead-man branch that wipes the navigation history and locks two subsystems behind a key nobody has.',
            effects: { systems: { sensors: -15, power: -6 }, morale: -8, crewStress: 14 },
          },
        },
      },
      {
        id: 'kill-it',
        label: 'Kill the process and purge it',
        hint: 'Direct. Might break something.',
        check: { skill: 'computers', participation: 'individual', criticalRisk: true },
        effects: { hours: 3 },
        outcomes: {
          exceptional: {
            text: 'Killed, purged, and the space it was occupying turns out to have been holding down two other things that ran badly. The whole system is quicker.',
            effects: { systems: { sensors: 8, power: 3 }, crewXp: 12 },
          },
          success: {
            text: 'Gone. Nothing else changes, which is exactly what you wanted.',
            effects: { crewXp: 6, crewStress: -2 },
          },
          partial: {
            text: 'It stops running and its scheduler entry regenerates within a day. You will be killing this weekly.',
            effects: { crewStress: 5 },
          },
          failure: {
            text: 'It will not die. It has permissions nobody aboard can override.',
            effects: { crewStress: 7, morale: -3 },
          },
          criticalFailure: {
            text: 'The purge takes the navigation log with it and something retaliatory locks the sensor firmware. You have made an enemy of a program.',
            effects: { systems: { sensors: -16 }, morale: -7, crewStress: 13 },
          },
        },
      },
      {
        id: 'watch-it',
        label: 'Leave it and monitor what it does',
        hint: 'Costs nothing now.',
        effects: { hours: 2 },
        result: {
          text: 'You log its wake cycles and leave it alone. Every eleven hours something aboard your ship reads your course and you have decided to live with that.',
          effects: { crewStress: 4, flag: { key: 'ghost_process_watched', value: true } },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'tec-cargo-restraint-failure',
    scope: ['technical'],
    title: 'Something Moved in the Hold',
    body:
      'A course correction produces a noise from the cargo bay that no correctly stowed hold has ever made. Half a ton of crated cargo has broken its restraints and is now resting against a bulkhead it should not be touching. Any hard burn from here and it goes through something on {ship} that matters.',
    weight: 11,
    conditions: { requiresShip: true },
    tags: ['cargo', 'restraints', 'hazard'],
    choices: [
      {
        id: 'restow-properly',
        label: 'Stop the burn and restow the whole hold',
        hint: 'Heavy work, everyone involved.',
        check: {
          skill: 'mechanicalEngineering',
          attributes: ['strength', 'proprioception'],
          participation: 'group',
        },
        effects: { hours: 7 },
        outcomes: {
          exceptional: {
            text: 'The whole hold gets re-laid properly, with the mass distribution corrected while you are at it. The trim improves and nothing in there will move again.',
            effects: { systems: { hull: 6, engines: 4 }, morale: 6, crewXp: 12 },
          },
          success: {
            text: 'Everything back in its place, new lashings, second set of eyes on every strap. Done properly.',
            effects: { systems: { hull: 3 }, crewXp: 7 },
          },
          partial: {
            text: 'Restowed, with two crates that will not sit right no matter how they are strapped.',
            effects: { crewStress: 3 },
          },
          failure: {
            text: 'It takes seven hours and one crate is still resting against the bulkhead because nothing aboard will move it safely.',
            effects: { systems: { hull: -4 }, crewStress: 7, morale: -3 },
          },
          criticalFailure: {
            text: 'A crate comes down during the restow and catches somebody against the deck rail. It is going to be a long recovery.',
            effects: {
              medicine: -2,
              morale: -8,
              crewStress: 14,
              wound: { severityScore: 57, damageType: 'blunt' },
            },
          },
        },
      },
      {
        id: 'lash-in-place',
        label: 'Lash it where it lies and fly gently',
        hint: 'Fast. Constrains every burn afterwards.',
        effects: { hours: 2 },
        result: {
          text: 'Four straps and a wedge and a promise not to do anything sudden. It holds under everything except the manoeuvre you will eventually have to make.',
          effects: { crewStress: 4, flag: { key: 'cargo_unsecured', value: true } },
        },
      },
      {
        id: 'jettison',
        label: 'Jettison the loose cargo',
        hint: 'Instant. Expensive.',
        effects: { hours: 1, credits: -350 },
        result: {
          text: 'The bay doors open and half a ton of somebody’s livelihood goes into the dark. The hold is safe and the ledger is not.',
          effects: { morale: -5, crewStress: -4 },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'tec-micrometeorite-pitting',
    scope: ['technical'],
    title: 'A Hundred Small Dents',
    body:
      'The routine hull walk turns up a fresh field of micrometeorite pitting across the forward dorsal plating — nothing through, nothing venting, just a hundred small craters where there used to be paint. It is normal. It is also cumulative, and this hull has been accumulating for forty years.',
    weight: 13,
    routine: true,
    conditions: { requiresShip: true },
    tags: ['hull', 'routine', 'maintenance'],
    choices: [
      {
        id: 'fill-and-seal',
        label: 'Fill and seal the deepest pits',
        hint: 'A few hours and some sealant.',
        check: { skill: 'mechanicalEngineering', participation: 'duo' },
        effects: { hours: 5 },
        outcomes: {
          exceptional: {
            text: 'Every pit deeper than a millimetre filled, faired, and sealed, and the crew doing it finds a stress riser near the sensor mount that would have become a real problem.',
            effects: { systems: { hull: 12, sensors: 3 }, crewXp: 10 },
          },
          success: {
            text: 'The worst of the pitting is filled and sealed. The plating is good for another long while.',
            effects: { systems: { hull: 8 }, crewXp: 5 },
          },
          partial: {
            text: 'Half the field done before the sealant ran out. The rest is marked for next time.',
            effects: { systems: { hull: 4 } },
          },
          failure: {
            text: 'The sealant will not key to cold plating and peels off in sheets. Five hours wasted.',
            effects: { crewStress: 4 },
          },
          criticalFailure: {
            text: 'Somebody grinds a pit out too aggressively and thins the plate to the point where it has to be patched.',
            effects: { systems: { hull: -8 }, repairParts: -1, crewStress: 6 },
          },
        },
      },
      {
        id: 'log-and-move',
        label: 'Photograph it, log it, move on',
        hint: 'One hour.',
        effects: { hours: 1 },
        result: {
          text: 'The survey goes in the maintenance file with a date and a note. It is what most ships do, and most ships are fine.',
          effects: { systems: { hull: -2 } },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'tec-condensation-short',
    scope: ['technical'],
    title: 'Water Where the Wiring Is',
    body:
      'Condensation has been running down the inside of the aft bulkhead and pooling in a junction box that was never rated for it. Nothing has shorted yet. The box is warm to the touch, which is the ship telling you politely.',
    weight: 13,
    routine: true,
    conditions: { requiresShip: true },
    tags: ['power', 'routine', 'condensation'],
    choices: [
      {
        id: 'dry-and-reroute',
        label: 'Dry it out and reroute the run above the drip line',
        hint: 'A few hours of tidy work.',
        check: { skill: 'electricalEngineering', participation: 'individual' },
        effects: { hours: 4 },
        outcomes: {
          exceptional: {
            text: 'Dried, resealed, rerouted, and while you are there you fit a drip shield out of scrap. That junction will never see water again.',
            effects: { systems: { power: 10, lifeSupport: 3 }, crewXp: 10 },
          },
          success: {
            text: 'The run comes up out of the wet and the box goes back together sealed. Warmth gone.',
            effects: { systems: { power: 6 }, crewXp: 5 },
          },
          partial: {
            text: 'Dried and resealed in place. The condensation will come back and so will you.',
            effects: { systems: { power: 2 } },
          },
          failure: {
            text: 'The box will not reseal properly and the run cannot be moved without cutting a bulkhead. Left as found.',
            effects: { systems: { power: -3 }, crewStress: 3 },
          },
          criticalFailure: {
            text: 'You open the box without isolating the circuit and it shorts across your tools. Half the aft lighting is dead and so is your multitool.',
            effects: {
              systems: { power: -10 },
              crewStress: 8,
              wound: { severityScore: 24, damageType: 'burn' },
            },
          },
        },
      },
      {
        id: 'towel-it',
        label: 'Towel it out and tape the lid',
        hint: 'Ten minutes.',
        effects: { hours: 1 },
        result: {
          text: 'Somebody mops out the box, tapes the lid, and adds it to the list of things checked every watch. It works about as well as that sounds.',
          effects: { systems: { power: 1 }, crewStress: 2 },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'tec-airlock-seal-creep',
    scope: ['technical'],
    title: 'The Seal Has Gone Hard',
    body:
      'The main airlock inner seal has taken a permanent set — you can see the flat spot where it has been compressed for years. It still passes a pressure hold, barely, and the cycle time has crept up by nine seconds. On {ship} that is the difference between an inconvenience and a problem.',
    weight: 12,
    routine: true,
    conditions: { requiresShip: true },
    tags: ['hull', 'airlock', 'routine'],
    choices: [
      {
        id: 'replace-seal',
        label: 'Cut a new seal from stock and fit it',
        hint: 'Workshop work, one repair kit.',
        requires: { minRepairParts: 1 },
        check: { skill: 'mechanicalEngineering', participation: 'individual' },
        effects: { hours: 5, repairParts: -1 },
        outcomes: {
          exceptional: {
            text: 'The seal you cut is better than the original stock, and the lock cycles four seconds faster than the manual claims it should.',
            effects: { systems: { hull: 10, lifeSupport: 5 }, crewXp: 12, morale: 4 },
          },
          success: {
            text: 'New seal fitted, pressure hold clean, cycle time back to spec.',
            effects: { systems: { hull: 7, lifeSupport: 3 }, crewXp: 6 },
          },
          partial: {
            text: 'The new seal is slightly oversized and the lock cycles noisily. It holds pressure.',
            effects: { systems: { hull: 3 } },
          },
          failure: {
            text: 'You cut the profile wrong twice and put the old seal back rather than waste more stock.',
            effects: { crewStress: 4 },
          },
          criticalFailure: {
            text: 'The new seal fails its first real cycle and the lock vents into the corridor before the interlock catches. Nobody was in it. It was close.',
            effects: { systems: { hull: -10, lifeSupport: -6 }, morale: -6, crewStress: 10 },
          },
        },
      },
      {
        id: 'grease-it',
        label: 'Dress the seal and keep an eye on the cycle time',
        hint: 'Under an hour.',
        effects: { hours: 1 },
        result: {
          text: 'Cleaned, dressed with what passes for grease aboard, and logged. The nine seconds becomes seven. The seal is still old.',
          effects: { systems: { hull: 2 } },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'tec-emergency-decompression-scare',
    scope: ['technical'],
    title: 'The Pressure Alarm at 0400',
    body:
      'The alarm wakes everyone aboard {ship} at once and the panel says the aft hold is losing pressure. It might be a failing sensor and it might be a hole, and the difference matters enormously to whoever goes to look. {actor} is already at the hatch with a rebreather in one hand, waiting on you, {captain}.',
    weight: 10,
    conditions: { requiresShip: true },
    tags: ['hull', 'emergency', 'pressure'],
    choices: [
      {
        id: 'seal-and-diagnose',
        label: 'Seal the compartment and diagnose from outside it',
        hint: 'Careful. Costs the compartment for a while.',
        check: {
          skill: 'computers',
          secondarySkill: 'electricalEngineering',
          participation: 'duo',
        },
        effects: { hours: 3 },
        outcomes: {
          exceptional: {
            text: 'The panel data shows a sensor failing in a very specific pattern. You prove it from the corridor without risking anybody, and replace the sensor at leisure.',
            effects: { systems: { hull: 6, sensors: 4 }, morale: 7, crewStress: -5, crewXp: 12 },
          },
          success: {
            text: 'Failing sensor, not a breach. The compartment repressurises and everyone goes back to bed shaky and relieved.',
            effects: { systems: { sensors: 3 }, morale: 4, crewStress: -2, crewXp: 6 },
          },
          partial: {
            text: 'The data is ambiguous. You keep the hold sealed until daylight and lose the use of it.',
            effects: { crewStress: 5 },
          },
          failure: {
            text: 'You cannot tell from outside. The hold stays sealed, the alarm stays live, and nobody sleeps.',
            effects: { crewStress: 9, morale: -4 },
          },
          criticalFailure: {
            text: 'You call it a sensor fault and open the hatch. It was not a sensor fault, and the pressure wave takes the hatch out of somebody’s hands.',
            effects: {
              systems: { hull: -14, lifeSupport: -8 },
              morale: -8,
              crewStress: 15,
              wound: { severityScore: 49, damageType: 'blunt' },
            },
          },
        },
      },
      {
        id: 'suit-up-and-go',
        label: 'Suit up and go in',
        hint: 'Immediate answer, immediate exposure.',
        check: {
          skill: 'exploration',
          secondarySkill: 'mechanicalEngineering',
          attributes: ['composure', 'perception'],
          participation: 'duo',
          criticalRisk: true,
        },
        effects: { hours: 2 },
        outcomes: {
          exceptional: {
            text: 'Two of you go in on rebreathers, find a failed weld seep in ninety seconds, and have a patch on it before the pressure drops another point.',
            effects: { systems: { hull: 12 }, morale: 8, crewXp: 14 },
          },
          success: {
            text: 'A pinhole in an old repair. Found, patched, pressure holding. Everybody back inside within the hour.',
            effects: { systems: { hull: 8 }, repairParts: -1, morale: 5, crewXp: 8 },
          },
          partial: {
            text: 'You find it and the patch will only hold at reduced pressure. The hold stays at half atmosphere.',
            effects: { systems: { hull: 3 }, repairParts: -1, crewStress: 6 },
          },
          failure: {
            text: 'You cannot find the leak in the dark with a rebreather running down. Out again with nothing.',
            effects: { systems: { hull: -6 }, crewStress: 10, morale: -4 },
          },
          criticalFailure: {
            text: 'The plating fails properly while you are in there and the compartment goes to vacuum in seconds. Somebody gets dragged out by their tether.',
            effects: {
              systems: { hull: -18, lifeSupport: -6 },
              medicine: -2,
              morale: -10,
              crewStress: 17,
              wound: { severityScore: 64, damageType: 'blunt' },
            },
          },
        },
      },
      {
        id: 'write-it-off',
        label: 'Leave the hold sealed until the next port',
        hint: 'No risk. No cargo bay.',
        effects: { hours: 1 },
        result: {
          text: 'You dog the hatch, vent the hold deliberately, and write off access to it for the rest of the leg. Whatever is stowed in there stays in there.',
          effects: { systems: { hull: -3 }, morale: -5, crewStress: 3 },
        },
      },
    ],
  },
];

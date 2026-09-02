/**
 * Homeworld events.
 *
 * The Homeworld is governed, socially coherent, and running out of time. Two
 * threats are converging: atmospheric catalyst collapse and progressive mantle
 * instability. Nothing here is anarchy — it is queues, permits, shift rosters,
 * and people making rational choices under a deadline nobody can name exactly.
 *
 * Pure data. No logic.
 */

import type { GameEventDef } from '../../engine/types';

export const HOMEWORLD_EVENTS: GameEventDef[] = [
  // -------------------------------------------------------------------------
  // Family
  // -------------------------------------------------------------------------
  {
    id: 'hw-family-doorstep',
    scope: ['homeworld'],
    title: 'Two Bags and No Question',
    body: '{actor} is standing outside the pad gate with two bags and the face of someone who has already lost this argument with themselves. Their block failed the evacuation lottery a second time. They ask how work on {ship} is going, which is how they are asking whether there is room.',
    weight: 12,
    conditions: { once: true, requiresShip: true },
    tags: ['family', 'recruitment', 'departure'],
    choices: [
      {
        id: 'take-now',
        label: 'Take the bags. Walk them up the ramp.',
        hint: 'No discussion. One more mouth, one more pair of hands.',
        effects: { hours: 2 },
        result: {
          text: 'You carry a bag each and nobody says anything until the airlock cycles. They put their things in a corner of the hold like a guest who intends to stay.',
          effects: {
            morale: 8,
            food: -3,
            recruit: true,
            flag: { key: 'hw_family_aboard', value: true },
            log: 'Family member brought aboard.',
            crewXp: 20,
          },
        },
      },
      {
        id: 'hear-out',
        label: 'Sit down and hear the whole thing first',
        hint: '4 hours. They have more to say than they came prepared to say.',
        check: {
          skill: 'persuasion',
          attributes: ['charisma', 'composure'],
          participation: 'individual',
        },
        effects: { hours: 4 },
        outcomes: {
          exceptional: {
            text: 'By the end they have talked themselves into it and talked their neighbour into it too — a maintenance tech with a full permit book. Both of them are at the pad before dark.',
            effects: { morale: 11, recruit: true, personalXp: 45, flag: { key: 'hw_family_aboard', value: true } },
          },
          success: {
            text: 'They admit they have been sleeping in a transit shelter for eleven days. They come aboard without another word about it.',
            effects: { morale: 7, food: -3, recruit: true, personalXp: 30, flag: { key: 'hw_family_aboard', value: true } },
          },
          partial: {
            text: 'They agree, then need most of a day to close out a lease and collect somebody else. It costs you the afternoon but they show up.',
            effects: { hours: 7, morale: 4, recruit: true, personalXp: 15, flag: { key: 'hw_family_aboard', value: true } },
          },
          failure: {
            text: 'You push too hard on the wrong point and they get defensive. They take the bags back and say they will call. They do not call today.',
            effects: { morale: -5, crewStress: 4, flag: { key: 'hw_family_pending', value: true } },
          },
          criticalFailure: {
            text: 'It turns into the argument you have both been having for twenty years, in public, at a gate. They leave angry and you are left explaining it to the dock crew.',
            effects: { morale: -11, crewStress: 8, flag: { key: 'hw_family_estranged', value: true } },
          },
        },
      },
      {
        id: 'be-ready',
        label: 'Tell them to be at the pad when you call',
        hint: 'Honest. Also a promise you may not be able to keep.',
        effects: { hours: 1 },
        result: {
          text: 'They nod like it is a real plan. You watch them carry the bags back toward the transit line and you do not feel good about it.',
          effects: { morale: -4, crewStress: 3, flag: { key: 'hw_family_pending', value: true } },
        },
      },
      {
        id: 'refuse',
        label: 'Tell them the truth: there is no berth',
        hint: 'Saves food, air and weight. Costs everything else.',
        effects: { hours: 1 },
        result: {
          text: 'You explain the life support numbers out loud, which is somehow worse than lying. They say they understand. They do not look back.',
          effects: { morale: -13, crewStress: 9, flag: { key: 'hw_family_refused', value: true } },
        },
      },
    ],
  },

  {
    id: 'hw-family-holdout',
    scope: ['homeworld'],
    title: 'The One Who Will Not Go',
    body: '{actor} still has a shift roster, a lease, and an elderly neighbour who cannot manage the transit stairs alone. They are not in denial about the forecasts. They have simply decided that leaving means abandoning someone, and they will not do it.',
    weight: 9,
    conditions: { once: true },
    tags: ['family', 'moral-cost', 'departure'],
    choices: [
      {
        id: 'argue',
        label: 'Make the case, properly, one more time',
        hint: '3 hours. You know exactly which argument they respect.',
        check: {
          skill: 'persuasion',
          secondarySkill: 'negotiation',
          participation: 'individual',
          modifiers: [{ label: 'They have heard it all before', value: -8 }],
        },
        effects: { hours: 3 },
        outcomes: {
          exceptional: {
            text: 'You do not argue. You ask what it would take, then you solve it in front of them. They pack that evening and bring the neighbour with them.',
            effects: { morale: 10, food: -4, recruit: true, personalXp: 50 },
          },
          success: {
            text: 'They go quiet, then start listing what they would need to close out. That list is short enough to be an agreement.',
            effects: { morale: 6, personalXp: 30, flag: { key: 'hw_family_pending', value: true } },
          },
          partial: {
            text: 'They will come if the neighbour is placed somewhere safe first. It is a condition, not a refusal, and it is going to cost you a day you do not have.',
            effects: { hours: 6, morale: 2, personalXp: 15, flag: { key: 'hw_family_pending', value: true } },
          },
          failure: {
            text: 'They thank you for coming and change the subject to the weather, which on this planet is a very deliberate thing to do.',
            effects: { morale: -5, crewStress: 4 },
          },
          criticalFailure: {
            text: 'You call it selfish out loud. They stop talking mid-sentence and show you the door, and you spend the walk back knowing you were the one who ended it.',
            effects: { morale: -12, crewStress: 10, flag: { key: 'hw_family_estranged', value: true } },
          },
        },
      },
      {
        id: 'clear-obstacle',
        label: 'Get the neighbour a clean medical clearance',
        hint: '5 hours. Remove the reason instead of arguing with it.',
        check: {
          skill: 'medicalDiagnostics',
          secondarySkill: 'firstAid',
          participation: 'individual',
        },
        effects: { hours: 5, medicine: -2 },
        outcomes: {
          exceptional: {
            text: 'The old man is in better shape than anyone assumed — bad hip, good heart. You write it up, the shelter takes him on the priority list, and the objection evaporates.',
            effects: { morale: 9, recruit: true, personalXp: 45 },
          },
          success: {
            text: 'You stabilise the hip, document everything, and hand the file to a shelter intake officer who actually reads it. Placement confirmed.',
            effects: { morale: 6, personalXp: 30, flag: { key: 'hw_family_pending', value: true } },
          },
          partial: {
            text: 'The clearance goes through but the placement queue is four days deep. You have bought a maybe, not a yes.',
            effects: { morale: 2, personalXp: 12, flag: { key: 'hw_family_pending', value: true } },
          },
          failure: {
            text: 'The intake officer wants a specialist countersignature that no longer exists in this district. The file goes in a pile.',
            effects: { morale: -4, medicine: -1, crewStress: 3 },
          },
          criticalFailure: {
            text: 'You miss an arrhythmia. He collapses in the corridor and the whole household now associates you with the ambulance. Nobody is going anywhere with you.',
            effects: { morale: -10, medicine: -3, crewStress: 9, flag: { key: 'hw_family_estranged', value: true } },
          },
        },
      },
      {
        id: 'leave-supplies',
        label: 'Leave them supplies and go',
        hint: 'You cannot carry someone who has planted their feet.',
        requires: { minFood: 6, minMedicine: 2 },
        effects: { hours: 2 },
        result: {
          text: 'You stack rations and a medkit on their table and neither of you pretends it changes anything. They walk you down to the street.',
          effects: { food: -6, medicine: -2, morale: -3, crewStress: 4, flag: { key: 'hw_family_supplied', value: true } },
        },
      },
      {
        id: 'walk',
        label: 'Walk away and stop coming back',
        hint: 'Costs an hour and a piece of you.',
        effects: { hours: 1 },
        result: {
          text: 'You do not slam anything. You just stop climbing those stairs, and the decision sits in your chest for the rest of the week.',
          effects: { morale: -8, crewStress: 7 },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Work, jobs, contracts
  // -------------------------------------------------------------------------
  {
    id: 'hw-evac-convoy-shift',
    scope: ['homeworld'],
    title: 'Convoy Rotation, Southern Districts',
    body: 'The evacuation authority is short on qualified pilots and openly says so. They will pay day rates and fuel credit to anyone who can run loaded lifters from the southern districts to the orbital transfer pads. The rosters are long, the airframes are tired, and the ash haze is thickening by the hour.',
    weight: 11,
    tags: ['job', 'evacuation', 'piloting'],
    choices: [
      {
        id: 'full-rotation',
        label: 'Sign on for a full rotation',
        hint: '22 hours. Good money, exhausting, and the haze does not care how tired you are.',
        check: {
          skill: 'piloting',
          secondarySkill: 'navigation',
          participation: 'group',
          modifiers: [{ label: 'Particulate haze, degraded visibility', value: -10 }],
        },
        effects: { hours: 22, crewStress: 8 },
        outcomes: {
          exceptional: {
            text: 'Your crew moves more people in a shift than anyone on the roster. The dispatch chief tops up your tanks personally and asks if you want the same slot tomorrow.',
            effects: { credits: 1400, fuel: 12, morale: 6, crewXp: 90, flag: { key: 'hw_evac_reputation', value: true } },
          },
          success: {
            text: 'Eleven runs, no incidents, and a queue that finally moves. The pay clears before you are off the pad.',
            effects: { credits: 950, fuel: 6, morale: 3, crewXp: 60 },
          },
          partial: {
            text: 'Two lifters go down with fouled intakes and you spend a third of the shift on the ground. You get paid for what you flew.',
            effects: { credits: 480, crewStress: 4, crewXp: 35 },
          },
          failure: {
            text: 'A gate marshal reroutes you into a stalled corridor and you burn most of the shift holding position. The day rate barely covers what you burned getting there.',
            effects: { credits: 160, fuel: -4, morale: -4, crewStress: 6, crewXp: 15 },
          },
          criticalFailure: {
            text: 'You clip a gantry on a haze approach and put a loaded lifter down hard. Nobody dies. The inquiry takes the rest of the day and your name goes on a list.',
            effects: { credits: 0, morale: -9, crewStress: 14, wound: { severityScore: 34, damageType: 'blunt' }, flag: { key: 'hw_evac_blacklisted', value: true } },
          },
        },
      },
      {
        id: 'half-shift',
        label: 'Take a half shift only',
        hint: '9 hours. Less money, less exposure, back before the haze peaks.',
        check: {
          skill: 'piloting',
          participation: 'duo',
        },
        effects: { hours: 9, crewStress: 3 },
        outcomes: {
          exceptional: {
            text: 'Four clean runs and an early release. The dispatcher marks you as reliable, which on this world is a currency.',
            effects: { credits: 620, fuel: 4, morale: 3, crewXp: 45 },
          },
          success: {
            text: 'Three runs, paid on the pad, home before the ceiling drops.',
            effects: { credits: 400, crewXp: 30 },
          },
          partial: {
            text: 'One run cancels for weight. You get two thirds of the rate and a lot of standing around.',
            effects: { credits: 250, crewXp: 18 },
          },
          failure: {
            text: 'The slot is filled by the time you clear the permit desk. You get a standby fee and an apology.',
            effects: { credits: 60, morale: -3, crewXp: 8 },
          },
          criticalFailure: {
            text: 'A hard landing cracks a strut and the authority docks the repair from your rate. You paid to work today.',
            effects: { credits: -140, hull: -5, morale: -6, crewStress: 8 },
          },
        },
      },
      {
        id: 'load-crew',
        label: 'Work the pads as loading crew instead',
        hint: '12 hours of backs and boxes. Safe, dull, and it pays in goods.',
        effects: { hours: 12, crewStress: 5 },
        result: {
          text: 'You move crates until your hands stop closing properly. The quartermaster pays out in stores because the credit terminals are down again.',
          effects: { credits: 220, food: 8, repairParts: 12, morale: -2, crewXp: 25 },
        },
      },
      {
        id: 'decline',
        label: 'Skip it — your own loading is not finished',
        hint: 'Nothing gained, nothing burned.',
        effects: { hours: 1 },
        result: {
          text: 'You watch the lifters climb out through the murk and go back to your own manifest. Somebody else flew those people.',
          effects: { morale: -2 },
        },
      },
    ],
  },

  {
    id: 'hw-machinist-contract',
    scope: ['homeworld'],
    title: 'The Shop on Ninth Terrace',
    body: 'A machine shop three streets from the pad is taking its last contracts before the owner ships out. He has a hard mount, a length of good rail, and no time to finish fitting it. He will trade the work for parts, credits, or the mount itself if you can do the job yourself.',
    weight: 9,
    conditions: { requiresShip: true },
    tags: ['job', 'shipwork', 'trade'],
    choices: [
      {
        id: 'fit-mount',
        label: 'Fit the hard mount to {ship} yourself',
        hint: '10 hours in his bay. His tools, your hands.',
        check: {
          skill: 'shipWeapons',
          secondarySkill: 'weaponsmithing',
          participation: 'duo',
        },
        effects: { hours: 10 },
        outcomes: {
          exceptional: {
            text: 'The mount seats true on the first alignment and the traverse runs sweet. He watches the last bolt go in and hands you the spare rail as well.',
            effects: { repairParts: 40, items: [{ itemId: 'shield_emitter', qty: 1, condition: 82 }], morale: 5, personalXp: 55, crewXp: 30 },
          },
          success: {
            text: 'Six hours of shimming and it sits square. He signs off on it and pays the balance in parts.',
            effects: { repairParts: 28, personalXp: 35, crewXp: 18 },
          },
          partial: {
            text: 'It holds, but the traverse binds at the extremes. Good enough to keep, not good enough to be proud of.',
            effects: { repairParts: 14, hull: -2, personalXp: 18 },
          },
          failure: {
            text: 'The mount will not seat without cutting a frame member you are not willing to cut. You give it back and eat the day.',
            effects: { morale: -3, crewStress: 4, personalXp: 8 },
          },
          criticalFailure: {
            text: 'A slipped cut opens a coolant run behind the plating. You spend the evening patching your own ship and paying him for the rail you ruined.',
            effects: { credits: -280, repairParts: -10, hull: -6, systems: { power: -8 }, crewStress: 9 },
          },
        },
      },
      {
        id: 'take-his-backlog',
        label: 'Clear his backlog for him instead',
        hint: '14 hours of other people mounts and brackets. Pays in credits.',
        check: {
          skill: 'weaponsmithing',
          secondarySkill: 'mechanicalEngineering',
          participation: 'individual',
        },
        effects: { hours: 14, crewStress: 4 },
        outcomes: {
          exceptional: {
            text: 'You clear the whole board and rebuild two actions that were written off. He pays the full contract value and throws in ammunition he cannot carry.',
            effects: { credits: 1100, items: [{ itemId: 'ammo_rifle', qty: 40 }, { itemId: 'ammo_pistol', qty: 30 }], personalXp: 50 },
          },
          success: {
            text: 'Eleven jobs off the board by evening. He pays out and shakes your hand like it mattered.',
            effects: { credits: 720, items: [{ itemId: 'ammo_pistol', qty: 20 }], personalXp: 32 },
          },
          partial: {
            text: 'You get through most of it. Two jobs need parts nobody in this district has any more.',
            effects: { credits: 380, personalXp: 16 },
          },
          failure: {
            text: 'Half the backlog turns out to need a jig he sold last month. You bill for the hours you actually worked.',
            effects: { credits: 130, morale: -2, personalXp: 6 },
          },
          criticalFailure: {
            text: 'A misheadspaced action lets go on the test bench. Nobody is hurt but the shop is out a customer and you are out the contract.',
            effects: { credits: -150, morale: -6, crewStress: 7, wound: { severityScore: 27, damageType: 'burn' } },
          },
        },
      },
      {
        id: 'buy-mount',
        label: 'Just buy the mount and go',
        hint: 'Fast. Expensive. Someone else fits it later.',
        requires: { minCredits: 600 },
        effects: { hours: 2, credits: -600 },
        result: {
          text: 'He wraps it in oiled cloth and helps you carry it to the cart. He does not haggle, which tells you what he thinks of his own timeline.',
          effects: { repairParts: 45, items: [{ itemId: 'welding_rig', qty: 1, condition: 70 }] },
        },
      },
      {
        id: 'pass',
        label: 'Not today',
        effects: { hours: 1 },
        result: {
          text: 'You tell him you will think about it. He says everyone says that, and starts packing the rail away.',
          effects: {},
        },
      },
    ],
  },

  {
    id: 'hw-clinic-triage-night',
    scope: ['homeworld'],
    title: 'Night Triage, District Clinic',
    body: 'The district clinic has lost half its staff to outbound transports and the other half to exhaustion. Crush injuries from the tremor zones keep arriving in ones and twos. The duty registrar sees your crew, sees hands, and stops pretending to be polite about it.',
    weight: 10,
    tags: ['medical', 'job', 'clinic'],
    choices: [
      {
        id: 'run-triage',
        label: 'Run triage until the queue clears',
        hint: '11 hours. Sorting the survivable from the not.',
        check: {
          skill: 'medicalDiagnostics',
          secondarySkill: 'firstAid',
          participation: 'individual',
          modifiers: [{ label: 'No imaging, failing lights', value: -6 }],
        },
        effects: { hours: 11, crewStress: 7 },
        outcomes: {
          exceptional: {
            text: 'You catch two internal bleeds that the on-shift nurse had marked as stable. The registrar signs you out with a full pharmacy draw and a standing invitation.',
            effects: { credits: 520, medicine: 8, morale: 7, personalXp: 55, flag: { key: 'hw_clinic_favour', value: true } },
          },
          success: {
            text: 'The queue is empty by morning and everyone in it is still breathing. They pay you out of the discretionary fund.',
            effects: { credits: 380, medicine: 5, morale: 4, personalXp: 35 },
          },
          partial: {
            text: 'You clear most of it. One call goes the wrong way and you will be thinking about it on the outbound burn.',
            effects: { credits: 220, medicine: 3, crewStress: 5, personalXp: 18 },
          },
          failure: {
            text: 'You are too slow to be useful and the registrar quietly moves you to fetching supplies. It is not cruelty, it is triage applied to you.',
            effects: { credits: 90, medicine: 1, morale: -4, personalXp: 8 },
          },
          criticalFailure: {
            text: 'You send a compartment-syndrome case to the low-priority bench. By the time anyone rechecks the limb it is past saving, and everyone in the room knows whose sheet it was.',
            effects: { credits: 0, morale: -11, crewStress: 15, personalXp: 4 },
          },
        },
      },
      {
        id: 'assist-surgery',
        label: 'Scrub in on the crush cases',
        hint: '9 hours at the table. Higher skill, higher stakes.',
        check: {
          skill: 'surgery',
          secondarySkill: 'medicalDiagnostics',
          participation: 'duo',
          criticalRisk: true,
        },
        effects: { hours: 9, crewStress: 8, medicine: -2 },
        outcomes: {
          exceptional: {
            text: 'Three limbs saved that should not have been. The clinic has nothing to pay you with but their surgical stock, and they give you all of it.',
            effects: { credits: 300, medicine: 11, items: [{ itemId: 'surgical_kit', qty: 1, condition: 88 }], morale: 9, personalXp: 65 },
          },
          success: {
            text: 'Long night, clean work, everyone off the table alive. They restock your kit before you leave.',
            effects: { credits: 260, medicine: 7, items: [{ itemId: 'medkit_field', qty: 1 }], morale: 5, personalXp: 40 },
          },
          partial: {
            text: 'You lose one and hold the rest. The surgeon says that is a good night here, which is its own kind of terrible.',
            effects: { credits: 180, medicine: 4, crewStress: 6, personalXp: 20 },
          },
          failure: {
            text: 'You are out of your depth and honest enough to say so before it costs someone. They put you on instruments and thank you anyway.',
            effects: { credits: 70, medicine: 2, morale: -3, personalXp: 10 },
          },
          criticalFailure: {
            text: 'A nicked vessel empties a patient faster than anyone can pack it. The room goes very quiet and then very loud, and you walk out into the ash with your hands still shaking.',
            effects: { credits: 0, medicine: -3, morale: -13, crewStress: 18, personalXp: 5 },
          },
        },
      },
      {
        id: 'donate-supplies',
        label: 'Hand over medicine and leave',
        hint: 'Costs stock. Buys goodwill you can spend later.',
        requires: { minMedicine: 4 },
        effects: { hours: 2, medicine: -4 },
        result: {
          text: 'The registrar counts the ampoules twice and writes your ship name in a ledger. She says if you need a berth for someone sick, come find her.',
          effects: { morale: 4, flag: { key: 'hw_clinic_favour', value: true }, crewXp: 15 },
        },
      },
      {
        id: 'not-tonight',
        label: 'Walk past',
        effects: { hours: 1 },
        result: {
          text: 'You keep walking. The queue outside the clinic is still there in the morning, longer.',
          effects: { morale: -3, crewStress: 2 },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Ship, parts, repair
  // -------------------------------------------------------------------------
  {
    id: 'hw-ship-auction-hall',
    scope: ['homeworld'],
    title: 'Impound Lot Liquidation',
    body: 'The port authority is liquidating impounded hulls before the yard closes for good. Nobody here can afford a whole ship, so the lots have been broken down: drive couplings, emitter arrays, sensor stacks, all of it sold as-is with no inspection window. The auctioneer is moving fast because he has a transport to catch.',
    weight: 8,
    conditions: { once: true, requiresShip: true },
    tags: ['auction', 'ship-parts', 'market'],
    choices: [
      {
        id: 'walk-the-lots',
        label: 'Walk the lots first and read the condition yourself',
        hint: '4 hours of crawling under scrap before the bidding starts.',
        check: {
          skill: 'scavenging',
          secondarySkill: 'mechanicalEngineering',
          participation: 'individual',
        },
        effects: { hours: 4 },
        outcomes: {
          exceptional: {
            text: 'Lot nineteen is catalogued as scrap and is a nearly new coupling with a cosmetic crack in the housing. You take it for the scrap price and nobody else bids.',
            effects: { credits: -180, items: [{ itemId: 'engine_coupling', qty: 1, condition: 91 }, { itemId: 'sensor_module', qty: 1, condition: 74 }], personalXp: 50 },
          },
          success: {
            text: 'You spot which lots have been water-damaged and bid only on the dry ones. Two solid pulls at fair money.',
            effects: { credits: -420, items: [{ itemId: 'power_cell', qty: 2, condition: 80 }, { itemId: 'coolant_flask', qty: 2 }], personalXp: 32 },
          },
          partial: {
            text: 'You get one good lot and one that is mostly corrosion under fresh paint. Net positive, barely.',
            effects: { credits: -350, repairParts: 30, items: [{ itemId: 'hull_patch', qty: 2 }], personalXp: 15 },
          },
          failure: {
            text: 'The bidding runs away from you on everything worth having. You leave with a crate of fasteners and sore knees.',
            effects: { credits: -80, repairParts: 8, morale: -2, personalXp: 6 },
          },
          criticalFailure: {
            text: 'You bid hard on a sealed emitter crate and win it. It is full of the packing foam somebody stole the emitter out of last month.',
            effects: { credits: -540, repairParts: 4, morale: -7, crewStress: 6 },
          },
        },
      },
      {
        id: 'bid-blind',
        label: 'Bid hard on the sealed drive lots',
        hint: 'No inspection. Big upside, real chance of buying garbage.',
        requires: { minCredits: 700 },
        check: {
          skill: 'negotiation',
          attributes: ['evaluation', 'decisionMaking'],
          participation: 'individual',
          criticalRisk: true,
        },
        effects: { hours: 3, credits: -700 },
        outcomes: {
          exceptional: {
            text: 'The crate holds a matched coupling pair and a spare emitter, all service-tagged within the year. The auctioneer looks physically ill when you open it.',
            effects: { items: [{ itemId: 'engine_coupling', qty: 2, condition: 88 }, { itemId: 'shield_emitter', qty: 1, condition: 85 }], morale: 6, personalXp: 45 },
          },
          success: {
            text: 'Solid haul: a good coupling and enough spares to keep it running.',
            effects: { items: [{ itemId: 'engine_coupling', qty: 1, condition: 78 }], repairParts: 55, personalXp: 28 },
          },
          partial: {
            text: 'Serviceable but tired. It will get you out of the system and probably no further.',
            effects: { items: [{ itemId: 'engine_coupling', qty: 1, condition: 44 }], repairParts: 20, personalXp: 12 },
          },
          failure: {
            text: 'Two thirds of the crate is unusable. You break the rest down for stock and try not to think about the price.',
            effects: { repairParts: 25, morale: -5 },
          },
          criticalFailure: {
            text: 'Under the tarp is a seized assembly somebody welded shut to hide the damage. The auctioneer is on a transport by the time you find out.',
            effects: { repairParts: 6, morale: -9, crewStress: 8 },
          },
        },
      },
      {
        id: 'sell-into-it',
        label: 'Sell your own surplus into the crowd instead',
        hint: '3 hours. Everyone here is buying and nobody is choosy.',
        requires: { minRepairParts: 40 },
        check: {
          skill: 'negotiation',
          participation: 'individual',
        },
        effects: { hours: 3, repairParts: -40 },
        outcomes: {
          exceptional: {
            text: 'You break your surplus into small lots and let the panic do the pricing. It goes for triple what it is worth.',
            effects: { credits: 980, personalXp: 40 },
          },
          success: {
            text: 'Clean sale at good money to three separate buyers.',
            effects: { credits: 620, personalXp: 25 },
          },
          partial: {
            text: 'You unload most of it before the crowd thins out and take the rest home.',
            effects: { credits: 380, repairParts: 12, personalXp: 12 },
          },
          failure: {
            text: 'A larger seller undercuts you an hour in. You take what you can get.',
            effects: { credits: 200, repairParts: 15, morale: -2 },
          },
          criticalFailure: {
            text: 'The buyer pays in a credit chit drawn on a district bank that suspended operations yesterday afternoon.',
            effects: { credits: 40, morale: -8, crewStress: 6 },
          },
        },
      },
      {
        id: 'skip-auction',
        label: 'Leave before the bidding starts',
        hint: 'You keep your credits and your afternoon.',
        effects: { hours: 1 },
        result: {
          text: 'You listen to the first three lots go for absurd money and decide your existing parts will hold. Probably.',
          effects: {},
        },
      },
    ],
  },

  {
    id: 'hw-drydock-repair-slot',
    scope: ['homeworld'],
    title: 'One Slot Left in Bay Four',
    body: 'The last commercial drydock still lit on this side of the port has one slot open before the crew stands down permanently. The foreman will sell it to you, rent you the tools, or let you have the bay free if you fix his gantry hoist first. There is a queue behind you and he is not sentimental about it.',
    weight: 11,
    conditions: { requiresShip: true },
    tags: ['repair', 'drydock', 'shipwork'],
    choices: [
      {
        id: 'pay-for-yard',
        label: 'Pay the yard crew to do the work',
        hint: '8 hours, expensive, done properly.',
        requires: { minCredits: 900 },
        effects: { hours: 8, credits: -900 },
        result: {
          text: 'Four fitters swarm the hull with the practiced boredom of people who have done this ten thousand times. It is the best your ship has looked in months.',
          effects: { hull: 22, systems: { engines: 14, power: 10 }, morale: 4, log: 'Hull and drive work completed at Bay Four.' },
        },
      },
      {
        id: 'diy-slot',
        label: 'Rent the bay and do it yourself',
        hint: '13 hours. Cheaper, and you know your own ship.',
        requires: { minCredits: 200, minRepairParts: 25 },
        check: {
          skill: 'mechanicalEngineering',
          secondarySkill: 'electricalEngineering',
          participation: 'group',
        },
        effects: { hours: 13, credits: -200, repairParts: -25, crewStress: 5 },
        outcomes: {
          exceptional: {
            text: 'With real tools and a real lift, your crew does work you have been putting off for a year. Everything comes back tighter than spec.',
            effects: { hull: 26, systems: { engines: 16, power: 12, lifeSupport: 8 }, morale: 8, crewXp: 90 },
          },
          success: {
            text: 'Plating, seals, and a full drive service. Long day, good result.',
            effects: { hull: 18, systems: { engines: 10, power: 6 }, morale: 4, crewXp: 55 },
          },
          partial: {
            text: 'You get the hull sorted but run out of bay time before the drive service is finished.',
            effects: { hull: 12, systems: { engines: 3 }, crewXp: 30 },
          },
          failure: {
            text: 'Half the job turns into diagnosing why the last person to touch this ship did what they did. You close it up no worse than you opened it.',
            effects: { hull: 4, repairParts: -5, morale: -3, crewXp: 12 },
          },
          criticalFailure: {
            text: 'A hoist strap lets go with a plate half-seated. The plate is scrap, the mounting is bent, and somebody in your crew is going to be sore for a week.',
            effects: { hull: -8, repairParts: -15, crewStress: 12, wound: { severityScore: 42, damageType: 'blunt' }, morale: -7 },
          },
        },
      },
      {
        id: 'fix-his-hoist',
        label: 'Fix the foreman gantry hoist for the free slot',
        hint: '6 hours on his problem, then the bay is yours.',
        check: {
          skill: 'electricalEngineering',
          secondarySkill: 'mechanicalEngineering',
          participation: 'duo',
        },
        effects: { hours: 6 },
        outcomes: {
          exceptional: {
            text: 'The fault is a corroded interlock nobody thought to check. You fix it in ninety minutes and he gives you the bay, the tools, and two of his fitters.',
            effects: { hull: 20, systems: { engines: 12, power: 8 }, repairParts: 20, morale: 6, personalXp: 55 },
          },
          success: {
            text: 'The hoist lifts clean again. He hands you the bay key and goes to sit down.',
            effects: { hull: 14, systems: { power: 8 }, repairParts: 10, personalXp: 35 },
          },
          partial: {
            text: 'It works, mostly, and he honours the deal at half the bay time. You patch what you can.',
            effects: { hull: 8, systems: { power: 4 }, personalXp: 18 },
          },
          failure: {
            text: 'The controller board is beyond field repair. He is decent about it and sells you the slot at a discount instead.',
            effects: { credits: -450, hull: 10, morale: -2, personalXp: 8 },
          },
          criticalFailure: {
            text: 'You back-feed the control run and cook the hoist for good. The bay closes an hour later and the queue behind you is very vocal about it.',
            effects: { credits: -300, morale: -8, crewStress: 10, flag: { key: 'hw_yard_banned', value: true } },
          },
        },
      },
      {
        id: 'give-up-slot',
        label: 'Give the slot to the ship behind you',
        hint: 'Costs the repair. Buys something less countable.',
        effects: { hours: 1 },
        result: {
          text: 'The family behind you have four children and a hull breach they have been taping shut. Their captain does not know what to say, so he just shakes your hand for too long.',
          effects: { morale: 7, crewXp: 20, flag: { key: 'hw_yard_goodwill', value: true } },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Infrastructure and disaster
  // -------------------------------------------------------------------------
  {
    id: 'hw-district-blackout',
    scope: ['homeworld'],
    title: 'Grid Segment Nine Goes Dark',
    body: 'The lights across four blocks drop at once, including the pad floods and the pumps in the transit sublevels. A grid tech with more responsibility than training is at the substation with a schematic she does not fully understand. Below street level, water is starting to move where it should not.',
    weight: 12,
    tags: ['infrastructure', 'blackout', 'engineering'],
    choices: [
      {
        id: 'fix-substation',
        label: 'Get into the substation and bring the segment back',
        hint: '5 hours with live bus bars and no isolation confirmation.',
        check: {
          skill: 'electricalEngineering',
          participation: 'duo',
          criticalRisk: true,
          modifiers: [{ label: 'Working live, no proper isolation', value: -12 }],
        },
        effects: { hours: 5, crewStress: 6 },
        outcomes: {
          exceptional: {
            text: 'You find a failed sync relay in twenty minutes and bring the segment up in stages so nothing else trips. Four blocks and the pumps come back at once.',
            effects: { credits: 640, morale: 9, repairParts: 25, personalXp: 60, flag: { key: 'hw_grid_favour', value: true } },
          },
          success: {
            text: 'Segment nine is back inside three hours. The tech writes your name on the incident log with something like relief.',
            effects: { credits: 420, morale: 5, repairParts: 12, personalXp: 38 },
          },
          partial: {
            text: 'You get the pumps and the pad floods back. The residential blocks stay dark until a proper crew arrives.',
            effects: { credits: 220, morale: 2, personalXp: 18 },
          },
          failure: {
            text: 'The fault is upstream, past the substation, in a run nobody can reach. You spend five hours proving that.',
            effects: { morale: -4, crewStress: 5, personalXp: 8 },
          },
          criticalFailure: {
            text: 'A phase you were told was dead was not. The arc puts you on your back and the segment stays down for another day.',
            effects: { morale: -8, crewStress: 14, wound: { severityScore: 55, damageType: 'burn' }, medicine: -3 },
          },
        },
      },
      {
        id: 'pull-cable',
        label: 'Strip the dead runs while the power is off',
        hint: '6 hours. There is a lot of good copper in a dark grid.',
        check: {
          skill: 'scavenging',
          secondarySkill: 'electricalEngineering',
          participation: 'group',
        },
        effects: { hours: 6, crewStress: 4 },
        outcomes: {
          exceptional: {
            text: 'You pull three hundred metres of heavy conductor and two intact junction cabinets before anyone official arrives.',
            effects: { repairParts: 95, items: [{ itemId: 'power_cell', qty: 2, condition: 72 }], credits: 260, crewXp: 55 },
          },
          success: {
            text: 'Good copper, clean pull, out before the crews arrive.',
            effects: { repairParts: 60, credits: 140, crewXp: 35 },
          },
          partial: {
            text: 'You get a decent haul before a marshal moves you on. No trouble, just a shortened evening.',
            effects: { repairParts: 30, crewXp: 18 },
          },
          failure: {
            text: 'Somebody stripped this run last week. You find bare conduit and old cut marks.',
            effects: { repairParts: 6, morale: -3, crewXp: 6 },
          },
          criticalFailure: {
            text: 'The segment re-energises while your cutters are still in the tray. Nobody dies, but a marshal takes your names and your tools.',
            effects: { repairParts: 0, credits: -180, morale: -7, crewStress: 11, wound: { severityScore: 30, damageType: 'burn' } },
          },
        },
      },
      {
        id: 'help-sublevel',
        label: 'Go down and get people out of the sublevels',
        hint: '4 hours in rising water and no lighting.',
        check: {
          skill: 'exploration',
          secondarySkill: 'firstAid',
          attributes: ['perception', 'composure'],
          participation: 'group',
        },
        effects: { hours: 4, crewStress: 7 },
        outcomes: {
          exceptional: {
            text: 'You find a stalled transit car with nineteen people in it and walk every one of them up to street level. One of them offers to come with you and means it.',
            effects: { morale: 11, recruit: true, crewXp: 70, flag: { key: 'hw_sublevel_hero', value: true } },
          },
          success: {
            text: 'Eleven people out, wet and shaken and alive. The district marshal thanks your crew by name.',
            effects: { morale: 7, credits: 180, crewXp: 45 },
          },
          partial: {
            text: 'You get most of them out. Two side passages flood before you can check them and nobody will ever know what was in there.',
            effects: { morale: 2, crewStress: 6, crewXp: 25 },
          },
          failure: {
            text: 'The water comes up faster than you can work and you have to pull your own people back. Everyone who got out got out on their own.',
            effects: { morale: -6, crewStress: 10, crewXp: 10 },
          },
          criticalFailure: {
            text: 'A section of ceiling comes down across the access stair behind your party. Getting out costs you more than going in did.',
            effects: { morale: -10, crewStress: 17, wound: { severityScore: 62, damageType: 'blunt' }, medicine: -4 },
          },
        },
      },
      {
        id: 'secure-ship',
        label: 'Go back and secure the ship instead',
        hint: 'The pad floods are down too, and yours is not the only ship here.',
        effects: { hours: 2 },
        result: {
          text: 'You sit in the dark hold with a hand light and listen to people shouting four streets away. Nothing of yours gets taken tonight.',
          effects: { morale: -4, crewStress: 3, flag: { key: 'hw_ship_secured', value: true } },
        },
      },
    ],
  },

  {
    id: 'hw-tremor-collapse-rescue',
    scope: ['homeworld'],
    title: 'Stairwell, Ninth Block',
    body: 'A mantle tremor drops the stair core of a residential tower two streets from the pad. Dust is still settling and the district response is committed elsewhere. Somebody is knocking on concrete from inside the void under the collapsed flight, steady and rhythmic, the way people knock when they have been doing it for a while.',
    weight: 9,
    conditions: { minCrew: 2 },
    tags: ['disaster', 'rescue', 'mantle'],
    choices: [
      {
        id: 'dig',
        label: 'Dig them out by hand',
        hint: '5 hours moving slab. The structure above you is not finished moving.',
        check: {
          skill: 'exploration',
          secondarySkill: 'mechanicalEngineering',
          attributes: ['strength', 'endurance'],
          participation: 'group',
          criticalRisk: true,
          modifiers: [{ label: 'Unstable overhead, aftershock risk', value: -10 }],
        },
        effects: { hours: 5, crewStress: 10 },
        outcomes: {
          exceptional: {
            text: 'You open a channel to the void in ninety minutes and bring out four people, all of them walking. One is a structural fitter who asks where your ship is berthed.',
            effects: { morale: 12, recruit: true, crewXp: 85, personalXp: 40, flag: { key: 'hw_tower_rescue', value: true } },
          },
          success: {
            text: 'Two out, dusty and dehydrated and entirely alive. The district crew arrives to take over as you are pulling the second one clear.',
            effects: { morale: 8, credits: 220, crewXp: 55, personalXp: 25 },
          },
          partial: {
            text: 'You reach one of them. The knocking from deeper in stops before you can get to it, and you do not talk about that on the walk back.',
            effects: { morale: 1, crewStress: 9, crewXp: 30 },
          },
          failure: {
            text: 'The slab you need to move is holding up everything above it. A response engineer arrives, looks at your work, and tells you to stop.',
            effects: { morale: -6, crewStress: 8, crewXp: 12 },
          },
          criticalFailure: {
            text: 'The aftershock arrives while your party is inside the void. You get most of your people out and you do not get all of them.',
            effects: { morale: -15, crewStress: 20, loseCrew: true, wound: { severityScore: 66, damageType: 'blunt' }, medicine: -5 },
          },
        },
      },
      {
        id: 'shaped-charge',
        label: 'Cut the slab with a shaped charge',
        hint: '2 hours. Fast, precise, and completely unforgiving.',
        requires: { skill: { skill: 'explosives', min: 30 } },
        check: {
          skill: 'explosives',
          participation: 'individual',
          criticalRisk: true,
        },
        effects: { hours: 2, crewStress: 8 },
        outcomes: {
          exceptional: {
            text: 'One charge, correctly placed, drops exactly the section you wanted and nothing else. Everyone underneath walks out inside the hour.',
            effects: { morale: 12, credits: 300, personalXp: 65, crewXp: 40, flag: { key: 'hw_tower_rescue', value: true } },
          },
          success: {
            text: 'The cut opens clean and the void is accessible. Three people out, one badly bruised.',
            effects: { morale: 8, credits: 180, personalXp: 40, medicine: -2 },
          },
          partial: {
            text: 'The charge shifts the slab but does not free it. You end up digging anyway, three hours behind where you would have been.',
            effects: { hours: 4, morale: 2, crewStress: 7, personalXp: 18 },
          },
          failure: {
            text: 'You cannot find a placement you would stake a life on, so you do not fire. That is the right call and it still feels like nothing.',
            effects: { morale: -4, crewStress: 6, personalXp: 8 },
          },
          criticalFailure: {
            text: 'The charge takes a load-bearing element with it. The void closes, the tower groans, and everyone standing nearby runs.',
            effects: { morale: -15, crewStress: 20, wound: { severityScore: 58, damageType: 'blunt' }, medicine: -4, flag: { key: 'hw_tower_disaster', value: true } },
          },
        },
      },
      {
        id: 'stabilise-casualties',
        label: 'Set up outside and treat whoever comes out',
        hint: '4 hours. Useful, safe, and you will never know what was under the slab.',
        check: {
          skill: 'firstAid',
          secondarySkill: 'medicalDiagnostics',
          participation: 'duo',
        },
        effects: { hours: 4, medicine: -3, crewStress: 5 },
        outcomes: {
          exceptional: {
            text: 'You run a clean casualty point on the pavement and every crush case that comes out of that stair goes to the clinic stable.',
            effects: { morale: 8, credits: 260, medicine: 4, personalXp: 50, flag: { key: 'hw_clinic_favour', value: true } },
          },
          success: {
            text: 'Six treated, all of them transported. A response medic restocks your kit before she leaves.',
            effects: { morale: 5, medicine: 3, personalXp: 32 },
          },
          partial: {
            text: 'You do what you can with what you brought, which runs out before the casualties do.',
            effects: { morale: 1, crewStress: 4, personalXp: 15 },
          },
          failure: {
            text: 'The district team arrives with a proper trauma bag and you become the people holding lights.',
            effects: { morale: -2, personalXp: 6 },
          },
          criticalFailure: {
            text: 'You miss a tension pneumothorax under all the dust and grey clothing. He arrests on the pavement in front of the crowd.',
            effects: { morale: -11, crewStress: 15, medicine: -2 },
          },
        },
      },
      {
        id: 'report-and-go',
        label: 'Report it to the district net and keep moving',
        hint: 'Correct. Also the thing you will remember later.',
        effects: { hours: 1 },
        result: {
          text: 'You file the location and the sound you heard, and the automated voice tells you response is committed for the next six hours. You walk back to the pad through the dust.',
          effects: { morale: -7, crewStress: 6 },
        },
      },
    ],
  },

  {
    id: 'hw-scrubber-volunteer',
    scope: ['homeworld'],
    title: 'Catalyst Station Twelve',
    body: 'The atmospheric scrubber stations are running past their maintenance intervals because the technicians who serviced them are already off-world. Station Twelve has a bank of failing exchangers and a supervisor who will take any hands with electrical training. Nobody pretends this fixes the problem. It buys weeks for a planet that needs years.',
    weight: 10,
    tags: ['atmosphere', 'volunteer', 'engineering'],
    choices: [
      {
        id: 'full-bank',
        label: 'Rebuild the whole exchanger bank',
        hint: '16 hours, all hands, filthy work in a sealed gallery.',
        check: {
          skill: 'electricalEngineering',
          secondarySkill: 'mechanicalEngineering',
          participation: 'group',
          modifiers: [{ label: 'Rebreathers, poor access, no spares', value: -8 }],
        },
        effects: { hours: 16, crewStress: 9 },
        outcomes: {
          exceptional: {
            text: 'The bank comes back at ninety percent of rated throughput, better than it has run in a year. The authority pays a hazard bonus and quietly tops off your tanks.',
            effects: { credits: 1250, fuel: 14, medicine: 4, morale: 10, crewXp: 100, flag: { key: 'hw_atmo_credit', value: true } },
          },
          success: {
            text: 'Eleven exchangers back on line by the end of the shift. The supervisor shakes every hand in your crew.',
            effects: { credits: 820, fuel: 8, morale: 6, crewXp: 65 },
          },
          partial: {
            text: 'Seven of twelve. The rest need parts that stopped shipping in from the moons two weeks ago.',
            effects: { credits: 450, fuel: 3, crewXp: 35 },
          },
          failure: {
            text: 'The control loop keeps rejecting the rebuilt units and nobody on site can say why. You are paid for the hours and sent home.',
            effects: { credits: 180, morale: -4, crewStress: 6, crewXp: 12 },
          },
          criticalFailure: {
            text: 'A hot line into the exchanger gallery lets go while your crew is in it. The gallery seals as designed, with people inside, until the purge cycle finishes.',
            effects: { credits: 100, morale: -10, crewStress: 18, wound: { severityScore: 52, damageType: 'burn' }, medicine: -5 },
          },
        },
      },
      {
        id: 'diagnostics-only',
        label: 'Run diagnostics and hand them a fault list',
        hint: '5 hours of instrument work. Less pay, no gallery time.',
        check: {
          skill: 'computers',
          secondarySkill: 'electricalEngineering',
          participation: 'individual',
        },
        effects: { hours: 5 },
        outcomes: {
          exceptional: {
            text: 'Your fault list finds a controller firmware regression that has been throttling four stations across the district. That is worth more than a day of wrenching.',
            effects: { credits: 700, dataCores: 1, morale: 7, personalXp: 55, flag: { key: 'hw_atmo_credit', value: true } },
          },
          success: {
            text: 'Clean, itemised, actionable. The supervisor pays you and starts working the list immediately.',
            effects: { credits: 420, morale: 3, personalXp: 35 },
          },
          partial: {
            text: 'Half the sensor loop reads garbage and you can only characterise what you can measure.',
            effects: { credits: 210, personalXp: 16 },
          },
          failure: {
            text: 'Their diagnostic bus is a proprietary standard that died with the vendor. You get nowhere in five hours.',
            effects: { credits: 60, morale: -3, personalXp: 6 },
          },
          criticalFailure: {
            text: 'You push a configuration that trips the station into safe mode for two hours. Two hours of a scrubber station offline is not a small thing here.',
            effects: { credits: 0, morale: -8, crewStress: 9, flag: { key: 'hw_atmo_blacklisted', value: true } },
          },
        },
      },
      {
        id: 'sell-them-parts',
        label: 'Sell them your spare parts and leave',
        hint: 'They need stock more than they need hands.',
        requires: { minRepairParts: 50 },
        effects: { hours: 2, repairParts: -50 },
        result: {
          text: 'The supervisor signs the transfer without haggling and has the crates open before you are out of the door. It is the most anyone has paid you for scrap.',
          effects: { credits: 760, morale: 2 },
        },
      },
      {
        id: 'no-time',
        label: 'You do not have the hours to spare',
        effects: { hours: 1 },
        result: {
          text: 'You look at the station stack venting grey into a grey sky and go back to your own loading. Somebody will do it. Probably.',
          effects: { morale: -3 },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Markets, sellers, scarcity
  // -------------------------------------------------------------------------
  {
    id: 'hw-desperate-seller',
    scope: ['homeworld'],
    title: 'A Case on the Pavement',
    body: 'A woman with a hard case is working the pad approach, offering the contents to anyone with a hull. She is not a dealer and does not know what she has — her husband was a survey geologist and this was his field kit. She wants a berth. Failing that, she wants credits, today, in hand.',
    weight: 11,
    tags: ['market', 'desperate-sale', 'appraisal'],
    choices: [
      {
        id: 'appraise',
        label: 'Open the case and actually look',
        hint: '2 hours. Know what it is before you price it.',
        check: {
          skill: 'scavenging',
          attributes: ['perception', 'evaluation'],
          participation: 'individual',
        },
        effects: { hours: 2 },
        outcomes: {
          exceptional: {
            text: 'Under the sample trays is a survey core reader with an intact dataset and a calibration certificate. You tell her exactly what it is worth, and pay her that.',
            effects: { credits: -650, items: [{ itemId: 'diagnostic_scanner', qty: 1, condition: 90 }, { itemId: 'handheld_scanner', qty: 1, condition: 85 }], dataCores: 1, morale: 5, personalXp: 55 },
          },
          success: {
            text: 'Good tools, well kept. You pay a fair price and she counts it twice on the pavement.',
            effects: { credits: -420, items: [{ itemId: 'handheld_scanner', qty: 1, condition: 78 }, { itemId: 'multitool', qty: 1, condition: 82 }], personalXp: 32 },
          },
          partial: {
            text: 'Half the kit is field-worn past usefulness. You buy the half that is not.',
            effects: { credits: -250, items: [{ itemId: 'multitool', qty: 1, condition: 60 }, { itemId: 'glow_rods', qty: 4 }], personalXp: 15 },
          },
          failure: {
            text: 'You cannot tell what most of it does, and neither can she. You pass, and feel the weight of that as you walk off.',
            effects: { morale: -3, personalXp: 6 },
          },
          criticalFailure: {
            text: 'You pay well over the odds for a scanner with a dead calibration module and a sensor head that has been dropped. She was not lying. You were just wrong.',
            effects: { credits: -520, items: [{ itemId: 'handheld_scanner', qty: 1, condition: 22 }], morale: -5 },
          },
        },
      },
      {
        id: 'lowball',
        label: 'Work her price down hard',
        hint: 'She has no other buyers today and you both know it.',
        check: {
          skill: 'negotiation',
          participation: 'individual',
          modifiers: [{ label: 'She is out of options', value: 12 }],
        },
        effects: { hours: 1 },
        outcomes: {
          exceptional: {
            text: 'She takes a fraction of what the kit is worth and thanks you for it. You get the case. You also get the look on her face.',
            effects: { credits: -140, items: [{ itemId: 'diagnostic_scanner', qty: 1, condition: 76 }, { itemId: 'handheld_scanner', qty: 1, condition: 70 }], morale: -5, personalXp: 40 },
          },
          success: {
            text: 'You settle at well under value and she agrees quickly, which is the part that stays with you.',
            effects: { credits: -220, items: [{ itemId: 'handheld_scanner', qty: 1, condition: 72 }, { itemId: 'multitool', qty: 1, condition: 70 }], morale: -3, personalXp: 25 },
          },
          partial: {
            text: 'She holds firmer than you expected and you meet somewhere near honest.',
            effects: { credits: -380, items: [{ itemId: 'handheld_scanner', qty: 1, condition: 72 }], personalXp: 12 },
          },
          failure: {
            text: 'She closes the case and walks. Somebody with more decency will buy it in ten minutes.',
            effects: { morale: -4 },
          },
          criticalFailure: {
            text: 'A dock marshal hears how you are talking to her and makes a point of standing between you until she has gone. Everyone at the pad approach saw it.',
            effects: { morale: -9, crewStress: 6, flag: { key: 'hw_pad_reputation_poor', value: true } },
          },
        },
      },
      {
        id: 'offer-berth',
        label: 'Offer her passage instead of credits',
        hint: 'Costs food, weight, and air. Gains a person.',
        requires: { minCrew: 1, minFood: 8 },
        effects: { hours: 3, food: -8 },
        result: {
          text: 'She hands you the case unopened, which is its own kind of statement, and asks what time she should be at the ramp. She is early.',
          effects: { items: [{ itemId: 'handheld_scanner', qty: 1, condition: 78 }, { itemId: 'multitool', qty: 1, condition: 74 }], recruit: true, morale: 8, crewXp: 30 },
        },
      },
      {
        id: 'decline-case',
        label: 'Tell her to try the port brokers',
        effects: { hours: 1 },
        result: {
          text: 'You point her toward the broker stalls and she nods like she has already been. She probably has.',
          effects: { morale: -2 },
        },
      },
    ],
  },

  {
    id: 'hw-market-panic-run',
    scope: ['homeworld'],
    title: 'The Price of Rations Doubles Before Noon',
    body: 'A forecast revision leaks onto the district net and the food halls empty in under an hour. Preserved stock triples, then triples again. The authority sends marshals to hold the queues but does nothing about the price, because there is nothing they can do about the price.',
    weight: 12,
    tags: ['market', 'panic', 'supply'],
    choices: [
      {
        id: 'buy-early',
        label: 'Buy hard before the second spike',
        hint: '3 hours in a queue. Expensive now, cheaper than tomorrow.',
        requires: { minCredits: 500 },
        check: {
          skill: 'negotiation',
          secondarySkill: 'persuasion',
          participation: 'individual',
        },
        effects: { hours: 3, credits: -500, crewStress: 3 },
        outcomes: {
          exceptional: {
            text: 'You get to a hall manager before he adjusts his board and take a pallet at yesterday prices.',
            effects: { food: 34, items: [{ itemId: 'preserved_meal', qty: 6 }], personalXp: 45 },
          },
          success: {
            text: 'A solid load of preserved stock at a bad price that will look like a good price by tomorrow.',
            effects: { food: 24, personalXp: 28 },
          },
          partial: {
            text: 'The board reprices while you are third in line. You buy anyway, less than you wanted.',
            effects: { food: 14, personalXp: 12 },
          },
          failure: {
            text: 'The hall closes its doors for restocking that never comes. You get a fraction of your order and a refund voucher.',
            effects: { food: 6, credits: 200, morale: -4 },
          },
          criticalFailure: {
            text: 'The pallet you paid for is loaded onto somebody else transport while you are arguing about the docket. The hall manager has already gone home.',
            effects: { food: 2, morale: -9, crewStress: 8 },
          },
        },
      },
      {
        id: 'sell-into-spike',
        label: 'Sell your own stores into the panic',
        hint: 'Credits now, hunger later. That is the whole trade.',
        requires: { minFood: 14 },
        check: {
          skill: 'negotiation',
          participation: 'individual',
          modifiers: [{ label: 'Buyers are not price sensitive today', value: 10 }],
        },
        effects: { hours: 2, food: -14 },
        outcomes: {
          exceptional: {
            text: 'You sell in small lots to individual families rather than to a reseller. Everyone pays more and nobody feels cheated.',
            effects: { credits: 1250, morale: 3, personalXp: 40 },
          },
          success: {
            text: 'Sold out in ninety minutes at four times list.',
            effects: { credits: 900, personalXp: 25 },
          },
          partial: {
            text: 'A reseller takes the lot in one go, which is fast and costs you the margin.',
            effects: { credits: 560, personalXp: 10 },
          },
          failure: {
            text: 'Marshals shut down informal selling on the concourse an hour after you set up. You keep half your stock and none of the sales.',
            effects: { credits: 220, food: 7, morale: -3 },
          },
          criticalFailure: {
            text: 'The crowd stops being a queue. You get out with your people and about a third of what you brought.',
            effects: { credits: 180, food: -2, morale: -8, crewStress: 12, combat: 'enc_desperate_looters' },
          },
        },
      },
      {
        id: 'find-supplier',
        label: 'Find a supplier who is not on the public boards',
        hint: '5 hours walking the freight lanes and asking.',
        check: {
          skill: 'scavenging',
          secondarySkill: 'persuasion',
          participation: 'individual',
        },
        effects: { hours: 5 },
        outcomes: {
          exceptional: {
            text: 'A canteen contractor with a warehouse full of institutional stock and no institution left to feed sells you the lot at cost.',
            effects: { credits: -320, food: 38, items: [{ itemId: 'stim_coffee', qty: 5 }], personalXp: 50 },
          },
          success: {
            text: 'A freight yard supervisor sells you what fell off a manifest. Fair price, no questions.',
            effects: { credits: -280, food: 22, personalXp: 32 },
          },
          partial: {
            text: 'You find one small seller with a small amount. Better than the halls, not by much.',
            effects: { credits: -240, food: 11, personalXp: 14 },
          },
          failure: {
            text: 'Everyone you ask has already been asked twice today. Five hours, no food.',
            effects: { morale: -4, crewStress: 4 },
          },
          criticalFailure: {
            text: 'The contact takes your deposit for a delivery to the pad tonight. There is no delivery and there was never a warehouse.',
            effects: { credits: -300, morale: -8, crewStress: 7 },
          },
        },
      },
      {
        id: 'ride-it-out',
        label: 'Stay out of it entirely',
        hint: 'You have what you have.',
        effects: { hours: 1 },
        result: {
          text: 'You count your own stores instead of fighting for someone else. The number is the number, and it has not changed.',
          effects: { crewStress: 2 },
        },
      },
    ],
  },

  {
    id: 'hw-fuel-depot-queue',
    scope: ['homeworld'],
    title: 'Allocation Day at the Depot',
    body: 'Fuel is on formal allocation now and the depot queue runs three blocks. Ships with evacuation contracts go first, ships with government charters second, everyone else takes what is left. A yard runner tells you there is a second gate on the north side that is not on the public board.',
    weight: 12,
    conditions: { requiresShip: true },
    tags: ['fuel', 'queue', 'scarcity'],
    choices: [
      {
        id: 'wait-queue',
        label: 'Queue properly and take the allocation',
        hint: '10 hours standing. Legal, certain, small.',
        effects: { hours: 10, crewStress: 5 },
        result: {
          text: 'You get to the head of the line at dusk and the clerk fills your allocation to the litre with the flat courtesy of someone doing this for the ninth hour.',
          effects: { fuel: 11, credits: -260, log: 'Standard fuel allocation drawn at the district depot.' },
        },
      },
      {
        id: 'argue-priority',
        label: 'Argue your way onto the priority list',
        hint: '3 hours and a story the allocation officer has to be able to defend.',
        check: {
          skill: 'persuasion',
          secondarySkill: 'negotiation',
          participation: 'individual',
          modifiers: [{ label: 'Officer has heard forty of these today', value: -10 }],
        },
        effects: { hours: 3 },
        outcomes: {
          exceptional: {
            text: 'You do not lie. You point out that your hull can carry evacuees on the outbound leg, and the officer writes you a charter number on the spot.',
            effects: { fuel: 26, credits: -380, morale: 6, personalXp: 55, flag: { key: 'hw_fuel_priority', value: true } },
          },
          success: {
            text: 'She bumps you into the second band. Not first, but you are fuelling before midnight.',
            effects: { fuel: 18, credits: -320, personalXp: 32 },
          },
          partial: {
            text: 'She gives you a supplementary draw on top of the standard allocation and tells you not to come back.',
            effects: { hours: 6, fuel: 14, credits: -280, personalXp: 14 },
          },
          failure: {
            text: 'You get the standard allocation and three hours of your life spent on nothing.',
            effects: { hours: 8, fuel: 9, credits: -260, morale: -3 },
          },
          criticalFailure: {
            text: 'You push a claim she can check and she checks it. Your name goes on the flagged list and the standard allocation is all you will ever get here.',
            effects: { hours: 8, fuel: 7, credits: -260, morale: -7, crewStress: 6, flag: { key: 'hw_depot_flagged', value: true } },
          },
        },
      },
      {
        id: 'north-gate',
        label: 'Try the north gate the runner mentioned',
        hint: '4 hours. Off the board means off the record, both ways.',
        check: {
          skill: 'stealth',
          secondarySkill: 'negotiation',
          participation: 'duo',
          criticalRisk: true,
        },
        effects: { hours: 4, crewStress: 5 },
        outcomes: {
          exceptional: {
            text: 'The north gate is run by a depot crew selling their own overage. You leave full, for cash, with nobody writing anything down.',
            effects: { fuel: 32, credits: -640, personalXp: 55 },
          },
          success: {
            text: 'A quiet transaction at the fence line. More fuel than the allocation, more money than the allocation.',
            effects: { fuel: 22, credits: -560, personalXp: 32 },
          },
          partial: {
            text: 'They will only sell a partial load and want the money up front. You take it.',
            effects: { fuel: 13, credits: -480, personalXp: 12 },
          },
          failure: {
            text: 'The gate is shut and a patrol is parked across it. You walk back around and join the ordinary queue eight hours behind where you started.',
            effects: { hours: 8, fuel: 9, credits: -260, morale: -4 },
          },
          criticalFailure: {
            text: 'The patrol was waiting for exactly this and they are not in a forgiving mood about depot theft this week.',
            effects: { fuel: 0, credits: -200, morale: -8, crewStress: 12, combat: 'enc_security_patrol', flag: { key: 'hw_depot_flagged', value: true } },
          },
        },
      },
      {
        id: 'skip-fuel',
        label: 'Skip the depot today',
        effects: { hours: 1 },
        result: {
          text: 'You look at the line, look at your tanks, and decide the tanks can wait one more day. That is a bet, and you have made it.',
          effects: { crewStress: 3 },
        },
      },
    ],
  },

  {
    id: 'hw-pharmacy-allocation',
    scope: ['homeworld'],
    title: 'Dispensary, Rationed',
    body: 'The district dispensary is issuing against clinical need only and the pharmacist behind the counter has been arguing with people since before dawn. Broad-spectrum antibiotics and analgesics are the choke points. Her back room is not empty. Her authority to open it is.',
    weight: 11,
    tags: ['medicine', 'rationing', 'clinic'],
    choices: [
      {
        id: 'clinical-case',
        label: 'Make a documented clinical case',
        hint: '3 hours writing up your crew properly.',
        check: {
          skill: 'medicalDiagnostics',
          secondarySkill: 'medicalResearch',
          participation: 'individual',
        },
        effects: { hours: 3 },
        outcomes: {
          exceptional: {
            text: 'Your workup is better than anything she has seen from the clinics this week. She issues against it in full and asks if you would review two of her problem cases.',
            effects: { credits: -180, medicine: 12, items: [{ itemId: 'antibiotics', qty: 3 }], morale: 5, personalXp: 55, flag: { key: 'hw_clinic_favour', value: true } },
          },
          success: {
            text: 'Clean documentation, defensible need, issued without argument.',
            effects: { credits: -160, medicine: 8, items: [{ itemId: 'painkillers', qty: 2 }], personalXp: 35 },
          },
          partial: {
            text: 'She issues the analgesics and holds the antibiotics back for the tremor wards. Reasonable, and short of what you need.',
            effects: { credits: -120, medicine: 4, personalXp: 15 },
          },
          failure: {
            text: 'Your paperwork does not meet the standard and she is past the point of doing anyone favours. Standard issue only.',
            effects: { credits: -90, medicine: 2, morale: -3 },
          },
          criticalFailure: {
            text: 'She spots an inconsistency in the workup and reads it as an attempt to game the allocation. Your ship name goes on a note by the terminal.',
            effects: { medicine: 0, morale: -8, crewStress: 7, flag: { key: 'hw_dispensary_flagged', value: true } },
          },
        },
      },
      {
        id: 'buy-out-back',
        label: 'Offer to buy from the back room at her price',
        hint: 'Fast, costly, and puts her career on the table with your credits.',
        requires: { minCredits: 800 },
        check: {
          skill: 'negotiation',
          attributes: ['socialAwareness', 'composure'],
          participation: 'individual',
          criticalRisk: true,
        },
        effects: { hours: 2 },
        outcomes: {
          exceptional: {
            text: 'She is leaving on a transport in six days and the stock expires in four months. The maths makes itself and she sells you a crate.',
            effects: { credits: -760, medicine: 15, items: [{ itemId: 'surgical_kit', qty: 1 }, { itemId: 'blood_substitute', qty: 2 }], personalXp: 50 },
          },
          success: {
            text: 'A quiet arrangement at an unquiet price. You leave with the bag under your coat.',
            effects: { credits: -820, medicine: 10, items: [{ itemId: 'antibiotics', qty: 2 }], personalXp: 30 },
          },
          partial: {
            text: 'She will part with the analgesics and nothing else. She has her limits and she is keeping them.',
            effects: { credits: -420, medicine: 5, personalXp: 12 },
          },
          failure: {
            text: 'She tells you no in a tone that ends the conversation, and serves the next person in line.',
            effects: { morale: -3 },
          },
          criticalFailure: {
            text: 'A district auditor is in the back office doing exactly the job the back office is for. The conversation stops being about medicine very quickly.',
            effects: { credits: -400, morale: -9, crewStress: 10, flag: { key: 'hw_dispensary_flagged', value: true } },
          },
        },
      },
      {
        id: 'back-door',
        label: 'Come back after hours and open the back room yourself',
        hint: '4 hours at night. Theft from a district dispensary, with all that implies.',
        check: {
          skill: 'lockpicking',
          secondarySkill: 'stealth',
          participation: 'duo',
          criticalRisk: true,
          modifiers: [{ label: 'Marshal patrols on a fixed loop', value: -8 }],
        },
        effects: { hours: 4, crewStress: 9 },
        outcomes: {
          exceptional: {
            text: 'Two locks, eleven minutes, nothing disturbed. Whoever inventories that room in the morning will not know anyone was in it.',
            effects: { medicine: 14, items: [{ itemId: 'antibiotics', qty: 3 }, { itemId: 'stim_shot', qty: 2 }], morale: -3, personalXp: 55 },
          },
          success: {
            text: 'In and out with what you came for. You leave the analgesics for the tremor wards, which is not much of a conscience but it is what you have.',
            effects: { medicine: 9, items: [{ itemId: 'antibiotics', qty: 2 }], morale: -4, personalXp: 32 },
          },
          partial: {
            text: 'The inner cabinet defeats you. You take what was on the open shelves and go.',
            effects: { medicine: 4, morale: -5, crewStress: 5, personalXp: 12 },
          },
          failure: {
            text: 'The door is alarmed to the district net. You are three streets away before the response arrives, with nothing to show for the night.',
            effects: { morale: -6, crewStress: 10 },
          },
          criticalFailure: {
            text: 'A marshal unit rolls the corner while your people are still at the door. They are not interested in explanations about a dispensary in a rationing week.',
            effects: { credits: -350, morale: -10, crewStress: 15, combat: 'enc_security_patrol', flag: { key: 'hw_dispensary_flagged', value: true } },
          },
        },
      },
      {
        id: 'take-standard',
        label: 'Take the standard issue and go',
        effects: { hours: 2, credits: -70 },
        result: {
          text: 'Two vials and a strip of analgesics, signed for. It is not enough and everyone at the counter knows it is not enough.',
          effects: { medicine: 3 },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Salvage and access
  // -------------------------------------------------------------------------
  {
    id: 'hw-transit-tunnel-salvage',
    scope: ['homeworld'],
    title: 'The Closed Line',
    body: 'Transit line four has been sealed since the last tremor sequence and the authority has written off recovering it. There are maintenance bays down there full of stock nobody is coming back for. There is also standing water, no lighting, and a ceiling that has already proved it can move.',
    weight: 10,
    conditions: { minCrew: 2 },
    tags: ['salvage', 'underground', 'hazard'],
    choices: [
      {
        id: 'work-the-bays',
        label: 'Work the maintenance bays methodically',
        hint: '8 hours underground. Slow, deliberate, productive.',
        check: {
          skill: 'scavenging',
          secondarySkill: 'exploration',
          participation: 'group',
          modifiers: [{ label: 'No lighting, standing water', value: -8 }],
        },
        effects: { hours: 8, crewStress: 6 },
        outcomes: {
          exceptional: {
            text: 'Bay three still has a sealed spares cage and the key is in the supervisor desk, exactly where a supervisor would leave it during an evacuation.',
            effects: { repairParts: 140, items: [{ itemId: 'power_cell', qty: 3, condition: 84 }, { itemId: 'welding_rig', qty: 1, condition: 76 }, { itemId: 'glow_rods', qty: 6 }], credits: 240, crewXp: 80 },
          },
          success: {
            text: 'Cable, couplings, tooling, and a crate of filters. Four trips up the emergency stair and worth every one.',
            effects: { repairParts: 85, items: [{ itemId: 'life_support_filter', qty: 2 }, { itemId: 'multitool', qty: 1, condition: 68 }], crewXp: 50 },
          },
          partial: {
            text: 'Two bays are flooded past working depth. The third gives you enough to justify the day.',
            effects: { repairParts: 40, items: [{ itemId: 'hull_patch', qty: 2 }], crewXp: 28 },
          },
          failure: {
            text: 'Someone was here first and was thorough about it. You come up with a sack of fasteners and wet boots.',
            effects: { repairParts: 10, morale: -4, crewStress: 5, crewXp: 10 },
          },
          criticalFailure: {
            text: 'A section of tunnel liner comes down between your party and the stair. Getting out takes four extra hours and somebody gets badly caught doing it.',
            effects: { hours: 4, repairParts: 15, morale: -9, crewStress: 16, wound: { severityScore: 58, damageType: 'blunt' }, medicine: -4 },
          },
        },
      },
      {
        id: 'blast-access',
        label: 'Blow the collapsed section to reach the deep bays',
        hint: '5 hours. Opens the untouched part of the line. Or closes all of it.',
        requires: { skill: { skill: 'explosives', min: 25 } },
        check: {
          skill: 'explosives',
          secondarySkill: 'mechanicalEngineering',
          participation: 'trio',
          criticalRisk: true,
        },
        effects: { hours: 5, crewStress: 8 },
        outcomes: {
          exceptional: {
            text: 'A precise cut drops the blockage into the drainage void and opens two hundred metres of untouched line. Nobody has been in here since the day it sealed.',
            effects: { repairParts: 200, items: [{ itemId: 'engine_coupling', qty: 1, condition: 80 }, { itemId: 'sensor_module', qty: 1, condition: 72 }, { itemId: 'plasma_cutter', qty: 1, condition: 70 }], credits: 420, personalXp: 65, crewXp: 60 },
          },
          success: {
            text: 'The blockage opens and the deep bays are intact. You fill everything you brought to carry it in.',
            effects: { repairParts: 130, items: [{ itemId: 'power_cell', qty: 2, condition: 78 }], credits: 180, personalXp: 40, crewXp: 40 },
          },
          partial: {
            text: 'You open a crawl-sized gap and get one person through at a time. Slow, cramped, moderately worth it.',
            effects: { repairParts: 55, crewStress: 6, personalXp: 20, crewXp: 20 },
          },
          failure: {
            text: 'The charge does nothing useful to a mass that size. You have wasted material and made the whole crew nervous.',
            effects: { repairParts: -10, morale: -5, crewStress: 8, personalXp: 8 },
          },
          criticalFailure: {
            text: 'The shot brings down far more than the blockage. The line is gone, the surface street above it has a new depression in it, and someone has to explain that to a district marshal.',
            effects: { credits: -400, morale: -12, crewStress: 18, wound: { severityScore: 64, damageType: 'blunt' }, flag: { key: 'hw_marshal_attention', value: true } },
          },
        },
      },
      {
        id: 'quick-sweep',
        label: 'Quick sweep of the accessible platform only',
        hint: '3 hours. Low risk, low return, home for dinner.',
        effects: { hours: 3, crewStress: 2 },
        result: {
          text: 'You strip the platform lockers and the ticket hall and leave the tunnel mouth alone. Modest haul, everybody walks back up.',
          effects: { repairParts: 28, items: [{ itemId: 'glow_rods', qty: 3 }, { itemId: 'salvage_scrap', qty: 4 }], crewXp: 15 },
        },
      },
      {
        id: 'leave-tunnel',
        label: 'Leave it sealed',
        effects: { hours: 1 },
        result: {
          text: 'You look at the water reflecting your light back at you and decide the ship needs its crew more than it needs cable.',
          effects: {},
        },
      },
    ],
  },

  {
    id: 'hw-scrapyard-after-hours',
    scope: ['homeworld'],
    title: 'Vashenko Reclamation, After Dark',
    body: 'The reclamation yard behind the freight terminal is shuttered — the owner left on a charter four days ago and the fence is a formality. Half the yard is worthless. The bonded section, behind a real gate with a real lock, is not. There are two auto-loaders on a patrol circuit that nobody remembered to switch off.',
    weight: 9,
    tags: ['salvage', 'lockpicking', 'night-work'],
    choices: [
      {
        id: 'pick-bonded',
        label: 'Open the bonded gate quietly',
        hint: '4 hours. The lock is good and the drones are patient.',
        check: {
          skill: 'lockpicking',
          secondarySkill: 'stealth',
          participation: 'duo',
          modifiers: [{ label: 'Loader drones on a fixed circuit', value: -7 }],
        },
        effects: { hours: 4, crewStress: 6 },
        outcomes: {
          exceptional: {
            text: 'Six minutes on the gate and the drones never break stride. The bonded section is exactly what a bonded section should be.',
            effects: { repairParts: 150, items: [{ itemId: 'shield_emitter', qty: 1, condition: 86 }, { itemId: 'engine_coupling', qty: 1, condition: 82 }, { itemId: 'fuel_canister', qty: 2 }], credits: 300, personalXp: 60 },
          },
          success: {
            text: 'The gate opens without complaint and you take what you can carry in two trips.',
            effects: { repairParts: 90, items: [{ itemId: 'power_cell', qty: 2, condition: 80 }, { itemId: 'coolant_flask', qty: 2 }], personalXp: 38 },
          },
          partial: {
            text: 'You get the gate but a drone circuit forces you out early. One trip only.',
            effects: { repairParts: 45, items: [{ itemId: 'sensor_module', qty: 1, condition: 62 }], crewStress: 4, personalXp: 16 },
          },
          failure: {
            text: 'The lock is a mechanical-electronic hybrid and you cannot beat it in the dark with what you brought.',
            effects: { morale: -4, crewStress: 5, personalXp: 8 },
          },
          criticalFailure: {
            text: 'You trip the gate interlock and both loaders reclassify your party as an obstruction to be removed.',
            effects: { morale: -7, crewStress: 13, combat: 'enc_maintenance_drones' },
          },
        },
      },
      {
        id: 'open-yard',
        label: 'Work the open yard and leave the bonded gate alone',
        hint: '5 hours. Legal-ish, safe-ish, thin pickings.',
        check: {
          skill: 'scavenging',
          participation: 'group',
        },
        effects: { hours: 5, crewStress: 3 },
        outcomes: {
          exceptional: {
            text: 'Somebody dumped a whole hull section in the open yard rather than pay to book it in. It is full of usable structure.',
            effects: { repairParts: 110, items: [{ itemId: 'hull_patch', qty: 4 }, { itemId: 'salvage_scrap', qty: 8 }], crewXp: 55 },
          },
          success: {
            text: 'Steady work, decent metal, nothing exciting.',
            effects: { repairParts: 60, items: [{ itemId: 'salvage_scrap', qty: 5 }], crewXp: 32 },
          },
          partial: {
            text: 'Most of it is corroded past use. You fill half a cart.',
            effects: { repairParts: 26, items: [{ itemId: 'salvage_scrap', qty: 2 }], crewXp: 15 },
          },
          failure: {
            text: 'The yard has been picked over every night since the owner left. You find rust and other people footprints.',
            effects: { repairParts: 8, morale: -3, crewXp: 6 },
          },
          criticalFailure: {
            text: 'A stack shifts as your crew is pulling from it. The plate that comes down is heavier than anyone estimated.',
            effects: { repairParts: 12, morale: -6, crewStress: 11, wound: { severityScore: 46, damageType: 'blunt' } },
          },
        },
      },
      {
        id: 'kill-drones',
        label: 'Shut the loader drones down at the control shed first',
        hint: '2 hours. Do the boring safe thing before the interesting thing.',
        check: {
          skill: 'electricalEngineering',
          secondarySkill: 'computers',
          participation: 'individual',
        },
        effects: { hours: 2 },
        outcomes: {
          exceptional: {
            text: 'You not only park the loaders, you unlock the bonded gate from the shed terminal. The yard is yours until dawn.',
            effects: { repairParts: 170, items: [{ itemId: 'engine_coupling', qty: 1, condition: 84 }, { itemId: 'portable_terminal', qty: 1, condition: 78 }], credits: 260, personalXp: 60 },
          },
          success: {
            text: 'Both loaders parked and docked. Whatever you do next, you do it without machines walking into you.',
            effects: { repairParts: 30, flag: { key: 'hw_yard_drones_down', value: true }, personalXp: 35 },
          },
          partial: {
            text: 'One drone parks. The other drops into a fault state and keeps moving, slowly, in a way you do not entirely trust.',
            effects: { repairParts: 15, crewStress: 4, personalXp: 15 },
          },
          failure: {
            text: 'The shed terminal wants a maintenance credential you do not have and will not be argued with.',
            effects: { morale: -2, personalXp: 6 },
          },
          criticalFailure: {
            text: 'Your attempt registers as a tamper event. Both loaders drop patrol behaviour and go looking for the source.',
            effects: { morale: -6, crewStress: 12, combat: 'enc_maintenance_drones' },
          },
        },
      },
      {
        id: 'skip-yard',
        label: 'Not worth the marshal report',
        effects: { hours: 1 },
        result: {
          text: 'You walk the fence line once, price the risk honestly, and go back to the pad.',
          effects: {},
        },
      },
    ],
  },

  {
    id: 'hw-estate-sale-navcomp',
    scope: ['homeworld'],
    title: 'Estate Clearance, Terrace Row',
    body: 'An executor is clearing a dead pilot house before the block is sealed, selling everything on the pavement at whatever anyone will pay. Among the furniture is a navigation computer old enough to have real switches and a watch in a case. She wants it gone by evening and has no idea what any of it is.',
    weight: 8,
    tags: ['appraisal', 'valuables', 'estate'],
    choices: [
      {
        id: 'assess-navcomp',
        label: 'Check whether the navcomp is real',
        hint: '2 hours with the covers off. You know what a working unit sounds like.',
        check: {
          skill: 'navigation',
          secondarySkill: 'electricalEngineering',
          participation: 'individual',
        },
        effects: { hours: 2 },
        outcomes: {
          exceptional: {
            text: 'It is a genuine deep-survey unit with the original ephemeris cartridges still in the rack, and it powers up on the second try.',
            effects: { credits: -240, items: [{ itemId: 'antique_navcomp', qty: 1, condition: 82 }, { itemId: 'heirloom_watch', qty: 1 }], dataCores: 1, personalXp: 55 },
          },
          success: {
            text: 'Old but sound. The ephemeris is decades stale and the machine underneath it is honest.',
            effects: { credits: -300, items: [{ itemId: 'antique_navcomp', qty: 1, condition: 68 }], personalXp: 32 },
          },
          partial: {
            text: 'The display is dead and half the switch bank does nothing, but the core module is intact and worth having.',
            effects: { credits: -180, items: [{ itemId: 'antique_navcomp', qty: 1, condition: 40 }], personalXp: 14 },
          },
          failure: {
            text: 'You cannot tell whether it works without a bench, and you do not have a bench. You leave it.',
            effects: { morale: -2, personalXp: 6 },
          },
          criticalFailure: {
            text: 'You pay real money for a display shell somebody gutted for parts years ago. The executor is genuinely apologetic, which does not help.',
            effects: { credits: -320, items: [{ itemId: 'salvage_scrap', qty: 3 }], morale: -5 },
          },
        },
      },
      {
        id: 'buy-lot',
        label: 'Buy the whole lot unexamined',
        hint: 'One price, no sorting, and you deal with it aboard.',
        requires: { minCredits: 450 },
        effects: { hours: 3, credits: -450 },
        result: {
          text: 'You take the navcomp, the watch, two crates of personal effects, and a tool roll, and the executor looks relieved to be rid of all of it.',
          effects: { items: [{ itemId: 'antique_navcomp', qty: 1, condition: 55 }, { itemId: 'heirloom_watch', qty: 1 }, { itemId: 'personal_effects', qty: 3 }, { itemId: 'multitool', qty: 1, condition: 62 }] },
        },
      },
      {
        id: 'haggle-watch',
        label: 'Buy only the watch, cheap',
        hint: 'Small, light, and it holds value anywhere in the system.',
        check: {
          skill: 'negotiation',
          participation: 'individual',
        },
        effects: { hours: 1 },
        outcomes: {
          exceptional: {
            text: 'She sells you the watch and throws in the case of personal effects because you were the only person all day who asked about the man who owned them.',
            effects: { credits: -70, items: [{ itemId: 'heirloom_watch', qty: 1 }, { itemId: 'personal_effects', qty: 2 }], personalXp: 35 },
          },
          success: {
            text: 'Fair price, quick handshake.',
            effects: { credits: -110, items: [{ itemId: 'heirloom_watch', qty: 1 }], personalXp: 20 },
          },
          partial: {
            text: 'She wants more than you offered and you meet her most of the way.',
            effects: { credits: -190, items: [{ itemId: 'heirloom_watch', qty: 1 }], personalXp: 8 },
          },
          failure: {
            text: 'She has been advised what it is worth by someone who actually knew. The price is not negotiable.',
            effects: { morale: -1 },
          },
          criticalFailure: {
            text: 'You mention the movement and she immediately understands she has been underpricing it all day. She stops selling and closes the case.',
            effects: { morale: -4 },
          },
        },
      },
      {
        id: 'walk-estate',
        label: 'Leave the dead man things alone',
        effects: { hours: 1 },
        result: {
          text: 'You look at the furniture on the pavement in the ash light and keep walking. Somebody bought all of it by dark.',
          effects: {},
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Recruitment
  // -------------------------------------------------------------------------
  {
    id: 'hw-old-crewmate-bar',
    scope: ['homeworld'],
    title: 'Somebody Who Knew You Before',
    body: 'The bar by the freight gate is full of people who used to have jobs at the freight gate. One of them recognises you across the room — someone you worked a bad contract with years ago, who did the work and never complained about the pay. They are drinking slowly, which means they are making it last.',
    weight: 10,
    conditions: { once: true },
    tags: ['recruitment', 'bar', 'old-contact'],
    choices: [
      {
        id: 'straight-offer',
        label: 'Sit down and offer them a berth outright',
        hint: '2 hours. No pitch, no terms, just the offer.',
        check: {
          skill: 'persuasion',
          attributes: ['charisma', 'socialAwareness'],
          participation: 'individual',
          modifiers: [{ label: 'You have history and it is good history', value: 12 }],
        },
        effects: { hours: 2 },
        outcomes: {
          exceptional: {
            text: 'They finish the drink, stand up, and ask which pad. On the way out they collect a friend from the next table who is exactly as useful as they are.',
            effects: { recruit: true, morale: 9, food: -3, personalXp: 55, crewXp: 30 },
          },
          success: {
            text: 'They say yes before you finish the sentence and then spend twenty minutes pretending they had to think about it.',
            effects: { recruit: true, morale: 6, food: -2, personalXp: 35 },
          },
          partial: {
            text: 'They will come, but they want their sister on the manifest too, and that is a conversation for tomorrow.',
            effects: { hours: 3, morale: 2, personalXp: 15, flag: { key: 'hw_crewmate_pending', value: true } },
          },
          failure: {
            text: 'They have a berth on an authority transport in nine days and a family already booked onto it. It is the right answer and it is not yours.',
            effects: { morale: -3, personalXp: 8 },
          },
          criticalFailure: {
            text: 'You misremember whose fault the bad contract was and say so out loud. They correct you in front of the whole bar and leave.',
            effects: { morale: -8, crewStress: 6 },
          },
        },
      },
      {
        id: 'buy-the-room',
        label: 'Buy a round for the room and see who talks',
        hint: '4 hours and real credits. Widens the net considerably.',
        requires: { minCredits: 250 },
        check: {
          skill: 'persuasion',
          secondarySkill: 'negotiation',
          participation: 'individual',
        },
        effects: { hours: 4, credits: -250 },
        outcomes: {
          exceptional: {
            text: 'By the third round you have a table of freight handlers, a grounded pilot, and a fitter arguing about who is more useful to you. Two of them mean it.',
            effects: { recruit: true, morale: 10, personalXp: 50, crewXp: 30, flag: { key: 'hw_bar_reputation', value: true } },
          },
          success: {
            text: 'Your old crewmate signs on and three others take your pad number.',
            effects: { recruit: true, morale: 6, personalXp: 32 },
          },
          partial: {
            text: 'Plenty of interest, nobody who can actually leave. You buy a lot of drinks for a lot of people with commitments.',
            effects: { morale: 3, personalXp: 14 },
          },
          failure: {
            text: 'The room takes the drinks and gives you nothing. Fair enough. It is a bar.',
            effects: { morale: -3 },
          },
          criticalFailure: {
            text: 'A rumour that you are hiring runs ahead of you and by closing you are being followed out by people who want a berth and will not be told no.',
            effects: { morale: -7, crewStress: 10, combat: 'enc_desperate_looters' },
          },
        },
      },
      {
        id: 'quiet-word',
        label: 'Just have a drink with them and ask how they are',
        hint: '2 hours. No agenda. It might turn into one anyway.',
        effects: { hours: 2, credits: -30 },
        result: {
          text: 'You talk about the old contract and the people from it, and neither of you mentions berths. At the door they say to call if you are short a pair of hands.',
          effects: { morale: 5, crewStress: -3, flag: { key: 'hw_crewmate_pending', value: true } },
        },
      },
      {
        id: 'dont-approach',
        label: 'Do not go over',
        effects: { hours: 1 },
        result: {
          text: 'You finish your drink at the bar, nod once across the room, and leave. They watch you go.',
          effects: { morale: -4 },
        },
      },
    ],
  },

  {
    id: 'hw-university-lab-closure',
    scope: ['homeworld'],
    title: 'The Institute Is Closing Its Doors',
    body: 'The planetary institute is shutting its research wings floor by floor. Postdocs are boxing up work nobody will read and equipment nobody will collect. A department head tells you plainly that she cannot get her people onto the priority transports, and that the archive she is standing next to represents forty years of atmospheric survey data.',
    weight: 8,
    conditions: { once: true },
    tags: ['recruitment', 'science', 'data'],
    choices: [
      {
        id: 'take-archive',
        label: 'Offer to carry the archive off-world',
        hint: '5 hours pulling and verifying the cores.',
        check: {
          skill: 'computers',
          secondarySkill: 'medicalResearch',
          participation: 'duo',
        },
        effects: { hours: 5 },
        outcomes: {
          exceptional: {
            text: 'You pull the complete set, verified, indexed, and compressed onto cores small enough to matter to nobody but the people who will need them.',
            effects: { dataCores: 4, credits: 400, morale: 8, personalXp: 60, flag: { key: 'hw_institute_archive', value: true } },
          },
          success: {
            text: 'Most of the archive comes across clean. The department head signs the custody chain over to you and does not cry until you have gone.',
            effects: { dataCores: 3, credits: 250, morale: 5, personalXp: 38 },
          },
          partial: {
            text: 'Two of the older array volumes will not read. You take what verified and leave the rest to the building.',
            effects: { dataCores: 1, morale: 2, personalXp: 16 },
          },
          failure: {
            text: 'The storage array wants a decryption authority that retired to another continent two years ago. Nobody is getting this data out.',
            effects: { morale: -4, personalXp: 8 },
          },
          criticalFailure: {
            text: 'A botched migration corrupts the source volumes while the copy is still incomplete. Forty years of survey work ends in an afternoon, with your hands on the terminal.',
            effects: { morale: -12, crewStress: 12, personalXp: 4 },
          },
        },
      },
      {
        id: 'take-people',
        label: 'Offer berths to two of her researchers',
        hint: '4 hours of interviews you are not qualified to run.',
        check: {
          skill: 'persuasion',
          attributes: ['socialAwareness', 'evaluation'],
          participation: 'individual',
        },
        effects: { hours: 4, food: -5 },
        outcomes: {
          exceptional: {
            text: 'The two who come are a field ecologist and an instrument engineer, and both of them can cook, which turns out to matter more than either credential.',
            effects: { recruit: true, morale: 10, dataCores: 1, personalXp: 50, crewXp: 30 },
          },
          success: {
            text: 'One researcher takes the berth immediately and brings her own equipment.',
            effects: { recruit: true, morale: 6, personalXp: 32 },
          },
          partial: {
            text: 'They all want to come and none of them will go without the others. You cannot take four.',
            effects: { morale: -2, crewStress: 4, personalXp: 12 },
          },
          failure: {
            text: 'Academic loyalty is a real thing and none of them will leave while the department head stays. She is staying.',
            effects: { morale: -4, personalXp: 6 },
          },
          criticalFailure: {
            text: 'You pick badly and say so badly. The department head asks you to leave the floor and means it.',
            effects: { morale: -8, crewStress: 7 },
          },
        },
      },
      {
        id: 'strip-lab',
        label: 'Ask for the equipment instead',
        hint: '3 hours loading. Instruments are worth a great deal off-world.',
        effects: { hours: 3 },
        result: {
          text: 'She signs an equipment release without reading it and helps you carry the crates down herself. There is no ceremony to any of it.',
          effects: { items: [{ itemId: 'diagnostic_scanner', qty: 1, condition: 88 }, { itemId: 'portable_terminal', qty: 1, condition: 84 }, { itemId: 'handheld_scanner', qty: 2, condition: 80 }], repairParts: 30, morale: 2 },
        },
      },
      {
        id: 'leave-institute',
        label: 'Nothing here fits on your ship',
        effects: { hours: 1 },
        result: {
          text: 'You look at the crates in the corridor and the people standing next to them and you tell her the truth about your capacity. She says she understands. She has heard it eleven times today.',
          effects: { morale: -5 },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Government, security, information
  // -------------------------------------------------------------------------
  {
    id: 'hw-ministry-data-request',
    scope: ['homeworld'],
    title: 'A Request From the Ministry',
    body: 'A ministry liaison finds you at the pad with a request rather than an order, which she is careful to emphasise. The planetary survey record needs to leave the system on a hull that is actually going, and the official transports are booked with people. She has cores, a custody protocol, and a modest budget.',
    weight: 8,
    conditions: { once: true, requiresShip: true },
    tags: ['government', 'data', 'contract'],
    choices: [
      {
        id: 'accept-full',
        label: 'Accept the full custody contract',
        hint: '4 hours of verification and paperwork. Real money, real obligation.',
        check: {
          skill: 'computers',
          secondarySkill: 'navigation',
          participation: 'individual',
        },
        effects: { hours: 4 },
        outcomes: {
          exceptional: {
            text: 'You verify every core against the manifest and find two that were mislabelled at source. She upgrades the contract on the spot and adds a fuel warrant.',
            effects: { credits: 1400, dataCores: 5, fuel: 15, morale: 6, personalXp: 60, flag: { key: 'hw_ministry_contract', value: true } },
          },
          success: {
            text: 'Signed, sealed, and loaded before dark. Half the fee up front, the rest payable at any surviving registry.',
            effects: { credits: 900, dataCores: 4, fuel: 8, personalXp: 38, flag: { key: 'hw_ministry_contract', value: true } },
          },
          partial: {
            text: 'Two cores fail verification and she withholds that portion of the fee. Fair, and irritating.',
            effects: { credits: 520, dataCores: 2, personalXp: 16, flag: { key: 'hw_ministry_contract', value: true } },
          },
          failure: {
            text: 'Your terminal cannot satisfy their custody protocol and she cannot sign off on a chain she cannot audit. She goes to find another hull.',
            effects: { morale: -4, personalXp: 8 },
          },
          criticalFailure: {
            text: 'You corrupt the custody manifest during transfer and the ministry now has to treat your ship as an unverified handler. Nobody shouts. The contract just disappears.',
            effects: { morale: -8, crewStress: 8, flag: { key: 'hw_ministry_declined', value: true } },
          },
        },
      },
      {
        id: 'negotiate-terms',
        label: 'Negotiate the terms upward before agreeing',
        hint: '3 hours. She has budget and she is under pressure.',
        check: {
          skill: 'negotiation',
          participation: 'individual',
          modifiers: [{ label: 'She has very few hulls left to ask', value: 8 }],
        },
        effects: { hours: 3 },
        outcomes: {
          exceptional: {
            text: 'You get the fee, a fuel warrant, priority depot access, and two berths on the outbound manifest for anyone you name.',
            effects: { credits: 1600, dataCores: 4, fuel: 20, morale: 7, personalXp: 55, flag: { key: 'hw_fuel_priority', value: true } },
          },
          success: {
            text: 'A better fee and a fuel warrant attached. She agrees faster than she should have, which tells you something.',
            effects: { credits: 1200, dataCores: 4, fuel: 12, personalXp: 35, flag: { key: 'hw_ministry_contract', value: true } },
          },
          partial: {
            text: 'She will move on fuel but not on money. You take the fuel.',
            effects: { credits: 800, dataCores: 3, fuel: 10, personalXp: 14, flag: { key: 'hw_ministry_contract', value: true } },
          },
          failure: {
            text: 'The budget is the budget and she has no authority to exceed it. Original terms or nothing.',
            effects: { credits: 900, dataCores: 4, morale: -2 },
          },
          criticalFailure: {
            text: 'You push it into something that sounds like leverage, and she stops treating this as a request. She thanks you for your time and takes the cores with her.',
            effects: { morale: -7, crewStress: 5, flag: { key: 'hw_ministry_declined', value: true } },
          },
        },
      },
      {
        id: 'carry-free',
        label: 'Carry it without a fee',
        hint: 'No money. Considerable goodwill, and a clean conscience.',
        effects: { hours: 2 },
        result: {
          text: 'She stops mid-sentence when you say no charge, then writes you a depot authorisation that she probably should not have. Nobody says anything about it.',
          effects: { dataCores: 3, fuel: 10, morale: 7, crewXp: 25, flag: { key: 'hw_ministry_contract', value: true } },
        },
      },
      {
        id: 'refuse-ministry',
        label: 'Refuse — cargo space is people space',
        effects: { hours: 1 },
        result: {
          text: 'You tell her what the volume is worth to you in berths and she does not argue, because she cannot. She marks your hull off her list.',
          effects: { flag: { key: 'hw_ministry_declined', value: true } },
        },
      },
    ],
  },

  {
    id: 'hw-customs-sweep',
    scope: ['homeworld'],
    title: 'Manifest Verification, Pad Nine',
    body: 'Port security is running manifest verification across every hull on the pad, looking for hoarded allocation goods and unbonded cargo. The team is professional, tired, and thorough. Their supervisor is working down the row with a scanner and he will reach {ship} in about twenty minutes.',
    weight: 11,
    conditions: { requiresShip: true },
    tags: ['security', 'inspection', 'contraband'],
    choices: [
      {
        id: 'full-cooperation',
        label: 'Open everything and cooperate fully',
        hint: '4 hours. Slow, clean, and they will find whatever is there.',
        effects: { hours: 4 },
        result: {
          text: 'They go through the hold crate by crate, confiscate a small amount of allocation-marked stock, and sign your manifest clean. The supervisor thanks you for not making it a whole thing.',
          effects: { food: -4, credits: -120, morale: -2, flag: { key: 'hw_manifest_clean', value: true } },
        },
      },
      {
        id: 'talk-through',
        label: 'Talk the supervisor through it yourself',
        hint: '2 hours. Move the conversation before it becomes a search.',
        check: {
          skill: 'persuasion',
          secondarySkill: 'negotiation',
          attributes: ['socialAwareness', 'composure'],
          participation: 'individual',
        },
        effects: { hours: 2, crewStress: 4 },
        outcomes: {
          exceptional: {
            text: 'You walk him through the hold, answer everything before he asks it, and he ends up telling you which pads are being swept tomorrow.',
            effects: { morale: 5, personalXp: 50, flag: { key: 'hw_manifest_clean', value: true } },
          },
          success: {
            text: 'A cursory look and a signature. He has forty more hulls to do and you did not give him a reason to slow down.',
            effects: { personalXp: 32, flag: { key: 'hw_manifest_clean', value: true } },
          },
          partial: {
            text: 'He pulls two crates at random and takes what is in them. Could have been much worse.',
            effects: { food: -5, repairParts: -15, personalXp: 12 },
          },
          failure: {
            text: 'You talk slightly too much and he decides to do the full sweep after all. Four hours and a lighter hold.',
            effects: { hours: 4, food: -7, credits: -220, morale: -4 },
          },
          criticalFailure: {
            text: 'He reads your evasion as exactly what it is and escalates. The hold gets stripped and a compliance note goes on your registry entry.',
            effects: { hours: 5, food: -10, repairParts: -30, credits: -400, morale: -9, crewStress: 10, flag: { key: 'hw_marshal_attention', value: true } },
          },
        },
      },
      {
        id: 'stash-cargo',
        label: 'Move the sensitive cargo before they get here',
        hint: '20 minutes and a good hiding place. Then act normal.',
        check: {
          skill: 'stealth',
          secondarySkill: 'mechanicalEngineering',
          participation: 'duo',
          criticalRisk: true,
        },
        effects: { hours: 1, crewStress: 6 },
        outcomes: {
          exceptional: {
            text: 'A void behind the coolant run takes everything with room to spare. The scanner reads structure and the supervisor reads a clean manifest.',
            effects: { morale: 5, personalXp: 55, flag: { key: 'hw_manifest_clean', value: true } },
          },
          success: {
            text: 'Everything sensitive is out of sight and stays out of sight. Signed and cleared in fifteen minutes.',
            effects: { personalXp: 35 },
          },
          partial: {
            text: 'Most of it is hidden. The rest is found, confiscated, and treated as an honest oversight.',
            effects: { food: -4, credits: -150, personalXp: 14 },
          },
          failure: {
            text: 'The scanner picks up the density anomaly immediately. They pull the panel, take the cargo, and fine you for the panel.',
            effects: { food: -8, repairParts: -25, credits: -350, morale: -6, crewStress: 8 },
          },
          criticalFailure: {
            text: 'They find the void, then find the second void, and then decide this hull needs a proper look. The proper look does not go quietly.',
            effects: { food: -10, repairParts: -40, credits: -500, morale: -10, crewStress: 15, combat: 'enc_security_patrol', flag: { key: 'hw_marshal_attention', value: true } },
          },
        },
      },
      {
        id: 'move-ship',
        label: 'Move {ship} to the far pad and skip the sweep entirely',
        hint: '3 hours, real fuel, and a slot you may not get back.',
        requires: { minFuel: 4 },
        effects: { hours: 3, fuel: -4 },
        result: {
          text: 'You lift and set down on the overflow apron on the far side of the field, where the sweep is not scheduled until next week. The apron has no services and no floodlights.',
          effects: { morale: -2, crewStress: 4, flag: { key: 'hw_far_apron', value: true } },
        },
      },
    ],
  },

  {
    id: 'hw-freight-manifest-hack',
    scope: ['homeworld'],
    title: 'Stalled on the Board',
    body: 'A freight yard clerk with nothing left to lose shows you the manifest board: forty containers of moon-run stock, sitting bonded, going nowhere because the consignees have already left the planet. The containers are legally in limbo. The routing system does not know that and will still accept a reassignment.',
    weight: 9,
    tags: ['freight', 'computers', 'grey-market'],
    choices: [
      {
        id: 'reassign',
        label: 'Reassign a container to your pad',
        hint: '4 hours in the routing system. Clean if you are good, obvious if you are not.',
        check: {
          skill: 'computers',
          participation: 'individual',
          criticalRisk: true,
          modifiers: [{ label: 'The clerk credentials are real and current', value: 10 }],
        },
        effects: { hours: 4, crewStress: 5 },
        outcomes: {
          exceptional: {
            text: 'You reassign three containers through a legitimate abandonment clause that has been on the books for sixty years. It is not even illegal, technically.',
            effects: { repairParts: 180, food: 26, items: [{ itemId: 'trade_rare_minerals', qty: 3 }, { itemId: 'trade_volatiles', qty: 2 }], credits: -200, personalXp: 65 },
          },
          success: {
            text: 'One container rerouted and delivered to your pad by an automated hauler that does not ask questions.',
            effects: { repairParts: 110, food: 14, items: [{ itemId: 'trade_ore_crate', qty: 2 }], credits: -150, personalXp: 40 },
          },
          partial: {
            text: 'The reassignment goes through but the hauler drops it at the wrong apron. Four hours of carrying later, you have most of it.',
            effects: { hours: 4, repairParts: 55, food: 8, crewStress: 5, personalXp: 18 },
          },
          failure: {
            text: 'The routing system rejects the reassignment and logs the attempt against the clerk credential. He is not happy and he is also not surprised.',
            effects: { morale: -4, crewStress: 6, personalXp: 8 },
          },
          criticalFailure: {
            text: 'The attempt trips a bonded-cargo alert. The clerk is escorted off the yard within the hour and your ship registry is attached to the incident.',
            effects: { credits: -400, morale: -9, crewStress: 12, flag: { key: 'hw_marshal_attention', value: true } },
          },
        },
      },
      {
        id: 'buy-the-clerk',
        label: 'Pay the clerk to do it himself',
        hint: 'His credentials, his risk, your credits.',
        requires: { minCredits: 400 },
        check: {
          skill: 'negotiation',
          participation: 'individual',
        },
        effects: { hours: 2, credits: -400 },
        outcomes: {
          exceptional: {
            text: 'He does it in four minutes and refuses half the money, because what he actually wanted was for somebody to use the stock before the yard is abandoned.',
            effects: { credits: 200, repairParts: 130, food: 18, items: [{ itemId: 'trade_chemicals', qty: 2 }], personalXp: 40 },
          },
          success: {
            text: 'Money changes hands, a container changes designation, and neither of you mentions it again.',
            effects: { repairParts: 95, food: 12, personalXp: 25 },
          },
          partial: {
            text: 'He will only move a partial load and picks the container himself. It is mostly ore crate, which is heavy and not what you needed.',
            effects: { items: [{ itemId: 'trade_ore_crate', qty: 3 }], repairParts: 30, personalXp: 10 },
          },
          failure: {
            text: 'He takes the money, gets cold feet, and gives it back the next morning. That is more honesty than you had any right to.',
            effects: { credits: 400, morale: -2 },
          },
          criticalFailure: {
            text: 'He takes the money and is on an outbound transport before the shift ends. There is no container and there is no clerk.',
            effects: { morale: -8, crewStress: 8 },
          },
        },
      },
      {
        id: 'buy-legit',
        label: 'Find the actual consignee and buy the claim legally',
        hint: '7 hours of chasing people who have mostly left. Slow, expensive, safe.',
        requires: { minCredits: 700 },
        effects: { hours: 7, credits: -700 },
        result: {
          text: 'It takes most of a day and four different offices, but you end up holding a signed transfer of claim from a company director who is glad to have it off his books.',
          effects: { repairParts: 100, food: 14, items: [{ itemId: 'trade_machine_parts', qty: 3 }], morale: 3, flag: { key: 'hw_manifest_clean', value: true } },
        },
      },
      {
        id: 'walk-yard',
        label: 'Not worth the registry note',
        effects: { hours: 1 },
        result: {
          text: 'You look at forty containers of things you need and walk out of the yard office. The clerk goes back to watching a board that will not change.',
          effects: { morale: -2 },
        },
      },
    ],
  },

  {
    id: 'hw-departure-window-brief',
    scope: ['homeworld'],
    title: 'Departure Window Briefing',
    body: 'The port authority runs an open briefing on outbound corridors twice a day, because uncoordinated departures have already caused two collisions this month. The traffic officer has current debris tracking, corridor loading, and honest advice. He also has a room full of captains who all want the same window.',
    weight: 10,
    conditions: { requiresShip: true },
    tags: ['navigation', 'departure', 'planning'],
    choices: [
      {
        id: 'work-the-plot',
        label: 'Sit with the plot and work your own corridor',
        hint: '5 hours with their tracking data and your charts.',
        check: {
          skill: 'navigation',
          secondarySkill: 'computers',
          participation: 'individual',
        },
        effects: { hours: 5 },
        outcomes: {
          exceptional: {
            text: 'You find a departure geometry through the southern gap that nobody else has plotted, saving fuel and clearing the debris field entirely.',
            effects: { fuel: 8, morale: 6, dataCores: 1, personalXp: 60, flag: { key: 'hw_departure_plotted', value: true } },
          },
          success: {
            text: 'A clean corridor, a solid burn plan, and a window you can actually make.',
            effects: { fuel: 4, personalXp: 38, flag: { key: 'hw_departure_plotted', value: true } },
          },
          partial: {
            text: 'You get a workable plot with a wide margin, which costs fuel you would rather have kept.',
            effects: { personalXp: 16 },
          },
          failure: {
            text: 'Their tracking data is four hours stale and every solution you build falls apart on the next update.',
            effects: { morale: -3, personalXp: 8 },
          },
          criticalFailure: {
            text: 'You file a plan built on a stale debris set. The authority rejects it publicly and you go to the back of the assignment queue.',
            effects: { morale: -7, crewStress: 8, flag: { key: 'hw_departure_queue_back', value: true } },
          },
        },
      },
      {
        id: 'buy-slot',
        label: 'Buy a priority departure slot from a broker at the back',
        hint: 'Expensive, immediate, and entirely legitimate. Mostly.',
        requires: { minCredits: 550 },
        effects: { hours: 2, credits: -550 },
        result: {
          text: 'The broker sells you a slot released by a hull that will never fly again. The paperwork is real and the price is what happens when a thing becomes finite.',
          effects: { flag: { key: 'hw_departure_priority', value: true }, morale: 3 },
        },
      },
      {
        id: 'ask-officer',
        label: 'Ask the traffic officer directly what he would do',
        hint: '2 hours and a straight question. He answers straight questions.',
        check: {
          skill: 'piloting',
          secondarySkill: 'persuasion',
          participation: 'individual',
        },
        effects: { hours: 2 },
        outcomes: {
          exceptional: {
            text: 'He talks you through the corridor he is keeping clear for authority traffic and tells you exactly when it will be unwatched.',
            effects: { fuel: 6, personalXp: 45, flag: { key: 'hw_departure_plotted', value: true } },
          },
          success: {
            text: 'He gives you a corridor recommendation and the real debris picture rather than the published one.',
            effects: { fuel: 3, personalXp: 28, flag: { key: 'hw_departure_plotted', value: true } },
          },
          partial: {
            text: 'He gives you the published advice, which is fine, and nothing more, which is a shame.',
            effects: { personalXp: 10 },
          },
          failure: {
            text: 'He is halfway through a shift with a hundred captains asking him the same thing. You get the handout.',
            effects: { morale: -2 },
          },
          criticalFailure: {
            text: 'You ask in a way that sounds like you want him to bend a rule in front of a full room. He remembers your ship name.',
            effects: { morale: -6, crewStress: 5, flag: { key: 'hw_departure_queue_back', value: true } },
          },
        },
      },
      {
        id: 'skip-brief',
        label: 'Skip the briefing and depart on your own read',
        hint: 'Saves five hours. Costs you the debris picture.',
        effects: { hours: 1 },
        result: {
          text: 'You have flown out of worse. You also have not flown out of this, this week, with this much traffic and this much junk in the low corridors.',
          effects: { crewStress: 4, flag: { key: 'hw_departure_unplotted', value: true } },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Danger, shelter, community
  // -------------------------------------------------------------------------
  {
    id: 'hw-block-looters',
    scope: ['homeworld'],
    title: 'Four People and a Pry Bar',
    body: 'Coming back to the pad after dark you find four people working the storage lockers along the perimeter fence. They are not professionals — they are a family group with a pry bar and a cart, taking what they can carry. One of them is holding a length of pipe and watching your hands.',
    weight: 10,
    conditions: { minDanger: 20 },
    tags: ['confrontation', 'looting', 'night'],
    choices: [
      {
        id: 'talk-down',
        label: 'Talk them out of it',
        hint: 'Nobody here wants this to be a fight, including them.',
        check: {
          skill: 'persuasion',
          attributes: ['composure', 'socialAwareness'],
          participation: 'individual',
        },
        effects: { hours: 1, crewStress: 4 },
        outcomes: {
          exceptional: {
            text: 'You get them talking, then get them fed, and by the end the man with the pipe is telling you which lockers on this row are already empty and which are not.',
            effects: { food: -4, morale: 7, repairParts: 25, personalXp: 55 },
          },
          success: {
            text: 'They put the cart down and leave without anyone raising a voice. Nothing of yours is missing.',
            effects: { morale: 4, personalXp: 32 },
          },
          partial: {
            text: 'They take what is in the cart and go. You decide that is an acceptable price for nobody bleeding.',
            effects: { repairParts: -20, food: -3, personalXp: 14 },
          },
          failure: {
            text: 'They ignore you, finish loading, and walk the cart out through the fence gap. There are four of them and they know it.',
            effects: { repairParts: -40, food: -8, morale: -5, crewStress: 6 },
          },
          criticalFailure: {
            text: 'You say the wrong thing to a frightened man holding a pipe, and the situation stops being a conversation.',
            effects: { morale: -6, crewStress: 12, combat: 'enc_desperate_looters' },
          },
        },
      },
      {
        id: 'draw-down',
        label: 'Draw and tell them to leave the cart',
        hint: 'Fast and effective. Also how people get shot on a pad at night.',
        check: {
          skill: 'firearms',
          attributes: ['steadiness', 'composure'],
          participation: 'duo',
          criticalRisk: true,
        },
        effects: { hours: 1, crewStress: 8 },
        outcomes: {
          exceptional: {
            text: 'You are calm, loud, and completely unambiguous. They leave the cart, the bar, and the row, and nobody fires anything.',
            effects: { repairParts: 30, items: [{ itemId: 'crowbar', qty: 1, condition: 70 }], morale: 2, personalXp: 45 },
          },
          success: {
            text: 'They back off into the dark and leave the cart where it stands.',
            effects: { repairParts: 20, personalXp: 28 },
          },
          partial: {
            text: 'They scatter, taking half the load with them. You keep the rest and the fence gap stays a fence gap.',
            effects: { repairParts: 10, crewStress: 5, personalXp: 12 },
          },
          failure: {
            text: 'The man with the pipe decides you will not shoot a family group over storage lockers, and he is right.',
            effects: { repairParts: -35, food: -6, morale: -6, crewStress: 9 },
          },
          criticalFailure: {
            text: 'Somebody moves, somebody else reacts, and the pad row turns into exactly the thing everyone was trying to avoid.',
            effects: { morale: -9, crewStress: 16, combat: 'enc_desperate_looters' },
          },
        },
      },
      {
        id: 'flank-quiet',
        label: 'Circle around and secure the ship without being seen',
        hint: 'Let them have the lockers. Protect what actually matters.',
        check: {
          skill: 'stealth',
          participation: 'group',
        },
        effects: { hours: 2, crewStress: 5 },
        outcomes: {
          exceptional: {
            text: 'You are aboard and buttoned up before they reach your row, and they move on when they find nothing open.',
            effects: { morale: 2, personalXp: 40, crewXp: 25 },
          },
          success: {
            text: 'You get in without a confrontation. They take from the empty lockers and are gone by morning.',
            effects: { repairParts: -10, personalXp: 25, crewXp: 15 },
          },
          partial: {
            text: 'One of them spots you but says nothing. They take more than they would have and you let them.',
            effects: { repairParts: -25, food: -4, crewStress: 4, personalXp: 10 },
          },
          failure: {
            text: 'The approach is lit and open and there is no version of this where they do not see you coming.',
            effects: { repairParts: -30, food: -5, morale: -4, crewStress: 7 },
          },
          criticalFailure: {
            text: 'You come around the fence line straight into two of them who were watching the back. Nobody has time to talk.',
            effects: { morale: -7, crewStress: 13, combat: 'enc_desperate_looters' },
          },
        },
      },
      {
        id: 'call-marshals',
        label: 'Call the district marshals and wait',
        hint: '3 hours standing in the cold being correct.',
        effects: { hours: 3, crewStress: 4 },
        result: {
          text: 'A marshal unit arrives forty minutes later and takes the family away in the back of a transport. Your lockers are intact. You do not sleep well.',
          effects: { morale: -6, flag: { key: 'hw_marshal_favour', value: true } },
        },
      },
    ],
  },

  {
    id: 'hw-safe-zone-shelter',
    scope: ['homeworld'],
    title: 'Green Card District',
    body: 'The authority has certified three blocks around the old civic hall as structurally sound and atmospherically buffered, at least for the next while. It is warm, the air is clean, and there are cots. It is also full of people who are not leaving, which makes it the best recruiting ground on this side of the port.',
    weight: 10,
    tags: ['shelter', 'rest', 'recruitment'],
    choices: [
      {
        id: 'proper-rest',
        label: 'Take the crew in for a proper night',
        hint: '11 hours of clean air and a real bed each.',
        requires: { minCredits: 120 },
        effects: { hours: 11, credits: -120 },
        result: {
          text: 'Everyone sleeps flat for the first time in weeks and the air does not taste of anything. It is remarkable what that is worth.',
          effects: { crewStress: -10, morale: 8, food: -3, log: 'Crew rested in the certified shelter district.' },
        },
      },
      {
        id: 'work-kitchen',
        label: 'Work the shelter kitchen for the evening',
        hint: '6 hours cooking for four hundred. Feeds them, and you.',
        check: {
          skill: 'cooking',
          secondarySkill: 'persuasion',
          participation: 'duo',
        },
        effects: { hours: 6 },
        outcomes: {
          exceptional: {
            text: 'You turn a pallet of institutional protein culture into something four hundred people actually want to eat. The shelter warden sends you away with stores and a list of names worth talking to.',
            effects: { food: 18, morale: 10, crewStress: -6, personalXp: 50, flag: { key: 'hw_shelter_favour', value: true } },
          },
          success: {
            text: 'Good service, no shortages, and a warm room full of people who are not thinking about the sky for an hour.',
            effects: { food: 10, morale: 6, crewStress: -4, personalXp: 32 },
          },
          partial: {
            text: 'You run out an hour before the queue does. Some people eat and some people do not.',
            effects: { food: 4, morale: 2, personalXp: 14 },
          },
          failure: {
            text: 'The shelter cooks have their system and you are in the way of it. You spend six hours washing trays.',
            effects: { food: 2, morale: -2, personalXp: 6 },
          },
          criticalFailure: {
            text: 'A batch of reconstituted culture goes out warm and half the evening service spends the night sick. The warden asks you not to come back.',
            effects: { food: -3, morale: -9, crewStress: 8, medicine: -2 },
          },
        },
      },
      {
        id: 'recruit-shelter',
        label: 'Spend the day looking for people worth a berth',
        hint: '7 hours of talking to strangers about the worst week of their lives.',
        check: {
          skill: 'persuasion',
          attributes: ['socialAwareness', 'evaluation'],
          participation: 'individual',
        },
        effects: { hours: 7, crewStress: 5 },
        outcomes: {
          exceptional: {
            text: 'You find a shuttle mechanic who has been sleeping in the civic hall for two weeks because her employer left without her, and she is at your ramp within the hour.',
            effects: { recruit: true, morale: 9, food: -3, personalXp: 55 },
          },
          success: {
            text: 'One good candidate out of a long day. That is a good day.',
            effects: { recruit: true, morale: 5, food: -3, personalXp: 35 },
          },
          partial: {
            text: 'Two maybes and a lot of people who want a berth for their whole family. You take pad numbers and no commitments.',
            effects: { morale: 1, personalXp: 15, flag: { key: 'hw_shelter_contacts', value: true } },
          },
          failure: {
            text: 'Everyone here who could leave has already left. The people remaining are here for reasons that will not fit in a cargo hold.',
            effects: { morale: -4, crewStress: 4, personalXp: 8 },
          },
          criticalFailure: {
            text: 'Word gets around that a captain is picking people, and the room turns. The warden has to walk you out through a side door.',
            effects: { morale: -9, crewStress: 12, flag: { key: 'hw_shelter_banned', value: true } },
          },
        },
      },
      {
        id: 'skip-shelter',
        label: 'Sleep on the ship as usual',
        effects: { hours: 8 },
        result: {
          text: 'The hold is cold and the air recycler ticks all night, and everybody is where you can find them. There is something to be said for that.',
          effects: { crewStress: -3 },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Routine / low-stakes
  // -------------------------------------------------------------------------
  {
    id: 'hw-forecast-rumor',
    scope: ['homeworld'],
    title: 'What the Forecasters Are Actually Saying',
    body: 'Three separate people at the pad tell you three different versions of the same rumour about the revised terminal estimate. One of them is a retired atmospheric modeller who is selling copies of an unofficial forecast bulletin out of a document case, at a price that suggests he believes it.',
    weight: 12,
    routine: true,
    tags: ['rumor', 'forecast', 'information'],
    choices: [
      {
        id: 'buy-bulletin',
        label: 'Buy the unofficial bulletin',
        hint: 'Might be good data. Might be a man with a printer.',
        requires: { minCredits: 150 },
        effects: { hours: 1, credits: -150 },
        result: {
          text: 'The bulletin is dense, sourced, and considerably less optimistic than the public advisory. You read it twice and then do not sleep much.',
          effects: { crewStress: 5, flag: { key: 'hw_forecast_bulletin', value: true }, log: 'Acquired an unofficial forecast bulletin.' },
        },
      },
      {
        id: 'question-him',
        label: 'Question him about his sources instead',
        hint: '2 hours. Free, if you can tell real modelling from confident nonsense.',
        check: {
          skill: 'medicalResearch',
          attributes: ['reasoning', 'evaluation'],
          participation: 'individual',
        },
        effects: { hours: 2 },
        outcomes: {
          exceptional: {
            text: 'His methodology holds up and he is delighted anyone asked. He gives you the bulletin and the underlying dataset for nothing.',
            effects: { dataCores: 1, personalXp: 40, flag: { key: 'hw_forecast_bulletin', value: true } },
          },
          success: {
            text: 'The work is sound. He is not a crank, he is a man who was made redundant by an institute that stopped wanting his answers.',
            effects: { credits: -80, personalXp: 25, flag: { key: 'hw_forecast_bulletin', value: true } },
          },
          partial: {
            text: 'Half of it is real modelling and half is extrapolation he cannot defend. You take the half that stands up.',
            effects: { personalXp: 10 },
          },
          failure: {
            text: 'You cannot follow the mathematics well enough to judge it, and he can tell.',
            effects: { morale: -1 },
          },
          criticalFailure: {
            text: 'You challenge a step he can defend and he takes you apart in front of a small crowd. He does not sell you anything after that.',
            effects: { morale: -4 },
          },
        },
      },
      {
        id: 'ignore-rumor',
        label: 'Ignore it and get on with loading',
        effects: { hours: 1 },
        result: {
          text: 'You have heard four terminal estimates this month and none of them changed what you have to do today.',
          effects: {},
        },
      },
    ],
  },

  {
    id: 'hw-neighbor-food-swap',
    scope: ['homeworld'],
    title: 'The Woman Two Pads Over',
    body: 'The freighter two pads over has a galley with more preserved protein than they can eat and no fresh anything. Their cook wanders over with a crate and an offer, mostly because she is bored and wants to talk to someone who is not her own crew.',
    weight: 13,
    routine: true,
    tags: ['trade', 'community', 'food'],
    choices: [
      {
        id: 'cook-together',
        label: 'Pool what you both have and cook a real meal',
        hint: '4 hours. Two crews, one galley.',
        check: {
          skill: 'cooking',
          participation: 'duo',
        },
        effects: { hours: 4 },
        outcomes: {
          exceptional: {
            text: 'It becomes the best evening either crew has had in a month, and her captain sends over a case of coolant and a bottle of something to say thank you.',
            effects: { food: 6, morale: 9, crewStress: -7, items: [{ itemId: 'coolant_flask', qty: 2 }, { itemId: 'stim_coffee', qty: 3 }], personalXp: 30 },
          },
          success: {
            text: 'Everyone eats properly and sits around afterwards not talking about departure windows.',
            effects: { food: 3, morale: 6, crewStress: -5, personalXp: 20 },
          },
          partial: {
            text: 'The food is fine. The conversation gets on to forecasts about halfway through and does not come back.',
            effects: { food: 2, morale: 2, crewStress: -2, personalXp: 8 },
          },
          failure: {
            text: 'You burn the protein culture and everyone is very polite about it.',
            effects: { food: -2, morale: -1 },
          },
          criticalFailure: {
            text: 'Something in the pooled stock was not what it was labelled and both crews spend the night regretting it.',
            effects: { food: -3, morale: -5, medicine: -2, crewStress: 6 },
          },
        },
      },
      {
        id: 'straight-swap',
        label: 'Straight swap — your produce for their protein',
        hint: 'Quick, fair, done in an hour.',
        requires: { minFood: 5 },
        effects: { hours: 1, food: -5 },
        result: {
          text: 'You trade a crate each and both crews eat something different for a week. It is the simplest transaction of the month.',
          effects: { food: 9, items: [{ itemId: 'protein_culture', qty: 3 }], morale: 2 },
        },
      },
      {
        id: 'decline-swap',
        label: 'Politely decline',
        effects: { hours: 1 },
        result: {
          text: 'She takes it well, leaves you two ration packs anyway, and goes back to her own ramp.',
          effects: { food: 2, morale: -1 },
        },
      },
    ],
  },

  {
    id: 'hw-water-queue',
    scope: ['homeworld'],
    title: 'Standpipe Queue, Sector Six',
    body: 'District water is on scheduled pressure and the standpipe on the corner runs for four hours a day. The queue is orderly, everyone has containers, and a couple of people are selling their place in line for whatever the market will bear.',
    weight: 13,
    routine: true,
    tags: ['queue', 'supply', 'routine'],
    choices: [
      {
        id: 'queue-water',
        label: 'Queue like everyone else',
        hint: '4 hours of standing.',
        effects: { hours: 4, crewStress: 2 },
        result: {
          text: 'You fill everything you brought and carry it back. The queue behind you is longer than the queue in front was.',
          effects: { food: 5, log: 'Ship water tanks topped from the district standpipe.' },
        },
      },
      {
        id: 'buy-place',
        label: 'Buy a place near the front',
        hint: 'Saves three hours. Costs credits and a small amount of self-respect.',
        requires: { minCredits: 60 },
        effects: { hours: 1, credits: -60 },
        result: {
          text: 'A man near the front takes your money and steps out of the line without embarrassment. Nobody in the queue says anything, which is somehow worse.',
          effects: { food: 5, morale: -2 },
        },
      },
      {
        id: 'help-carry',
        label: 'Carry containers for the people who cannot',
        hint: '5 hours. Slower, heavier, better.',
        effects: { hours: 5, crewStress: 3 },
        result: {
          text: 'You end up hauling for half the block and three separate people try to pay you in things they clearly cannot spare. You take a jar of preserves from one of them.',
          effects: { food: 6, morale: 5, items: [{ itemId: 'preserved_meal', qty: 2 }], crewXp: 15 },
        },
      },
    ],
  },

  {
    id: 'hw-street-kitchen',
    scope: ['homeworld'],
    title: 'Somebody Set Up a Grill',
    body: 'Two streets from the pad, a man has dragged an industrial grill out of a closed restaurant and is cooking whatever people bring him, for free, because his freezer is going to fail anyway. There is a crowd, there is music from a portable unit, and for a couple of hours the district does not feel like it is ending.',
    weight: 12,
    routine: true,
    tags: ['community', 'morale', 'food'],
    choices: [
      {
        id: 'join-in',
        label: 'Bring the crew and stay a while',
        hint: '3 hours. Costs a little stock, buys a lot of steadiness.',
        effects: { hours: 3, food: -3 },
        result: {
          text: 'Your crew eats standing up in the street with two hundred strangers and somebody in the back starts singing badly. Everyone sleeps better afterwards.',
          effects: { morale: 8, crewStress: -8, crewXp: 15 },
        },
      },
      {
        id: 'cook-for-them',
        label: 'Take over the grill for an hour',
        hint: '4 hours. He has been at it since noon and his hands are shaking.',
        check: {
          skill: 'cooking',
          participation: 'individual',
        },
        effects: { hours: 4, food: -2 },
        outcomes: {
          exceptional: {
            text: 'You clear the whole queue and then some, and the crowd sends food back to your ship in armfuls for a week afterwards.',
            effects: { food: 14, morale: 10, crewStress: -8, personalXp: 35, flag: { key: 'hw_district_liked', value: true } },
          },
          success: {
            text: 'Two hours on the grill and everyone eats. The owner sits down for the first time all day.',
            effects: { food: 6, morale: 7, crewStress: -6, personalXp: 22 },
          },
          partial: {
            text: 'You get through most of the queue before the gas runs out.',
            effects: { food: 2, morale: 4, crewStress: -3, personalXp: 10 },
          },
          failure: {
            text: 'The grill is a temperamental piece of commercial equipment and it does not like you. He takes it back gently.',
            effects: { morale: 1, crewStress: -2 },
          },
          criticalFailure: {
            text: 'You scorch through half the remaining stock and the queue thins out to nothing. He does not say anything, which is worse than if he had.',
            effects: { food: -3, morale: -4 },
          },
        },
      },
      {
        id: 'skip-grill',
        label: 'Keep working',
        effects: { hours: 1 },
        result: {
          text: 'You can hear it from the pad. Your crew can hear it too, and they keep looking up.',
          effects: { morale: -3, crewStress: 2 },
        },
      },
    ],
  },
];

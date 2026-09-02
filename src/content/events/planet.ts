/**
 * Planet events — the Small Inhabited Planet.
 *
 * A mostly oceanic world of scattered habitable island chains, home to the
 * Naumari: an amphibious native people with their own trade interests,
 * etiquette, and internal politics. The shelf houses live on the shallow
 * chains and deal with offworlders. The deep houses do not, mostly, and
 * have opinions about the ones who do.
 */

import type { GameEventDef } from '../../engine/types';

export const PLANET_EVENTS: GameEventDef[] = [
  {
    id: 'pln-harbour-tariff',
    scope: ['planet'],
    title: 'The Reeve of the Shallows',
    body: 'A Naumari harbour reeve meets your landing at {location} with two clerks and a tariff schedule written in three scripts, one of which is yours and badly translated. She is unhurried, precise, and has clearly done this with better-prepared captains than you.',
    weight: 12,
    conditions: { once: true, locationKinds: ['inhabitedPlanet'] },
    tags: ['arrival', 'tariff'],
    choices: [
      {
        id: 'negotiate-the-schedule',
        label: 'Work through the schedule with her',
        hint: 'Four hours, and she will not be rushed',
        effects: { hours: 4 },
        check: { skill: 'negotiation', attributes: ['evaluation', 'socialAwareness'], participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'You take the schedule seriously enough that she starts explaining the reasoning behind it, which is the actual test. She lands you at the resident rate and puts your name on the harbour roll.',
            effects: {
              credits: -120,
              morale: 6,
              personalXp: 40,
              flag: { key: 'harbour_roll', value: true },
            },
          },
          success: {
            text: 'A visitor rate, correctly applied, with the water levy waived because you brought your own. Fair, and she says so.',
            effects: { credits: -300, personalXp: 25, flag: { key: 'harbour_roll', value: true } },
          },
          partial: {
            text: 'You pay the standard offworld rate. Four hours, no discount, and she is faintly disappointed in the effort.',
            effects: { credits: -500, personalXp: 10 },
          },
          failure: {
            text: 'You argue a line item that turns out to be the harbour maintenance fund. The clerks stop translating for a while.',
            effects: { credits: -650, morale: -3, crewStress: 4 },
          },
          criticalFailure: {
            text: 'You imply the schedule is arbitrary in front of two clerks and a dock full of people. Your berth is moved to the outer piles, an hour\'s walk from anywhere.',
            effects: {
              credits: -700,
              hours: 4,
              morale: -6,
              crewStress: 8,
              flag: { key: 'harbour_disfavour', value: true },
            },
          },
        },
      },
      {
        id: 'pay-posted-rate',
        label: 'Pay the posted offworld rate',
        hint: 'One hour, no argument',
        requires: { minCredits: 500 },
        effects: { hours: 1, credits: -500 },
        result: {
          text: 'You pay without haggling, which she notes. It is not respect exactly, but it is not the other thing either.',
          effects: { morale: 1, log: 'Paid the posted offworld landing tariff.' },
        },
      },
      {
        id: 'pay-in-goods',
        label: 'Offer cargo against the tariff',
        hint: 'Three hours, costs stock',
        requires: { minRepairParts: 25 },
        effects: { hours: 3, repairParts: -25 },
        check: { skill: 'persuasion', secondarySkill: 'negotiation', participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'Machine stock is scarce on the chains and she knows exactly what it is worth. The tariff is cleared and she owes you the difference in goodwill.',
            effects: {
              food: 8,
              morale: 7,
              personalXp: 35,
              flag: { key: 'harbour_roll', value: true },
            },
          },
          success: {
            text: 'The parts clear the tariff with a little left over, paid in dried fish and fresh water.',
            effects: { food: 5, personalXp: 20, flag: { key: 'harbour_roll', value: true } },
          },
          partial: {
            text: 'The goods cover most of it. You pay the remainder in credits and she keeps the parts.',
            effects: { credits: -200, personalXp: 8 },
          },
          failure: {
            text: 'She has three crates of the same parts in the harbour store already and values them accordingly.',
            effects: { credits: -400, morale: -3 },
          },
          criticalFailure: {
            text: 'Offering used ship parts against a formal tariff reads, in her culture, as offering someone your rubbish. It takes a while to understand why the mood changed.',
            effects: {
              credits: -600,
              morale: -7,
              crewStress: 8,
              flag: { key: 'harbour_disfavour', value: true },
            },
          },
        },
      },
    ],
  },

  {
    id: 'pln-tide-market',
    scope: ['planet'],
    title: 'The Market Runs on the Tide',
    body: 'The market at {location} opens when the shelf drains and closes when it floods, which gives you about five hours. Produce, dried protein, cold-water medicine stock, and a great deal of shouting. Prices move faster than the water does.',
    weight: 13,
    conditions: { locationKinds: ['inhabitedPlanet'] },
    tags: ['market', 'food'],
    choices: [
      {
        id: 'buy-early',
        label: 'Buy at the open, before the crowd',
        hint: 'Two hours, premium prices, best stock',
        requires: { minCredits: 400 },
        effects: { hours: 2, credits: -400 },
        result: {
          text: 'You get the pick of the morning haul at the price you pay for being first. It is genuinely good food and your crew notices at the next meal.',
          effects: {
            food: 14,
            items: [{ itemId: 'fresh_produce', qty: 3 }],
            morale: 5,
            log: 'Bought fresh stores at the tide market opening.',
          },
        },
      },
      {
        id: 'buy-at-the-flood',
        label: 'Wait for the flood and buy what nobody sold',
        hint: 'Five hours, cheap, unpredictable',
        effects: { hours: 5 },
        check: { skill: 'negotiation', secondarySkill: 'cooking', attributes: ['evaluation', 'perception'], participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'With twenty minutes of tide left, three stalls would rather sell at any price than carry it home. You fill the hold for the cost of one good crate.',
            effects: {
              credits: -220,
              food: 24,
              items: [{ itemId: 'fresh_produce', qty: 4 }, { itemId: 'protein_culture', qty: 2 }],
              personalXp: 35,
              morale: 6,
            },
          },
          success: {
            text: 'Late-tide prices on decent stock. You buy well and carry it out with the water already over the causeway.',
            effects: { credits: -280, food: 16, items: [{ itemId: 'preserved_meal', qty: 4 }], personalXp: 22 },
          },
          partial: {
            text: 'Cheap and mediocre. Half of it will need eating within the week.',
            effects: { credits: -250, food: 10, personalXp: 10 },
          },
          failure: {
            text: 'You misjudge the tide and the good stalls are packed and gone before you commit. What is left is what was left for a reason.',
            effects: { credits: -200, food: 5, morale: -3, crewStress: 4 },
          },
          criticalFailure: {
            text: 'You are still haggling when the shelf floods. You lose two crates to the water and buy the rest at whatever price gets you off the causeway.',
            effects: { credits: -400, food: 4, morale: -6, crewStress: 10 },
          },
        },
      },
      {
        id: 'sell-offworld-goods',
        label: 'Sell offworld goods into the market',
        hint: 'Four hours, and novelty is worth money here',
        requires: { minRepairParts: 30 },
        effects: { hours: 4, repairParts: -30 },
        check: { skill: 'persuasion', secondarySkill: 'negotiation', participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'Sealed bearings and corrosion-proof fittings are worth more than gold on a world made of salt water. Three houses bid against each other.',
            effects: { credits: 1500, food: 6, morale: 6, personalXp: 40, flag: { key: 'market_reputation', value: true } },
          },
          success: {
            text: 'A strong sale. Offworld machine stock moves fast here and everybody knows it.',
            effects: { credits: 950, personalXp: 25 },
          },
          partial: {
            text: 'You sell at a fair price to the first buyer instead of the best one, and find out afterwards.',
            effects: { credits: 520, personalXp: 10 },
          },
          failure: {
            text: 'A ship came through two months ago selling the same thing. The market is saturated and unimpressed.',
            effects: { credits: 220, morale: -3 },
          },
          criticalFailure: {
            text: 'A shelf house factor points out, publicly and correctly, that your fittings are the wrong alloy for salt exposure. Nobody buys anything.',
            effects: {
              repairParts: 30,
              morale: -6,
              crewStress: 6,
              flag: { key: 'market_disfavour', value: true },
            },
          },
        },
      },
      {
        id: 'skip-market',
        label: 'Skip the market',
        hint: 'Costs the stores you did not buy',
        result: {
          text: 'You stay with the ship. The next tide is in eleven hours and there is no telling what the stalls will have then.',
          effects: { morale: -2, log: 'Missed the tide market at the inhabited planet.' },
        },
      },
    ],
  },

  {
    id: 'pln-reef-pharmacology',
    scope: ['planet', 'medical'],
    title: 'What Grows on the Reef',
    body: 'A Naumari apothecary at {location} works with reef organisms your medical database has never heard of. Some of what she has does things your synthetics cannot. She is willing to trade, and she is also quietly interested in what is in your medkits.',
    weight: 11,
    conditions: { locationKinds: ['inhabitedPlanet'] },
    tags: ['medicine', 'exchange'],
    choices: [
      {
        id: 'study-with-her',
        label: 'Spend a day working alongside her',
        hint: 'Twelve hours, and you will have to admit ignorance',
        effects: { hours: 12 },
        check: { skill: 'medicalResearch', secondarySkill: 'medicalDiagnostics', participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'By evening you have a preparation protocol for two reef compounds, one of which is a better haemostatic than anything you carry, and she has notes on your synthetics she considers a fair trade.',
            effects: {
              medicine: 12,
              dataCores: 1,
              items: [{ itemId: 'blood_substitute', qty: 2 }, { itemId: 'antibiotics', qty: 3 }],
              personalXp: 50,
              morale: 6,
              flag: { key: 'reef_pharmacology', value: true },
            },
          },
          success: {
            text: 'You learn how to prepare and store three of her compounds without spoiling them, which is most of the difficulty.',
            effects: {
              medicine: 8,
              items: [{ itemId: 'painkillers', qty: 3 }],
              personalXp: 32,
              flag: { key: 'reef_pharmacology', value: true },
            },
          },
          partial: {
            text: 'You come away with the compounds and only half the preparation method. They will keep for a while and then they will not.',
            effects: { medicine: 5, personalXp: 15 },
          },
          failure: {
            text: 'Twelve hours of a conversation neither of you can quite have. She is patient about it and you are no wiser.',
            effects: { crewStress: 5, personalXp: 8 },
          },
          criticalFailure: {
            text: 'You mishandle a live specimen while she is out of the room. The reaction puts you on the floor of her workshop for two hours.',
            effects: {
              medicine: -2,
              morale: -5,
              crewStress: 10,
              wound: { severityScore: 40, damageType: 'stun' },
            },
          },
        },
      },
      {
        id: 'straight-trade',
        label: 'Trade synthetics for her stock',
        hint: 'Three hours, straightforward',
        requires: { minMedicine: 4 },
        effects: { hours: 3, medicine: -4 },
        check: { skill: 'negotiation', participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'She values broad-spectrum antibiotics far above what they cost you, and the trade closes at a ratio that embarrasses you slightly.',
            effects: {
              medicine: 12,
              items: [{ itemId: 'medkit_field', qty: 1 }],
              personalXp: 30,
              morale: 4,
            },
          },
          success: {
            text: 'A clean exchange, roughly even by both parties\' reckoning, which is the definition of a good trade.',
            effects: { medicine: 9, personalXp: 18 },
          },
          partial: {
            text: 'She trades cautiously with an offworlder she does not know. Modest volume, modest terms.',
            effects: { medicine: 6, personalXp: 8 },
          },
          failure: {
            text: 'Your synthetics are close enough to what a previous ship traded her that she already has more than she can use.',
            effects: { medicine: 4, morale: -2 },
          },
          criticalFailure: {
            text: 'One of your batches is past its stability date and she catches it. She returns everything and closes the shutter.',
            effects: {
              medicine: 2,
              morale: -6,
              crewStress: 6,
              flag: { key: 'apothecary_distrust', value: true },
            },
          },
        },
      },
      {
        id: 'buy-outright',
        label: 'Buy her stock for credits',
        hint: 'Two hours, expensive, no relationship',
        requires: { minCredits: 700 },
        effects: { hours: 2, credits: -700 },
        result: {
          text: 'She sells you what she has in the front of the shop and none of what is behind it. Credits are useful to her. They are not interesting.',
          effects: {
            medicine: 8,
            items: [{ itemId: 'painkillers', qty: 2 }],
            log: 'Bought native medical stock for credits.',
          },
        },
      },
    ],
  },

  {
    id: 'pln-storm-front',
    scope: ['planet'],
    title: 'The Chain Reads the Weather',
    body: 'Every Naumari on the chain starts moving boats and stock inland at midmorning, and nobody can tell you why in a way your instruments confirm. Your own forecast says the front will pass north. Theirs says otherwise, and theirs is based on eleven generations of living here.',
    weight: 11,
    conditions: { locationKinds: ['inhabitedPlanet'], requiresShip: true },
    tags: ['weather', 'local-knowledge'],
    choices: [
      {
        id: 'help-secure-the-chain',
        label: 'Put your crew into the securing effort',
        hint: 'Ten hours of heavy work in rising wind',
        effects: { hours: 10 },
        check: { skill: 'exploration', secondarySkill: 'mechanicalEngineering', attributes: ['strength', 'endurance'], participation: 'group' },
        outcomes: {
          exceptional: {
            text: 'Your crew works the causeway winches through the worst of it alongside three shelf houses. Nothing is lost on that stretch, and everyone on the chain knows who was there.',
            effects: {
              food: 10,
              credits: 400,
              morale: 12,
              crewXp: 40,
              crewStress: 8,
              flag: { key: 'chain_goodwill', value: true },
            },
          },
          success: {
            text: 'Hard, useful, unglamorous work. The chain loses two boats instead of nine and your crew is fed properly for it.',
            effects: { food: 6, morale: 8, crewXp: 25, crewStress: 10, flag: { key: 'chain_goodwill', value: true } },
          },
          partial: {
            text: 'You help where you can and get in the way where you cannot. The effort is appreciated more than it was useful.',
            effects: { food: 3, morale: 3, crewStress: 12, crewXp: 10 },
          },
          failure: {
            text: 'Your crew does not know the work and the front arrives faster than the briefing did. Somebody has to come back for two of them.',
            effects: { morale: -4, crewStress: 16, wound: { severityScore: 32, damageType: 'blunt' } },
          },
          criticalFailure: {
            text: 'A winch line parts under load with your people on the wrong side of it, and the boat it was holding goes into the channel.',
            effects: {
              morale: -9,
              crewStress: 18,
              wound: { severityScore: 58, damageType: 'blunt' },
              flag: { key: 'chain_disfavour', value: true },
            },
          },
        },
      },
      {
        id: 'lift-the-ship',
        label: 'Lift the ship to high orbit and ride it out',
        hint: 'Six hours and fuel, entirely safe',
        requires: { minFuel: 8 },
        effects: { hours: 6, fuel: -8 },
        result: {
          text: 'You take the ship up and sit above the weather for a day. When you come back down the chain has been rearranged and nobody mentions where you were.',
          effects: {
            morale: -3,
            crewStress: -4,
            log: 'Rode out a planetary storm front in orbit.',
          },
        },
      },
      {
        id: 'trust-your-instruments',
        label: 'Trust your forecast and stay grounded',
        hint: 'No cost now, and it is a bet against local knowledge',
        check: { skill: 'navigation', attributes: ['reasoning', 'evaluation'], participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'Your forecast was right and theirs was cautious. The front passes north, you lose nothing, and two Naumari pilots come to ask how your array reads pressure.',
            effects: { morale: 6, personalXp: 40, flag: { key: 'chain_goodwill', value: true } },
          },
          success: {
            text: 'A hard blow and nothing more. The ship rides it on her landing gear and the chain is quietly surprised.',
            effects: { hull: -3, crewStress: 6, personalXp: 25 },
          },
          partial: {
            text: 'The edge of the front catches the harbour. You spend the night rerigging tie-downs in the rain and the hull takes a beating.',
            effects: { hull: -10, systems: { sensors: -5 }, crewStress: 12, personalXp: 10 },
          },
          failure: {
            text: 'They were right. The surge comes over the piles and the ship is standing in a metre of salt water by morning.',
            effects: {
              hull: -16,
              systems: { power: -10, lifeSupport: -6 },
              food: -6,
              crewStress: 16,
              morale: -7,
            },
          },
          criticalFailure: {
            text: 'The surge takes the landing gear out from under one side and puts the ship on her flank against a pile. Getting her upright will take the whole chain.',
            effects: {
              hull: -28,
              systems: { engines: -18, power: -14, lifeSupport: -10 },
              food: -8,
              crewStress: 20,
              morale: -13,
            },
          },
        },
      },
    ],
  },

  {
    id: 'pln-deepwater-salvage',
    scope: ['planet', 'scavenge'],
    title: 'The Thing on the Shelf Edge',
    body: 'A shelf house at {location} will pay for the recovery of a cargo module that went off a barge into forty metres of water at the shelf edge. They cannot dive that deep safely and they say so plainly. They also mention, without emphasis, that the shelf edge is where the big things hunt.',
    weight: 9,
    conditions: { locationKinds: ['inhabitedPlanet'], minCrew: 3 },
    tags: ['diving', 'salvage'],
    choices: [
      {
        id: 'dive-with-gear',
        label: 'Dive it with rebreathers and lines',
        hint: 'Eight hours, deep water, real danger',
        effects: { hours: 8 },
        check: { skill: 'exploration', secondarySkill: 'scavenging', attributes: ['endurance', 'composure'], participation: 'trio', criticalRisk: true },
        outcomes: {
          exceptional: {
            text: 'The module is intact, upright, and the lift goes exactly as planned. The house pays the full recovery fee and adds a share of what was inside.',
            effects: {
              credits: 1400,
              food: 10,
              items: [{ itemId: 'trade_produce', qty: 3 }, { itemId: 'rebreather', qty: 1 }],
              morale: 10,
              crewXp: 40,
            },
          },
          success: {
            text: 'Two dives, a lot of silt, and the module comes up on the third lift attempt. Everyone surfaces on schedule.',
            effects: { credits: 900, food: 5, morale: 6, crewXp: 25, crewStress: 8 },
          },
          partial: {
            text: 'The module comes up flooded and half its contents are ruined. You are paid for the recovery and not for the cargo.',
            effects: { credits: 400, crewStress: 12, crewXp: 12 },
          },
          failure: {
            text: 'A line fouls at depth and the dive is called. Somebody comes up too fast and spends the evening on oxygen.',
            effects: {
              credits: 100,
              medicine: -3,
              morale: -5,
              crewStress: 16,
              wound: { severityScore: 44, damageType: 'stun' },
            },
          },
          criticalFailure: {
            text: 'Something comes off the shelf edge into the dive site while three of your people are on the bottom. Two of them make the surface.',
            effects: {
              morale: -15,
              crewStress: 20,
              medicine: -4,
              loseCrew: true,
              flag: { key: 'lost_diver', value: true },
            },
          },
        },
      },
      {
        id: 'hire-naumari-divers',
        label: 'Hire Naumari divers and run support',
        hint: 'Six hours, costs the fee, much safer',
        requires: { minCredits: 400 },
        effects: { hours: 6, credits: -400 },
        check: { skill: 'mechanicalEngineering', secondarySkill: 'persuasion', participation: 'duo' },
        outcomes: {
          exceptional: {
            text: 'Four Naumari divers work the bottom while your crew runs the winch and the compressor. The module comes up clean and both crews come away impressed with the other.',
            effects: {
              credits: 1000,
              food: 6,
              morale: 9,
              crewXp: 25,
              personalXp: 30,
              flag: { key: 'chain_goodwill', value: true },
            },
          },
          success: {
            text: 'They dive, you lift, the module comes up. A straightforward job done by people who each knew their half of it.',
            effects: { credits: 700, morale: 5, crewXp: 15, personalXp: 18 },
          },
          partial: {
            text: 'Your winch rig slips twice and the divers spend longer down than they should have. The module comes up damaged.',
            effects: { credits: 250, crewStress: 8, morale: -2, personalXp: 8 },
          },
          failure: {
            text: 'The compressor fails at the worst moment and the dive is aborted. The divers are unhurt and unimpressed.',
            effects: { credits: -100, repairParts: -8, morale: -5, crewStress: 8 },
          },
          criticalFailure: {
            text: 'A support line under your control parts with a Naumari diver on it. He surfaces alive. The house does not employ you again.',
            effects: {
              credits: -400,
              morale: -10,
              crewStress: 16,
              flag: { key: 'chain_disfavour', value: true },
            },
          },
        },
      },
      {
        id: 'scan-the-site',
        label: 'Survey the site first and sell them the data',
        hint: 'Three hours, no diving',
        effects: { hours: 3 },
        check: { skill: 'computers', secondarySkill: 'navigation', attributes: ['perception', 'reasoning'], participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'A full sonar map of the shelf edge, including two older wrecks the house did not know about. They pay for the map and forget about the module for a while.',
            effects: { credits: 800, dataCores: 1, personalXp: 40, morale: 5 },
          },
          success: {
            text: 'You put the module\'s exact position and attitude on a chart. They pay a survey fee and get their own people on it.',
            effects: { credits: 400, personalXp: 25 },
          },
          partial: {
            text: 'The bottom return is cluttered and your position fix is approximate. They pay accordingly.',
            effects: { credits: 150, personalXp: 10 },
          },
          failure: {
            text: 'Three hours of sonar and silt. You cannot separate the module from the bottom clutter at all.',
            effects: { crewStress: 4, morale: -2 },
          },
          criticalFailure: {
            text: 'Your survey points them at the wrong feature and two of their divers waste a day and a decompression cycle on a rock.',
            effects: {
              credits: -200,
              morale: -6,
              crewStress: 8,
              flag: { key: 'chain_disfavour', value: true },
            },
          },
        },
      },
      {
        id: 'decline-dive',
        label: 'Decline the job',
        hint: 'Costs the fee you did not earn',
        result: {
          text: 'You tell them your crew are not divers, which is true. They accept it without comment and go back to the problem.',
          effects: { morale: -1, log: 'Declined a deepwater recovery job.' },
        },
      },
    ],
  },

  {
    id: 'pln-two-houses',
    scope: ['planet', 'social'],
    title: 'Between Two Houses',
    body: 'Two shelf houses at {location} have been arguing over a shoal boundary for two generations, and both have separately asked you to carry cargo that would settle it in their favour. Neither has mentioned the other. Both assume you already know.',
    weight: 10,
    conditions: { locationKinds: ['inhabitedPlanet'] },
    tags: ['politics', 'houses'],
    choices: [
      {
        id: 'learn-the-dispute',
        label: 'Find out what the argument is actually about',
        hint: 'Six hours of listening to people who do not want to explain',
        effects: { hours: 6 },
        check: { skill: 'persuasion', attributes: ['socialAwareness', 'learning'], participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'It is not about the shoal. It is about a marriage that did not happen forty years ago and a debt that was paid in the wrong form. Understanding that lets you carry both cargoes without insulting anyone.',
            effects: {
              credits: 1200,
              morale: 8,
              personalXp: 50,
              flag: { key: 'house_neutral', value: true },
            },
          },
          success: {
            text: 'You get enough of the history to see where the real line is, and you take the cargo that does not cross it.',
            effects: { credits: 700, personalXp: 30, flag: { key: 'house_neutral', value: true } },
          },
          partial: {
            text: 'Six hours and you understand the shoal boundary perfectly and the argument not at all. You carry one cargo and hope.',
            effects: { credits: 400, crewStress: 5, personalXp: 12 },
          },
          failure: {
            text: 'Both houses conclude you have been talking to the other one, which is true, and both withdraw their offers.',
            effects: { morale: -4, crewStress: 6 },
          },
          criticalFailure: {
            text: 'You repeat something one house told you in front of the other, in a hall, at volume. The argument now includes you.',
            effects: {
              morale: -8,
              crewStress: 12,
              flag: { key: 'house_enemy', value: true },
            },
          },
        },
      },
      {
        id: 'take-the-better-offer',
        label: 'Take whichever cargo pays more',
        hint: 'Three hours, and one house will remember',
        effects: { hours: 3 },
        result: {
          text: 'You take the better-paying contract and load it in daylight where everyone can see. The other house says nothing at all, which on this world means a great deal.',
          effects: {
            credits: 900,
            items: [{ itemId: 'trade_produce', qty: 2 }],
            morale: -2,
            flag: { key: 'house_partisan', value: true },
            log: 'Took a partisan cargo contract in a local house dispute.',
          },
        },
      },
      {
        id: 'offer-to-mediate',
        label: 'Offer to carry a message between them',
        hint: 'Eight hours, presumptuous, potentially valuable',
        effects: { hours: 8 },
        check: { skill: 'negotiation', secondarySkill: 'persuasion', attributes: ['socialAwareness', 'composure'], participation: 'individual', criticalRisk: true },
        outcomes: {
          exceptional: {
            text: 'An outsider can carry words neither house can say to the other without losing standing. By evening there is a provisional shoal agreement and both houses are quietly grateful to a person who will be gone in a week.',
            effects: {
              credits: 1600,
              food: 12,
              morale: 12,
              personalXp: 55,
              flag: { key: 'house_mediator', value: true },
            },
          },
          success: {
            text: 'You carry three messages and the tone of the fourth is different from the first. Nothing is settled. Something has moved.',
            effects: { credits: 700, morale: 7, personalXp: 35, flag: { key: 'house_mediator', value: true } },
          },
          partial: {
            text: 'You get a partial hearing from both and a firm instruction from each not to speak for them again.',
            effects: { credits: 200, crewStress: 6, personalXp: 15 },
          },
          failure: {
            text: 'An offworlder inserting himself into a two-generation dispute is exactly as welcome as it sounds. Both houses close their doors.',
            effects: { morale: -6, crewStress: 10, flag: { key: 'house_enemy', value: true } },
          },
          criticalFailure: {
            text: 'You misrender a formal phrase and turn a grievance into an accusation. The two houses are now further apart than they were, and everyone knows who did it.',
            effects: {
              credits: -300,
              morale: -12,
              crewStress: 16,
              flag: { key: 'chain_disfavour', value: true },
            },
          },
        },
      },
      {
        id: 'stay-out-of-it',
        label: 'Decline both contracts',
        hint: 'Free, and you carry nothing',
        result: {
          text: 'You tell both houses your hold is committed. Neither believes you and both accept the answer, which is how this is done.',
          effects: { morale: 1, log: 'Stayed clear of a local house dispute.' },
        },
      },
    ],
  },

  {
    id: 'pln-water-offered',
    scope: ['planet', 'social'],
    title: 'Water, Offered With Both Hands',
    body: 'A deep house elder invites your crew to a shore meal at {location}. Partway through, she offers you a shallow bowl of fresh water held in both hands, and the entire table stops talking. Nobody has explained what you are supposed to do.',
    weight: 8,
    conditions: { once: true, locationKinds: ['inhabitedPlanet'], minCrew: 2 },
    tags: ['etiquette', 'hospitality'],
    choices: [
      {
        id: 'accept-both-hands',
        label: 'Take it with both hands and drink',
        hint: 'Read the room and commit',
        effects: { hours: 4 },
        check: { skill: 'persuasion', attributes: ['socialAwareness', 'composure'], participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'You take it correctly, drink half, and return the bowl with the rest, which is the part nobody could have told you. The table exhales. The evening becomes something else entirely.',
            effects: {
              food: 8,
              morale: 12,
              crewXp: 20,
              personalXp: 50,
              flag: { key: 'deep_house_guest', value: true },
            },
          },
          success: {
            text: 'You take it with both hands and drink. It is not perfect and it is clearly sincere, and sincerity carries most of the weight.',
            effects: { food: 5, morale: 8, personalXp: 30, flag: { key: 'deep_house_guest', value: true } },
          },
          partial: {
            text: 'You drink the whole bowl. A younger Naumari winces. The elder pretends not to notice, which is its own kind of verdict.',
            effects: { food: 3, morale: 3, personalXp: 15 },
          },
          failure: {
            text: 'You take the bowl with one hand out of habit. The conversation resumes a beat late and stays formal for the rest of the meal.',
            effects: { morale: -3, crewStress: 5, personalXp: 8 },
          },
          criticalFailure: {
            text: 'You set the bowl down without drinking to ask a question. Two people leave the table. The meal ends early.',
            effects: {
              morale: -9,
              crewStress: 12,
              flag: { key: 'deep_house_offence', value: true },
            },
          },
        },
      },
      {
        id: 'ask-the-host',
        label: 'Ask her, plainly, what is expected',
        hint: 'Honest, and it costs standing',
        effects: { hours: 4 },
        result: {
          text: 'You say you do not know the form and ask to be told. She tells you, at length, in front of everyone. It is a small humiliation and a real one, and it is also the correct answer.',
          effects: {
            food: 4,
            morale: 4,
            crewXp: 12,
            personalXp: 25,
            flag: { key: 'deep_house_guest', value: true },
            log: 'Admitted ignorance of local custom at a deep house table.',
          },
        },
      },
      {
        id: 'defer-to-crew',
        label: 'Let the crew member she is actually watching answer',
        hint: 'Four hours, and it is not your moment',
        effects: { hours: 4 },
        check: { skill: 'persuasion', attributes: ['socialAwareness', 'decisionMaking'], participation: 'duo' },
        outcomes: {
          exceptional: {
            text: 'You realise the offer was never aimed at you, step back, and let it land where it was meant to. The elder notices that you noticed.',
            effects: {
              food: 8,
              morale: 11,
              crewXp: 30,
              personalXp: 40,
              flag: { key: 'deep_house_guest', value: true },
            },
          },
          success: {
            text: 'Your crew member handles it better than you would have. The table warms considerably.',
            effects: { food: 5, morale: 7, crewXp: 20, personalXp: 15, flag: { key: 'deep_house_guest', value: true } },
          },
          partial: {
            text: 'They freeze and you have to take the bowl anyway, half a beat too late.',
            effects: { food: 2, morale: 1, crewStress: 5, crewXp: 8 },
          },
          failure: {
            text: 'Passing an offered bowl to someone else reads as declining it. The elder withdraws it without expression.',
            effects: { morale: -5, crewStress: 8 },
          },
          criticalFailure: {
            text: 'The bowl goes over on the table between you. Nobody says anything. Everybody stands up.',
            effects: {
              morale: -10,
              crewStress: 14,
              flag: { key: 'deep_house_offence', value: true },
            },
          },
        },
      },
    ],
  },

  {
    id: 'pln-navigator-passage',
    scope: ['planet', 'social'],
    title: 'She Has Never Seen Her Own Sky From Outside',
    body: 'A Naumari channel pilot at {location} has spent nineteen years reading currents nobody else can read and has decided that is not enough. She wants offworld passage. Her house does not want her to have it, and she has asked you rather than them.',
    weight: 8,
    conditions: { once: true, locationKinds: ['inhabitedPlanet'] },
    tags: ['recruit', 'family'],
    choices: [
      {
        id: 'take-her-openly',
        label: 'Go to her house and ask for her properly',
        hint: 'Eight hours, formal, and they may say no',
        effects: { hours: 8 },
        check: { skill: 'negotiation', secondarySkill: 'persuasion', attributes: ['socialAwareness', 'leadership'], participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'You make the request in the correct form and the house, after two hours of argument nobody translates for you, releases her with a gift of charts and a stated expectation that you will bring her back.',
            effects: {
              recruit: true,
              dataCores: 1,
              food: 6,
              morale: 12,
              personalXp: 50,
              flag: { key: 'naumari_pilot_aboard', value: true },
            },
          },
          success: {
            text: 'They agree, reluctantly, with conditions. She comes aboard with her house\'s permission and her mother\'s silence.',
            effects: {
              recruit: true,
              morale: 8,
              personalXp: 32,
              flag: { key: 'naumari_pilot_aboard', value: true },
            },
          },
          partial: {
            text: 'The house defers a decision to the next tide council, which is in three weeks. She understands what that means.',
            effects: { morale: -3, crewStress: 6, personalXp: 15 },
          },
          failure: {
            text: 'The house refuses, firmly, and is now aware she asked. That is worse for her than for you.',
            effects: { morale: -6, crewStress: 8, flag: { key: 'pilot_refused', value: true } },
          },
          criticalFailure: {
            text: 'You make the request in a form that implies purchase. The house hears it as an offworlder trying to buy a person, and the chain hears about it by evening.',
            effects: {
              morale: -12,
              crewStress: 14,
              flag: { key: 'chain_disfavour', value: true },
            },
          },
        },
      },
      {
        id: 'take-her-quietly',
        label: 'Take her aboard without telling anyone',
        hint: 'Two hours, and it will follow you',
        effects: { hours: 2 },
        result: {
          text: 'She comes up the ramp at night with one bag. She is the best pilot on your bridge within a week and she does not talk about home.',
          effects: {
            recruit: true,
            morale: 4,
            crewStress: 8,
            flag: { key: 'naumari_pilot_stolen', value: true },
            log: 'A Naumari channel pilot left the planet without her house’s consent.',
          },
        },
      },
      {
        id: 'hire-her-for-the-chain',
        label: 'Hire her as a local pilot only',
        hint: 'Four hours, no offworld berth',
        requires: { minCredits: 300 },
        effects: { hours: 4, credits: -300 },
        result: {
          text: 'She takes the work and takes it seriously, and threads your ship through channels your charts call impassable. At the end she says thank you in a way that makes it clear what you did not offer.',
          effects: {
            fuel: 6,
            systems: { sensors: 4 },
            personalXp: 20,
            morale: -2,
            log: 'Hired a Naumari channel pilot for local navigation only.',
          },
        },
      },
      {
        id: 'tell-her-no',
        label: 'Tell her no',
        hint: 'Free, and clean',
        result: {
          text: 'You give her the honest reason: a ship this size, a leg that long, and stores that do not stretch. She takes it standing very straight and thanks you for not lying about it.',
          effects: { morale: -3, log: 'Declined to carry a Naumari pilot offworld.' },
        },
      },
    ],
  },

  {
    id: 'pln-shoal-predator',
    scope: ['planet', 'hostile'],
    title: 'Something Is Taking the Nets',
    body: 'Three net stations on the outer chain have been stripped in a week and one Naumari fisher has not come back. The houses have put a bounty on whatever is doing it. They are careful to say the bounty is for the animal and not for a hunt.',
    weight: 9,
    conditions: { locationKinds: ['inhabitedPlanet'], minCrew: 3 },
    tags: ['fauna', 'bounty'],
    choices: [
      {
        id: 'hunt-it',
        label: 'Take a party out to the outer nets',
        hint: 'Ten hours on the water',
        effects: { hours: 10 },
        check: { skill: 'firearms', secondarySkill: 'exploration', attributes: ['perception', 'steadiness'], participation: 'trio', criticalRisk: true },
        outcomes: {
          exceptional: {
            text: 'You find it at the second station, take it cleanly from the boat, and recover enough of the fisher\'s gear to return to his house.',
            effects: {
              credits: 1200,
              food: 10,
              morale: 11,
              crewXp: 40,
              flag: { key: 'chain_goodwill', value: true },
            },
          },
          success: {
            text: 'A long wait and one good shot. The bounty is paid and the outer chain fishes again.',
            effects: { credits: 800, food: 6, morale: 7, crewXp: 25, crewStress: 8 },
          },
          partial: {
            text: 'You wound it and it goes deep. The nets are safe for now and nobody is calling it finished.',
            effects: { credits: 300, crewStress: 12, crewXp: 12 },
          },
          failure: {
            text: 'Ten hours on a small boat in heavy chop and no sighting at all. Two of your crew are extremely unwell.',
            effects: { crewStress: 14, morale: -4 },
          },
          criticalFailure: {
            text: 'It comes at the boat instead of the nets.',
            effects: {
              crewStress: 18,
              morale: -6,
              combat: 'enc_hostile_fauna',
            },
          },
        },
      },
      {
        id: 'study-the-pattern',
        label: 'Work out what changed before hunting anything',
        hint: 'Six hours with the fishers and their records',
        effects: { hours: 6 },
        check: { skill: 'medicalResearch', secondarySkill: 'exploration', attributes: ['reasoning', 'evaluation'], participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'A warm current shift has pushed a deep-water species onto the shelf. You show the houses where it will be next week and they move the nets instead of killing anything.',
            effects: {
              credits: 900,
              dataCores: 1,
              food: 8,
              morale: 10,
              personalXp: 50,
              flag: { key: 'chain_goodwill', value: true },
            },
          },
          success: {
            text: 'You map the strikes against the tide tables and find the pattern. The nets move and the losses stop.',
            effects: { credits: 600, food: 4, morale: 7, personalXp: 32, flag: { key: 'chain_goodwill', value: true } },
          },
          partial: {
            text: 'You find half a pattern. The houses move two of the three stations and lose the third anyway.',
            effects: { credits: 250, personalXp: 15, crewStress: 4 },
          },
          failure: {
            text: 'The records are kept in a form you cannot read and the fishers have better things to do than teach you. Six hours, nothing gained.',
            effects: { crewStress: 6, morale: -3 },
          },
          criticalFailure: {
            text: 'Your conclusion sends a net crew to a station on the night it is hit. They get clear. Only just.',
            effects: {
              morale: -9,
              crewStress: 14,
              flag: { key: 'chain_disfavour', value: true },
            },
          },
        },
      },
      {
        id: 'sell-them-gear',
        label: 'Sell the houses deterrent gear instead',
        hint: 'Three hours, profitable, not your problem',
        requires: { minRepairParts: 20 },
        effects: { hours: 3, repairParts: -20 },
        result: {
          text: 'Acoustic emitters rigged out of spare hull sensors. They work about half the time, which the houses knew before they bought them and bought them anyway.',
          effects: {
            credits: 600,
            morale: -2,
            personalXp: 12,
            log: 'Sold improvised deterrent gear to the net houses.',
          },
        },
      },
      {
        id: 'leave-the-bounty',
        label: 'Leave it to the locals',
        hint: 'Free',
        result: {
          text: 'It is their water and their animal and they have been doing this longer than your species has had ships. Nobody argues with the reasoning and the bounty stays posted.',
          effects: { log: 'Declined the shoal predator bounty.' },
        },
      },
    ],
  },

  {
    id: 'pln-drowned-relay',
    scope: ['planet', 'technical'],
    title: 'The Drowned Relay',
    body: 'A pre-contact orbital relay came down on the shallow chain at {location} generations ago and the Naumari built a stilt platform around it rather than move it. It still has power. Nobody on the chain has ever got it to say anything, and they are willing to let you try.',
    weight: 9,
    conditions: { locationKinds: ['inhabitedPlanet'] },
    tags: ['relic', 'data'],
    choices: [
      {
        id: 'interface-with-it',
        label: 'Get a terminal onto it',
        hint: 'Eight hours on a wet platform',
        effects: { hours: 8 },
        check: { skill: 'computers', secondarySkill: 'electricalEngineering', attributes: ['reasoning', 'memory'], participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'It is a survey relay from a mapping expedition that never filed a report. Sixty years of orbital observation of this system comes off it, including the outer lanes you are about to fly.',
            effects: {
              dataCores: 3,
              fuel: 6,
              systems: { sensors: 8 },
              credits: 600,
              personalXp: 55,
              morale: 8,
              flag: { key: 'relay_decoded', value: true },
            },
          },
          success: {
            text: 'You get it talking. Partial survey archives, a stellar drift table, and a system chart that is better than yours.',
            effects: {
              dataCores: 2,
              systems: { sensors: 5 },
              personalXp: 35,
              morale: 5,
              flag: { key: 'relay_decoded', value: true },
            },
          },
          partial: {
            text: 'The relay responds and then locks you out at the archive layer. You have a handshake protocol and nothing behind it.',
            effects: { dataCores: 1, personalXp: 18, crewStress: 4 },
          },
          failure: {
            text: 'Eight hours crouched on wet decking and the relay never acknowledges anything. The Naumari platform keeper is politely unsurprised.',
            effects: { crewStress: 8, morale: -3, personalXp: 8 },
          },
          criticalFailure: {
            text: 'Your interface attempt trips a power condition the relay has been sitting on for sixty years. It discharges into the platform and the platform is wooden.',
            effects: {
              credits: -400,
              morale: -8,
              crewStress: 14,
              wound: { severityScore: 50, damageType: 'burn' },
              flag: { key: 'chain_disfavour', value: true },
            },
          },
        },
      },
      {
        id: 'strip-it-for-parts',
        label: 'Strip it for components instead',
        hint: 'Six hours, and the chain will have views',
        effects: { hours: 6 },
        check: { skill: 'mechanicalEngineering', secondarySkill: 'persuasion', participation: 'duo' },
        outcomes: {
          exceptional: {
            text: 'You negotiate for the parts you actually need, take them cleanly, and leave the housing standing. The platform keeper gets a working light for the first time in his life.',
            effects: {
              items: [{ itemId: 'sensor_module', qty: 1, condition: 70 }, { itemId: 'power_cell', qty: 2 }],
              repairParts: 35,
              systems: { sensors: 5 },
              morale: 5,
              crewXp: 25,
            },
          },
          success: {
            text: 'Good salvage out of a sixty-year-old orbital unit. The chain takes payment and considers the matter closed.',
            effects: {
              credits: -200,
              repairParts: 40,
              items: [{ itemId: 'power_cell', qty: 1, condition: 60 }],
              crewXp: 15,
            },
          },
          partial: {
            text: 'Corrosion has taken most of what was worth having. You come away with scrap and a wet afternoon.',
            effects: { repairParts: 12, items: [{ itemId: 'salvage_scrap', qty: 3 }], crewStress: 5 },
          },
          failure: {
            text: 'The platform keeper stops the work partway through and you cannot argue with his reasoning. You leave with less than you came for.',
            effects: { repairParts: 5, morale: -4, crewStress: 6 },
          },
          criticalFailure: {
            text: 'You cut into a structural member of the platform to reach a component. The stilt town watches part of its own decking go into the water.',
            effects: {
              credits: -500,
              repairParts: 10,
              morale: -10,
              crewStress: 14,
              flag: { key: 'chain_disfavour', value: true },
            },
          },
        },
      },
      {
        id: 'teach-them-to-use-it',
        label: 'Show the chain how to read it themselves',
        hint: 'Twelve hours, no immediate profit',
        effects: { hours: 12 },
        check: { skill: 'computers', secondarySkill: 'persuasion', attributes: ['learning', 'charisma'], participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'Three days of weather data a day, in a form the platform keeper can read, and a working method for keeping it running. The chain will remember this for a long time.',
            effects: {
              food: 10,
              credits: 400,
              morale: 12,
              personalXp: 45,
              flag: { key: 'chain_goodwill', value: true },
            },
          },
          success: {
            text: 'You leave the keeper with a working terminal and a written procedure. He walks you back to your ship personally.',
            effects: { food: 6, morale: 9, personalXp: 30, flag: { key: 'chain_goodwill', value: true } },
          },
          partial: {
            text: 'The teaching goes further than the technology does. He understands the method and the relay only half cooperates.',
            effects: { food: 3, morale: 4, personalXp: 15, crewStress: 5 },
          },
          failure: {
            text: 'Twelve hours across a language barrier and a technology barrier at the same time. Neither of you gets anywhere.',
            effects: { crewStress: 10, morale: -2, personalXp: 8 },
          },
          criticalFailure: {
            text: 'You leave him with a procedure that damages the unit the third time he runs it. The relay goes dark permanently and he knows why.',
            effects: {
              morale: -9,
              crewStress: 12,
              flag: { key: 'chain_disfavour', value: true },
            },
          },
        },
      },
    ],
  },

  {
    id: 'pln-council-permit',
    scope: ['planet', 'social'],
    title: 'The Tide Council',
    body: 'Nothing significant happens on the chain without the tide council, and the council meets when the council meets. Your request for an inland survey permit is item eleven on a list of nineteen, behind a dispute about a jetty. You are expected to sit through all of it.',
    weight: 9,
    conditions: { once: true, locationKinds: ['inhabitedPlanet'] },
    tags: ['politics', 'permit'],
    choices: [
      {
        id: 'sit-through-it',
        label: 'Sit through the whole council',
        hint: 'Twenty hours, most of it not about you',
        effects: { hours: 20 },
        check: { skill: 'persuasion', attributes: ['socialAwareness', 'discipline'], participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'You sit through nineteen items without once checking the time, and when yours comes up three houses speak for you before you have said anything. The permit is broad and the council asks you to come back next season.',
            effects: {
              morale: 9,
              personalXp: 50,
              credits: -100,
              flag: { key: 'survey_permit_broad', value: true },
            },
          },
          success: {
            text: 'Twenty hours of jetty disputes and then a permit, granted without argument, because you were visibly willing to earn it.',
            effects: { morale: 5, personalXp: 32, credits: -200, flag: { key: 'survey_permit', value: true } },
          },
          partial: {
            text: 'You get a limited permit: two named islands, no inland water, and a chaperone.',
            effects: { personalXp: 15, credits: -250, crewStress: 6, flag: { key: 'survey_permit_limited', value: true } },
          },
          failure: {
            text: 'The council runs out of time at item nine. Yours is deferred to the next meeting, in eleven days.',
            effects: { crewStress: 8, morale: -4 },
          },
          criticalFailure: {
            text: 'You leave to eat during item six and return to find your item was moved up and heard in your absence. It was refused.',
            effects: {
              morale: -8,
              crewStress: 10,
              flag: { key: 'permit_refused', value: true },
            },
          },
        },
      },
      {
        id: 'sponsor-through-a-house',
        label: 'Get a shelf house to sponsor the request',
        hint: 'Eight hours, and you will owe them',
        effects: { hours: 8 },
        check: { skill: 'negotiation', attributes: ['evaluation', 'socialAwareness'], participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'A house with an interest in the same islands sponsors you and pushes the item to third. The permit is granted before midday and the obligation is one you can live with.',
            effects: {
              morale: 7,
              personalXp: 40,
              flag: { key: 'survey_permit_broad', value: true },
            },
          },
          success: {
            text: 'Sponsorship secured, permit granted, favour owed. A clean transaction on all three counts.',
            effects: {
              credits: -400,
              personalXp: 25,
              flag: { key: 'survey_permit', value: true },
            },
          },
          partial: {
            text: 'The house sponsors you and attaches conditions that make the permit barely worth having.',
            effects: { credits: -400, crewStress: 5, personalXp: 12, flag: { key: 'survey_permit_limited', value: true } },
          },
          failure: {
            text: 'The house you approach is on the wrong side of the jetty dispute and your item is heard in the shadow of theirs.',
            effects: { morale: -5, crewStress: 8, flag: { key: 'permit_refused', value: true } },
          },
          criticalFailure: {
            text: 'You accept sponsorship without understanding the obligation attached to it. What you have agreed to is not a fee.',
            effects: {
              morale: -8,
              crewStress: 14,
              flag: { key: 'house_obligation', value: true },
            },
          },
        },
      },
      {
        id: 'survey-without-permit',
        label: 'Survey the islands without asking',
        hint: 'Six hours, and the chain will find out',
        effects: { hours: 6 },
        check: { skill: 'stealth', secondarySkill: 'exploration', participation: 'duo', criticalRisk: true },
        outcomes: {
          exceptional: {
            text: 'Two islands surveyed and off again before the tide turned. Nobody saw the ship and the mineral returns are worth the risk you took.',
            effects: {
              dataCores: 2,
              credits: 700,
              items: [{ itemId: 'trade_rare_minerals', qty: 2 }],
              personalXp: 40,
              crewXp: 20,
            },
          },
          success: {
            text: 'A quick survey of one island and a clean withdrawal. Useful data, no witnesses.',
            effects: { dataCores: 1, items: [{ itemId: 'trade_ore_crate', qty: 1 }], personalXp: 25, crewXp: 12 },
          },
          partial: {
            text: 'You get partial returns and a fishing boat gets a good look at your hull on the way out.',
            effects: { dataCores: 1, crewStress: 10, morale: -3 },
          },
          failure: {
            text: 'A chaperone boat is waiting at the landing site. The survey does not happen and the council is informed.',
            effects: { morale: -6, crewStress: 10, flag: { key: 'permit_refused', value: true } },
          },
          criticalFailure: {
            text: 'You are found on an island that is not a resource site but a burial chain. The council does not need to argue about the permit any more.',
            effects: {
              credits: -800,
              morale: -14,
              crewStress: 18,
              flag: { key: 'chain_disfavour', value: true },
            },
          },
        },
      },
    ],
  },

  {
    id: 'pln-stilt-town-fever',
    scope: ['planet', 'medical'],
    title: 'Fever in the Stilt Town',
    body: 'A stilt town on the outer chain has forty people down with something that started in the water tanks. Their own apothecary is one of the forty. A messenger has come to the harbour asking whether the offworld ship carries medicine, and what it costs.',
    weight: 9,
    conditions: { locationKinds: ['inhabitedPlanet'], minCrew: 2 },
    tags: ['outbreak', 'medical'],
    choices: [
      {
        id: 'go-and-treat',
        label: 'Take your medic and go',
        hint: 'Eighteen hours and your medical stock',
        requires: { minMedicine: 5 },
        effects: { hours: 18, medicine: -5 },
        check: { skill: 'medicalDiagnostics', secondarySkill: 'firstAid', attributes: ['reasoning', 'endurance'], participation: 'duo' },
        outcomes: {
          exceptional: {
            text: 'A water-borne bacterium, identified in three hours and treatable with what you brought. Forty people recover and the town\'s apprentice apothecary asks to come with you and learn.',
            effects: {
              food: 12,
              credits: 500,
              morale: 12,
              recruit: true,
              personalXp: 50,
              crewXp: 25,
              flag: { key: 'chain_goodwill', value: true },
            },
          },
          success: {
            text: 'Eighteen hours of hard work and the fever breaks across the town. They give you everything they can spare and it is more than they should.',
            effects: {
              food: 8,
              credits: 250,
              morale: 9,
              personalXp: 32,
              crewStress: 10,
              flag: { key: 'chain_goodwill', value: true },
            },
          },
          partial: {
            text: 'You stabilise most of them. Three of the oldest do not recover and the town is grateful and grieving at the same time.',
            effects: { food: 4, morale: 3, crewStress: 14, personalXp: 18 },
          },
          failure: {
            text: 'You cannot identify it and your synthetics do nothing. You spend eighteen hours keeping people hydrated and watching.',
            effects: { medicine: -2, morale: -5, crewStress: 16, personalXp: 8 },
          },
          criticalFailure: {
            text: 'Whatever it is, your crew is not immune to it. You bring two cases back to the ship with you.',
            effects: {
              medicine: -4,
              morale: -10,
              crewStress: 20,
              wound: { severityScore: 56, damageType: 'stun' },
              flag: { key: 'shipboard_outbreak', value: true },
            },
          },
        },
      },
      {
        id: 'send-medicine-only',
        label: 'Send medicine, keep the crew aboard',
        hint: 'Two hours, costs stock, safe',
        requires: { minMedicine: 6 },
        effects: { hours: 2, medicine: -6 },
        result: {
          text: 'Six units of broad-spectrum stock go out on the messenger\'s boat with written instructions. You hear four days later that it helped, mostly.',
          effects: {
            food: 4,
            morale: 5,
            personalXp: 10,
            flag: { key: 'chain_goodwill', value: true },
            log: 'Sent medical supplies to a stricken stilt town.',
          },
        },
      },
      {
        id: 'sell-the-medicine',
        label: 'Sell them what they need',
        hint: 'Three hours, and it is a real price',
        requires: { minMedicine: 6 },
        effects: { hours: 3, medicine: -6 },
        check: { skill: 'negotiation', participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'The town pays in cured fish, dried kelp, and worked shell, at a rate that leaves both sides feeling they did well. It is a fair trade and it is also a town buying its own survival.',
            effects: { food: 18, credits: 400, morale: -2, personalXp: 30 },
          },
          success: {
            text: 'They pay what they have. It is more than the medicine is worth and less than the situation is worth, and nobody comments.',
            effects: { food: 12, credits: 250, morale: -4, personalXp: 18 },
          },
          partial: {
            text: 'They cannot meet the price and you take partial payment rather than carry the stock back to the ship.',
            effects: { food: 6, morale: -5, crewStress: 5, personalXp: 8 },
          },
          failure: {
            text: 'The harbour reeve hears the price you named and buys the medicine herself, then makes sure the chain knows the arrangement.',
            effects: { credits: 300, morale: -9, crewStress: 8, flag: { key: 'chain_disfavour', value: true } },
          },
          criticalFailure: {
            text: 'You are still negotiating when a second boat arrives to say the count is now fifty-one. Whatever you agree to now, this is the story that gets told about your ship.',
            effects: {
              credits: 200,
              morale: -13,
              crewStress: 14,
              flag: { key: 'chain_disfavour', value: true },
            },
          },
        },
      },
      {
        id: 'stay-out-of-fever',
        label: 'Send the messenger away',
        hint: 'Free, and quarantine discipline is a real argument',
        result: {
          text: 'You give the honest reason: a closed hull, a long leg, and no way to isolate an outbreak aboard. It is a defensible position and the messenger rows back alone.',
          effects: {
            morale: -6,
            crewStress: 8,
            log: 'Refused to assist a stilt town outbreak.',
          },
        },
      },
    ],
  },

  {
    id: 'pln-salt-kiln-work',
    scope: ['planet'],
    title: 'The Kilns Are Down',
    body: 'The salt kilns on the middle chain are the only industry at {location} that pays in offworld credits, and two of the six are cold because a Naumari mechanic cannot source the parts to fix them. He is not asking for help. He is standing in front of a broken machine and swearing at it in his own language.',
    weight: 11,
    conditions: { locationKinds: ['inhabitedPlanet'] },
    tags: ['work', 'repair'],
    choices: [
      {
        id: 'fix-the-kilns',
        label: 'Work on them with him',
        hint: 'Fourteen hours and your parts',
        requires: { minRepairParts: 15 },
        effects: { hours: 14, repairParts: -15 },
        check: { skill: 'mechanicalEngineering', secondarySkill: 'electricalEngineering', participation: 'duo' },
        outcomes: {
          exceptional: {
            text: 'Both kilns relit by the second shift, plus a modification to the feed that will stop it happening again. The chain pays properly and the mechanic will not let anyone else touch your ship while you are in harbour.',
            effects: {
              credits: 1300,
              food: 8,
              items: [{ itemId: 'trade_chemicals', qty: 2 }],
              morale: 9,
              crewXp: 30,
              personalXp: 40,
              flag: { key: 'kiln_contact', value: true },
            },
          },
          success: {
            text: 'One kiln relit properly and the second running at reduced draw. Good pay and a mechanic who now considers you a colleague.',
            effects: {
              credits: 800,
              food: 4,
              morale: 6,
              crewXp: 20,
              personalXp: 25,
              flag: { key: 'kiln_contact', value: true },
            },
          },
          partial: {
            text: 'You get one running. The other needs a casting nobody on this world can make.',
            effects: { credits: 400, crewXp: 10, personalXp: 12, crewStress: 8 },
          },
          failure: {
            text: 'Fourteen hours and your parts, and neither kiln lights. The mechanic is more apologetic about it than you are.',
            effects: { credits: 100, morale: -4, crewStress: 12 },
          },
          criticalFailure: {
            text: 'A pressure test on the relit kiln fails with people standing next to it. The chain loses a kiln permanently and someone loses the use of a hand for a while.',
            effects: {
              credits: -300,
              morale: -9,
              crewStress: 16,
              wound: { severityScore: 60, damageType: 'burn' },
              flag: { key: 'chain_disfavour', value: true },
            },
          },
        },
      },
      {
        id: 'sell-the-parts',
        label: 'Sell him the parts and let him do it',
        hint: 'Two hours, clean, profitable',
        requires: { minRepairParts: 20 },
        effects: { hours: 2, repairParts: -20 },
        result: {
          text: 'He pays a fair price for parts he could not otherwise get and gets both kilns running in three days without you. That is arguably the better outcome for everyone.',
          effects: {
            credits: 700,
            morale: 2,
            log: 'Sold machine parts to the salt kiln works.',
          },
        },
      },
      {
        id: 'crew-labour-at-kilns',
        label: 'Put your crew on the working kilns for a shift',
        hint: 'Ten hours of hot, heavy work',
        effects: { hours: 10 },
        check: { skill: 'cooking', secondarySkill: 'exploration', attributes: ['endurance', 'discipline'], participation: 'group' },
        outcomes: {
          exceptional: {
            text: 'Your crew runs the four good kilns through a full shift and the chain makes its quota anyway. They are paid in credits and in salt, which is currency here.',
            effects: {
              credits: 700,
              food: 10,
              items: [{ itemId: 'trade_chemicals', qty: 2 }],
              crewXp: 25,
              morale: 6,
              crewStress: 8,
            },
          },
          success: {
            text: 'A hot, straightforward shift. Fair pay and a crew that smells of brine for two days.',
            effects: { credits: 450, food: 5, crewXp: 15, crewStress: 10 },
          },
          partial: {
            text: 'Your people are slow at unfamiliar work and the shift underproduces. Partial pay, no complaints.',
            effects: { credits: 220, crewStress: 12, crewXp: 8 },
          },
          failure: {
            text: 'A batch is spoiled by mishandling and the kiln crew stops using your people halfway through.',
            effects: { credits: 80, crewStress: 12, morale: -5 },
          },
          criticalFailure: {
            text: 'Somebody opens a kiln door against instruction and the flash burn takes the shift down to nothing.',
            effects: {
              credits: -200,
              morale: -8,
              crewStress: 16,
              wound: { severityScore: 46, damageType: 'burn' },
            },
          },
        },
      },
      {
        id: 'walk-past-kilns',
        label: 'Leave him to it',
        hint: 'Free',
        result: {
          text: 'It is not your machine and not your chain. He gets it running eventually, or he does not, and either way you are not there for it.',
          effects: { log: 'Passed on work at the salt kilns.' },
        },
      },
    ],
  },

  {
    id: 'pln-smuggler-cove',
    scope: ['planet', 'hostile'],
    title: 'The Cove Nobody Charts',
    body: 'A Naumari fisher tells you, obliquely and for a price, about a cove on the far side of the chain where offworld boats put in at night and no tariff is ever paid. He is not telling you because he wants you to go there. He is telling you because the houses want it dealt with and cannot say so.',
    weight: 8,
    conditions: { locationKinds: ['inhabitedPlanet'], minDanger: 15, minCrew: 3 },
    tags: ['smugglers', 'covert'],
    choices: [
      {
        id: 'scout-the-cove',
        label: 'Scout it quietly',
        hint: 'Eight hours, no contact if you can help it',
        effects: { hours: 8 },
        check: { skill: 'stealth', secondarySkill: 'exploration', participation: 'duo', criticalRisk: true },
        outcomes: {
          exceptional: {
            text: 'A full picture: three boats, a schedule, a cached manifest, and the name of the shelf house factor taking the cut. All of it recorded, none of it noticed.',
            effects: {
              dataCores: 2,
              credits: 900,
              morale: 8,
              crewXp: 30,
              personalXp: 40,
              flag: { key: 'cove_intelligence', value: true },
            },
          },
          success: {
            text: 'You get positions, timings, and enough of a manifest to be useful. Nobody sees you.',
            effects: { dataCores: 1, credits: 500, crewXp: 20, personalXp: 25, flag: { key: 'cove_intelligence', value: true } },
          },
          partial: {
            text: 'You see enough to confirm it is real and not enough to be worth much to anyone.',
            effects: { credits: 150, crewStress: 8, crewXp: 10 },
          },
          failure: {
            text: 'A lookout on the headland spots your boat and the cove is empty within the hour. Whoever they are, they now know somebody is looking.',
            effects: { crewStress: 12, morale: -4, flag: { key: 'cove_alerted', value: true } },
          },
          criticalFailure: {
            text: 'They are better at this than you and they have the high ground on both sides of the cove mouth.',
            effects: {
              crewStress: 18,
              morale: -6,
              combat: 'enc_smuggler_ambush',
            },
          },
        },
      },
      {
        id: 'trade-with-them',
        label: 'Put in openly and do business',
        hint: 'Five hours, profitable, and the houses will know',
        effects: { hours: 5 },
        check: { skill: 'negotiation', secondarySkill: 'persuasion', attributes: ['composure', 'evaluation'], participation: 'individual', criticalRisk: true },
        outcomes: {
          exceptional: {
            text: 'They take you for a fellow professional and sell you fuel, parts, and passage information at prices no harbour would offer.',
            effects: {
              fuel: 18,
              repairParts: 40,
              credits: -600,
              items: [{ itemId: 'fuel_canister', qty: 2 }],
              personalXp: 35,
              flag: { key: 'cove_trade', value: true },
            },
          },
          success: {
            text: 'A quick, cold transaction on a dark beach. Cheap fuel and no paperwork.',
            effects: { fuel: 12, credits: -500, personalXp: 20, morale: -2, flag: { key: 'cove_trade', value: true } },
          },
          partial: {
            text: 'They sell you fuel at a fair price and nothing else, and watch you the entire time.',
            effects: { fuel: 8, credits: -450, crewStress: 8 },
          },
          failure: {
            text: 'They decide an unfamiliar hull asking questions is a problem rather than a customer, and tell you to leave.',
            effects: { crewStress: 10, morale: -4, flag: { key: 'cove_alerted', value: true } },
          },
          criticalFailure: {
            text: 'They take your credits aboard for the count and then decide your ship is worth more than the sale.',
            effects: {
              credits: -600,
              crewStress: 18,
              morale: -8,
              combat: 'enc_smuggler_ambush',
            },
          },
        },
      },
      {
        id: 'report-to-houses',
        label: 'Tell the houses what you were told',
        hint: 'Three hours, and the fisher will be exposed',
        effects: { hours: 3 },
        result: {
          text: 'You hand the information to the harbour reeve. She does not thank you and she does not pretend to be surprised, and the fisher who told you is not at the market the next tide.',
          effects: {
            credits: 300,
            morale: -4,
            crewStress: 6,
            flag: { key: 'chain_goodwill', value: true },
            log: 'Reported the smuggling cove to the harbour authority.',
          },
        },
      },
      {
        id: 'forget-the-cove',
        label: 'Forget he mentioned it',
        hint: 'Costs the fee you already paid',
        effects: { credits: -50 },
        result: {
          text: 'You pay him for the information and then do nothing with it, which is probably what he expected and possibly what he wanted.',
          effects: { log: 'Bought and ignored information about a smuggling cove.' },
        },
      },
    ],
  },

  {
    id: 'pln-island-survey',
    scope: ['planet', 'scavenge'],
    title: 'The Unworked Chain',
    body: 'A short chain of islands two hours out has never been settled: too small for a stilt town, too far for daily fishing, and reportedly rich in the mineral crusts the kilns cannot process. The Naumari have no objection to you looking. They have never had a reason to.',
    weight: 11,
    conditions: { locationKinds: ['inhabitedPlanet'], minCrew: 2 },
    tags: ['survey', 'resources'],
    choices: [
      {
        id: 'full-survey',
        label: 'Survey the chain properly',
        hint: 'Fourteen hours across three islands',
        effects: { hours: 14 },
        check: { skill: 'exploration', secondarySkill: 'scavenging', attributes: ['perception', 'endurance'], participation: 'trio' },
        outcomes: {
          exceptional: {
            text: 'Two of the three islands carry workable crusts and the third has a freshwater spring the chain did not know about. The survey is worth more to the houses than the minerals are to you.',
            effects: {
              dataCores: 2,
              credits: 900,
              items: [{ itemId: 'trade_rare_minerals', qty: 3 }, { itemId: 'trade_ore_crate', qty: 2 }],
              morale: 9,
              crewXp: 35,
              flag: { key: 'chain_goodwill', value: true },
            },
          },
          success: {
            text: 'A solid survey and a good haul of crust samples that will sell at the next real market.',
            effects: {
              dataCores: 1,
              items: [{ itemId: 'trade_rare_minerals', qty: 2 }, { itemId: 'trade_ore_crate', qty: 1 }],
              credits: 300,
              crewXp: 22,
              crewStress: 6,
            },
          },
          partial: {
            text: 'One island worked, two abandoned when the weather turned. Modest returns.',
            effects: { items: [{ itemId: 'trade_ore_crate', qty: 1 }], credits: 120, crewStress: 10, crewXp: 10 },
          },
          failure: {
            text: 'The crusts are thin and the landings are worse than the charts suggested. Fourteen hours and a bag of rock.',
            effects: { items: [{ itemId: 'salvage_scrap', qty: 2 }], crewStress: 14, morale: -4 },
          },
          criticalFailure: {
            text: 'A landing goes wrong on a wet basalt shelf and the party spends four hours getting one of their own back to the boat.',
            effects: {
              crewStress: 18,
              morale: -7,
              medicine: -3,
              wound: { severityScore: 54, damageType: 'blunt' },
            },
          },
        },
      },
      {
        id: 'aerial-survey',
        label: 'Survey from the ship instead',
        hint: 'Four hours and fuel, less detail',
        requires: { minFuel: 5 },
        effects: { hours: 4, fuel: -5 },
        check: { skill: 'navigation', secondarySkill: 'computers', attributes: ['perception', 'reasoning'], participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'A low pass with the array wide open maps all three islands to a depth no ground party could have reached in a week.',
            effects: { dataCores: 2, credits: 600, systems: { sensors: 3 }, personalXp: 40, morale: 5 },
          },
          success: {
            text: 'Good aerial returns and a chart the houses will want a copy of.',
            effects: { dataCores: 1, credits: 300, personalXp: 25 },
          },
          partial: {
            text: 'Cloud cover over two of the islands. You map one and burn the fuel anyway.',
            effects: { dataCores: 1, personalXp: 12 },
          },
          failure: {
            text: 'The mineral crusts do not read distinctly from altitude and you learn nothing you did not already suspect.',
            effects: { crewStress: 4, morale: -2 },
          },
          criticalFailure: {
            text: 'A low pass in bad air puts the ship into a downdraft over a headland and the landing gear takes the recovery badly.',
            effects: {
              hull: -12,
              systems: { engines: -8 },
              crewStress: 12,
              morale: -6,
            },
          },
        },
      },
      {
        id: 'hire-a-local-guide',
        label: 'Hire a Naumari boat and guide',
        hint: 'Ten hours, costs credits, much better odds',
        requires: { minCredits: 250 },
        effects: { hours: 10, credits: -250 },
        result: {
          text: 'The guide knows every landing on the chain, which of them are safe at which tide, and which island the fishers have always avoided. He does not say why about the last one and you do not push.',
          effects: {
            items: [{ itemId: 'trade_rare_minerals', qty: 2 }],
            dataCores: 1,
            credits: 250,
            crewXp: 15,
            morale: 4,
            flag: { key: 'chain_goodwill', value: true },
            log: 'Surveyed the outer island chain with a Naumari guide.',
          },
        },
      },
    ],
  },

  {
    id: 'pln-offworlder-grudge',
    scope: ['planet', 'social'],
    title: 'The Last Ship That Came',
    body: 'A shelf house factor at {location} will not deal with you at all, and after some effort you learn why: an offworld crew came through eleven years ago, took on water and repairs against a promised payment, and left in the night. Your species. Not your crew. He does not consider that a distinction.',
    weight: 8,
    conditions: { once: true, locationKinds: ['inhabitedPlanet'] },
    tags: ['reputation', 'debt'],
    choices: [
      {
        id: 'pay-the-old-debt',
        label: 'Pay what the last ship owed',
        hint: 'It is not your debt and it is a lot of money',
        requires: { minCredits: 900 },
        effects: { hours: 3, credits: -900 },
        result: {
          text: 'You put the amount on his table and say plainly that it is not your debt and you are paying it anyway. He is silent for a long time and then opens his ledger to you, and to every house on the chain.',
          effects: {
            morale: 10,
            personalXp: 35,
            flag: { key: 'old_debt_cleared', value: true },
            log: 'Paid a debt left by a previous offworld crew.',
          },
        },
      },
      {
        id: 'work-it-off',
        label: 'Offer to work it off instead',
        hint: 'Sixteen hours of whatever he names',
        effects: { hours: 16 },
        check: { skill: 'mechanicalEngineering', secondarySkill: 'persuasion', attributes: ['endurance', 'discipline'], participation: 'group' },
        outcomes: {
          exceptional: {
            text: 'He names the worst job on his dock and your crew does it without complaint or shortcuts. By the end he is working alongside them and the debt is not mentioned again.',
            effects: {
              food: 10,
              credits: 500,
              morale: 12,
              crewXp: 35,
              flag: { key: 'old_debt_cleared', value: true },
            },
          },
          success: {
            text: 'Two shifts of hard labour clears it. He shakes hands at the end, which from a shelf house factor is close to an apology.',
            effects: {
              food: 5,
              morale: 8,
              crewXp: 25,
              crewStress: 10,
              flag: { key: 'old_debt_cleared', value: true },
            },
          },
          partial: {
            text: 'The work is done adequately and the debt is reduced rather than cleared. He will deal with you at arm\'s length.',
            effects: { crewStress: 12, morale: 2, crewXp: 12 },
          },
          failure: {
            text: 'Your crew is not up to the work he named and he stops it before the second shift. He considers the point proven.',
            effects: { crewStress: 14, morale: -5 },
          },
          criticalFailure: {
            text: 'Somebody damages a hoist during the second shift. You now owe him for that as well and the chain has a second story about offworld crews.',
            effects: {
              credits: -400,
              morale: -9,
              crewStress: 16,
              flag: { key: 'chain_disfavour', value: true },
            },
          },
        },
      },
      {
        id: 'argue-the-distinction',
        label: 'Make the case that it is not your debt',
        hint: 'Four hours, and it is a defensible position',
        effects: { hours: 4 },
        check: { skill: 'persuasion', attributes: ['charisma', 'socialAwareness'], participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'You get him to say out loud that eleven years is a long time to hold a species responsible for a crew. He deals with you, warily, and that is a real change.',
            effects: { morale: 6, credits: 200, personalXp: 40, flag: { key: 'factor_wary_trade', value: true } },
          },
          success: {
            text: 'He accepts the distinction in principle and applies it grudgingly in practice. You can trade with him at unfavourable terms.',
            effects: { personalXp: 25, flag: { key: 'factor_wary_trade', value: true } },
          },
          partial: {
            text: 'He hears you out and does not change his position. He does introduce you to a smaller house that will deal with you.',
            effects: { personalXp: 12, crewStress: 3 },
          },
          failure: {
            text: 'Four hours of a conversation that was never going to move. He closes the ledger and stands up.',
            effects: { morale: -4, crewStress: 6 },
          },
          criticalFailure: {
            text: 'You compare your crew favourably to the last one at some length. He repeats what you said to two other houses, accurately, and it does not sound the same in their halls.',
            effects: {
              morale: -8,
              crewStress: 10,
              flag: { key: 'chain_disfavour', value: true },
            },
          },
        },
      },
      {
        id: 'trade-elsewhere',
        label: 'Take your business to another house',
        hint: 'Costs nothing except the best prices on the chain',
        result: {
          text: 'You deal with a smaller house at worse terms and everybody involved understands why. It works. It just costs more.',
          effects: {
            credits: -200,
            morale: -2,
            log: 'Traded through a lesser house to avoid an inherited grudge.',
          },
        },
      },
    ],
  },

  {
    id: 'pln-kelp-harvest',
    scope: ['planet'],
    title: 'The Harvest Runs Short-Handed',
    body: 'The deep kelp harvest at {location} runs for four days a season and this year the chain is short of boats and hands. It is cold, wet, repetitive work in open water, it pays in food rather than credits, and it is the single most important thing happening on this world this week.',
    weight: 12,
    conditions: { locationKinds: ['inhabitedPlanet'], minCrew: 3 },
    tags: ['harvest', 'community'],
    choices: [
      {
        id: 'work-the-harvest',
        label: 'Put the whole crew on the harvest',
        hint: 'Twenty-two hours over two days',
        effects: { hours: 22 },
        check: { skill: 'exploration', secondarySkill: 'cooking', attributes: ['endurance', 'resilience'], participation: 'group' },
        outcomes: {
          exceptional: {
            text: 'Your crew works two full days alongside four houses and pulls its weight in front of all of them. The chain fills its stores and the share they give you is not a payment, it is a portion.',
            effects: {
              food: 30,
              items: [{ itemId: 'protein_culture', qty: 3 }, { itemId: 'preserved_meal', qty: 6 }],
              morale: 12,
              crewXp: 40,
              crewStress: 10,
              flag: { key: 'chain_kin', value: true },
            },
          },
          success: {
            text: 'Two days of cold, hard, honest work. The hold comes back heavy and the crew comes back proud of something.',
            effects: {
              food: 20,
              items: [{ itemId: 'preserved_meal', qty: 4 }],
              morale: 9,
              crewXp: 28,
              crewStress: 12,
              flag: { key: 'chain_goodwill', value: true },
            },
          },
          partial: {
            text: 'Your people manage one day and most of a second. The share is proportional and nobody makes anything of it.',
            effects: { food: 12, morale: 4, crewXp: 15, crewStress: 14 },
          },
          failure: {
            text: 'Open-water work in cold swell is harder than it looks and half your crew is useless by the second morning. You take a token share and go.',
            effects: { food: 5, morale: -3, crewStress: 16 },
          },
          criticalFailure: {
            text: 'A boat is swamped in the harvest line with two of your crew aboard. They are pulled out. The kelp in that boat is not.',
            effects: {
              food: 3,
              morale: -9,
              crewStress: 20,
              medicine: -3,
              wound: { severityScore: 48, damageType: 'stun' },
            },
          },
        },
      },
      {
        id: 'lend-the-ship',
        label: 'Lend the ship as a lifting platform',
        hint: 'Eight hours and fuel, no crew in the water',
        requires: { minFuel: 6 },
        effects: { hours: 8, fuel: -6 },
        check: { skill: 'piloting', secondarySkill: 'mechanicalEngineering', participation: 'duo' },
        outcomes: {
          exceptional: {
            text: 'Your ship hovers the harvest line and lifts loads no boat could carry. The chain finishes in half the usual time and talks about it for years.',
            effects: {
              food: 24,
              credits: 400,
              morale: 11,
              personalXp: 40,
              crewXp: 20,
              flag: { key: 'chain_kin', value: true },
            },
          },
          success: {
            text: 'A useful day of lifting. Salt spray in everything and a hold full of kelp.',
            effects: { food: 16, morale: 7, personalXp: 25, systems: { engines: -3 }, flag: { key: 'chain_goodwill', value: true } },
          },
          partial: {
            text: 'The downwash is a problem for the smaller boats and you spend half the day repositioning. Modest help, modest share.',
            effects: { food: 8, systems: { engines: -4 }, crewStress: 6, personalXp: 12 },
          },
          failure: {
            text: 'The ship is the wrong tool. You scatter two harvest lines with the downwash and withdraw before you make it worse.',
            effects: { food: 3, systems: { engines: -5 }, morale: -5, crewStress: 8 },
          },
          criticalFailure: {
            text: 'A lift line fouls the landing gear and the load drops across a boat. Nobody is killed and the chain will be picking kelp out of the wreckage for a week.',
            effects: {
              hull: -10,
              systems: { engines: -10 },
              morale: -10,
              crewStress: 16,
              flag: { key: 'chain_disfavour', value: true },
            },
          },
        },
      },
      {
        id: 'buy-harvest-share',
        label: 'Buy a share of the harvest instead',
        hint: 'Two hours, credits for food',
        requires: { minCredits: 600 },
        effects: { hours: 2, credits: -600 },
        result: {
          text: 'You buy in as an outside investor, which the chain permits and does not celebrate. The food is real and the transaction is exactly what it looks like.',
          effects: {
            food: 18,
            morale: -1,
            log: 'Bought a share of the kelp harvest rather than working it.',
          },
        },
      },
      {
        id: 'skip-the-harvest',
        label: 'Stay with the ship',
        hint: 'Free, and the chain notices who is not there',
        result: {
          text: 'Every hull in the harbour is empty for two days except yours. Nobody says anything about it, then or later, which is itself the comment.',
          effects: {
            morale: -5,
            crewStress: 3,
            log: 'Sat out the kelp harvest.',
          },
        },
      },
    ],
  },
];

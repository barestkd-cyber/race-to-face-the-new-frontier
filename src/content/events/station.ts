/**
 * Station events — the Outer Trade Station and the Main Transit Station.
 *
 * The Outer Trade Station is a small remote commodity post hanging off the
 * edge of the interstellar economy. The Main Transit Station is the first
 * genuinely important hub on the route and the last reliable resupply
 * before the long final leg.
 */

import type { GameEventDef } from '../../engine/types';

export const STATION_EVENTS: GameEventDef[] = [
  {
    id: 'stn-berth-fee-dispute',
    scope: ['station'],
    title: 'The Berth Bill',
    body: 'The docking invoice at {location} lists a mass surcharge, a hazard levy, and a line item called "handling" that is larger than the other two combined. The berth clerk has clearly had this conversation forty times today and is not enjoying it either.',
    weight: 12,
    conditions: { locationKinds: ['tradeStation', 'transitStation'] },
    tags: ['fees', 'bureaucracy'],
    choices: [
      {
        id: 'argue-the-line-items',
        label: 'Take the invoice apart line by line',
        hint: 'Three hours at the counter',
        effects: { hours: 3 },
        check: { skill: 'negotiation', attributes: ['evaluation', 'composure'], participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'You find two levies that do not apply to a hull your size and one that was repealed last year. The clerk voids all three and quietly waives the handling fee to get you out of the queue.',
            effects: { credits: 60, personalXp: 30, morale: 3 },
          },
          success: {
            text: 'The handling fee comes off and the hazard levy is halved. It takes three hours you would rather have spent sleeping.',
            effects: { credits: -180, personalXp: 20 },
          },
          partial: {
            text: 'One item comes off. The clerk adds a queue-time charge that makes the saving almost meaningless.',
            effects: { credits: -320, personalXp: 10, crewStress: 3 },
          },
          failure: {
            text: 'You pay the full amount and lose the afternoon doing it. The clerk was right about all of it.',
            effects: { credits: -420, morale: -2, crewStress: 4 },
          },
          criticalFailure: {
            text: 'Your persistence gets your hull flagged for a compliance review, which is a fine on top of the fee.',
            effects: {
              credits: -620,
              morale: -4,
              crewStress: 6,
              flag: { key: 'station_flagged', value: true },
            },
          },
        },
      },
      {
        id: 'pay-and-move',
        label: 'Pay it and get on with the day',
        hint: 'Fast, expensive',
        requires: { minCredits: 400 },
        effects: { hours: 0.5, credits: -400 },
        result: {
          text: 'You pay the number on the page. The clerk stamps the berth and you have your whole day back, which counts for something.',
          effects: { morale: 1, log: 'Berth fees paid in full without dispute.' },
        },
      },
      {
        id: 'work-off-the-fee',
        label: 'Offer labour instead of credits',
        hint: 'Eight hours of your crew on their dock',
        effects: { hours: 8 },
        check: { skill: 'mechanicalEngineering', secondarySkill: 'persuasion', participation: 'group' },
        outcomes: {
          exceptional: {
            text: 'Your crew spends a shift on their loading gantry and does it well enough that the dockmaster writes off the berth and asks when you are back through.',
            effects: {
              credits: 200,
              crewStress: 6,
              crewXp: 25,
              morale: 4,
              flag: { key: 'dockmaster_favour', value: true },
            },
          },
          success: {
            text: 'A shift of honest work clears the invoice. Everyone is tired and nobody is out of pocket.',
            effects: { crewStress: 8, crewXp: 18, morale: 2 },
          },
          partial: {
            text: 'The work covers most of the fee. You pay the remainder and your crew is still tired.',
            effects: { credits: -150, crewStress: 9, crewXp: 10 },
          },
          failure: {
            text: 'Your people are slower than their own dock gang and the dockmaster ends the arrangement early. You pay the fee anyway.',
            effects: { credits: -400, crewStress: 10, morale: -4 },
          },
          criticalFailure: {
            text: 'Somebody drops a pallet through a gantry rail. You now owe the fee and the damage.',
            effects: {
              credits: -700,
              crewStress: 14,
              morale: -7,
              wound: { severityScore: 32, damageType: 'blunt' },
            },
          },
        },
      },
    ],
  },

  {
    id: 'stn-repair-yard-quote',
    scope: ['station', 'technical'],
    title: 'The Yard Quote',
    body: 'A yard crew at {location} walks your hull, taps three plates, and hands you a quote with a lot of zeroes and a line about "structural fatigue consistent with vessel age." They may be right. They may also have seen a captain with nowhere else to go.',
    weight: 11,
    conditions: { locationKinds: ['transitStation'], requiresShip: true },
    tags: ['repair', 'money'],
    choices: [
      {
        id: 'audit-the-quote',
        label: 'Have your own engineer walk it with them',
        hint: 'Four hours, and the yard will not like it',
        effects: { hours: 4 },
        check: { skill: 'mechanicalEngineering', secondarySkill: 'negotiation', participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'Two of the three findings are cosmetic and your engineer proves it with a thickness gauge. The yard reprices, apologises, and throws in a plate set to close it out.',
            effects: {
              credits: -450,
              hull: 20,
              items: [{ itemId: 'hull_patch', qty: 3 }],
              personalXp: 40,
              morale: 5,
            },
          },
          success: {
            text: 'The quote drops by half once someone competent is standing there. The real work gets done properly.',
            effects: { credits: -900, hull: 18, systems: { hull: 10 }, personalXp: 25 },
          },
          partial: {
            text: 'They shave a little off and do the work. Your engineer thinks the plate they used was not the grade they charged for.',
            effects: { credits: -1300, hull: 12, personalXp: 12, crewStress: 3 },
          },
          failure: {
            text: 'The findings were all real. You pay the quote and get a lecture about maintenance intervals.',
            effects: { credits: -1600, hull: 15, morale: -3 },
          },
          criticalFailure: {
            text: 'The walkthrough turns up a frame crack nobody had found yet. The quote goes up, not down, and you cannot leave without the work.',
            effects: { credits: -2000, hull: 10, systems: { hull: -5 }, morale: -8, crewStress: 8 },
          },
        },
      },
      {
        id: 'buy-parts-do-it-yourself',
        label: 'Buy the materials and do the work aboard',
        hint: 'Sixteen hours of your own labour',
        requires: { minCredits: 300 },
        effects: { hours: 16, credits: -300 },
        check: { skill: 'mechanicalEngineering', secondarySkill: 'electricalEngineering', participation: 'group' },
        outcomes: {
          exceptional: {
            text: 'Your crew does the yard\'s job better than the yard would have, at a fifth of the price, and has parts left over.',
            effects: { hull: 22, systems: { hull: 12 }, repairParts: 20, crewXp: 40, morale: 8 },
          },
          success: {
            text: 'Sixteen hours of hard work and the plates are sound. The yard foreman watches part of it and says nothing, which is a compliment.',
            effects: { hull: 16, systems: { hull: 8 }, crewStress: 8, crewXp: 25, morale: 4 },
          },
          partial: {
            text: 'You get most of it done. One section will need a yard eventually, and everyone knows it.',
            effects: { hull: 8, crewStress: 10, crewXp: 12 },
          },
          failure: {
            text: 'Halfway through you find the materials you bought are the wrong grade. You close it up no better than before.',
            effects: { credits: -150, hull: 2, crewStress: 12, morale: -5 },
          },
          criticalFailure: {
            text: 'A cutting job goes wrong against a pressurised run and the bay floods with coolant. The yard has to be called in anyway, at emergency rates.',
            effects: {
              credits: -900,
              hull: -8,
              systems: { lifeSupport: -10 },
              wound: { severityScore: 44, damageType: 'burn' },
              crewStress: 16,
              morale: -8,
            },
          },
        },
      },
      {
        id: 'partial-work-only',
        label: 'Authorise the critical repair only',
        hint: 'Six hours, half measures',
        requires: { minCredits: 700 },
        effects: { hours: 6, credits: -700 },
        result: {
          text: 'They do the one plate that would have failed and leave the rest tagged. The yard foreman writes "deferred" on the sheet with visible feeling.',
          effects: { hull: 10, systems: { hull: 4 }, log: 'Critical hull repair only; remaining work deferred.' },
        },
      },
      {
        id: 'decline-the-yard',
        label: 'Decline the work entirely',
        hint: 'Free, and it is a bet',
        result: {
          text: 'You thank them and undock with the tags still on the plating. Your engineer says nothing for the rest of the day, which is worse than if they had argued.',
          effects: {
            morale: -4,
            crewStress: 6,
            systems: { hull: -4 },
            log: 'Declined yard repairs at the transit station.',
          },
        },
      },
    ],
  },

  {
    id: 'stn-ration-queue',
    scope: ['station', 'social'],
    title: 'The Ration Queue',
    body: 'The commodity hall at {location} is running a queue system instead of a market. Station residents get a card and a number. Ship crews get whatever is left at the end of the day, which today is very little. A hall supervisor is watching you look at the boards.',
    weight: 11,
    conditions: { locationKinds: ['tradeStation'] },
    tags: ['scarcity', 'food'],
    choices: [
      {
        id: 'talk-to-supervisor',
        label: 'Make your case to the supervisor',
        hint: 'Two hours, and you will have to be honest',
        effects: { hours: 2 },
        check: { skill: 'persuasion', attributes: ['charisma', 'socialAwareness'], participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'She has a ship of her own on the wall behind the desk. She pulls you a ship-crew allocation from a reserve that is not supposed to exist and asks you to not talk about it.',
            effects: {
              food: 16,
              credits: -280,
              morale: 7,
              personalXp: 35,
              flag: { key: 'ration_hall_friend', value: true },
            },
          },
          success: {
            text: 'She moves you up the ship-crew list to tomorrow morning instead of next week. It costs you a night in dock.',
            effects: { food: 10, credits: -320, hours: 10, personalXp: 20 },
          },
          partial: {
            text: 'You get a partial allocation at an inflated ship-crew rate. It is food, at least.',
            effects: { food: 5, credits: -400, personalXp: 8 },
          },
          failure: {
            text: 'She has heard every version of this and has a station full of people with cards. You get nothing but a place in line.',
            effects: { morale: -3, crewStress: 4 },
          },
          criticalFailure: {
            text: 'You push a line about your crew starving in front of a hall full of residents who are also hungry. Somebody spits at your feet on the way out.',
            effects: {
              morale: -7,
              crewStress: 8,
              flag: { key: 'unwelcome_at_hall', value: true },
            },
          },
        },
      },
      {
        id: 'buy-off-the-cards',
        label: 'Buy allocation cards from residents',
        hint: 'Four hours in the corridors, morally cheap',
        effects: { hours: 4 },
        check: { skill: 'negotiation', secondarySkill: 'stealth', participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'Four families sell you a week of their allocation each, at prices that make them better off than the food would have. It still feels like what it is.',
            effects: { food: 20, credits: -650, morale: -3, personalXp: 30 },
          },
          success: {
            text: 'You buy enough cards to fill the hold. The people who sold them will be hungry next week.',
            effects: { food: 12, credits: -500, morale: -5, personalXp: 15 },
          },
          partial: {
            text: 'A few cards, at a bad rate, from people who clearly needed the credits more than you needed the margin.',
            effects: { food: 6, credits: -450, morale: -6, crewStress: 4 },
          },
          failure: {
            text: 'Word gets around the residential ring before you get four cards. Doors stop opening.',
            effects: { credits: -120, morale: -6, crewStress: 6, flag: { key: 'unwelcome_at_hall', value: true } },
          },
          criticalFailure: {
            text: 'A hall inspector is running the same corridors looking for exactly this. Your cards are confiscated and your name goes on a list.',
            effects: {
              credits: -500,
              morale: -8,
              crewStress: 10,
              combat: 'enc_security_patrol',
              flag: { key: 'station_flagged', value: true },
            },
          },
        },
      },
      {
        id: 'trade-medicine-for-food',
        label: 'Trade medicine into the hall instead',
        hint: 'Three hours, costs your med stock',
        requires: { minMedicine: 4 },
        effects: { hours: 3, medicine: -4 },
        result: {
          text: 'Antibiotics move faster than credits here. The hall clears you a proper allocation and the clinic sends someone to shake your hand.',
          effects: {
            food: 14,
            morale: 5,
            personalXp: 15,
            flag: { key: 'ration_hall_friend', value: true },
            log: 'Traded medical stock for a food allocation at the ration hall.',
          },
        },
      },
      {
        id: 'skip-the-hall',
        label: 'Buy nothing here',
        hint: 'Costs nothing but the stores you do not have',
        result: {
          text: 'You leave the hall with an empty manifest. The next port is a long way and your crew does the arithmetic on their own.',
          effects: { morale: -4, crewStress: 5, log: 'Left the ration hall without resupplying.' },
        },
      },
    ],
  },

  {
    id: 'stn-medical-ward-favour',
    scope: ['station', 'medical'],
    title: 'Short-Handed Ward',
    body: 'The medical ward at {location} has three times its normal caseload and half its normal staff after a decompression on the freight ring. The duty physician sees your medic\'s credentials on the dock manifest and asks, without much hope, whether you can spare anyone.',
    weight: 10,
    conditions: { locationKinds: ['transitStation'], minCrew: 3 },
    tags: ['medical', 'goodwill'],
    choices: [
      {
        id: 'work-the-ward',
        label: 'Put your medic on the ward for a shift',
        hint: 'Fourteen hours, and it will be ugly',
        effects: { hours: 14 },
        check: { skill: 'surgery', secondarySkill: 'firstAid', participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'Eleven patients, two of them shouldn\'t-have-lived cases. The ward gives your medic their pick of the supply room and one of the orderlies asks about a berth.',
            effects: {
              medicine: 10,
              credits: 700,
              items: [{ itemId: 'surgical_kit', qty: 1 }, { itemId: 'blood_substitute', qty: 2 }],
              morale: 9,
              recruit: true,
              personalXp: 50,
            },
          },
          success: {
            text: 'A hard shift, competently worked. The ward pays properly and restocks your kit without being asked twice.',
            effects: {
              medicine: 7,
              credits: 450,
              items: [{ itemId: 'medkit_field', qty: 1 }],
              morale: 5,
              personalXp: 30,
              crewStress: 8,
            },
          },
          partial: {
            text: 'Your medic is out of their depth on the trauma cases and useful on everything else. Fair pay, no favours.',
            effects: { medicine: 3, credits: 200, crewStress: 10, personalXp: 15 },
          },
          failure: {
            text: 'They lose a patient they should not have lost and the ward staff are polite about it in a way that is worse than shouting.',
            effects: { credits: 120, morale: -6, crewStress: 14, personalXp: 8 },
          },
          criticalFailure: {
            text: 'A procedural error in the ward under exhaustion. The station files an incident report and your medic\'s name is on it.',
            effects: {
              credits: -300,
              morale: -9,
              crewStress: 18,
              flag: { key: 'medical_incident_filed', value: true },
            },
          },
        },
      },
      {
        id: 'sell-supplies-to-ward',
        label: 'Sell them your medical stock instead',
        hint: 'One hour, good price, empty locker',
        requires: { minMedicine: 6 },
        effects: { hours: 1, medicine: -6 },
        check: { skill: 'negotiation', participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'They pay emergency rates without blinking and give you priority on the next resupply barge.',
            effects: { credits: 1100, morale: 3, personalXp: 25, flag: { key: 'ward_credit', value: true } },
          },
          success: {
            text: 'A clean sale at a good rate. The ward is grateful and your locker is thin.',
            effects: { credits: 750, personalXp: 15 },
          },
          partial: {
            text: 'The station procurement office overrides the physician and pays list price. It is still money.',
            effects: { credits: 420, personalXp: 6 },
          },
          failure: {
            text: 'Procurement decides your stock is not certified for ward use and takes it into quarantine pending review.',
            effects: { credits: 150, morale: -4, crewStress: 5 },
          },
          criticalFailure: {
            text: 'Half your stock fails their assay. They keep it, fine you for the paperwork, and note the batch numbers.',
            effects: { credits: -200, morale: -6, crewStress: 8, flag: { key: 'station_flagged', value: true } },
          },
        },
      },
      {
        id: 'decline-ward',
        label: 'Decline; your crew needs the rest',
        hint: 'Free, and your medic will hear about it',
        result: {
          text: 'You say no. It is a defensible answer and your medic accepts it without comment, and looks at the ward doors on the way past.',
          effects: { morale: -3, crewStress: -3, log: 'Declined to assist the station medical ward.' },
        },
      },
    ],
  },

  {
    id: 'stn-bar-provocation',
    scope: ['station', 'social'],
    title: 'The Wrong Table',
    body: 'A dock hand two tables over has been telling a story about ships from your part of the sky for twenty minutes, loudly, and getting louder. Your crew have stopped talking. The bar has stopped talking. He is not going to stop on his own.',
    weight: 11,
    conditions: { locationKinds: ['tradeStation', 'transitStation'], minCrew: 2 },
    tags: ['bar', 'confrontation'],
    choices: [
      {
        id: 'talk-him-down',
        label: 'Walk over and talk to him',
        hint: 'One hour, and the whole bar is watching',
        effects: { hours: 1 },
        check: { skill: 'persuasion', attributes: ['charisma', 'composure'], participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'You sit down uninvited, buy him a drink, and get him talking about his own home instead. Two hours later half the bar is at your table.',
            effects: {
              credits: -60,
              morale: 8,
              personalXp: 35,
              flag: { key: 'bar_reputation_good', value: true },
            },
          },
          success: {
            text: 'He runs out of steam under polite, unimpressed attention and takes his story to the other end of the bar.',
            effects: { morale: 4, personalXp: 20 },
          },
          partial: {
            text: 'He stops talking about your homeworld and starts talking about you. It is quieter, at least.',
            effects: { morale: -1, crewStress: 4, personalXp: 8 },
          },
          failure: {
            text: 'He takes the approach as an invitation and gets in your face in front of your own crew.',
            effects: { morale: -5, crewStress: 8 },
          },
          criticalFailure: {
            text: 'He decides you have insulted him and comes over the table with a bottle.',
            effects: { morale: -6, crewStress: 12, combat: 'enc_lone_gunman' },
          },
        },
      },
      {
        id: 'let-crew-handle',
        label: 'Let your crew answer it',
        hint: 'Half an hour, no control over the outcome',
        effects: { hours: 0.5 },
        check: { skill: 'brawling', secondarySkill: 'closeQuarters', participation: 'duo', criticalRisk: true },
        outcomes: {
          exceptional: {
            text: 'One shove, one very short conversation, and he leaves. Your crew walk back to the table like nothing happened and the bar decides it likes them.',
            effects: { morale: 9, crewXp: 25, flag: { key: 'bar_reputation_hard', value: true } },
          },
          success: {
            text: 'It gets physical for about six seconds and then it is over. He goes out the door under his own power.',
            effects: { morale: 5, crewStress: 4, crewXp: 15 },
          },
          partial: {
            text: 'A proper scuffle. Your people win it and the bar bills you for a table.',
            effects: { credits: -180, morale: 2, crewStress: 8, wound: { severityScore: 24, damageType: 'blunt' }, crewXp: 10 },
          },
          failure: {
            text: 'He had friends at the bar and your two are outnumbered before anyone thinks it through.',
            effects: { crewStress: 12, morale: -4, combat: 'enc_lone_gunman' },
          },
          criticalFailure: {
            text: 'It goes badly, publicly, and station security arrives in time to arrest the wrong people.',
            effects: {
              credits: -400,
              morale: -8,
              crewStress: 16,
              wound: { severityScore: 46, damageType: 'blunt' },
              combat: 'enc_security_patrol',
              flag: { key: 'station_flagged', value: true },
            },
          },
        },
      },
      {
        id: 'leave-the-bar',
        label: 'Take your crew and leave',
        hint: 'Costs nothing but the evening',
        result: {
          text: 'You settle the tab and walk your people out. Nobody argues. Nobody looks at each other much either, on the way back to the ship.',
          effects: {
            morale: -4,
            crewStress: 5,
            log: 'Left a station bar rather than answer a provocation.',
          },
        },
      },
    ],
  },

  {
    id: 'stn-freight-yard-hiring',
    scope: ['station', 'social'],
    title: 'The Yard Gate',
    body: 'The freight yard at {location} hires by the shift, and the people who do not get picked stand at the gate all day anyway. Several of them have ship tickets. One of them has been watching your hull since you docked and is working up the nerve.',
    weight: 10,
    conditions: { locationKinds: ['transitStation'] },
    tags: ['recruit', 'labour'],
    choices: [
      {
        id: 'run-a-trial-shift',
        label: 'Hire three for a trial shift aboard',
        hint: 'Ten hours, and you learn a lot',
        effects: { hours: 10, credits: -180 },
        check: { skill: 'persuasion', secondarySkill: 'mechanicalEngineering', attributes: ['evaluation', 'leadership'], participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'Two of the three are competent and one of them is better than that. She takes the berth and brings her own tools.',
            effects: {
              repairParts: 15,
              items: [{ itemId: 'multitool', qty: 1, condition: 80 }],
              recruit: true,
              morale: 6,
              personalXp: 35,
            },
          },
          success: {
            text: 'One good hand out of three, which is a normal yield at a gate like this. He signs on.',
            effects: { repairParts: 8, recruit: true, morale: 4, personalXp: 20 },
          },
          partial: {
            text: 'They work the shift adequately and none of them is what you need. You pay them and they go back to the gate.',
            effects: { repairParts: 5, personalXp: 8, crewStress: 3 },
          },
          failure: {
            text: 'Ten hours of supervision for work you could have done faster yourself. One of them pockets a hand tool on the way out.',
            effects: { credits: -100, morale: -3, crewStress: 6 },
          },
          criticalFailure: {
            text: 'One of your trial hires was casing the ship. You are short a locker\'s worth of stock before anyone realises.',
            effects: {
              credits: -350,
              repairParts: -20,
              morale: -7,
              crewStress: 10,
            },
          },
        },
      },
      {
        id: 'talk-to-the-watcher',
        label: 'Go talk to the one who has been watching',
        hint: 'Two hours, no obligation',
        effects: { hours: 2 },
        check: { skill: 'persuasion', attributes: ['socialAwareness', 'evaluation'], participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'Twenty years on bulk haulers, laid off when the line folded, no berth in eight months and no interest in charity. He wants work, not passage, and he is worth having.',
            effects: { recruit: true, morale: 6, crewXp: 10, personalXp: 30 },
          },
          success: {
            text: 'A straightforward conversation about terms. He will come, on conditions, and the conditions are fair.',
            effects: { recruit: true, credits: -200, morale: 3, personalXp: 18 },
          },
          partial: {
            text: 'He is interested but wants a berth for someone else too, and you cannot carry two. He gives you a name at the union hall instead.',
            effects: { personalXp: 10, flag: { key: 'yard_contact', value: true } },
          },
          failure: {
            text: 'He wanted a bigger ship and a longer contract, and says so without malice. Two hours, no result.',
            effects: { crewStress: 2 },
          },
          criticalFailure: {
            text: 'You misjudge the conversation badly and he takes offence in front of the whole gate. The yard is cold to you afterwards.',
            effects: { morale: -5, crewStress: 6, flag: { key: 'yard_unwelcome', value: true } },
          },
        },
      },
      {
        id: 'hire-day-labour',
        label: 'Hire day labour for the hold only',
        hint: 'Six hours, straightforward',
        requires: { minCredits: 150 },
        effects: { hours: 6, credits: -150 },
        result: {
          text: 'Four hands, one shift, cargo restowed and the bay swept. They are gone before the watch changes and nobody learns anybody\'s name.',
          effects: {
            repairParts: 10,
            crewStress: -4,
            morale: 2,
            log: 'Day labour hired for cargo work at the freight yard.',
          },
        },
      },
    ],
  },

  {
    id: 'stn-customs-inspection',
    scope: ['station'],
    title: 'Customs Wants a Walkthrough',
    body: 'Two customs officers at the berth with a scanner and a clipboard. It is a routine sweep, they say, and it is scheduled for right now. Everything aboard is legal. Probably. You are not entirely sure what the last owner left in the void spaces.',
    weight: 11,
    conditions: { locationKinds: ['tradeStation', 'transitStation'], requiresShip: true },
    tags: ['customs', 'risk'],
    choices: [
      {
        id: 'cooperate-fully',
        label: 'Open everything and walk them through',
        hint: 'Four hours, nothing to hide',
        effects: { hours: 4 },
        check: { skill: 'persuasion', attributes: ['composure', 'socialAwareness'], participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'You give them a genuinely useful tour and they find nothing but a very old ship. One of them signs off a clean rating that will save you an inspection at the next three ports.',
            effects: {
              credits: -40,
              morale: 4,
              personalXp: 25,
              flag: { key: 'customs_clean_rating', value: true },
            },
          },
          success: {
            text: 'Clean sweep, minor paperwork fine for an out-of-date manifest, and they are gone in four hours.',
            effects: { credits: -120, personalXp: 15 },
          },
          partial: {
            text: 'They find an unlogged crate of parts from the previous owner and impound it while they check the serials.',
            effects: { credits: -200, repairParts: -25, crewStress: 5, personalXp: 8 },
          },
          failure: {
            text: 'The void space behind the aft lockers had something in it. It is not yours and it is not legal, and explaining that takes most of the day.',
            effects: { credits: -600, hours: 6, morale: -5, crewStress: 10, flag: { key: 'station_flagged', value: true } },
          },
          criticalFailure: {
            text: 'What they pull out of the void space carries a registry number attached to an open investigation. Your ship is held while they decide what to do about it.',
            effects: {
              credits: -1200,
              hours: 12,
              morale: -9,
              crewStress: 16,
              flag: { key: 'customs_investigation', value: true },
            },
          },
        },
      },
      {
        id: 'sweep-first',
        label: 'Stall them and sweep the ship yourself first',
        hint: 'Two hours, and they will notice',
        effects: { hours: 2 },
        check: { skill: 'stealth', secondarySkill: 'scavenging', participation: 'group', criticalRisk: true },
        outcomes: {
          exceptional: {
            text: 'You find three things the previous owner left, two of which are worth money, and none of which are aboard when customs comes up the ramp.',
            effects: {
              items: [{ itemId: 'pistol_holdout', qty: 1, condition: 65 }, { itemId: 'data_core', qty: 1 }],
              credits: 300,
              crewXp: 25,
              personalXp: 30,
            },
          },
          success: {
            text: 'The void spaces come up clean by the time the officers board. The inspection is dull and short.',
            effects: { credits: -60, crewXp: 15, personalXp: 18 },
          },
          partial: {
            text: 'You find the problem and cannot get it off the ship in time. It goes into the waste processor, which costs you whatever it was worth.',
            effects: { crewStress: 8, morale: -2, crewXp: 8 },
          },
          failure: {
            text: 'The stall is transparent. The officers escalate to a full-authority search and take it apart properly.',
            effects: { credits: -800, hours: 8, morale: -6, crewStress: 12, flag: { key: 'station_flagged', value: true } },
          },
          criticalFailure: {
            text: 'One of your crew is caught carrying something down the ramp. Security is called before customs even boards.',
            effects: {
              credits: -900,
              morale: -10,
              crewStress: 18,
              combat: 'enc_security_patrol',
              flag: { key: 'customs_investigation', value: true },
            },
          },
        },
      },
      {
        id: 'grease-the-clipboard',
        label: 'Offer them a reason to be quick',
        hint: 'Costs credits, and it is a gamble on who they are',
        requires: { minCredits: 300 },
        effects: { hours: 1 },
        check: { skill: 'negotiation', attributes: ['evaluation', 'socialAwareness'], participation: 'individual', criticalRisk: true },
        outcomes: {
          exceptional: {
            text: 'They take it, stamp the sheet, and one of them tells you which berths get swept hardest and when.',
            effects: {
              credits: -300,
              personalXp: 30,
              flag: { key: 'customs_contact', value: true },
              morale: 2,
            },
          },
          success: {
            text: 'A short walkthrough, a stamped sheet, and no questions about the void spaces.',
            effects: { credits: -400, personalXp: 18 },
          },
          partial: {
            text: 'One takes it, the other does not. You get a real inspection anyway, conducted very slowly.',
            effects: { credits: -400, hours: 6, crewStress: 8 },
          },
          failure: {
            text: 'The offer is declined loudly enough for the berth to hear. The inspection becomes thorough.',
            effects: { credits: -500, hours: 8, morale: -6, crewStress: 10, flag: { key: 'station_flagged', value: true } },
          },
          criticalFailure: {
            text: 'You have just attempted to bribe an officer in front of a berth camera.',
            effects: {
              credits: -1400,
              hours: 10,
              morale: -10,
              crewStress: 18,
              flag: { key: 'customs_investigation', value: true },
            },
          },
        },
      },
    ],
  },

  {
    id: 'stn-cargo-shift-work',
    scope: ['station'],
    title: 'Hands Wanted on the Ring',
    body: 'A bulk transfer at {location} is running behind and the cargo office is paying a premium for any crew willing to work the overnight. It is honest work, it is hard, and it will cost you a day you could have spent on the ship.',
    weight: 11,
    conditions: { locationKinds: ['tradeStation', 'transitStation'], minCrew: 2 },
    tags: ['work', 'credits'],
    choices: [
      {
        id: 'full-crew-shift',
        label: 'Put the whole crew on it',
        hint: 'Twelve hours, best pay, everyone tired',
        effects: { hours: 12 },
        check: { skill: 'exploration', secondarySkill: 'mechanicalEngineering', attributes: ['strength', 'endurance'], participation: 'group' },
        outcomes: {
          exceptional: {
            text: 'Your crew clears the backlog four hours early and the cargo office pays the completion bonus without being asked.',
            effects: {
              credits: 900,
              items: [{ itemId: 'trade_machine_parts', qty: 2 }],
              crewStress: 8,
              crewXp: 30,
              morale: 5,
            },
          },
          success: {
            text: 'A full overnight, worked properly, paid in full. Everyone sleeps hard afterwards.',
            effects: { credits: 600, crewStress: 10, crewXp: 20, morale: 2 },
          },
          partial: {
            text: 'The shift runs long and the pay is prorated against a scheduling dispute that is not your fault.',
            effects: { credits: 350, crewStress: 13, crewXp: 10 },
          },
          failure: {
            text: 'Half your crew is not built for dock work and the gang boss stops using them by hour six. Partial pay and a bad reference.',
            effects: { credits: 180, crewStress: 14, morale: -5 },
          },
          criticalFailure: {
            text: 'A load slips off a gantry with someone underneath it. The office pays the shift and nothing else.',
            effects: {
              credits: 200,
              crewStress: 18,
              morale: -8,
              wound: { severityScore: 54, damageType: 'blunt' },
            },
          },
        },
      },
      {
        id: 'send-two',
        label: 'Send two and keep the rest on ship work',
        hint: 'Eight hours, split effort',
        effects: { hours: 8 },
        check: { skill: 'exploration', attributes: ['endurance', 'discipline'], participation: 'duo' },
        outcomes: {
          exceptional: {
            text: 'Two good hands earn nearly what four would have, and the rest of the crew gets the maintenance list cleared.',
            effects: { credits: 450, repairParts: 8, systems: { engines: 4 }, crewXp: 18, crewStress: 5 },
          },
          success: {
            text: 'Decent pay, and the ship gets a day of attention it needed.',
            effects: { credits: 320, systems: { engines: 3 }, crewXp: 12, crewStress: 6 },
          },
          partial: {
            text: 'The pay is thin and the ship work goes half done because the good tools went to the dock.',
            effects: { credits: 180, crewStress: 8, crewXp: 6 },
          },
          failure: {
            text: 'Your two get put on the worst end of the transfer and paid the base rate for it.',
            effects: { credits: 90, crewStress: 10, morale: -3 },
          },
          criticalFailure: {
            text: 'One of them argues with a gang boss and both get sent off the ring unpaid.',
            effects: { credits: 0, crewStress: 12, morale: -6, flag: { key: 'yard_unwelcome', value: true } },
          },
        },
      },
      {
        id: 'skip-the-work',
        label: 'Skip it, the ship needs the time',
        hint: 'No credits, better rested crew',
        effects: { hours: 4 },
        result: {
          text: 'You put the day into the maintenance list instead. It is the right call for the ship and everyone still notices the credits you did not earn.',
          effects: {
            systems: { engines: 4, power: 3 },
            crewStress: -6,
            morale: -1,
            log: 'Declined dock work in favour of ship maintenance.',
          },
        },
      },
    ],
  },

  {
    id: 'stn-ring-blackout',
    scope: ['station', 'technical'],
    title: 'The Ring Goes Dark',
    body: 'Two thirds of {location} loses power at once. Emergency lighting, sealed sections, and a station engineering crew that is three people short of being able to handle it. Somebody on the emergency band is asking whether any docked ship has an electrical engineer aboard.',
    weight: 8,
    conditions: { once: true, locationKinds: ['tradeStation'] },
    tags: ['crisis', 'electrical'],
    choices: [
      {
        id: 'answer-the-call',
        label: 'Send your engineer into the ring',
        hint: 'Ten hours in the dark',
        effects: { hours: 10 },
        check: { skill: 'electricalEngineering', secondarySkill: 'computers', participation: 'individual', criticalRisk: true },
        outcomes: {
          exceptional: {
            text: 'The fault is in a switchgear cabinet nobody had opened in six years. Your engineer isolates it, brings the ring back in stages, and the station administrator finds out who did it.',
            effects: {
              credits: 1200,
              fuel: 10,
              items: [{ itemId: 'power_cell', qty: 3 }, { itemId: 'diagnostic_scanner', qty: 1 }],
              morale: 10,
              personalXp: 50,
              flag: { key: 'station_hero', value: true },
            },
          },
          success: {
            text: 'The ring comes back up in eight hours instead of thirty. The station pays and means it.',
            effects: {
              credits: 700,
              fuel: 5,
              items: [{ itemId: 'power_cell', qty: 2 }],
              morale: 7,
              personalXp: 32,
              flag: { key: 'station_hero', value: true },
            },
          },
          partial: {
            text: 'You get half the ring back and the station engineers find the rest themselves. Partial payment, genuine thanks.',
            effects: { credits: 300, morale: 4, personalXp: 18, crewStress: 6 },
          },
          failure: {
            text: 'Ten hours of chasing a fault that turns out to be in a section nobody could reach. You come back tired and empty-handed.',
            effects: { crewStress: 10, morale: -3, personalXp: 8 },
          },
          criticalFailure: {
            text: 'A cabinet that was supposed to be isolated was not. Your engineer is carried out of the ring by station medics.',
            effects: {
              medicine: -5,
              crewStress: 18,
              morale: -10,
              wound: { severityScore: 74, damageType: 'burn' },
            },
          },
        },
      },
      {
        id: 'sell-power-cells',
        label: 'Sell the station your power stock',
        hint: 'Two hours, profitable, and they will remember',
        requires: { minRepairParts: 30 },
        effects: { hours: 2, repairParts: -30 },
        check: { skill: 'negotiation', participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'A crisis price, agreed in ten minutes, paid immediately. Nobody says anything about it out loud.',
            effects: { credits: 1600, morale: -2, personalXp: 28, flag: { key: 'crisis_profiteer', value: true } },
          },
          success: {
            text: 'You sell high into a blackout. It is legal and everyone involved knows exactly what it is.',
            effects: { credits: 1100, morale: -4, personalXp: 16, flag: { key: 'crisis_profiteer', value: true } },
          },
          partial: {
            text: 'Station procurement holds you to a standing contract rate. Modest profit, no goodwill.',
            effects: { credits: 500, morale: -3, personalXp: 6 },
          },
          failure: {
            text: 'They requisition your stock at an assessed emergency rate that is barely above cost.',
            effects: { credits: 250, morale: -5, crewStress: 5 },
          },
          criticalFailure: {
            text: 'Word of the price you asked reaches the ring while people are still sitting in the dark. Nobody on this station will deal with you now.',
            effects: {
              credits: 400,
              morale: -10,
              crewStress: 10,
              flag: { key: 'unwelcome_at_station', value: true },
            },
          },
        },
      },
      {
        id: 'seal-and-wait',
        label: 'Seal the ship and wait it out',
        hint: 'Four hours, no risk, no credit',
        effects: { hours: 4 },
        result: {
          text: 'You close the hatch and run on your own power until the ring comes back. It takes a day and a half and you hear about all of it on the open band.',
          effects: {
            systems: { power: -4 },
            morale: -4,
            crewStress: 6,
            log: 'Sat out a station-wide blackout aboard ship.',
          },
        },
      },
    ],
  },

  {
    id: 'stn-data-broker',
    scope: ['station', 'technical'],
    title: 'The Broker in the Back Office',
    body: 'A data broker on the commercial ring will buy survey caches, route logs, and anything you pulled out of a derelict, no questions asked about provenance. She will also sell, and what she is selling looks a great deal like navigation data for the final leg.',
    weight: 10,
    conditions: { locationKinds: ['transitStation'] },
    tags: ['data', 'trade'],
    choices: [
      {
        id: 'sell-cores',
        label: 'Sell her what you are carrying',
        hint: 'Three hours of haggling',
        effects: { hours: 3 },
        check: { skill: 'negotiation', secondarySkill: 'computers', participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'She recognises the survey format before you finish the pitch and pays for exclusivity on top of the data.',
            effects: { dataCores: -2, credits: 1800, personalXp: 35, morale: 4 },
          },
          success: {
            text: 'A fair price for good data, paid on the spot.',
            effects: { dataCores: -2, credits: 1100, personalXp: 20 },
          },
          partial: {
            text: 'She takes one core and passes on the other, and pays about what it is worth.',
            effects: { dataCores: -1, credits: 450, personalXp: 8 },
          },
          failure: {
            text: 'She already has the same data from two other crews this month. You keep your cores and your afternoon is gone.',
            effects: { crewStress: 3 },
          },
          criticalFailure: {
            text: 'She copies both cores during the "evaluation" and then declines to buy. You have no recourse and both of you know it.',
            effects: { dataCores: -1, morale: -6, crewStress: 8 },
          },
        },
      },
      {
        id: 'buy-route-data',
        label: 'Buy her final-leg navigation package',
        hint: 'Expensive, and you cannot verify it here',
        requires: { minCredits: 1200 },
        effects: { hours: 2, credits: -1200 },
        check: { skill: 'computers', attributes: ['reasoning', 'evaluation'], participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'The package is genuine and better than genuine: corrected drift tables and three fuel-body fixes that are not on any commercial chart.',
            effects: {
              dataCores: 2,
              fuel: 8,
              systems: { sensors: 6 },
              personalXp: 40,
              morale: 6,
              flag: { key: 'final_leg_charts', value: true },
            },
          },
          success: {
            text: 'Real navigation data for the long leg. It will save fuel and it will save arguments.',
            effects: { dataCores: 1, fuel: 4, personalXp: 25, flag: { key: 'final_leg_charts', value: true } },
          },
          partial: {
            text: 'Half the package is current and half is six years stale. You can tell which is which, which is the only reason it is worth anything.',
            effects: { fuel: 2, personalXp: 12 },
          },
          failure: {
            text: 'It is a repackaged commercial chart with a private header. You have paid a lot for something that was nearly free.',
            effects: { morale: -5, crewStress: 6 },
          },
          criticalFailure: {
            text: 'The package is a competitor\'s poisoned copy, seeded with drift errors. You will not find out where until you are on the long leg.',
            effects: {
              morale: -6,
              crewStress: 8,
              flag: { key: 'poisoned_charts', value: true },
            },
          },
        },
      },
      {
        id: 'ask-about-the-route',
        label: 'Just ask her what she knows',
        hint: 'One hour, costs a drink and a favour',
        effects: { hours: 1, credits: -80 },
        result: {
          text: 'She talks for an hour without selling you anything, which tells you she wants something later. What she says about the final leg is worth writing down.',
          effects: {
            personalXp: 12,
            flag: { key: 'broker_owed_favour', value: true },
            log: 'Traded conversation with a data broker on the transit ring.',
          },
        },
      },
    ],
  },

  {
    id: 'stn-fuel-syndicate',
    scope: ['station'],
    title: 'One Seller, One Price',
    body: 'Every fuel vendor on {location} quotes the same number to within a decimal, and the number is high. There is one independent bunkering outfit on the far side of the ring that is not part of the arrangement, and there is a reason nobody uses them.',
    weight: 11,
    conditions: { locationKinds: ['tradeStation', 'transitStation'] },
    tags: ['fuel', 'market'],
    choices: [
      {
        id: 'pay-the-cartel',
        label: 'Buy at the posted rate',
        hint: 'Two hours, certain quality',
        requires: { minCredits: 900 },
        effects: { hours: 2, credits: -900 },
        result: {
          text: 'Clean fuel, correct volume, gouging price. The bunkering crew is efficient and entirely unembarrassed.',
          effects: { fuel: 22, morale: -2, log: 'Refuelled at the posted cartel rate.' },
        },
      },
      {
        id: 'use-the-independent',
        label: 'Bunker with the independent',
        hint: 'Four hours, cheaper, unknown quality',
        requires: { minCredits: 450 },
        effects: { hours: 4, credits: -450 },
        check: { skill: 'mechanicalEngineering', secondarySkill: 'scavenging', attributes: ['perception', 'evaluation'], participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'Your engineer assays every batch at the manifold and rejects two. What goes aboard is as good as the cartel\'s and half the price.',
            effects: { fuel: 24, personalXp: 35, morale: 5, credits: -50 },
          },
          success: {
            text: 'Slightly dirty, entirely usable. The filters will need attention sooner than they would have.',
            effects: { fuel: 20, systems: { engines: -3 }, personalXp: 20 },
          },
          partial: {
            text: 'The fuel is contaminated enough that a third of it has to be dumped after assay.',
            effects: { fuel: 12, systems: { engines: -5 }, crewStress: 5, personalXp: 8 },
          },
          failure: {
            text: 'Water in the bottom of the batch. It goes into the tank before anyone catches it and the injectors will remember this for a long time.',
            effects: { fuel: 14, systems: { engines: -12 }, crewStress: 10, morale: -5 },
          },
          criticalFailure: {
            text: 'Whatever was in the fourth batch was not fuel at all. The feed system has to be flushed and part of it replaced.',
            effects: {
              fuel: 8,
              repairParts: -30,
              systems: { engines: -22, power: -6 },
              crewStress: 14,
              morale: -8,
            },
          },
        },
      },
      {
        id: 'break-the-price',
        label: 'Try to break the arrangement',
        hint: 'Six hours of talking to people who do not want to talk',
        effects: { hours: 6 },
        check: { skill: 'negotiation', secondarySkill: 'persuasion', attributes: ['socialAwareness', 'evaluation'], participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'You find the vendor with the thinnest margin and the biggest grudge, and he sells you a full load below the posted rate purely to spite the others.',
            effects: { fuel: 25, credits: -520, personalXp: 40, morale: 6, flag: { key: 'fuel_contact', value: true } },
          },
          success: {
            text: 'One vendor breaks ranks quietly for a single sale. You get a decent price and he asks you not to say where.',
            effects: { fuel: 20, credits: -680, personalXp: 25 },
          },
          partial: {
            text: 'A small discount for a smaller volume. Better than nothing, worse than six hours.',
            effects: { fuel: 12, credits: -600, personalXp: 10 },
          },
          failure: {
            text: 'Nobody breaks. By the end of the day the posted price has quietly gone up for your hull specifically.',
            effects: { credits: -100, morale: -4, crewStress: 6 },
          },
          criticalFailure: {
            text: 'You are shown the door at three vendors and the fourth calls berth security to have you moved along.',
            effects: {
              morale: -7,
              crewStress: 10,
              flag: { key: 'unwelcome_at_station', value: true },
            },
          },
        },
      },
      {
        id: 'partial-fuel',
        label: 'Buy the minimum and move on',
        hint: 'Cheap now, tight later',
        requires: { minCredits: 300 },
        effects: { hours: 1, credits: -300 },
        result: {
          text: 'Enough to make the next leg with no margin at all. Your navigator writes the number on the bridge board and underlines it.',
          effects: { fuel: 9, crewStress: 5, log: 'Bought minimum fuel at a cartel-priced station.' },
        },
      },
    ],
  },

  {
    id: 'stn-evacuee-family',
    scope: ['station', 'social'],
    title: 'The Family at Berth Nine',
    body: 'Four people have been living in the transit lounge at {location} for eleven days. Their ship was condemned at inspection and the station will not carry them further. The mother has been asking every captain in the ring and she has clearly stopped expecting a yes.',
    weight: 8,
    conditions: { once: true, locationKinds: ['tradeStation', 'transitStation'] },
    tags: ['refugees', 'passage'],
    choices: [
      {
        id: 'carry-them-all',
        label: 'Carry all four',
        hint: 'Costs stores every day of the way',
        effects: { hours: 3 },
        result: {
          text: 'Four more people in a ship that was already tight. They take the cargo bay, they take it gratefully, and the food tally changes shape immediately.',
          effects: {
            food: -12,
            morale: 7,
            crewStress: 6,
            recruit: true,
            flag: { key: 'carrying_evacuees', value: true },
            log: 'Took an evacuee family aboard as passengers.',
          },
        },
      },
      {
        id: 'carry-for-payment',
        label: 'Carry them for what they can pay',
        hint: 'Four hours, and they will pay too much',
        effects: { hours: 4 },
        check: { skill: 'negotiation', attributes: ['evaluation', 'socialAwareness'], participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'They have less than nothing in credits and more than you expected in skills. You take the family and the eldest works passage as an actual hand.',
            effects: { food: -10, recruit: true, morale: 8, personalXp: 30, flag: { key: 'carrying_evacuees', value: true } },
          },
          success: {
            text: 'They pay what a berth is worth and you take them. Nobody is cheated.',
            effects: { food: -10, credits: 500, morale: 4, personalXp: 18, flag: { key: 'carrying_evacuees', value: true } },
          },
          partial: {
            text: 'They pay everything they have, which is not much, and you take them anyway because you have already said the number out loud.',
            effects: { food: -10, credits: 180, morale: 1, crewStress: 5, flag: { key: 'carrying_evacuees', value: true } },
          },
          failure: {
            text: 'You name a price they cannot meet and they thank you politely for your time, which is somehow worse than an argument.',
            effects: { morale: -6, crewStress: 8 },
          },
          criticalFailure: {
            text: 'The negotiation happens in a full lounge and the ring hears you pricing a berth to a family sleeping on the deck.',
            effects: {
              morale: -10,
              crewStress: 12,
              flag: { key: 'unwelcome_at_station', value: true },
            },
          },
        },
      },
      {
        id: 'give-supplies',
        label: 'Give them supplies, not passage',
        hint: 'One hour, costs stores, changes nothing',
        requires: { minFood: 6 },
        effects: { hours: 1, food: -5 },
        result: {
          text: 'Five crew-days of food and two thermal blankets. She thanks you properly, and they are still going to be in that lounge next month.',
          effects: {
            items: [{ itemId: 'thermal_blanket', qty: 2 }],
            morale: -1,
            crewStress: 3,
            log: 'Gave supplies to an evacuee family without offering passage.',
          },
        },
      },
      {
        id: 'walk-past',
        label: 'Walk past',
        hint: 'Free, and the crew saw you do it',
        result: {
          text: 'You have your own crew, your own stores, and a long leg ahead. All of that is true and none of it makes the walk back to the berth any easier.',
          effects: {
            morale: -6,
            crewStress: 6,
            log: 'Declined to help an evacuee family at the station.',
          },
        },
      },
    ],
  },

  {
    id: 'stn-berth-thieves',
    scope: ['station', 'hostile'],
    title: 'Someone Has Been at the Hatch',
    body: 'Fresh tool marks around the cargo hatch seal and a scuff pattern on the berth deck that says three people, unhurried, some time in the last watch. Nothing is missing yet. They were measuring.',
    weight: 10,
    conditions: { locationKinds: ['tradeStation', 'transitStation'], requiresShip: true },
    tags: ['theft', 'security'],
    choices: [
      {
        id: 'lay-a-trap',
        label: 'Set up and wait for them',
        hint: 'Eight hours of sitting in the dark',
        effects: { hours: 8 },
        check: { skill: 'stealth', secondarySkill: 'closeQuarters', participation: 'trio', criticalRisk: true },
        outcomes: {
          exceptional: {
            text: 'Three of them come back and walk into a bay with the lights off and your crew already positioned. They leave everything they were carrying, including their tools.',
            effects: {
              items: [{ itemId: 'lockpick_set', qty: 1 }, { itemId: 'plasma_cutter', qty: 1, condition: 70 }],
              credits: 250,
              morale: 8,
              crewXp: 30,
            },
          },
          success: {
            text: 'They come back, see the trap before it closes, and run. Nobody tries this berth again.',
            effects: { morale: 5, crewXp: 18, crewStress: 5 },
          },
          partial: {
            text: 'Eight hours of nothing, then two of them try a different hatch on the far side while your people are all at this one.',
            effects: { repairParts: -15, crewStress: 10, morale: -3, crewXp: 8 },
          },
          failure: {
            text: 'They do not come back. Your crew loses a night of sleep and the berth is no safer than it was.',
            effects: { crewStress: 12, morale: -4 },
          },
          criticalFailure: {
            text: 'They come back with more people than you have, and they were expecting the trap.',
            effects: {
              crewStress: 16,
              morale: -6,
              combat: 'enc_scavenger_gang',
            },
          },
        },
      },
      {
        id: 'harden-the-hatch',
        label: 'Reinforce the seals and alarm the bay',
        hint: 'Five hours and parts',
        requires: { minRepairParts: 10 },
        effects: { hours: 5, repairParts: -10 },
        check: { skill: 'electricalEngineering', secondarySkill: 'lockpicking', participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'A proper alarm loop, a hardened seal, and a deadbolt arrangement that would embarrass a bank. Nobody is opening that hatch from outside again.',
            effects: { hull: 6, morale: 5, personalXp: 35, flag: { key: 'hatch_hardened', value: true } },
          },
          success: {
            text: 'The hatch is harder to open and the bay will wake the ship if anyone tries. Good enough.',
            effects: { hull: 3, personalXp: 22, flag: { key: 'hatch_hardened', value: true } },
          },
          partial: {
            text: 'The alarm works. The seal reinforcement fouls the hatch mechanism and now it sticks.',
            effects: { hull: -2, systems: { hull: -3 }, personalXp: 10, crewStress: 4 },
          },
          failure: {
            text: 'Five hours and the hatch is no better protected than it was, and the parts are used.',
            effects: { morale: -4, crewStress: 6 },
          },
          criticalFailure: {
            text: 'The alarm loop shorts into the bay lighting circuit and the whole aft section goes dark and stays that way.',
            effects: {
              systems: { power: -12 },
              repairParts: -8,
              morale: -6,
              crewStress: 10,
            },
          },
        },
      },
      {
        id: 'report-to-security',
        label: 'Report it to station security',
        hint: 'Two hours of forms',
        effects: { hours: 2 },
        result: {
          text: 'Security takes a report, photographs the tool marks, and tells you what everyone already knows: they will patrol the ring more often for about three days.',
          effects: {
            crewStress: 3,
            morale: -1,
            log: 'Attempted berth break-in reported to station security.',
          },
        },
      },
      {
        id: 'move-the-berth',
        label: 'Pay to move to a monitored berth',
        hint: 'Costs credits, solves it cleanly',
        requires: { minCredits: 350 },
        effects: { hours: 3, credits: -350 },
        result: {
          text: 'You move the ship to the inner ring where the cameras work and the fees are higher. Nothing else happens for the rest of the stay.',
          effects: { crewStress: -4, morale: 2, log: 'Relocated to a monitored berth after an attempted break-in.' },
        },
      },
    ],
  },

  {
    id: 'stn-etiquette-misstep',
    scope: ['station', 'social'],
    title: 'Three Ways to Say Yes',
    body: 'Your first serious negotiation at {location} is with a trade factor whose species uses posture and hand position as grammar. You have said yes twice with the wrong hand and the factor has become extremely formal, which your translator flags as a bad sign without explaining why.',
    weight: 8,
    conditions: { once: true, locationKinds: ['transitStation'] },
    tags: ['xenosocial', 'first-contact'],
    choices: [
      {
        id: 'ask-directly',
        label: 'Stop and ask what you got wrong',
        hint: 'Two hours, and you have to be willing to look foolish',
        effects: { hours: 2 },
        check: { skill: 'persuasion', attributes: ['socialAwareness', 'learning'], participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'The factor is delighted to be asked. Forty minutes of grammar later you have a working etiquette and a contact who now considers you worth teaching.',
            effects: {
              credits: 400,
              morale: 6,
              personalXp: 45,
              flag: { key: 'xeno_etiquette_learned', value: true },
            },
          },
          success: {
            text: 'You apologise correctly, which is itself a small test, and pass it. The negotiation restarts on better terms.',
            effects: { credits: 250, personalXp: 28, flag: { key: 'xeno_etiquette_learned', value: true } },
          },
          partial: {
            text: 'The factor explains, patiently, in a way that makes clear this conversation is now a favour rather than a deal.',
            effects: { personalXp: 15, crewStress: 3 },
          },
          failure: {
            text: 'Asking was itself the wrong move at this stage of the exchange. The factor concludes the meeting politely and does not schedule another.',
            effects: { morale: -4, crewStress: 5 },
          },
          criticalFailure: {
            text: 'You mirror a gesture that means something quite specific about the factor\'s parentage. The meeting ends and the ring hears about it.',
            effects: {
              morale: -8,
              crewStress: 10,
              flag: { key: 'xeno_faux_pas', value: true },
            },
          },
        },
      },
      {
        id: 'hire-an-interpreter',
        label: 'Hire a protocol interpreter first',
        hint: 'Four hours and real credits',
        requires: { minCredits: 300 },
        effects: { hours: 4, credits: -300 },
        result: {
          text: 'The interpreter costs more than the deal is worth and is worth every credit. You close the negotiation cleanly and learn enough to not need her next time.',
          effects: {
            credits: 550,
            morale: 4,
            personalXp: 25,
            flag: { key: 'xeno_etiquette_learned', value: true },
            log: 'Hired a protocol interpreter for a cross-species negotiation.',
          },
        },
      },
      {
        id: 'push-through-anyway',
        label: 'Push the deal through as it stands',
        hint: 'One hour, and you will pay for it somewhere',
        effects: { hours: 1 },
        check: { skill: 'negotiation', attributes: ['evaluation', 'composure'], participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'The factor decides your bluntness is a dialect rather than an insult and closes on your terms out of what appears to be amusement.',
            effects: { credits: 700, personalXp: 30, morale: 4 },
          },
          success: {
            text: 'You get a deal. It is a worse deal than a fluent captain would have got and you will never know by how much.',
            effects: { credits: 300, personalXp: 15 },
          },
          partial: {
            text: 'The terms come out lopsided and you sign them because backing out now would be a third insult.',
            effects: { credits: 80, morale: -3, personalXp: 6 },
          },
          failure: {
            text: 'The factor withdraws the offer entirely and files a note with the exchange about the interaction.',
            effects: { morale: -5, crewStress: 6 },
          },
          criticalFailure: {
            text: 'You close a deal you did not understand. The obligation you have just accepted is larger than the goods.',
            effects: {
              credits: -600,
              morale: -8,
              crewStress: 12,
              flag: { key: 'xeno_bad_contract', value: true },
            },
          },
        },
      },
    ],
  },

  {
    id: 'stn-scrap-auction',
    scope: ['station', 'scavenge'],
    title: 'Lot Fourteen, As-Is',
    body: 'The station scrap office is auctioning off condemned ship stores by the pallet, sight unseen except for a two-minute walk past. Half of it is genuinely dead. The other half is worth more than the whole lot costs, if you can tell which pallets are which in two minutes.',
    weight: 10,
    conditions: { locationKinds: ['tradeStation', 'transitStation'] },
    tags: ['auction', 'salvage'],
    choices: [
      {
        id: 'appraise-the-lots',
        label: 'Work the walkthrough properly',
        hint: 'Three hours including the bidding',
        requires: { minCredits: 400 },
        effects: { hours: 3, credits: -400 },
        check: { skill: 'scavenging', secondarySkill: 'mechanicalEngineering', attributes: ['perception', 'evaluation'], participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'You spot a pallet of coupling stock buried under genuinely dead cabling and take it for the price of scrap.',
            effects: {
              repairParts: 90,
              items: [
                { itemId: 'engine_coupling', qty: 2, condition: 75 },
                { itemId: 'coolant_flask', qty: 3 },
              ],
              personalXp: 40,
              morale: 6,
            },
          },
          success: {
            text: 'Two good pallets out of five bid on. A solid haul for the money.',
            effects: {
              repairParts: 55,
              items: [{ itemId: 'hull_patch', qty: 2 }, { itemId: 'power_cell', qty: 1, condition: 60 }],
              personalXp: 25,
            },
          },
          partial: {
            text: 'One useful pallet and one of genuine rubbish. About break-even, which at a scrap auction counts as a loss.',
            effects: { repairParts: 25, personalXp: 12 },
          },
          failure: {
            text: 'Everything you bid on is exactly as condemned as the paperwork said. You have bought four hundred credits of scrap metal.',
            effects: { repairParts: 10, morale: -4, crewStress: 4 },
          },
          criticalFailure: {
            text: 'One of the pallets contains a leaking cell stack that the scrap office should have flagged. You now own a disposal problem.',
            effects: {
              repairParts: 5,
              credits: -200,
              medicine: -2,
              morale: -6,
              crewStress: 8,
            },
          },
        },
      },
      {
        id: 'bid-blind-cheap',
        label: 'Bid low on everything and sort it later',
        hint: 'One hour, volume over judgement',
        requires: { minCredits: 250 },
        effects: { hours: 1, credits: -250 },
        result: {
          text: 'You win three pallets nobody else wanted. About a third of it is useful and the rest fills the bay until the next port.',
          effects: {
            repairParts: 30,
            items: [{ itemId: 'salvage_scrap', qty: 6 }],
            crewStress: 3,
            log: 'Bought condemned stores blind at a scrap auction.',
          },
        },
      },
      {
        id: 'sell-into-auction',
        label: 'Sell your own surplus into the auction',
        hint: 'Two hours, thins the hold',
        requires: { minRepairParts: 40 },
        effects: { hours: 2, repairParts: -40 },
        check: { skill: 'negotiation', participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'Two bidders want the same lot and drive it well past what your surplus is worth.',
            effects: { credits: 1000, personalXp: 28, morale: 3 },
          },
          success: {
            text: 'A fair clearing price and a lighter hold.',
            effects: { credits: 650, personalXp: 15 },
          },
          partial: {
            text: 'The room is thin and your lot goes at reserve.',
            effects: { credits: 320, personalXp: 6 },
          },
          failure: {
            text: 'No bids. The office charges you a listing fee and hands the pallet back.',
            effects: { repairParts: 40, credits: -60, crewStress: 3 },
          },
          criticalFailure: {
            text: 'The office reclassifies half your lot as condemned on inspection and disposes of it at your expense.',
            effects: { credits: -180, morale: -5, crewStress: 6 },
          },
        },
      },
      {
        id: 'skip-auction',
        label: 'Skip it',
        hint: 'Keeps your credits and your afternoon',
        result: {
          text: 'You watch ten minutes of the bidding from the rail and leave. Somebody else takes the coupling stock and you find out later what it was.',
          effects: { morale: -1, log: 'Skipped the station scrap auction.' },
        },
      },
    ],
  },

  {
    id: 'stn-quarantine-hold',
    scope: ['station', 'medical'],
    title: 'Held at the Medical Gate',
    body: 'Station health control has flagged your crew manifest at {location} and will not clear anyone to the inner rings until every person aboard passes a screen. The queue is eleven hours long and one of your people has a cough they have been playing down for a week.',
    weight: 9,
    conditions: { locationKinds: ['transitStation'], minCrew: 3 },
    tags: ['quarantine', 'medical'],
    choices: [
      {
        id: 'screen-your-own-first',
        label: 'Screen your crew aboard before you present them',
        hint: 'Five hours and your own supplies',
        requires: { minMedicine: 2 },
        effects: { hours: 5, medicine: -2 },
        check: { skill: 'medicalDiagnostics', participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'You find the cough is a dust reaction from the cargo bay, document it properly, and walk the whole crew through the gate in forty minutes.',
            effects: { morale: 6, crewStress: -4, personalXp: 35, flag: { key: 'health_cleared', value: true } },
          },
          success: {
            text: 'Everybody is clean. Health control accepts your paperwork and processes you fast.',
            effects: { morale: 3, personalXp: 22, flag: { key: 'health_cleared', value: true } },
          },
          partial: {
            text: 'You clear most of the crew. The one with the cough goes into a station hold for observation and misses the whole stopover.',
            effects: { credits: -200, morale: -3, crewStress: 8, personalXp: 10 },
          },
          failure: {
            text: 'Your screen misses something their screen finds. The whole crew is held an extra day and the ship is fumigated at your expense.',
            effects: { credits: -450, hours: 14, morale: -6, crewStress: 12 },
          },
          criticalFailure: {
            text: 'Health control finds an actual notifiable pathogen. The ship is sealed at the berth and everyone aboard is going nowhere for two days.',
            effects: {
              credits: -700,
              hours: 30,
              medicine: -4,
              morale: -10,
              crewStress: 18,
              flag: { key: 'quarantined', value: true },
            },
          },
        },
      },
      {
        id: 'queue-and-wait',
        label: 'Join the queue and take what comes',
        hint: 'Eleven hours of standing around',
        effects: { hours: 11 },
        result: {
          text: 'Eleven hours in a corridor with three hundred other people. Everyone passes except the cough, who is held overnight and released in the morning with an inhaler and a bill.',
          effects: {
            credits: -120,
            crewStress: 10,
            morale: -4,
            log: 'Cleared station health control after a long queue.',
          },
        },
      },
      {
        id: 'buy-priority-screening',
        label: 'Pay for priority screening',
        hint: 'Two hours, expensive, still a real screen',
        requires: { minCredits: 500 },
        effects: { hours: 2, credits: -500 },
        result: {
          text: 'A private clinic on the commercial ring runs the panel in an hour and files it directly. The cough gets a diagnosis, a prescription, and a clean certificate.',
          effects: {
            medicine: 2,
            morale: 4,
            crewStress: -4,
            flag: { key: 'health_cleared', value: true },
            log: 'Paid for priority health screening at the transit station.',
          },
        },
      },
    ],
  },

  {
    id: 'stn-courier-contract',
    scope: ['station'],
    title: 'A Sealed Case and a Berth Number',
    body: 'A shipping agent at {location} wants a sealed case carried to the far end of the route and delivered to a berth number, not a name. The fee is generous. The agent is very clear that the case is not to be opened and slightly less clear about what happens if it is.',
    weight: 10,
    conditions: { locationKinds: ['tradeStation', 'transitStation'] },
    tags: ['contract', 'courier'],
    choices: [
      {
        id: 'take-the-job',
        label: 'Take the contract as offered',
        hint: 'Two hours, half up front',
        effects: { hours: 2 },
        result: {
          text: 'Half the fee lands in your account before the case is aboard. It weighs about nine kilos and does not rattle. Your crew has opinions.',
          effects: {
            credits: 800,
            crewStress: 5,
            morale: -2,
            flag: { key: 'carrying_sealed_case', value: true },
            log: 'Accepted a sealed courier contract.',
          },
        },
      },
      {
        id: 'negotiate-terms',
        label: 'Negotiate for more and for a name',
        hint: 'Three hours, and the agent does not like questions',
        effects: { hours: 3 },
        check: { skill: 'negotiation', secondarySkill: 'persuasion', participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'You get the full fee up front, a contact name at the destination, and an honest answer about the contents that makes the whole thing simpler.',
            effects: {
              credits: 1600,
              personalXp: 40,
              morale: 3,
              flag: { key: 'carrying_sealed_case', value: true },
            },
          },
          success: {
            text: 'A better fee and a name. The agent is irritated and professional about it.',
            effects: { credits: 1100, personalXp: 25, flag: { key: 'carrying_sealed_case', value: true } },
          },
          partial: {
            text: 'You get a little more money and no information at all.',
            effects: { credits: 950, personalXp: 10, crewStress: 4, flag: { key: 'carrying_sealed_case', value: true } },
          },
          failure: {
            text: 'The agent decides you are too curious to be a courier and takes the case to the next berth along.',
            effects: { crewStress: 4, morale: -3 },
          },
          criticalFailure: {
            text: 'Your questions get back to whoever the case belongs to. Two people follow your crew back to the berth that evening.',
            effects: {
              crewStress: 12,
              morale: -5,
              flag: { key: 'watched_by_someone', value: true },
            },
          },
        },
      },
      {
        id: 'scan-the-case',
        label: 'Take it, then scan it aboard',
        hint: 'Two hours, and you will know',
        effects: { hours: 2, credits: 800 },
        check: { skill: 'computers', secondarySkill: 'medicalDiagnostics', attributes: ['perception', 'reasoning'], participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'Dense storage media and a biometric lock, nothing hazardous, nothing alive. You know what you are carrying now and it is worth more than the fee.',
            effects: {
              dataCores: 1,
              personalXp: 40,
              crewStress: -3,
              flag: { key: 'sealed_case_scanned', value: true },
            },
          },
          success: {
            text: 'Electronics and a sealed inner container. Not dangerous. Not your business either.',
            effects: { personalXp: 25, crewStress: -2, flag: { key: 'carrying_sealed_case', value: true } },
          },
          partial: {
            text: 'The scan is blocked by shielding, which tells you something on its own and nothing you can act on.',
            effects: { crewStress: 6, personalXp: 10, flag: { key: 'carrying_sealed_case', value: true } },
          },
          failure: {
            text: 'The scan triggers a tamper indicator on the case housing. It is a very small red light and it will not go out.',
            effects: {
              crewStress: 12,
              morale: -5,
              flag: { key: 'sealed_case_tampered', value: true },
            },
          },
          criticalFailure: {
            text: 'The tamper response is not a light. The case sterilises its own contents with enough heat to set off the bay suppression system.',
            effects: {
              credits: -400,
              hull: -6,
              systems: { lifeSupport: -6 },
              morale: -8,
              crewStress: 16,
              flag: { key: 'sealed_case_destroyed', value: true },
            },
          },
        },
      },
      {
        id: 'decline-courier',
        label: 'Decline the contract',
        hint: 'Free, and there goes the fee',
        result: {
          text: 'You pass. The agent has another captain lined up before you are off the concourse.',
          effects: { morale: -1, log: 'Declined a sealed courier contract.' },
        },
      },
    ],
  },

  {
    id: 'stn-dead-ring-section',
    scope: ['station', 'scavenge'],
    title: 'The Sealed Arm',
    body: 'A whole arm of {location} was sealed off after an atmosphere failure and never reopened. It still has power on the emergency bus and it still has everything that was in it when the doors closed. The station does not stop people going in. It just does not help them come out.',
    weight: 8,
    conditions: { locationKinds: ['tradeStation'] },
    tags: ['salvage', 'derelict'],
    choices: [
      {
        id: 'full-expedition',
        label: 'Take a party in with lamps and rebreathers',
        hint: 'Twelve hours, real risk',
        requires: { minCrew: 3 },
        effects: { hours: 12 },
        check: { skill: 'exploration', secondarySkill: 'scavenging', participation: 'trio', criticalRisk: true },
        outcomes: {
          exceptional: {
            text: 'The residential deck was evacuated in a hurry and nobody has been back. Your party comes out with more than they can carry in one trip.',
            effects: {
              credits: 1300,
              repairParts: 60,
              items: [
                { itemId: 'medkit_field', qty: 2 },
                { itemId: 'heirloom_watch', qty: 1 },
                { itemId: 'life_support_filter', qty: 2 },
              ],
              morale: 8,
              crewXp: 40,
            },
          },
          success: {
            text: 'Two decks worked over carefully. Good stores, mostly intact, and everyone comes back on their own feet.',
            effects: {
              credits: 600,
              repairParts: 35,
              items: [{ itemId: 'glow_rods', qty: 3 }, { itemId: 'medkit_basic', qty: 1 }],
              crewXp: 25,
              crewStress: 8,
            },
          },
          partial: {
            text: 'A partial collapse cuts the route short. You come out with what you were carrying at the time.',
            effects: { credits: 200, repairParts: 15, crewStress: 12, crewXp: 12 },
          },
          failure: {
            text: 'The arm was picked over years ago. Twelve hours in a cold dark corridor for a bag of scrap.',
            effects: { repairParts: 6, crewStress: 14, morale: -5 },
          },
          criticalFailure: {
            text: 'People have been living in the sealed arm, and they do not consider it abandoned.',
            effects: {
              crewStress: 18,
              morale: -6,
              combat: 'enc_derelict_squatters',
            },
          },
        },
      },
      {
        id: 'shallow-sweep',
        label: 'Work the first two compartments only',
        hint: 'Four hours, limited exposure',
        effects: { hours: 4 },
        check: { skill: 'scavenging', attributes: ['perception', 'evaluation'], participation: 'duo' },
        outcomes: {
          exceptional: {
            text: 'The first compartments were a supply store. You clear both without going more than fifty metres past the seal.',
            effects: {
              repairParts: 40,
              items: [{ itemId: 'hull_patch', qty: 2 }, { itemId: 'rebreather', qty: 1 }],
              credits: 250,
              crewXp: 20,
            },
          },
          success: {
            text: 'A decent take from the near compartments and out again before anyone gets nervous.',
            effects: { repairParts: 22, items: [{ itemId: 'glow_rods', qty: 2 }], crewXp: 12 },
          },
          partial: {
            text: 'Slim pickings near the seal. Everything worth having is deeper in.',
            effects: { repairParts: 8, crewStress: 5, crewXp: 6 },
          },
          failure: {
            text: 'The near compartments are stripped bare and one of your party puts a foot through a corroded deck plate.',
            effects: { crewStress: 10, wound: { severityScore: 28, damageType: 'pierce' }, morale: -3 },
          },
          criticalFailure: {
            text: 'The seal you came through cycles shut behind you and it takes four hours and a cutting torch to get back out.',
            effects: {
              hours: 6,
              credits: -200,
              crewStress: 16,
              morale: -7,
            },
          },
        },
      },
      {
        id: 'buy-a-map',
        label: 'Buy a route map from someone who has been in',
        hint: 'One hour, costs credits, improves everything',
        requires: { minCredits: 200 },
        effects: { hours: 1, credits: -200 },
        result: {
          text: 'An old dock hand sells you a hand-drawn deck plan with three routes marked and one marked twice, in red. It is probably worth more than he charged.',
          effects: {
            items: [{ itemId: 'data_core', qty: 1 }],
            personalXp: 10,
            flag: { key: 'sealed_arm_map', value: true },
            log: 'Bought a route map to the station’s sealed arm.',
          },
        },
      },
    ],
  },

  {
    id: 'stn-card-table',
    scope: ['station', 'social'],
    title: 'The Back Table',
    body: 'A long-running game in the back of a dock bar on {location}, cash only, six seats and one open. The stakes are meaningful and the players are locals who play here every rotation. Somebody at that table is very good and it is not obvious who.',
    weight: 9,
    conditions: { locationKinds: ['tradeStation', 'transitStation'] },
    tags: ['gambling', 'risk'],
    choices: [
      {
        id: 'play-serious',
        label: 'Sit down and play properly',
        hint: 'Six hours, real money',
        requires: { minCredits: 400 },
        effects: { hours: 6, credits: -400 },
        check: { skill: 'negotiation', attributes: ['evaluation', 'composure'], participation: 'individual', criticalRisk: true },
        outcomes: {
          exceptional: {
            text: 'You read the table inside an hour and spend the next five taking it apart quietly enough that nobody minds.',
            effects: { credits: 2200, morale: 8, personalXp: 40 },
          },
          success: {
            text: 'You leave up, and you leave at the right time, which is the harder half.',
            effects: { credits: 1100, morale: 5, personalXp: 25 },
          },
          partial: {
            text: 'Six hours to break about even. Good company, no profit.',
            effects: { credits: 420, personalXp: 12, crewStress: 3 },
          },
          failure: {
            text: 'The quiet one at the end of the table was the good one. Your stake is gone by the fourth hour.',
            effects: { morale: -5, crewStress: 6 },
          },
          criticalFailure: {
            text: 'You chase the losses on credit, which the table happily extends. Somebody now expects to be paid before you undock.',
            effects: {
              credits: -700,
              morale: -9,
              crewStress: 14,
              flag: { key: 'gambling_debt', value: true },
            },
          },
        },
      },
      {
        id: 'play-for-information',
        label: 'Play small and listen',
        hint: 'Four hours, cheap seat',
        requires: { minCredits: 100 },
        effects: { hours: 4, credits: -100 },
        check: { skill: 'persuasion', attributes: ['socialAwareness', 'perception'], participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'Four hours of small bets and large conversation. You leave with route gossip, a yard contact, and most of your stake.',
            effects: {
              credits: 150,
              personalXp: 35,
              morale: 4,
              flag: { key: 'dock_contact', value: true },
            },
          },
          success: {
            text: 'You lose a modest amount and learn which berths get robbed and which vendors short-fill.',
            effects: { personalXp: 20, morale: 2, flag: { key: 'dock_contact', value: true } },
          },
          partial: {
            text: 'Some useful talk, some noise, and your stake is gone.',
            effects: { personalXp: 10 },
          },
          failure: {
            text: 'They talk about nothing at all in front of an offworlder. You have paid a hundred credits for four hours of weather.',
            effects: { crewStress: 3, morale: -2 },
          },
          criticalFailure: {
            text: 'They work out you are there to listen and one of them takes it personally.',
            effects: { morale: -5, crewStress: 10, combat: 'enc_lone_gunman' },
          },
        },
      },
      {
        id: 'skip-the-table',
        label: 'Have a drink and leave',
        hint: 'Costs an hour and nothing else',
        effects: { hours: 1, credits: -30 },
        result: {
          text: 'You watch two hands from the bar and go back to the ship. Whatever was going to happen at that table happens without you.',
          effects: { crewStress: -3, log: 'Passed on a high-stakes dock game.' },
        },
      },
    ],
  },

  {
    id: 'stn-old-crewmate',
    scope: ['station', 'social'],
    title: 'Someone Who Knew the Ship',
    body: 'A woman on the transit concourse stops dead when she sees your hull number, then walks over and asks after the previous owner by name. She crewed this ship for two years before you ever saw it, and she is currently between berths.',
    weight: 7,
    conditions: { once: true, locationKinds: ['transitStation'] },
    tags: ['legacy', 'recruit'],
    choices: [
      {
        id: 'offer-a-berth',
        label: 'Offer her a berth on the spot',
        hint: 'Two hours, no vetting',
        effects: { hours: 2 },
        result: {
          text: 'She is aboard within the hour and finds three things wrong with the ship before dinner, all of which she already knew about from the last time.',
          effects: {
            recruit: true,
            systems: { engines: 5, power: 4 },
            morale: 6,
            crewXp: 10,
            flag: { key: 'old_hand_aboard', value: true },
            log: 'A former crew member of the ship rejoined at the transit station.',
          },
        },
      },
      {
        id: 'hear-her-out',
        label: 'Buy her a meal and hear the whole story',
        hint: 'Four hours, and some of it will be hard to hear',
        effects: { hours: 4, credits: -60 },
        check: { skill: 'persuasion', attributes: ['socialAwareness', 'evaluation'], participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'Four hours of history: what the ship was used for, what the previous owner hid, and where. She signs on, and she brings a diagram.',
            effects: {
              recruit: true,
              items: [{ itemId: 'antique_navcomp', qty: 1, condition: 70 }],
              repairParts: 20,
              systems: { engines: 6 },
              morale: 8,
              personalXp: 40,
              flag: { key: 'old_hand_aboard', value: true },
            },
          },
          success: {
            text: 'She tells you enough to explain three things about this ship that never made sense, and takes the berth.',
            effects: {
              recruit: true,
              systems: { engines: 4 },
              morale: 5,
              personalXp: 25,
              flag: { key: 'old_hand_aboard', value: true },
            },
          },
          partial: {
            text: 'She talks, she does not sign, and she gives you the name of the yard that did the last real work on the hull.',
            effects: { personalXp: 15, flag: { key: 'yard_contact', value: true } },
          },
          failure: {
            text: 'Whatever happened at the end of her time aboard, she is not over it. She finishes the meal, thanks you, and goes.',
            effects: { morale: -3, personalXp: 8 },
          },
          criticalFailure: {
            text: 'The story ends with a debt the previous owner left with the wrong people, and she is not the only one who has recognised your hull number today.',
            effects: {
              morale: -6,
              crewStress: 12,
              flag: { key: 'watched_by_someone', value: true },
            },
          },
        },
      },
      {
        id: 'send-her-off',
        label: 'Tell her the ship is full',
        hint: 'Free, and she will not ask twice',
        result: {
          text: 'She takes it well, which makes it worse. She tells you one thing about the engine trim as a parting gift and walks back into the concourse crowd.',
          effects: {
            systems: { engines: 2 },
            morale: -3,
            log: 'Turned away a former crew member of the ship.',
          },
        },
      },
    ],
  },

  {
    id: 'stn-yard-upgrade-offer',
    scope: ['station', 'technical'],
    title: 'The Offer From the Yard',
    body: 'A yard broker at {location} has a sensor array and a shield emitter out of a scrapped patrol cutter, both far better than what you are carrying, both priced like the paperwork on them is imaginative. He wants an answer before the next shift.',
    weight: 8,
    conditions: { once: true, locationKinds: ['transitStation'], requiresShip: true },
    tags: ['upgrade', 'grey-market'],
    choices: [
      {
        id: 'buy-and-fit',
        label: 'Buy both and fit them yourself',
        hint: 'Twelve hours and most of your money',
        requires: { minCredits: 1800 },
        effects: { hours: 12, credits: -1800 },
        check: { skill: 'electricalEngineering', secondarySkill: 'mechanicalEngineering', participation: 'duo' },
        outcomes: {
          exceptional: {
            text: 'Both units go in clean and calibrate better than their own spec sheets. The ship can suddenly see and take a hit.',
            effects: {
              systems: { sensors: 25, shields: 22, power: -4 },
              items: [{ itemId: 'sensor_module', qty: 1 }],
              morale: 9,
              crewXp: 40,
              personalXp: 40,
            },
          },
          success: {
            text: 'Both fitted, both working, one of them complaining about your power bus.',
            effects: { systems: { sensors: 18, shields: 15, power: -6 }, crewXp: 25, morale: 6 },
          },
          partial: {
            text: 'The array goes in. The emitter does not fit your mounts and sits in the hold as a very expensive spare.',
            effects: {
              systems: { sensors: 16, power: -4 },
              items: [{ itemId: 'shield_emitter', qty: 1, condition: 80 }],
              crewStress: 8,
              crewXp: 15,
            },
          },
          failure: {
            text: 'Neither unit will handshake with a ship this old. You have bought two paperweights and lost a day.',
            effects: {
              items: [{ itemId: 'sensor_module', qty: 1, condition: 70 }, { itemId: 'shield_emitter', qty: 1, condition: 70 }],
              morale: -6,
              crewStress: 12,
            },
          },
          criticalFailure: {
            text: 'The emitter draws far more than the bus can give during commissioning. Something in the power section lets go and takes the array with it.',
            effects: {
              systems: { power: -20, sensors: -10, shields: -8 },
              repairParts: -25,
              morale: -10,
              crewStress: 16,
            },
          },
        },
      },
      {
        id: 'buy-the-array-only',
        label: 'Take the sensor array only',
        hint: 'Six hours, half the exposure',
        requires: { minCredits: 900 },
        effects: { hours: 6, credits: -900 },
        result: {
          text: 'The array goes in without much argument and the difference on the scope is immediate. Your navigator spends the evening just looking at things.',
          effects: {
            systems: { sensors: 16, power: -3 },
            morale: 6,
            crewXp: 15,
            log: 'Fitted a salvaged patrol-cutter sensor array.',
          },
        },
      },
      {
        id: 'check-the-serials',
        label: 'Check the serials before you commit',
        hint: 'Three hours at a public terminal',
        effects: { hours: 3 },
        check: { skill: 'computers', attributes: ['reasoning', 'memory'], participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'Both units are legitimately decommissioned and the broker has been overcharging on that basis. You buy them at a price that reflects reality.',
            effects: {
              credits: -1100,
              systems: { sensors: 18, shields: 14, power: -5 },
              personalXp: 40,
              morale: 7,
            },
          },
          success: {
            text: 'Clean serials on the array, murky on the emitter. You buy one and leave the other.',
            effects: { credits: -850, systems: { sensors: 15, power: -3 }, personalXp: 25 },
          },
          partial: {
            text: 'The registry is ambiguous on both. You walk away from a good deal you cannot verify.',
            effects: { personalXp: 12, morale: -2 },
          },
          failure: {
            text: 'The terminal has no record either way and three hours are gone. The broker sells both units to a hauler crew while you are still searching.',
            effects: { morale: -4, crewStress: 5 },
          },
          criticalFailure: {
            text: 'Both serials come back attached to an active theft report, and your query is now attached to them.',
            effects: {
              morale: -6,
              crewStress: 12,
              flag: { key: 'station_flagged', value: true },
            },
          },
        },
      },
      {
        id: 'decline-upgrade',
        label: 'Turn it down',
        hint: 'Free, and it was probably the sensible call',
        result: {
          text: 'You tell him no and he shrugs like he expected it. Whether that means you dodged something or missed something, you will not find out.',
          effects: { morale: -1, log: 'Declined a grey-market systems upgrade.' },
        },
      },
    ],
  },

  {
    id: 'stn-lockdown-riot',
    scope: ['station', 'hostile'],
    title: 'Lockdown on the Concourse',
    body: 'A resupply barge failed to arrive at {location} for the third time and the concourse has stopped being a queue and started being something else. Station security has sealed the ring transits. Two of your crew are on the wrong side of the seal.',
    weight: 6,
    conditions: { once: true, locationKinds: ['tradeStation', 'transitStation'], minCrew: 3, minDanger: 20 },
    tags: ['riot', 'crisis'],
    choices: [
      {
        id: 'go-get-them',
        label: 'Go in and bring them out',
        hint: 'Four hours through a locked-down ring',
        effects: { hours: 4 },
        check: { skill: 'stealth', secondarySkill: 'closeQuarters', attributes: ['agility', 'decisionMaking'], participation: 'duo', criticalRisk: true },
        outcomes: {
          exceptional: {
            text: 'Service crawlways and a maintenance override get you across the ring and back with both of them and two other people who needed the same route.',
            effects: {
              morale: 10,
              crewXp: 35,
              personalXp: 45,
              recruit: true,
              crewStress: 8,
            },
          },
          success: {
            text: 'You find them in a sealed retail unit, wait out the worst of it, and walk everyone back at shift change.',
            effects: { morale: 6, crewXp: 22, personalXp: 30, crewStress: 10 },
          },
          partial: {
            text: 'You get one of them out cleanly. The other spends the night in a security holding pen and comes back with a bill and a bruise.',
            effects: {
              credits: -300,
              morale: -2,
              crewStress: 14,
              wound: { severityScore: 30, damageType: 'blunt' },
            },
          },
          failure: {
            text: 'The route you take puts you in the middle of the crowd when security starts clearing it with batons.',
            effects: {
              credits: -200,
              morale: -7,
              crewStress: 18,
              combat: 'enc_desperate_looters',
            },
          },
          criticalFailure: {
            text: 'The ring transit cycles shut with your party split across it, and by the time the lockdown lifts one of your people is not accounted for anywhere on the station.',
            effects: {
              morale: -15,
              crewStress: 20,
              loseCrew: true,
              flag: { key: 'lost_crew_in_riot', value: true },
            },
          },
        },
      },
      {
        id: 'work-through-security',
        label: 'Work it through the security office',
        hint: 'Eight hours of official channels',
        effects: { hours: 8 },
        check: { skill: 'persuasion', attributes: ['composure', 'leadership'], participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'You get a duty supervisor to pull both of your people out through a controlled transit inside two hours, and you spend the rest of the time being useful at the desk.',
            effects: { morale: 8, personalXp: 40, crewStress: 5, flag: { key: 'security_contact', value: true } },
          },
          success: {
            text: 'Eight hours of forms and waiting, and both come out unhurt at the end of it.',
            effects: { morale: 3, personalXp: 25, crewStress: 8 },
          },
          partial: {
            text: 'They are released at the end of the lockdown like everyone else. The paperwork you did made no difference at all.',
            effects: { crewStress: 12, morale: -2, personalXp: 10 },
          },
          failure: {
            text: 'Security processes them as participants rather than bystanders. The fines are not small.',
            effects: { credits: -600, morale: -6, crewStress: 14, flag: { key: 'station_flagged', value: true } },
          },
          criticalFailure: {
            text: 'One of your crew is charged with something real. Getting them back aboard costs a great deal and everyone knows the charge was invented.',
            effects: {
              credits: -1200,
              morale: -10,
              crewStress: 18,
              flag: { key: 'station_flagged', value: true },
            },
          },
        },
      },
      {
        id: 'seal-and-prep-departure',
        label: 'Seal the ship and prepare to leave without them',
        hint: 'Two hours, and you will have to say it out loud',
        effects: { hours: 2 },
        result: {
          text: 'You bring the ship to readiness and tell the crew the deadline. They come back through the seal an hour before it, and nobody mentions the conversation again.',
          effects: {
            morale: -8,
            crewStress: 16,
            flag: { key: 'set_a_deadline', value: true },
            log: 'Prepared to depart during a station lockdown with crew still ashore.',
          },
        },
      },
    ],
  },

  {
    id: 'stn-surplus-armourer',
    scope: ['station'],
    title: 'Surplus, Sold As Seen',
    body: 'A surplus dealer on the lower ring has a rack of decommissioned weapons and armour, all of it condition-graded by someone with a generous imagination. He will let you strip and check one item before you buy. Only one.',
    weight: 9,
    conditions: { locationKinds: ['tradeStation', 'transitStation'] },
    tags: ['equipment', 'market'],
    choices: [
      {
        id: 'strip-and-assess',
        label: 'Strip the most expensive piece and judge the rest by it',
        hint: 'Three hours at his bench',
        requires: { minCredits: 500 },
        effects: { hours: 3, credits: -500 },
        check: { skill: 'weaponsmithing', attributes: ['proprioception', 'evaluation'], participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'The rack came out of the same lot and the wear pattern tells you which three pieces were barely used. You take all three at rack price.',
            effects: {
              items: [
                { itemId: 'rifle_service', qty: 1, condition: 85 },
                { itemId: 'vest_ballistic', qty: 1, condition: 80 },
                { itemId: 'ammo_rifle', qty: 4 },
              ],
              personalXp: 40,
              morale: 5,
            },
          },
          success: {
            text: 'You pick two sound pieces out of a rack of mostly tired ones.',
            effects: {
              items: [{ itemId: 'carbine_worn', qty: 1, condition: 70 }, { itemId: 'vest_padded', qty: 1, condition: 75 }],
              personalXp: 25,
            },
          },
          partial: {
            text: 'One decent piece and one that will need a weaponsmith before anybody fires it.',
            effects: {
              items: [{ itemId: 'shotgun_field', qty: 1, condition: 55 }, { itemId: 'ammo_shotgun', qty: 3 }],
              personalXp: 12,
            },
          },
          failure: {
            text: 'The piece you stripped was the only good one on the rack and you have bought two of the others.',
            effects: {
              items: [{ itemId: 'pistol_service', qty: 1, condition: 40 }],
              morale: -4,
              crewStress: 3,
            },
          },
          criticalFailure: {
            text: 'The action you were stripping was loaded, which the dealer swore it was not.',
            effects: {
              morale: -6,
              crewStress: 10,
              wound: { severityScore: 50, damageType: 'pierce' },
            },
          },
        },
      },
      {
        id: 'haggle-a-bundle',
        label: 'Haggle for a bundle, unexamined',
        hint: 'Two hours, volume and luck',
        requires: { minCredits: 400 },
        effects: { hours: 2, credits: -400 },
        check: { skill: 'negotiation', participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'He wants the rack clear before the next inspection and you catch him at exactly the right hour.',
            effects: {
              items: [
                { itemId: 'smg_compact', qty: 1, condition: 65 },
                { itemId: 'stun_baton', qty: 2, condition: 80 },
                { itemId: 'helmet_industrial', qty: 2 },
                { itemId: 'ammo_pistol', qty: 5 },
              ],
              personalXp: 30,
              morale: 4,
            },
          },
          success: {
            text: 'A reasonable bundle at a reasonable price. Most of it works.',
            effects: {
              items: [{ itemId: 'pistol_service', qty: 2, condition: 65 }, { itemId: 'ammo_pistol', qty: 4 }],
              personalXp: 18,
            },
          },
          partial: {
            text: 'You overpay slightly for a mixed lot with one genuinely useful item in it.',
            effects: { items: [{ itemId: 'machete', qty: 1 }, { itemId: 'vest_padded', qty: 1, condition: 50 }], personalXp: 8 },
          },
          failure: {
            text: 'The bundle is exactly what it looked like from across the ring: tired rack stock at a firm price.',
            effects: { items: [{ itemId: 'improvised_club', qty: 2 }], morale: -4 },
          },
          criticalFailure: {
            text: 'Two of the pieces in your bundle carry serials the dealer should have filed off and did not.',
            effects: {
              items: [{ itemId: 'pistol_holdout', qty: 1, condition: 45 }],
              morale: -5,
              crewStress: 8,
              flag: { key: 'station_flagged', value: true },
            },
          },
        },
      },
      {
        id: 'buy-nothing-armourer',
        label: 'Buy nothing',
        hint: 'Free',
        result: {
          text: 'You look at the rack for ten minutes and decide the crew is better served by food. The dealer agrees with you, out loud, which is not a good sign for his stock.',
          effects: { log: 'Passed on the surplus weapons rack.' },
        },
      },
    ],
  },

  {
    id: 'stn-cargo-broker-consignment',
    scope: ['station'],
    title: 'Space in the Hold',
    body: 'A cargo broker at {location} has three consignments looking for a hull: bulk ore going the direction you are already headed, volatiles paying triple, and a refrigerated medical shipment with a hard delivery window. Your hold will take one of them properly.',
    weight: 11,
    conditions: { locationKinds: ['tradeStation', 'transitStation'], requiresShip: true },
    tags: ['cargo', 'trade'],
    choices: [
      {
        id: 'take-ore',
        label: 'Take the ore',
        hint: 'Three hours to load, dull and safe',
        effects: { hours: 3 },
        result: {
          text: 'Heavy, boring, and paid on delivery. The loading crew has you sealed and stamped before the shift ends.',
          effects: {
            items: [{ itemId: 'trade_ore_crate', qty: 4 }],
            credits: 300,
            log: 'Took an ore consignment on the outbound leg.',
          },
        },
      },
      {
        id: 'take-volatiles',
        label: 'Take the volatiles',
        hint: 'Five hours, triple rate, and it is volatile',
        effects: { hours: 5 },
        check: { skill: 'explosives', secondarySkill: 'mechanicalEngineering', attributes: ['reasoning', 'discipline'], participation: 'duo' },
        outcomes: {
          exceptional: {
            text: 'Your people build a stowage arrangement the broker photographs for his own training material. He pays a premium on top of the rate.',
            effects: {
              items: [{ itemId: 'trade_volatiles', qty: 3 }],
              credits: 900,
              personalXp: 35,
              crewXp: 20,
              morale: 4,
            },
          },
          success: {
            text: 'Properly blocked, properly vented, properly documented. It pays what it promised.',
            effects: { items: [{ itemId: 'trade_volatiles', qty: 3 }], credits: 700, crewXp: 15 },
          },
          partial: {
            text: 'The stowage passes inspection on the second attempt. You take a reduced load and a reduced rate.',
            effects: { items: [{ itemId: 'trade_volatiles', qty: 1 }], credits: 350, crewStress: 6, crewXp: 8 },
          },
          failure: {
            text: 'The broker\'s surveyor fails your bay for volatiles carriage and the consignment goes to another hull.',
            effects: { crewStress: 6, morale: -4 },
          },
          criticalFailure: {
            text: 'A drum is punctured against a frame during loading. The bay is evacuated, the load is cancelled, and the cleanup is billed to you.',
            effects: {
              credits: -500,
              hull: -6,
              systems: { lifeSupport: -8 },
              crewStress: 14,
              morale: -7,
              wound: { severityScore: 38, damageType: 'burn' },
            },
          },
        },
      },
      {
        id: 'take-medical',
        label: 'Take the medical shipment',
        hint: 'Four hours, hard window, real consequences',
        effects: { hours: 4 },
        check: { skill: 'medicalDiagnostics', secondarySkill: 'electricalEngineering', participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'You verify the cold chain yourself, rig a redundant monitor off the ship bus, and the consignor pays for the reassurance as much as the carriage.',
            effects: {
              credits: 1000,
              medicine: 4,
              personalXp: 40,
              morale: 5,
              flag: { key: 'medical_consignment', value: true },
            },
          },
          success: {
            text: 'Cold chain verified and loaded. Good money and a delivery window you can make.',
            effects: { credits: 750, medicine: 2, personalXp: 25, flag: { key: 'medical_consignment', value: true } },
          },
          partial: {
            text: 'One of the units is already marginal. You take the load knowing part of it may not arrive viable.',
            effects: { credits: 500, crewStress: 6, personalXp: 12, flag: { key: 'medical_consignment', value: true } },
          },
          failure: {
            text: 'Your bay cannot hold the temperature the consignment needs and the broker finds out before you do.',
            effects: { morale: -4, crewStress: 5 },
          },
          criticalFailure: {
            text: 'You accept the load and the bay chiller fails within the hour, in dock, in front of the consignor.',
            effects: {
              credits: -700,
              systems: { power: -8 },
              morale: -8,
              crewStress: 12,
              flag: { key: 'station_flagged', value: true },
            },
          },
        },
      },
      {
        id: 'take-nothing',
        label: 'Sail with the hold empty',
        hint: 'Faster, lighter, poorer',
        result: {
          text: 'You leave the consignments on the dock. The ship handles better empty and the balance sheet does not care about handling.',
          effects: { morale: -2, log: 'Departed the station with an empty hold.' },
        },
      },
    ],
  },

  {
    id: 'stn-rest-and-shore-leave',
    scope: ['station', 'social'],
    title: 'A Night Off the Ship',
    body: 'Your crew has been in the same six compartments for weeks and {location} has bars, baths, real food, and beds that do not move. Shore leave costs money and time and returns something you cannot buy directly.',
    weight: 12,
    conditions: { locationKinds: ['tradeStation', 'transitStation'], minCrew: 2 },
    tags: ['rest', 'morale'],
    choices: [
      {
        id: 'proper-shore-leave',
        label: 'Full shore leave, ship money',
        hint: 'Eighteen hours and a real bill',
        requires: { minCredits: 400 },
        effects: { hours: 18, credits: -400 },
        result: {
          text: 'Baths, a proper meal, and a night in beds that stay still. They come back late, loud, and noticeably easier with each other.',
          effects: {
            morale: 11,
            crewStress: -10,
            crewXp: 8,
            log: 'Full shore leave taken at the station.',
          },
        },
      },
      {
        id: 'staggered-leave',
        label: 'Staggered leave, ship stays crewed',
        hint: 'Twelve hours, half the benefit, no risk',
        requires: { minCredits: 200 },
        effects: { hours: 12, credits: -200 },
        result: {
          text: 'Half the crew ashore, half aboard, then swap. Nobody gets a full night and everybody gets a bath.',
          effects: { morale: 5, crewStress: -6, log: 'Staggered shore leave taken at the station.' },
        },
      },
      {
        id: 'organise-a-meal',
        label: 'Bring the station aboard instead',
        hint: 'Six hours, cheaper, depends on the galley',
        requires: { minCredits: 120 },
        effects: { hours: 6, credits: -120 },
        check: { skill: 'cooking', secondarySkill: 'persuasion', participation: 'individual' },
        outcomes: {
          exceptional: {
            text: 'Fresh produce off the station market, cooked properly, eaten at a table with everyone at it. It is the best evening the ship has had.',
            effects: {
              food: 6,
              items: [{ itemId: 'fresh_produce', qty: 3 }],
              morale: 12,
              crewStress: -9,
              personalXp: 30,
            },
          },
          success: {
            text: 'A real meal aboard with station produce. Cheaper than a bar and better company.',
            effects: { food: 4, morale: 7, crewStress: -6, personalXp: 18 },
          },
          partial: {
            text: 'The market produce was not what it claimed and half the meal is rations anyway. People appreciate the effort.',
            effects: { food: 2, morale: 3, crewStress: -3, personalXp: 8 },
          },
          failure: {
            text: 'You overpay for produce that turns within a day. The meal happens and nobody talks about it afterwards.',
            effects: { credits: -80, morale: -2, crewStress: 2 },
          },
          criticalFailure: {
            text: 'Something in the market produce was not safe. Two of the crew spend shore leave being ill in a compartment that does not have a window.',
            effects: {
              medicine: -3,
              morale: -8,
              crewStress: 12,
            },
          },
        },
      },
      {
        id: 'no-leave',
        label: 'No leave; there is work to do',
        hint: 'Saves money, spends goodwill',
        effects: { hours: 6 },
        result: {
          text: 'You keep everyone aboard and put the day into the maintenance list. It gets done. Somebody stands at the airlock port for a long time looking at the concourse lights.',
          effects: {
            systems: { engines: 4, power: 3, lifeSupport: 3 },
            morale: -8,
            crewStress: 8,
            log: 'Shore leave denied in favour of ship work.',
          },
        },
      },
    ],
  },
];

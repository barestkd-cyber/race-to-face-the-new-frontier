/**
 * Moon events.
 *
 * The two moons exist to feed the Homeworld: metallic mining, rare minerals,
 * water and ice harvesting, volatiles, chemical production, greenhouse
 * agriculture, and heavy manufacturing. Workers rotate down and back; freight
 * goes home. As the Homeworld clock runs out, none of that is true any more —
 * rotations stop, freight stops, stores get hoarded, facilities go dark, and
 * the people left behind start making their own arrangements.
 *
 * Pure data. No logic.
 */

import type { GameEventDef } from '../../engine/types';

export const MOON_EVENTS: GameEventDef[] = [
  // -------------------------------------------------------------------------
  // Extraction incidents
  // -------------------------------------------------------------------------
  {
    id: 'moon-shaft-collapse',
    scope: ['moon'],
    title: 'Level Four Has Come Down',
    body: 'A support run in the deep metallic workings lets go while a face crew is still below. The shift boss has three people accounted for and two who are not, and he has no rescue team because his rescue team was rotated home eleven days ago and never replaced. He is asking anyone with a suit and a light.',
    weight: 11,
    conditions: { minCrew: 2 },
    tags: ['mining', 'rescue', 'collapse'],
    choices: [
      {
        id: 'go-down',
        label: 'Take your crew down to the face',
        hint: '6 hours in a working that has already failed once.',
        check: {
          skill: 'exploration',
          secondarySkill: 'mechanicalEngineering',
          attributes: ['perception', 'endurance'],
          participation: 'group',
          criticalRisk: true,
          modifiers: [{ label: 'Unshored roof, no ground control survey', value: -12 }],
        },
        effects: { hours: 6, crewStress: 11 },
        outcomes: {
          exceptional: {
            text: 'You find a void behind the fall with both men in it, conscious and furious about the state of the shoring. One of them asks whether your ship has a berth, and he is a ground control engineer.',
            effects: { morale: 12, credits: 900, recruit: true, crewXp: 95, flag: { key: 'moon_mine_favour', value: true } },
          },
          success: {
            text: 'Two hours of careful digging and both of them walk out on their own feet. The shift boss pays out of his own discretionary account.',
            effects: { morale: 9, credits: 650, repairParts: 30, crewXp: 60 },
          },
          partial: {
            text: 'You bring one out. The second void does not have anyone in it and you spend a long time making sure of that.',
            effects: { morale: 2, credits: 350, crewStress: 9, medicine: -3, crewXp: 35 },
          },
          failure: {
            text: 'The ground keeps working and the shift boss pulls everyone back before you reach the face. He is right to and nobody feels good about it.',
            effects: { morale: -6, crewStress: 9, crewXp: 12 },
          },
          criticalFailure: {
            text: 'A secondary fall takes the access drift while your party is past it. Getting the survivors out costs hours you did not plan and someone who came down with you does not come back up.',
            effects: { morale: -15, crewStress: 20, loseCrew: true, wound: { severityScore: 68, damageType: 'blunt' }, medicine: -6 },
          },
        },
      },
      {
        id: 'reshore-first',
        label: 'Reshore the drift before anyone goes past it',
        hint: '8 hours of engineering before any rescue. Slower. Much safer.',
        check: {
          skill: 'mechanicalEngineering',
          secondarySkill: 'exploration',
          participation: 'trio',
        },
        effects: { hours: 8, crewStress: 7, repairParts: -25 },
        outcomes: {
          exceptional: {
            text: 'You put in a set that would pass any inspection anywhere, and the mine crew walk their own people out through it without incident.',
            effects: { morale: 11, credits: 700, repairParts: 40, crewXp: 85, flag: { key: 'moon_mine_favour', value: true } },
          },
          success: {
            text: 'The drift holds and the rescue goes through clean. Long, dull, correct.',
            effects: { morale: 7, credits: 480, crewXp: 55 },
          },
          partial: {
            text: 'You get the first forty metres properly supported before the timber runs out. It is enough to reach one of the two.',
            effects: { morale: 3, credits: 260, crewStress: 6, crewXp: 30 },
          },
          failure: {
            text: 'The ground is too broken to support with what the mine has left on site. You spend eight hours proving it cannot be done.',
            effects: { morale: -5, repairParts: -10, crewStress: 8, crewXp: 12 },
          },
          criticalFailure: {
            text: 'A set fails while it is being placed. Nobody reaches the face, the drift is now longer and worse, and one of your people is carried out.',
            effects: { morale: -12, crewStress: 17, wound: { severityScore: 60, damageType: 'blunt' }, medicine: -5 },
          },
        },
      },
      {
        id: 'surface-medical',
        label: 'Set up a casualty point at the portal',
        hint: '4 hours on the surface. Useful, and you will not be the one down there.',
        check: {
          skill: 'firstAid',
          secondarySkill: 'medicalDiagnostics',
          participation: 'duo',
        },
        effects: { hours: 4, medicine: -3, crewStress: 5 },
        outcomes: {
          exceptional: {
            text: 'Everything that comes up that portal is stabilised inside two minutes of reaching air. The colony medic restocks you twice over.',
            effects: { morale: 8, medicine: 9, credits: 300, personalXp: 50, flag: { key: 'moon_clinic_favour', value: true } },
          },
          success: {
            text: 'Three crush cases handled cleanly and handed off. The medic says you can use her bay whenever you are on this rock.',
            effects: { morale: 5, medicine: 5, credits: 200, personalXp: 32 },
          },
          partial: {
            text: 'You do what you can with the kit you brought, and the kit you brought runs out.',
            effects: { morale: 1, crewStress: 5, personalXp: 14 },
          },
          failure: {
            text: 'The colony medical team arrives from the north camp before anyone comes up and takes over your position.',
            effects: { morale: -3, personalXp: 6 },
          },
          criticalFailure: {
            text: 'You misjudge a decompression case as simple shock. He is on his way to the colony bay before anyone realises, and he does not arrive well.',
            effects: { morale: -11, crewStress: 14, medicine: -3 },
          },
        },
      },
      {
        id: 'stay-out',
        label: 'This is not your mine',
        hint: 'Correct, defensible, and everyone at the portal will remember it.',
        effects: { hours: 1 },
        result: {
          text: 'You tell the shift boss you have no ground control experience and he does not argue, because he has no time to argue. Word gets around the camp by evening.',
          effects: { morale: -6, crewStress: 4, flag: { key: 'moon_camp_cold', value: true } },
        },
      },
    ],
  },

  {
    id: 'moon-volatiles-leak',
    scope: ['moon'],
    title: 'Bleed at the Volatiles Head',
    body: 'A wellhead in the volatiles field is venting under pressure into a low bowl of terrain and the vapour is pooling exactly where it should not. The extraction crew have backed off to a safe distance and are watching their own facility become a bomb. Their charge specialist rotated home three weeks ago.',
    weight: 9,
    tags: ['volatiles', 'hazard', 'explosives'],
    choices: [
      {
        id: 'shaped-relief',
        label: 'Cut a relief vent with a shaped charge',
        hint: '3 hours. The right answer, executed by someone who had better be right.',
        requires: { skill: { skill: 'explosives', min: 30 } },
        check: {
          skill: 'explosives',
          secondarySkill: 'mechanicalEngineering',
          participation: 'individual',
          criticalRisk: true,
          modifiers: [{ label: 'Vapour pooling, no clean approach', value: -10 }],
        },
        effects: { hours: 3, crewStress: 10 },
        outcomes: {
          exceptional: {
            text: 'One charge opens a relief path uphill of the pool and the field vents harmlessly for two hours. The extraction chief signs over a full tender load of product on the spot.',
            effects: { credits: 1300, fuel: 22, items: [{ itemId: 'trade_volatiles', qty: 4 }], morale: 10, personalXp: 70, flag: { key: 'moon_field_favour', value: true } },
          },
          success: {
            text: 'The vent opens, the bowl clears, and the wellhead can be shut in by hand an hour later.',
            effects: { credits: 850, fuel: 14, items: [{ itemId: 'trade_volatiles', qty: 2 }], morale: 6, personalXp: 45 },
          },
          partial: {
            text: 'The relief cut works but takes half the wellhead assembly with it. The field is safe and considerably less productive.',
            effects: { credits: 400, fuel: 6, crewStress: 7, personalXp: 20 },
          },
          failure: {
            text: 'You cannot find a placement that does not put the charge inside the vapour envelope, so you do not place one. The crew wait it out instead.',
            effects: { morale: -4, crewStress: 8, personalXp: 8 },
          },
          criticalFailure: {
            text: 'The charge ignites the pool. The bowl goes up in a single soft enormous thump, the field burns for a day, and one of the people standing with you does not get clear.',
            effects: { credits: 0, morale: -15, crewStress: 20, loseCrew: true, wound: { severityScore: 72, damageType: 'burn' }, medicine: -6, flag: { key: 'moon_field_disaster', value: true } },
          },
        },
      },
      {
        id: 'shut-in-manual',
        label: 'Suit up and shut the wellhead in by hand',
        hint: '4 hours crossing a vapour bowl in a hardsuit. Slow, deliberate, terrifying.',
        check: {
          skill: 'mechanicalEngineering',
          secondarySkill: 'exploration',
          attributes: ['proprioception', 'composure'],
          participation: 'duo',
          criticalRisk: true,
        },
        effects: { hours: 4, crewStress: 12 },
        outcomes: {
          exceptional: {
            text: 'Two people walk in, close the master valve by hand, and walk out. It takes forty minutes and looks like nothing at all from the safe line.',
            effects: { credits: 1100, fuel: 16, morale: 11, personalXp: 60, crewXp: 50, flag: { key: 'moon_field_favour', value: true } },
          },
          success: {
            text: 'The valve is stiff and it takes both of you on the wheel, but it closes and the venting stops.',
            effects: { credits: 700, fuel: 10, morale: 7, personalXp: 40, crewXp: 30 },
          },
          partial: {
            text: 'You get it three quarters closed before the suit alarms drive you out. It is enough to stop the pooling and not enough to stop the leak.',
            effects: { credits: 320, fuel: 4, crewStress: 8, personalXp: 18 },
          },
          failure: {
            text: 'The approach route reads unsurvivable on the gas meters and you turn back at the rim. The field crew agree with you and nobody says anything else about it.',
            effects: { morale: -4, crewStress: 9, personalXp: 8 },
          },
          criticalFailure: {
            text: 'A suit seal fails halfway across the bowl. Getting the casualty out is done fast, badly, and at considerable cost to everyone who does it.',
            effects: { morale: -12, crewStress: 19, wound: { severityScore: 74, damageType: 'burn' }, medicine: -7 },
          },
        },
      },
      {
        id: 'evacuate-only',
        label: 'Help them evacuate the field camp instead',
        hint: '5 hours of moving people and equipment away from the bowl.',
        effects: { hours: 5, crewStress: 6 },
        result: {
          text: 'You spend the afternoon hauling habitat modules and gas bottles uphill. The wellhead is still venting when you leave and everyone who was near it is not.',
          effects: { credits: 380, items: [{ itemId: 'hardsuit_work', qty: 1, condition: 66 }, { itemId: 'rebreather', qty: 2 }], morale: 4, crewXp: 30 },
        },
      },
      {
        id: 'leave-field',
        label: 'Get well clear and stay clear',
        effects: { hours: 2 },
        result: {
          text: 'You move {ship} to the far side of the ridge and watch the vapour build in the bowl through a long lens. It does not go up today.',
          effects: { crewStress: 5, morale: -3 },
        },
      },
    ],
  },

  {
    id: 'moon-drill-head-jam',
    scope: ['moon'],
    title: 'The Cutter Head Will Not Turn',
    body: 'The rare minerals operation has one working continuous miner and its cutter head has seized in the face. Their maintenance contract was with a Homeworld firm that stopped answering nine days ago. The site manager will pay in product, in stores, or in anything else she has, because without that machine the site is finished.',
    weight: 12,
    tags: ['mining', 'repair', 'contract'],
    choices: [
      {
        id: 'strip-and-fix',
        label: 'Strip the drive train and find the fault',
        hint: '12 hours in the face with their tools and your judgement.',
        check: {
          skill: 'mechanicalEngineering',
          secondarySkill: 'electricalEngineering',
          participation: 'duo',
        },
        effects: { hours: 12, crewStress: 6, repairParts: -20 },
        outcomes: {
          exceptional: {
            text: 'The fault is a sheared key in the reduction gear, and while you are in there you find three more failures waiting to happen and fix those too. She pays like someone who understands what she just got.',
            effects: { credits: 1500, items: [{ itemId: 'trade_rare_minerals', qty: 5 }], repairParts: 60, morale: 8, personalXp: 65 },
          },
          success: {
            text: 'Sheared key, replaced, cutter head turning by the end of the shift.',
            effects: { credits: 950, items: [{ itemId: 'trade_rare_minerals', qty: 3 }], repairParts: 30, personalXp: 42 },
          },
          partial: {
            text: 'It turns, at reduced load, until somebody gets a proper gear set out here. That is the best anyone is going to do.',
            effects: { credits: 500, items: [{ itemId: 'trade_rare_minerals', qty: 1 }], personalXp: 20 },
          },
          failure: {
            text: 'The reduction housing is cracked through and there is no field repair for that. She takes the news better than you expected.',
            effects: { credits: 180, morale: -3, personalXp: 8 },
          },
          criticalFailure: {
            text: 'You free the head with the drive still energised and it takes a run at the face. The machine is scrap, the site is finished, and everyone knows exactly whose hands were on it.',
            effects: { credits: 0, repairParts: -20, morale: -11, crewStress: 15, wound: { severityScore: 50, damageType: 'blunt' }, flag: { key: 'moon_site_ruined', value: true } },
          },
        },
      },
      {
        id: 'cut-it-free',
        label: 'Cut the seized section out with a plasma torch',
        hint: '6 hours. Faster, cruder, and it costs the machine some life.',
        check: {
          skill: 'weaponsmithing',
          secondarySkill: 'mechanicalEngineering',
          attributes: ['proprioception', 'steadiness'],
          participation: 'individual',
        },
        effects: { hours: 6, crewStress: 4 },
        outcomes: {
          exceptional: {
            text: 'Clean cuts, minimal collateral, and a bridging piece fabricated out of scrap that will outlast the rest of the machine.',
            effects: { credits: 900, items: [{ itemId: 'trade_rare_minerals', qty: 3 }, { itemId: 'plasma_cutter', qty: 1, condition: 74 }], personalXp: 55 },
          },
          success: {
            text: 'The seized section comes out and the head turns. It will need proper work eventually and eventually is not a word that means much here.',
            effects: { credits: 620, items: [{ itemId: 'trade_rare_minerals', qty: 2 }], personalXp: 35 },
          },
          partial: {
            text: 'It runs, badly, at a third of rate. The site manager takes it, because a third of rate is not zero.',
            effects: { credits: 300, repairParts: 12, personalXp: 15 },
          },
          failure: {
            text: 'You cannot get an angle on the seized section without cutting through a hydraulic run, and she will not authorise that.',
            effects: { credits: 100, morale: -3, personalXp: 6 },
          },
          criticalFailure: {
            text: 'The torch opens a pressurised hydraulic line at head height. The burn is bad and the machine is worse.',
            effects: { credits: 0, morale: -9, crewStress: 13, wound: { severityScore: 56, damageType: 'burn' }, medicine: -4 },
          },
        },
      },
      {
        id: 'sell-parts',
        label: 'Sell her the parts and let her crew do it',
        hint: 'No hours in the face. Straight trade.',
        requires: { minRepairParts: 60 },
        effects: { hours: 2, repairParts: -60 },
        result: {
          text: 'She takes the whole lot without inspecting it and pays in refined product, which is worth more off this rock than it is on it.',
          effects: { credits: 400, items: [{ itemId: 'trade_rare_minerals', qty: 4 }, { itemId: 'trade_ore_crate', qty: 2 }] },
        },
      },
      {
        id: 'no-contract',
        label: 'Decline the work',
        effects: { hours: 1 },
        result: {
          text: 'She thanks you for looking and goes to make the call that shuts the site down. Forty people find out at the end of the shift.',
          effects: { morale: -3 },
        },
      },
    ],
  },

  {
    id: 'moon-ice-shelf-crack',
    scope: ['moon'],
    title: 'The Harvest Field Is Moving',
    body: 'The water harvesting operation works a shelf of buried ice that everyone assumed was stable. It is not: a fracture has opened across the main cut and the harvester itself is sitting on the wrong side of it. There is a crew inside it, and a hopper on the pad that could reach them if somebody wants to fly it.',
    weight: 10,
    tags: ['ice-harvest', 'terrain', 'rescue'],
    choices: [
      {
        id: 'fly-hopper',
        label: 'Take the hopper across and lift them off',
        hint: '3 hours. Short flight, awful landing site, no margin.',
        check: {
          skill: 'piloting',
          secondarySkill: 'navigation',
          participation: 'individual',
          criticalRisk: true,
          modifiers: [{ label: 'Unsurveyed landing surface, shifting ice', value: -10 }],
        },
        effects: { hours: 3, fuel: -3, crewStress: 8 },
        outcomes: {
          exceptional: {
            text: 'You set down on a spur of solid shelf, load six people in under four minutes, and are off before the surface underneath does anything interesting.',
            effects: { credits: 800, items: [{ itemId: 'trade_ice_block', qty: 4 }], morale: 10, personalXp: 60, flag: { key: 'moon_harvest_favour', value: true } },
          },
          success: {
            text: 'Two trips, six people, no damage to anything that matters.',
            effects: { credits: 520, items: [{ itemId: 'trade_ice_block', qty: 2 }], morale: 6, personalXp: 38 },
          },
          partial: {
            text: 'You get four out. The fracture widens before the third trip and the last two have to walk the long way around the head of the cut.',
            effects: { credits: 300, morale: 2, crewStress: 6, personalXp: 16 },
          },
          failure: {
            text: 'The surface will not take the hopper anywhere within reach of the harvester. You fly back with an empty cabin and a lot of opinions about ice.',
            effects: { morale: -5, crewStress: 7, personalXp: 8 },
          },
          criticalFailure: {
            text: 'A skid punches through into a void on touchdown and the hopper goes over. Everyone gets out of it. The hopper stays where it is.',
            effects: { credits: -300, morale: -10, crewStress: 16, wound: { severityScore: 54, damageType: 'blunt' }, medicine: -4 },
          },
        },
      },
      {
        id: 'walk-route',
        label: 'Find a walking route around the head of the fracture',
        hint: '7 hours on foot across a shelf that is actively failing.',
        check: {
          skill: 'exploration',
          secondarySkill: 'navigation',
          participation: 'trio',
          modifiers: [{ label: 'Active fracture propagation', value: -8 }],
        },
        effects: { hours: 7, crewStress: 9 },
        outcomes: {
          exceptional: {
            text: 'You find and mark a route around the fracture head that the harvest crew can use with their own equipment, indefinitely. That is worth more to them than a rescue.',
            effects: { credits: 750, items: [{ itemId: 'trade_ice_block', qty: 3 }, { itemId: 'climbing_rig', qty: 1, condition: 80 }], morale: 9, crewXp: 75, flag: { key: 'moon_harvest_favour', value: true } },
          },
          success: {
            text: 'A long, cold, roped traverse and everyone comes back across it.',
            effects: { credits: 480, morale: 6, crewXp: 50 },
          },
          partial: {
            text: 'The route works but takes four hours each way. You get the crew off and the harvester stays where it is.',
            effects: { hours: 3, credits: 240, crewStress: 8, crewXp: 28 },
          },
          failure: {
            text: 'Every line you try ends at a crevasse field you will not cross without gear nobody on this moon has any more.',
            effects: { morale: -5, crewStress: 8, crewXp: 12 },
          },
          criticalFailure: {
            text: 'A snow bridge fails under the lead of your party. The rope holds and the shoulder that took the arrest does not.',
            effects: { morale: -9, crewStress: 15, wound: { severityScore: 48, damageType: 'blunt' }, medicine: -4 },
          },
        },
      },
      {
        id: 'strip-harvester',
        label: 'Write off the crew rescue and strip the near-side plant',
        hint: '5 hours. Cold, practical, and the harvest crew will hear about it.',
        check: {
          skill: 'scavenging',
          participation: 'group',
        },
        effects: { hours: 5, crewStress: 5 },
        outcomes: {
          exceptional: {
            text: 'The near-side processing plant is full of pumps, heat exchangers, and a sealed spares locker nobody had opened this season.',
            effects: { repairParts: 160, items: [{ itemId: 'coolant_flask', qty: 4 }, { itemId: 'life_support_filter', qty: 3 }], morale: -5, crewXp: 45 },
          },
          success: {
            text: 'A solid haul of pumps and piping. The harvest crew get themselves across the fracture eventually, and they watched you load.',
            effects: { repairParts: 100, items: [{ itemId: 'coolant_flask', qty: 2 }], morale: -6, crewXp: 30 },
          },
          partial: {
            text: 'Most of the plant is bolted to structure you cannot cut in five hours.',
            effects: { repairParts: 45, morale: -5, crewXp: 15 },
          },
          failure: {
            text: 'The near-side plant was stripped last week by somebody else with the same idea. You have made yourself unpopular for nothing.',
            effects: { repairParts: 10, morale: -8, crewStress: 5 },
          },
          criticalFailure: {
            text: 'The fracture propagates under the near-side pad while your crew is on it, and you spend the evening explaining yourselves to the harvest crew who came to pull you out.',
            effects: { repairParts: 15, morale: -12, crewStress: 14, wound: { severityScore: 40, damageType: 'blunt' }, flag: { key: 'moon_camp_cold', value: true } },
          },
        },
      },
      {
        id: 'relay-only',
        label: 'Relay their position to the colony and move on',
        effects: { hours: 1 },
        result: {
          text: 'You push their coordinates to the colony net and get an acknowledgement from an automated relay. Whether anyone is still reading that channel is a separate question.',
          effects: { morale: -4, crewStress: 3 },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Rotation collapse, freight, and people
  // -------------------------------------------------------------------------
  {
    id: 'moon-rotation-cancelled',
    scope: ['moon'],
    title: 'No Rotation This Cycle',
    body: 'The colony board posts a notice that the crew rotation transport is cancelled indefinitely, and then the shift supervisor stands in front of it for an hour answering questions he does not have answers to. Two hundred people who expected to be home in four days are now not going home at all. Several of them are looking at every hull on the pad, including yours.',
    weight: 12,
    conditions: { once: true },
    tags: ['rotation', 'recruitment', 'colony-collapse'],
    choices: [
      {
        id: 'address-them',
        label: 'Stand up and tell them what you can actually offer',
        hint: '4 hours. Honest, public, and it will not make everyone happy.',
        check: {
          skill: 'persuasion',
          attributes: ['leadership', 'composure'],
          participation: 'individual',
          modifiers: [{ label: 'Two hundred frightened people', value: -8 }],
        },
        effects: { hours: 4, crewStress: 5 },
        outcomes: {
          exceptional: {
            text: 'You lay out exactly how many berths you have and exactly what the trip is, and instead of a scramble you get a room that organises itself. Two of the people who volunteer are the ones you would have picked.',
            effects: { recruit: true, morale: 11, food: -5, personalXp: 65, crewXp: 30, flag: { key: 'moon_captain_trusted', value: true } },
          },
          success: {
            text: 'You are honest about the numbers and they take it. One fitter follows you back to the pad and does not leave.',
            effects: { recruit: true, morale: 7, food: -3, personalXp: 40 },
          },
          partial: {
            text: 'Half the room hears the offer and half hears a rejection. You leave with contacts and no commitments.',
            effects: { morale: 2, personalXp: 18, flag: { key: 'moon_camp_contacts', value: true } },
          },
          failure: {
            text: 'The supervisor cuts you off before you finish, because a captain talking about berths in that room is the last thing he needs.',
            effects: { morale: -4, crewStress: 5, personalXp: 8 },
          },
          criticalFailure: {
            text: 'The word berth goes through the crowd like a current and the notice board comes off the wall. You get out through a service corridor.',
            effects: { morale: -10, crewStress: 15, combat: 'enc_mutinous_workers', flag: { key: 'moon_camp_cold', value: true } },
          },
        },
      },
      {
        id: 'quiet-hiring',
        label: 'Work the shift bars quietly instead',
        hint: '6 hours, one conversation at a time, no crowd.',
        check: {
          skill: 'negotiation',
          secondarySkill: 'persuasion',
          attributes: ['evaluation', 'socialAwareness'],
          participation: 'individual',
        },
        effects: { hours: 6 },
        outcomes: {
          exceptional: {
            text: 'You find a rotation crew of four who work together, want to stay together, and only need two of them to be on your manifest to make it work.',
            effects: { recruit: true, morale: 8, food: -4, credits: -200, personalXp: 55 },
          },
          success: {
            text: 'One good hire, agreed over a table, terms written on a canteen napkin.',
            effects: { recruit: true, morale: 5, food: -3, credits: -150, personalXp: 35 },
          },
          partial: {
            text: 'Everyone wants terms you cannot meet and you spend six hours being talked at.',
            effects: { crewStress: 3, personalXp: 14, flag: { key: 'moon_camp_contacts', value: true } },
          },
          failure: {
            text: 'The camp has closed ranks. Nobody is leaving alone while there is any chance the transport gets reinstated.',
            effects: { morale: -3, personalXp: 8 },
          },
          criticalFailure: {
            text: 'A shift steward decides you are poaching skilled labour off a colony that cannot replace it, and makes that argument loudly in a crowded room.',
            effects: { morale: -8, crewStress: 9, flag: { key: 'moon_camp_cold', value: true } },
          },
        },
      },
      {
        id: 'carry-mail',
        label: 'Offer to carry messages home instead of people',
        hint: '3 hours collecting recordings for families who may not be there.',
        effects: { hours: 3 },
        result: {
          text: 'Ninety-one people record something for someone. You take the cores and do not make any promises about delivery, and they all thank you anyway.',
          effects: { dataCores: 2, morale: 6, crewStress: 4, flag: { key: 'moon_carrying_mail', value: true } },
        },
      },
      {
        id: 'stay-out-of-it',
        label: 'Stay off the concourse entirely',
        effects: { hours: 1 },
        result: {
          text: 'You watch the crowd from the pad gantry and go back to your loading. By evening the notice board is gone and so is the supervisor.',
          effects: { morale: -3, crewStress: 3 },
        },
      },
    ],
  },

  {
    id: 'moon-stranded-rotation-crew',
    scope: ['moon'],
    title: 'The Ones Who Missed the Last Transport',
    body: 'Eleven workers have been living in a decommissioned habitat module by the freight yard for two weeks, pooling their allocation and taking turns on the one working heater. They are not desperate yet — they are organised, and organised people negotiate. Their spokeswoman knows exactly what her group is worth to a short-handed ship.',
    weight: 11,
    tags: ['recruitment', 'stranded', 'negotiation'],
    choices: [
      {
        id: 'negotiate-terms',
        label: 'Negotiate terms with the whole group',
        hint: '4 hours. They will trade labour for passage if the numbers work.',
        check: {
          skill: 'negotiation',
          attributes: ['evaluation', 'socialAwareness'],
          participation: 'individual',
        },
        effects: { hours: 4 },
        outcomes: {
          exceptional: {
            text: 'They will not all fit and they know it. She picks the two most useful herself, hands you their records, and asks only that you take the group stores off their hands at a fair price.',
            effects: { recruit: true, food: 16, repairParts: 45, credits: -300, morale: 9, personalXp: 60 },
          },
          success: {
            text: 'Two berths agreed against work terms, with the rest of the group standing behind the deal.',
            effects: { recruit: true, food: 6, credits: -400, morale: 6, personalXp: 38 },
          },
          partial: {
            text: 'One berth, at a price that reflects how much leverage she actually had.',
            effects: { recruit: true, credits: -800, food: -3, personalXp: 16 },
          },
          failure: {
            text: 'She will not break up the group and you cannot take eleven people. That is the whole negotiation.',
            effects: { morale: -3, personalXp: 8 },
          },
          criticalFailure: {
            text: 'You suggest taking the useful ones and leaving the rest, out loud, in the module. The conversation ends there and so does your welcome at the freight yard.',
            effects: { morale: -9, crewStress: 8, flag: { key: 'moon_camp_cold', value: true } },
          },
        },
      },
      {
        id: 'fix-their-hab',
        label: 'Fix their habitat module first and talk afterwards',
        hint: '6 hours on their heater and their air plant. No conditions attached.',
        check: {
          skill: 'electricalEngineering',
          secondarySkill: 'mechanicalEngineering',
          participation: 'duo',
        },
        effects: { hours: 6, repairParts: -20 },
        outcomes: {
          exceptional: {
            text: 'You get both heaters and the backup scrubber running and leave them a spares list. Three of them are at your ramp before you have finished packing the tools.',
            effects: { recruit: true, food: 10, morale: 12, personalXp: 55, crewXp: 40, flag: { key: 'moon_captain_trusted', value: true } },
          },
          success: {
            text: 'Heat and clean air in a module that had neither. She offers you the two best people in the group without being asked.',
            effects: { recruit: true, morale: 8, food: 5, personalXp: 38, crewXp: 25 },
          },
          partial: {
            text: 'The heater runs. The air plant needs a filter cartridge that does not exist on this moon any more.',
            effects: { morale: 4, food: 3, personalXp: 16, flag: { key: 'moon_camp_contacts', value: true } },
          },
          failure: {
            text: 'Both units are beyond field repair and you have used up your parts proving it. They appreciate the attempt more than the result.',
            effects: { repairParts: -10, morale: 1, personalXp: 8 },
          },
          criticalFailure: {
            text: 'You back-feed the module ring main and take out the one thing that was working. Eleven people spend a much colder night because you tried to help.',
            effects: { repairParts: -15, morale: -10, crewStress: 10, flag: { key: 'moon_camp_cold', value: true } },
          },
        },
      },
      {
        id: 'supply-them',
        label: 'Leave them supplies and no offer',
        hint: 'Costs stores. Buys nothing you can put on a manifest.',
        requires: { minFood: 10 },
        effects: { hours: 2, food: -10, medicine: -2 },
        result: {
          text: 'They divide it eleven ways in front of you and she writes your ship name on the module wall with everyone else who has helped. There are four names.',
          effects: { morale: 5, crewXp: 20, flag: { key: 'moon_camp_contacts', value: true } },
        },
      },
      {
        id: 'no-room',
        label: 'Tell them you have no room',
        effects: { hours: 1 },
        result: {
          text: 'She does not argue, which is somehow harder than if she had. They go back inside and shut the hatch against the cold.',
          effects: { morale: -5, crewStress: 4 },
        },
      },
    ],
  },

  {
    id: 'moon-last-shuttle-manifest',
    scope: ['moon'],
    title: 'Nobody Is Getting On the Down Shuttle',
    body: 'One rotation shuttle is still running to the Homeworld and it is leaving half empty, because the people rostered onto it have read the same forecasts you have and refuse to board. The colony administrator needs bodies on that manifest to keep the freight contract alive. He is offering the empty seats, and everything attached to them, to whoever will solve his problem.',
    weight: 9,
    conditions: { once: true },
    tags: ['rotation', 'administration', 'freight'],
    choices: [
      {
        id: 'broker-deal',
        label: 'Broker a deal between the administrator and the workers',
        hint: '5 hours in the middle of two groups who both think you are on the other side.',
        check: {
          skill: 'negotiation',
          secondarySkill: 'persuasion',
          participation: 'individual',
        },
        effects: { hours: 5, crewStress: 5 },
        outcomes: {
          exceptional: {
            text: 'You get the shuttle loaded with volunteers who have family down there and want to go, and the administrator releases the whole standing freight allocation to your hull as payment.',
            effects: { credits: 1200, fuel: 18, food: 22, items: [{ itemId: 'trade_chemicals', qty: 3 }], morale: 9, personalXp: 65, flag: { key: 'moon_admin_favour', value: true } },
          },
          success: {
            text: 'Enough volunteers to satisfy the contract, on revised terms nobody loves and everybody signs.',
            effects: { credits: 800, fuel: 10, food: 12, personalXp: 42 },
          },
          partial: {
            text: 'The shuttle goes at two thirds. The administrator pays two thirds and does not pretend otherwise.',
            effects: { credits: 450, fuel: 5, food: 6, personalXp: 18 },
          },
          failure: {
            text: 'Neither side moves. The shuttle goes down half empty and the freight contract dies with it.',
            effects: { morale: -4, crewStress: 5, personalXp: 8 },
          },
          criticalFailure: {
            text: 'Both sides decide you were working for the other one. The administrator withdraws the offer and the shift stewards stop taking your calls.',
            effects: { morale: -9, crewStress: 10, flag: { key: 'moon_camp_cold', value: true } },
          },
        },
      },
      {
        id: 'buy-the-seats',
        label: 'Buy out the empty seats and the cargo allocation attached',
        hint: 'Straight purchase. The freight is the point, not the seats.',
        requires: { minCredits: 900 },
        effects: { hours: 3, credits: -900 },
        result: {
          text: 'He processes it in about four minutes and looks profoundly relieved. The allocation moves to your hull and the shuttle goes down with nine crates and no passengers.',
          effects: { food: 26, repairParts: 90, fuel: 12, items: [{ itemId: 'trade_chemicals', qty: 2 }, { itemId: 'trade_volatiles', qty: 2 }], flag: { key: 'moon_admin_favour', value: true } },
        },
      },
      {
        id: 'tell-truth',
        label: 'Tell the workers exactly what you know about the forecasts',
        hint: '2 hours. It ends the administrator problem by making it worse.',
        effects: { hours: 2 },
        result: {
          text: 'You lay out the timeline as you understand it in a canteen full of people who have only had rumours. Nobody boards that shuttle. The administrator does not speak to you again, and about forty people do.',
          effects: { morale: 5, crewStress: 6, flag: { key: 'moon_camp_contacts', value: true }, log: 'You told the moon crews what you know about the Homeworld timeline.' },
        },
      },
      {
        id: 'not-my-problem',
        label: 'Let the shuttle go half empty',
        effects: { hours: 1 },
        result: {
          text: 'It lifts at the scheduled time with four people aboard and comes back three days later with nobody. Nothing else comes back after that.',
          effects: { crewStress: 3 },
        },
      },
    ],
  },

  {
    id: 'moon-freight-dispute',
    scope: ['moon'],
    title: 'Two Claims on One Container Stack',
    body: 'A stack of forty bonded containers on the freight apron has two parties standing in front of it. The mining consortium says the ore is theirs until it is paid for. The freight cooperative says possession and standing contract. Neither has a way to enforce anything, and both would rather have a neutral hull settle it than escalate.',
    weight: 11,
    tags: ['freight', 'dispute', 'trade'],
    choices: [
      {
        id: 'arbitrate',
        label: 'Arbitrate it and take a cut of the settlement',
        hint: '5 hours reading contracts written by people who have left.',
        check: {
          skill: 'negotiation',
          secondarySkill: 'computers',
          attributes: ['reasoning', 'socialAwareness'],
          participation: 'individual',
        },
        effects: { hours: 5 },
        outcomes: {
          exceptional: {
            text: 'You find the clause that settles it and a second clause that lets both parties save face. They split the stack, pay your fee, and each throw in a container for the trouble.',
            effects: { credits: 1100, items: [{ itemId: 'trade_ore_crate', qty: 4 }, { itemId: 'trade_machine_parts', qty: 2 }], morale: 7, personalXp: 60, flag: { key: 'moon_yard_favour', value: true } },
          },
          success: {
            text: 'A defensible split that both sides sign. Your fee is paid out of the stack.',
            effects: { credits: 700, items: [{ itemId: 'trade_ore_crate', qty: 2 }], personalXp: 38 },
          },
          partial: {
            text: 'They accept your reading on half the stack and keep arguing about the other half. You get paid for half.',
            effects: { credits: 350, items: [{ itemId: 'trade_ore_crate', qty: 1 }], personalXp: 16 },
          },
          failure: {
            text: 'The contracts are contradictory, both parties are right, and no reading you can offer changes that.',
            effects: { morale: -3, personalXp: 8 },
          },
          criticalFailure: {
            text: 'Your ruling reads as bought and the losing side says so at volume. The freight yard is now a place where your ship name means something bad.',
            effects: { morale: -8, crewStress: 8, flag: { key: 'moon_yard_hostile', value: true } },
          },
        },
      },
      {
        id: 'buy-disputed',
        label: 'Buy the disputed stack from both of them at once',
        hint: 'Pay twice, own it clean, and end the argument with money.',
        requires: { minCredits: 800 },
        effects: { hours: 3, credits: -800 },
        result: {
          text: 'Both parties take a reduced payment rather than an unresolved claim, and sign releases within the hour. You have overpaid for ore and underpaid for peace.',
          effects: { items: [{ itemId: 'trade_ore_crate', qty: 6 }, { itemId: 'trade_rare_minerals', qty: 2 }], repairParts: 50, flag: { key: 'moon_yard_favour', value: true } },
        },
      },
      {
        id: 'haul-for-cut',
        label: 'Offer to haul the stack out and settle in transit',
        hint: '4 hours loading. Their problem becomes your cargo.',
        check: {
          skill: 'persuasion',
          participation: 'duo',
        },
        effects: { hours: 4 },
        outcomes: {
          exceptional: {
            text: 'Both parties agree to consign the stack to you against a share of whatever you can realise for it, which is a far better deal than either of them thought they were getting.',
            effects: { items: [{ itemId: 'trade_ore_crate', qty: 5 }, { itemId: 'trade_rare_minerals', qty: 3 }], credits: 300, personalXp: 50 },
          },
          success: {
            text: 'A consignment agreement, signed by both, and forty containers off an apron that badly needed the space.',
            effects: { items: [{ itemId: 'trade_ore_crate', qty: 4 }], repairParts: 40, personalXp: 30 },
          },
          partial: {
            text: 'One party agrees, the other insists on holding half the stack. You take what is released.',
            effects: { items: [{ itemId: 'trade_ore_crate', qty: 2 }], personalXp: 12 },
          },
          failure: {
            text: 'Neither of them will let a third hull take custody of something they are still fighting over.',
            effects: { morale: -2 },
          },
          criticalFailure: {
            text: 'The consortium reads the offer as an attempt to steal the stack outright, and their site security is on the apron within the hour.',
            effects: { morale: -7, crewStress: 10, combat: 'enc_security_patrol', flag: { key: 'moon_yard_hostile', value: true } },
          },
        },
      },
      {
        id: 'walk-apron',
        label: 'Leave them to it',
        effects: { hours: 1 },
        result: {
          text: 'You walk past the stack and the two groups standing on either side of it. They are still there when you come back through at the end of the day.',
          effects: {},
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Facilities, salvage, systems
  // -------------------------------------------------------------------------
  {
    id: 'moon-abandoned-refinery',
    scope: ['moon'],
    title: 'The Refinery Nobody Shut Down Properly',
    body: 'The eastern chemical refinery was evacuated on twelve hours notice when the last freight run failed to arrive. Its reactors were vented but its stores were not emptied, its workshops were left as they stood, and nobody has walked through the plant since. It also still has power, which means something in there is still running.',
    weight: 10,
    conditions: { once: true, minCrew: 2 },
    tags: ['salvage', 'abandoned', 'chemical'],
    choices: [
      {
        id: 'systematic-strip',
        label: 'Work the plant systematically, block by block',
        hint: '10 hours. Thorough, methodical, and you will be inside a chemical plant.',
        check: {
          skill: 'scavenging',
          secondarySkill: 'exploration',
          participation: 'group',
          modifiers: [{ label: 'Residual process chemicals, no site plan', value: -7 }],
        },
        effects: { hours: 10, crewStress: 7 },
        outcomes: {
          exceptional: {
            text: 'The bonded chemical store is intact and the maintenance workshop was locked with everything still in it. Four cart loads and you leave things behind because you run out of hull.',
            effects: { repairParts: 220, items: [{ itemId: 'trade_chemicals', qty: 5 }, { itemId: 'welding_rig', qty: 1, condition: 84 }, { itemId: 'plasma_cutter', qty: 1, condition: 78 }, { itemId: 'coolant_flask', qty: 4 }], credits: 500, crewXp: 90 },
          },
          success: {
            text: 'Workshops, stores, and a lot of good pipe. Three loads back to the ship.',
            effects: { repairParts: 150, items: [{ itemId: 'trade_chemicals', qty: 3 }, { itemId: 'multitool', qty: 1, condition: 76 }], credits: 220, crewXp: 60 },
          },
          partial: {
            text: 'Two blocks are still under residual pressure and you leave them alone. What you can reach is worth having.',
            effects: { repairParts: 70, items: [{ itemId: 'trade_chemicals', qty: 1 }], crewXp: 32 },
          },
          failure: {
            text: 'The plant was stripped in the first week by people who worked here and knew where everything was. You are a fortnight late.',
            effects: { repairParts: 20, morale: -4, crewXp: 12 },
          },
          criticalFailure: {
            text: 'The reason the plant still has power is a crew who have been living in the admin block and consider it theirs. They are not interested in a conversation.',
            effects: { repairParts: 10, morale: -8, crewStress: 14, combat: 'enc_scavenger_gang' },
          },
        },
      },
      {
        id: 'find-the-power',
        label: 'Trace the live circuit first and find out what is running',
        hint: '4 hours. Know what you are walking into.',
        check: {
          skill: 'electricalEngineering',
          secondarySkill: 'computers',
          participation: 'individual',
        },
        effects: { hours: 4 },
        outcomes: {
          exceptional: {
            text: 'The live circuit runs to a still-charged bank and an intact site control room, and the control room has the plant inventory on a terminal that has not been touched.',
            effects: { repairParts: 60, items: [{ itemId: 'power_cell', qty: 4, condition: 86 }, { itemId: 'portable_terminal', qty: 1, condition: 82 }], dataCores: 1, personalXp: 60, flag: { key: 'moon_refinery_mapped', value: true } },
          },
          success: {
            text: 'The load is a bank of circulation pumps on a timer nobody cancelled. Harmless, and the bank behind it is worth taking.',
            effects: { repairParts: 40, items: [{ itemId: 'power_cell', qty: 2, condition: 78 }], personalXp: 35, flag: { key: 'moon_refinery_mapped', value: true } },
          },
          partial: {
            text: 'You trace it as far as a distribution board and lose it in undocumented cabling. Something in block three is drawing and you cannot say what.',
            effects: { repairParts: 15, personalXp: 15 },
          },
          failure: {
            text: 'The site distribution is a forty-year accretion with no drawings. Four hours and you know nothing you did not know.',
            effects: { morale: -3, personalXp: 6 },
          },
          criticalFailure: {
            text: 'You open a panel that is still live at plant voltage. The bang brings people running from the admin block, and they are not staff.',
            effects: { morale: -7, crewStress: 12, wound: { severityScore: 44, damageType: 'burn' }, combat: 'enc_scavenger_pair' },
          },
        },
      },
      {
        id: 'chemical-store-only',
        label: 'Hit the bonded chemical store and nothing else',
        hint: '4 hours. Focused, fast, out before dark.',
        check: {
          skill: 'lockpicking',
          secondarySkill: 'stealth',
          participation: 'duo',
        },
        effects: { hours: 4, crewStress: 4 },
        outcomes: {
          exceptional: {
            text: 'Bonded store, bonded lock, twelve minutes. Everything on the shelves is labelled, sealed, and worth more off this moon than anything else in the plant.',
            effects: { items: [{ itemId: 'trade_chemicals', qty: 6 }, { itemId: 'coolant_flask', qty: 3 }], credits: 300, personalXp: 55 },
          },
          success: {
            text: 'The store opens and you take what you can carry in one trip.',
            effects: { items: [{ itemId: 'trade_chemicals', qty: 4 }], repairParts: 25, personalXp: 32 },
          },
          partial: {
            text: 'The outer store opens, the inner cage does not. You take the bulk stock and leave the good stuff behind a grille.',
            effects: { items: [{ itemId: 'trade_chemicals', qty: 2 }], personalXp: 14 },
          },
          failure: {
            text: 'The bonded lock is a proper one and you do not beat it with a field set in the dark.',
            effects: { morale: -3, personalXp: 6 },
          },
          criticalFailure: {
            text: 'Forcing the cage cracks a decanted vessel behind it. The store fills with something that makes your rebreathers alarm and you leave with nothing.',
            effects: { morale: -7, crewStress: 11, wound: { severityScore: 38, damageType: 'burn' }, medicine: -3 },
          },
        },
      },
      {
        id: 'leave-refinery',
        label: 'Leave the plant alone',
        effects: { hours: 1 },
        result: {
          text: 'You look at a chemical plant with the lights on and nobody in it, and decide there is easier salvage on this moon.',
          effects: {},
        },
      },
    ],
  },

  {
    id: 'moon-lifesupport-cascade',
    scope: ['moon'],
    title: 'Habitat Ring Three Is Losing Air Quality',
    body: 'A scrubber cascade in the main habitat ring is failing progressively and the colony has no filter stock left because filter stock came up on the freight runs. Four hundred people live in that ring. The maintenance chief has a schematic, two apprentices, and a growing carbon dioxide reading he keeps checking and not mentioning.',
    weight: 12,
    tags: ['life-support', 'colony', 'engineering'],
    choices: [
      {
        id: 'rebuild-cascade',
        label: 'Rebuild the cascade with your crew and your spares',
        hint: '9 hours, all hands, and it will cost you filters you were saving.',
        requires: { minRepairParts: 30 },
        check: {
          skill: 'electricalEngineering',
          secondarySkill: 'mechanicalEngineering',
          participation: 'group',
        },
        effects: { hours: 9, repairParts: -30, crewStress: 7 },
        outcomes: {
          exceptional: {
            text: 'The cascade comes back at full rate and you leave the chief a bypass arrangement that will keep working when the next stage fails. The colony pays in the only currency it has left, which turns out to be a great deal of it.',
            effects: { credits: 1300, food: 24, fuel: 12, morale: 12, crewXp: 95, flag: { key: 'moon_colony_favour', value: true } },
          },
          success: {
            text: 'Air quality back inside limits by the end of the shift. The chief shakes every hand in your crew twice.',
            effects: { credits: 850, food: 14, fuel: 6, morale: 8, crewXp: 65 },
          },
          partial: {
            text: 'Two of three stages recovered. The ring is habitable and the margin is thin enough that nobody is relaxed about it.',
            effects: { credits: 420, food: 8, morale: 3, crewXp: 35 },
          },
          failure: {
            text: 'The failure is in the ducting, not the plant, and there is not enough duct in the colony to fix it. You have spent your filters on a diagnosis.',
            effects: { credits: 150, morale: -5, crewStress: 7, crewXp: 12 },
          },
          criticalFailure: {
            text: 'A rebuild sequence error dumps the cascade completely. Ring three is evacuated to the north camp overnight, and everyone knows which crew was in the plant room.',
            effects: { credits: 0, morale: -12, crewStress: 16, flag: { key: 'moon_colony_hostile', value: true } },
          },
        },
      },
      {
        id: 'sell-filters',
        label: 'Sell them your life support filters and leave',
        hint: 'They need stock, not hands. You need to not be here.',
        requires: { minRepairParts: 20 },
        effects: { hours: 2, repairParts: -20 },
        result: {
          text: 'The chief buys everything you will part with at a price that makes you uncomfortable and starts installing before you are out of the plant room.',
          effects: { credits: 900, food: 10, morale: 2 },
        },
      },
      {
        id: 'improvise-scrubber',
        label: 'Improvise scrubbers from greenhouse stock and chemical feed',
        hint: '7 hours of chemistry, plumbing, and educated guessing.',
        check: {
          skill: 'medicalResearch',
          secondarySkill: 'mechanicalEngineering',
          attributes: ['reasoning', 'learning'],
          participation: 'trio',
        },
        effects: { hours: 7, crewStress: 6 },
        outcomes: {
          exceptional: {
            text: 'A hydroxide bed fed from the chemical plant stock, plumbed into the ring return. It is ugly, it is enormous, and it works better than the cascade did.',
            effects: { credits: 1000, food: 20, items: [{ itemId: 'life_support_filter', qty: 3 }], morale: 11, personalXp: 65, crewXp: 55 },
          },
          success: {
            text: 'A working improvised bed that holds carbon dioxide inside limits. The chief writes down every step you took.',
            effects: { credits: 640, food: 12, morale: 7, personalXp: 42, crewXp: 35 },
          },
          partial: {
            text: 'It works at about half the required rate. Ring three goes on reduced occupancy and nobody dies of it.',
            effects: { credits: 300, food: 6, morale: 2, personalXp: 18, crewXp: 18 },
          },
          failure: {
            text: 'You cannot get the reaction rate anywhere near what four hundred people exhale. Seven hours and a very good understanding of why the original plant is the size it is.',
            effects: { morale: -4, crewStress: 6, personalXp: 8 },
          },
          criticalFailure: {
            text: 'The improvised bed runs away and puts caustic aerosol into the ring return. Two apprentices go to the colony bay and the ring is worse than when you arrived.',
            effects: { morale: -11, crewStress: 15, medicine: -5, wound: { severityScore: 46, damageType: 'burn' }, flag: { key: 'moon_colony_hostile', value: true } },
          },
        },
      },
      {
        id: 'not-our-ring',
        label: 'Your own life support needs the parts more',
        effects: { hours: 1 },
        result: {
          text: 'You tell the chief what you can spare, which is nothing, and he nods like a man who has been told that four times today.',
          effects: { morale: -5, crewStress: 3 },
        },
      },
    ],
  },

  {
    id: 'moon-hopper-salvage',
    scope: ['moon'],
    title: 'Three Hoppers on the Cold Pad',
    body: 'The colony surface fleet is parked and unpowered on the overflow pad because there is nobody left qualified to certify them and no fuel allocation to fly them. Two are stripped already. The third has been sitting under a cover, and the pad supervisor will look the other way for a share of whatever comes out of it.',
    weight: 11,
    tags: ['salvage', 'vehicles', 'shipwork'],
    choices: [
      {
        id: 'pull-drive',
        label: 'Pull the drive and power section',
        hint: '8 hours of heavy work in vacuum-rated coveralls.',
        check: {
          skill: 'mechanicalEngineering',
          secondarySkill: 'electricalEngineering',
          participation: 'trio',
        },
        effects: { hours: 8, crewStress: 6 },
        outcomes: {
          exceptional: {
            text: 'The drive comes out complete with its controller, and the power section under the cover has never been run past its first service interval.',
            effects: { repairParts: 190, items: [{ itemId: 'engine_coupling', qty: 2, condition: 88 }, { itemId: 'power_cell', qty: 3, condition: 84 }, { itemId: 'fuel_canister', qty: 3 }], credits: -150, crewXp: 85 },
          },
          success: {
            text: 'Drive out, power section out, cabling recovered. Three trips and a very satisfying pile.',
            effects: { repairParts: 130, items: [{ itemId: 'engine_coupling', qty: 1, condition: 80 }, { itemId: 'power_cell', qty: 2, condition: 76 }], credits: -100, crewXp: 55 },
          },
          partial: {
            text: 'The drive is seized into its mounts and only comes out in pieces. The power section is fine.',
            effects: { repairParts: 70, items: [{ itemId: 'power_cell', qty: 1, condition: 72 }], crewXp: 30 },
          },
          failure: {
            text: 'The cover was hiding fire damage. Somebody had a very bad day in this hopper and nobody wrote it up.',
            effects: { repairParts: 20, morale: -4, crewXp: 12 },
          },
          criticalFailure: {
            text: 'A residual charge in the power section lets go through a crew member and the pad supervisor decides he was never here.',
            effects: { repairParts: 25, credits: -200, morale: -8, crewStress: 13, wound: { severityScore: 52, damageType: 'burn' }, medicine: -4 },
          },
        },
      },
      {
        id: 'make-it-fly',
        label: 'Get the hopper flying and sell it whole',
        hint: '13 hours. Worth far more airborne than in pieces.',
        requires: { minRepairParts: 40, minFuel: 5 },
        check: {
          skill: 'piloting',
          secondarySkill: 'mechanicalEngineering',
          participation: 'duo',
          criticalRisk: true,
        },
        effects: { hours: 13, repairParts: -40, fuel: -5, crewStress: 8 },
        outcomes: {
          exceptional: {
            text: 'It flies, it certifies, and the ice harvest operation buys it before you have finished the acceptance circuit. They needed it more than they could say.',
            effects: { credits: 2200, items: [{ itemId: 'trade_ice_block', qty: 3 }], morale: 9, personalXp: 65, crewXp: 45 },
          },
          success: {
            text: 'Airborne, sound, and sold to the colony administration for a price they can barely justify.',
            effects: { credits: 1500, morale: 6, personalXp: 42, crewXp: 30 },
          },
          partial: {
            text: 'It flies badly enough that you will not sell it to somebody who has to trust it. You break it back down.',
            effects: { credits: 300, repairParts: 60, crewStress: 6, personalXp: 18 },
          },
          failure: {
            text: 'The attitude control will not hold and you cannot find why in thirteen hours. Everything you put into it stays in it.',
            effects: { credits: 0, morale: -6, crewStress: 8, personalXp: 8 },
          },
          criticalFailure: {
            text: 'It lifts, yaws hard on the second pad hop, and comes down on the corner of the pad shelter. Nobody was under it. Nobody will be flying it either.',
            effects: { credits: -400, morale: -10, crewStress: 16, wound: { severityScore: 58, damageType: 'blunt' }, flag: { key: 'moon_pad_hostile', value: true } },
          },
        },
      },
      {
        id: 'strip-avionics',
        label: 'Take only the avionics and go',
        hint: '3 hours, light load, high value per kilo.',
        check: {
          skill: 'computers',
          secondarySkill: 'electricalEngineering',
          participation: 'individual',
        },
        effects: { hours: 3 },
        outcomes: {
          exceptional: {
            text: 'The nav stack is a survey-grade unit somebody fitted out of contract, and it comes out with its almanac intact.',
            effects: { items: [{ itemId: 'sensor_module', qty: 2, condition: 86 }, { itemId: 'antique_navcomp', qty: 1, condition: 72 }], dataCores: 1, credits: -80, personalXp: 55 },
          },
          success: {
            text: 'Sensor heads, nav stack, and the comms module, all out in three hours.',
            effects: { items: [{ itemId: 'sensor_module', qty: 1, condition: 78 }, { itemId: 'emergency_beacon', qty: 1 }], credits: -80, personalXp: 35 },
          },
          partial: {
            text: 'The nav stack is bonded into the airframe and you get the sensor heads only.',
            effects: { items: [{ itemId: 'sensor_module', qty: 1, condition: 62 }], personalXp: 14 },
          },
          failure: {
            text: 'The bay was cleared out on the last certification and nobody put anything back.',
            effects: { morale: -3, personalXp: 6 },
          },
          criticalFailure: {
            text: 'You pull a module that is still tied to the pad monitoring net, and the alarm brings the supervisor and his opinion about your share.',
            effects: { credits: -300, morale: -6, crewStress: 8, flag: { key: 'moon_pad_hostile', value: true } },
          },
        },
      },
      {
        id: 'leave-hoppers',
        label: 'Leave the fleet alone',
        effects: { hours: 1 },
        result: {
          text: 'You walk the row of covered hoppers once. Somebody will strip them. It does not have to be today and it does not have to be you.',
          effects: {},
        },
      },
    ],
  },

  {
    id: 'moon-rogue-loader-drone',
    scope: ['moon'],
    title: 'Something Is Still Working in Bay Six',
    body: 'A cargo loader in the freight terminal has been running its last assigned task for eleven days without a supervisor, a manifest, or a reason. It has stacked and restacked the same containers forty times and it has started treating anything in its work envelope as cargo. Two people have already been injured getting too close.',
    weight: 10,
    tags: ['drone', 'freight', 'hazard'],
    choices: [
      {
        id: 'talk-to-controller',
        label: 'Get into the bay controller and stand it down',
        hint: '3 hours at a terminal instead of in the envelope.',
        check: {
          skill: 'computers',
          secondarySkill: 'electricalEngineering',
          participation: 'individual',
        },
        effects: { hours: 3 },
        outcomes: {
          exceptional: {
            text: 'You not only park it, you find seven other units in the same fault state across the terminal and clear all of them. The yard manager pays you for the lot.',
            effects: { credits: 900, repairParts: 55, items: [{ itemId: 'portable_terminal', qty: 1, condition: 80 }], morale: 6, personalXp: 60, flag: { key: 'moon_yard_favour', value: true } },
          },
          success: {
            text: 'Task cancelled, unit docked, bay six usable again.',
            effects: { credits: 480, repairParts: 25, personalXp: 38 },
          },
          partial: {
            text: 'It docks but will not accept a new task queue, so bay six works at half capacity. Better than a machine that treats people as freight.',
            effects: { credits: 240, repairParts: 10, personalXp: 16 },
          },
          failure: {
            text: 'The controller wants a supervisory credential that left on the last rotation. Three hours at a terminal that will not talk to you.',
            effects: { morale: -3, personalXp: 8 },
          },
          criticalFailure: {
            text: 'Your override pushes it out of its loop and into a general clearance behaviour, which is far worse. It comes out of the bay.',
            effects: { morale: -7, crewStress: 12, combat: 'enc_rogue_drone' },
          },
        },
      },
      {
        id: 'cut-power',
        label: 'Go in and cut its power coupling at contact range',
        hint: '2 hours. Direct, physical, and it is bigger than you.',
        check: {
          skill: 'meleeWeapons',
          secondarySkill: 'mechanicalEngineering',
          attributes: ['agility', 'decisionMaking'],
          participation: 'duo',
          criticalRisk: true,
        },
        effects: { hours: 2, crewStress: 8 },
        outcomes: {
          exceptional: {
            text: 'You time the arm cycle, get inside the envelope, and pull the coupling in one movement. It stops mid-lift and stays stopped.',
            effects: { credits: 600, repairParts: 45, items: [{ itemId: 'crowbar', qty: 1, condition: 78 }], morale: 5, personalXp: 55 },
          },
          success: {
            text: 'Two attempts and it is down. Somebody is going to be bruised tomorrow and everyone can use bay six again.',
            effects: { credits: 400, repairParts: 25, personalXp: 35 },
          },
          partial: {
            text: 'You get the coupling but take a container edge across the ribs on the way out.',
            effects: { credits: 300, repairParts: 15, wound: { severityScore: 32, damageType: 'blunt' }, personalXp: 15 },
          },
          failure: {
            text: 'The arm cycle is not as predictable as it looked from outside the line and you back off before it becomes a decision it makes for you.',
            effects: { morale: -3, crewStress: 6, personalXp: 8 },
          },
          criticalFailure: {
            text: 'It classifies your party as material to be relocated and acts on that classification.',
            effects: { morale: -8, crewStress: 15, combat: 'enc_rogue_drone', wound: { severityScore: 50, damageType: 'blunt' } },
          },
        },
      },
      {
        id: 'shoot-it',
        label: 'Put a beam through its power section from the gantry',
        hint: '1 hour. Loud, decisive, and expensive if you are wrong about what is behind it.',
        check: {
          skill: 'energyWeapons',
          participation: 'individual',
          criticalRisk: true,
        },
        effects: { hours: 1, crewStress: 5 },
        outcomes: {
          exceptional: {
            text: 'One shot through the power section from forty metres up. It sets its load down as it dies, which is more courtesy than it showed anyone this week.',
            effects: { credits: 500, repairParts: 40, morale: 4, personalXp: 50 },
          },
          success: {
            text: 'Three shots and it is a very large paperweight. The yard manager is happier than the accountant will be.',
            effects: { credits: 350, repairParts: 30, personalXp: 30 },
          },
          partial: {
            text: 'You disable the drive and leave the arm live. Somebody will have to finish it with a torch.',
            effects: { credits: 180, repairParts: 15, personalXp: 12 },
          },
          failure: {
            text: 'The power section is behind structural shielding and your shots do nothing but annoy a machine that cannot be annoyed.',
            effects: { morale: -4, crewStress: 6, personalXp: 6 },
          },
          criticalFailure: {
            text: 'A pass-through takes out a pressurised gas line behind the unit. The bay seals, the fire suppression dumps, and the loader is still running inside it.',
            effects: { credits: -500, morale: -9, crewStress: 14, wound: { severityScore: 42, damageType: 'burn' }, flag: { key: 'moon_yard_hostile', value: true } },
          },
        },
      },
      {
        id: 'avoid-bay-six',
        label: 'Use a different bay',
        effects: { hours: 2 },
        result: {
          text: 'You load out of bay nine, which is further from the pad and has a broken door. Bay six keeps stacking the same containers behind you.',
          effects: { crewStress: 2 },
        },
      },
    ],
  },

  {
    id: 'moon-sealed-core-archive',
    scope: ['moon'],
    title: 'The Survey Vault',
    body: 'Colony administration kept sixty years of geological survey, assay, and orbital mapping in a hardened vault under the admin block. The administrator is gone, the vault is sealed on a timer nobody can override locally, and the caretaker who is left says the whole thing will be worth a fortune to anyone still looking for resources anywhere in this system.',
    weight: 8,
    conditions: { once: true },
    tags: ['data', 'vault', 'archive'],
    choices: [
      {
        id: 'crack-timer',
        label: 'Work the timer lock from the vault controller',
        hint: '6 hours. It is a good system and it was designed by careful people.',
        check: {
          skill: 'computers',
          secondarySkill: 'lockpicking',
          participation: 'individual',
        },
        effects: { hours: 6 },
        outcomes: {
          exceptional: {
            text: 'You do not break the timer, you re-derive the maintenance schedule it is running and let it open itself. The vault holds everything the caretaker promised and an orbital survey of the outer system nobody has looked at in decades.',
            effects: { dataCores: 6, credits: 400, morale: 7, personalXp: 70, flag: { key: 'moon_survey_vault', value: true } },
          },
          success: {
            text: 'The lock opens on the fourth attempt and the archive is intact.',
            effects: { dataCores: 4, personalXp: 45, flag: { key: 'moon_survey_vault', value: true } },
          },
          partial: {
            text: 'You get the outer door and the inner cage stays shut. The overflow racks outside it are still worth carrying.',
            effects: { dataCores: 2, personalXp: 20 },
          },
          failure: {
            text: 'Six hours and the timer is exactly where it was. Whoever specified this system did their job.',
            effects: { morale: -3, personalXp: 8 },
          },
          criticalFailure: {
            text: 'A failed attempt puts the vault into lockout and wakes the admin block security units, which have not had anything to do in a fortnight.',
            effects: { morale: -8, crewStress: 12, combat: 'enc_maintenance_drones' },
          },
        },
      },
      {
        id: 'cut-in',
        label: 'Cut through the vault wall instead of the lock',
        hint: '9 hours with a torch. Crude, loud, and it will work eventually.',
        check: {
          skill: 'explosives',
          secondarySkill: 'mechanicalEngineering',
          participation: 'duo',
          criticalRisk: true,
        },
        effects: { hours: 9, crewStress: 8, repairParts: -15 },
        outcomes: {
          exceptional: {
            text: 'A shaped cut through the weakest structural panel opens the vault without touching a single rack.',
            effects: { dataCores: 5, credits: 250, personalXp: 60 },
          },
          success: {
            text: 'You open a hole large enough to pass the racks through, and the racks come through.',
            effects: { dataCores: 3, personalXp: 40 },
          },
          partial: {
            text: 'The cut takes most of the day and reaches the vault at the wrong angle. You get about a third of the archive out.',
            effects: { dataCores: 1, crewStress: 6, personalXp: 18 },
          },
          failure: {
            text: 'The vault liner is a composite you have no way to cut through with anything on this moon.',
            effects: { repairParts: -10, morale: -4, personalXp: 8 },
          },
          criticalFailure: {
            text: 'The cut goes through into the rack room and takes half the archive with it. Sixty years of survey data, gone, in about a second.',
            effects: { dataCores: 0, morale: -12, crewStress: 14, wound: { severityScore: 40, damageType: 'burn' } },
          },
        },
      },
      {
        id: 'ask-caretaker',
        label: 'Get the caretaker to authorise it properly',
        hint: '4 hours. He has no authority and he might have a way anyway.',
        check: {
          skill: 'persuasion',
          attributes: ['charisma', 'socialAwareness'],
          participation: 'individual',
        },
        effects: { hours: 4 },
        outcomes: {
          exceptional: {
            text: 'He has the emergency schedule in a notebook in his quarters, because of course he does, and he opens it himself on the condition that a copy goes somewhere it will survive.',
            effects: { dataCores: 5, morale: 8, personalXp: 55, flag: { key: 'moon_survey_vault', value: true } },
          },
          success: {
            text: 'He signs an emergency preservation release and works the timer down with you. It takes two hours and no crime.',
            effects: { dataCores: 3, morale: 5, personalXp: 35, flag: { key: 'moon_survey_vault', value: true } },
          },
          partial: {
            text: 'He will release the duplicate racks and not the primary archive. He is drawing a line somewhere and that is where.',
            effects: { dataCores: 2, personalXp: 15 },
          },
          failure: {
            text: 'He has spent his whole career keeping this vault shut and he is not going to stop over a conversation.',
            effects: { morale: -2, personalXp: 8 },
          },
          criticalFailure: {
            text: 'He decides you are here to loot it and puts the admin block on a security posture it has not held in years.',
            effects: { morale: -7, crewStress: 8, flag: { key: 'moon_admin_hostile', value: true } },
          },
        },
      },
      {
        id: 'leave-vault',
        label: 'Leave the vault sealed',
        effects: { hours: 1 },
        result: {
          text: 'You look at a door that will open on its own in eleven months and decide sixty years of assay data is not your problem. The caretaker goes back to his rounds.',
          effects: {},
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Hoarding, morale, administration
  // -------------------------------------------------------------------------
  {
    id: 'moon-hoarded-stores',
    scope: ['moon'],
    title: 'Somebody Has Been Counting Differently',
    body: 'The colony commissary is issuing at two thirds of the posted ration and the numbers do not close. A storeman has been diverting stock into a sealed bay off the old freight spur for a month, and half the camp knows it, and nobody has done anything because doing something means deciding what happens next. He has a rifle and a bay full of food.',
    weight: 11,
    tags: ['hoarding', 'stores', 'confrontation'],
    choices: [
      {
        id: 'talk-him-out',
        label: 'Talk him into opening the bay',
        hint: '3 hours. He is frightened, not evil, and he knows the arithmetic.',
        check: {
          skill: 'persuasion',
          attributes: ['composure', 'socialAwareness'],
          participation: 'individual',
          criticalRisk: true,
        },
        effects: { hours: 3, crewStress: 6 },
        outcomes: {
          exceptional: {
            text: 'You get him to open it and to be the one who announces it, which lets him walk out of this as something other than the man who stole the food. The commissary gives your ship a share.',
            effects: { food: 26, credits: 300, morale: 11, personalXp: 60, flag: { key: 'moon_colony_favour', value: true } },
          },
          success: {
            text: 'He opens the bay. The camp gets its ration back and you get a portion for making it happen without anyone getting shot.',
            effects: { food: 16, morale: 7, personalXp: 40 },
          },
          partial: {
            text: 'He releases half and keeps a personal reserve. Nobody is happy and nobody escalates.',
            effects: { food: 8, morale: 2, personalXp: 16 },
          },
          failure: {
            text: 'He will not open the door for a stranger off a ship, and he is not wrong to be suspicious of one.',
            effects: { morale: -4, crewStress: 5, personalXp: 8 },
          },
          criticalFailure: {
            text: 'You corner him verbally in front of a small crowd and he stops being a frightened storeman and starts being a man with a rifle and no way out.',
            effects: { morale: -9, crewStress: 15, combat: 'enc_lone_gunman' },
          },
        },
      },
      {
        id: 'open-quietly',
        label: 'Open the bay yourself, at night, and take a share',
        hint: '4 hours. The camp gets fed either way. You just get paid first.',
        check: {
          skill: 'lockpicking',
          secondarySkill: 'stealth',
          participation: 'duo',
          criticalRisk: true,
        },
        effects: { hours: 4, crewStress: 7 },
        outcomes: {
          exceptional: {
            text: 'In, loaded, and out with the bay left open and the storeman none the wiser until the morning shift finds it. The camp finds the food and never finds you.',
            effects: { food: 30, items: [{ itemId: 'preserved_meal', qty: 6 }, { itemId: 'protein_culture', qty: 4 }], medicine: 4, personalXp: 60 },
          },
          success: {
            text: 'A good haul, quietly taken, and the rest left where the commissary will find it.',
            effects: { food: 20, items: [{ itemId: 'ration_pack', qty: 5 }], personalXp: 38 },
          },
          partial: {
            text: 'You get the outer bay only. The good stock is behind a second door you do not have time for.',
            effects: { food: 9, personalXp: 15 },
          },
          failure: {
            text: 'The bay door is a freight lock with a mechanical interlock and you are not opening it in the dark with hand tools.',
            effects: { morale: -3, crewStress: 5, personalXp: 6 },
          },
          criticalFailure: {
            text: 'He sleeps in the bay office. He wakes up, and he does not spend any time asking who you are.',
            effects: { morale: -8, crewStress: 16, combat: 'enc_lone_gunman', wound: { severityScore: 54, damageType: 'pierce' } },
          },
        },
      },
      {
        id: 'tell-commissary',
        label: 'Take the evidence to the commissary board',
        hint: '5 hours of finding the paper trail and handing it over.',
        check: {
          skill: 'computers',
          attributes: ['reasoning', 'evaluation'],
          participation: 'individual',
        },
        effects: { hours: 5 },
        outcomes: {
          exceptional: {
            text: 'The diversion record is all in the issue logs if you know how to read them, and it turns out he was not the only one. The board recovers three bays and pays you a finder share.',
            effects: { food: 22, credits: 500, morale: 8, personalXp: 55, flag: { key: 'moon_colony_favour', value: true } },
          },
          success: {
            text: 'A clean trail, handed over, acted on that afternoon. The ration goes back to full.',
            effects: { food: 12, credits: 250, morale: 5, personalXp: 35 },
          },
          partial: {
            text: 'You prove stock is missing and not where it went. The board opens an inquiry that will outlast the colony.',
            effects: { credits: 100, personalXp: 15 },
          },
          failure: {
            text: 'The issue logs stopped being maintained three weeks ago and there is nothing in them to find.',
            effects: { morale: -3, personalXp: 8 },
          },
          criticalFailure: {
            text: 'You name the wrong person off a bad reading and the camp acts on it before the board does. The man they go after did not do it.',
            effects: { morale: -11, crewStress: 12, flag: { key: 'moon_camp_cold', value: true } },
          },
        },
      },
      {
        id: 'buy-from-him',
        label: 'Just buy food from him and say nothing',
        hint: 'Solves your problem. Does nothing about anyone else.',
        requires: { minCredits: 600 },
        effects: { hours: 2, credits: -600 },
        result: {
          text: 'He sells you a cart load at four times value and thanks you for not making it complicated. The commissary queue is still at two thirds when you walk past it.',
          effects: { food: 24, items: [{ itemId: 'preserved_meal', qty: 4 }], morale: -5 },
        },
      },
    ],
  },

  {
    id: 'moon-canteen-unrest',
    scope: ['moon'],
    title: 'It Starts Over a Ration Card',
    body: 'A shift argument in the main canteen turns into forty people standing up at once. It is not really about the ration card — it is about eleven days of no rotation, no news, and no answers. The two shift stewards have lost the room and the colony has nothing that could reasonably be called security.',
    weight: 11,
    conditions: { minDanger: 15 },
    tags: ['unrest', 'morale', 'colony'],
    choices: [
      {
        id: 'take-the-room',
        label: 'Get up on a table and take the room',
        hint: 'You are an outsider with a ship. That cuts both ways.',
        check: {
          skill: 'persuasion',
          attributes: ['leadership', 'composure'],
          participation: 'individual',
          criticalRisk: true,
        },
        effects: { hours: 2, crewStress: 6 },
        outcomes: {
          exceptional: {
            text: 'You give them the one thing nobody has: an honest account of what you have seen, with no reassurance attached. The room sits back down and starts organising itself into something useful.',
            effects: { morale: 11, credits: 300, food: 8, personalXp: 65, flag: { key: 'moon_captain_trusted', value: true } },
          },
          success: {
            text: 'You get their attention and hold it long enough for the stewards to get it back. Nothing breaks.',
            effects: { morale: 7, personalXp: 40 },
          },
          partial: {
            text: 'Half the room listens and half of it walks out to do whatever it was going to do anyway.',
            effects: { morale: 2, crewStress: 5, personalXp: 16 },
          },
          failure: {
            text: 'A captain telling a canteen full of stranded workers to stay calm is exactly the wrong messenger. They tell you so.',
            effects: { morale: -5, crewStress: 8, personalXp: 8 },
          },
          criticalFailure: {
            text: 'Somebody at the back asks how many berths your ship has, and the whole room turns to look at you at the same time.',
            effects: { morale: -10, crewStress: 16, combat: 'enc_mutinous_workers', flag: { key: 'moon_camp_cold', value: true } },
          },
        },
      },
      {
        id: 'separate-them',
        label: 'Wade in and separate the two at the centre of it',
        hint: 'Physical, immediate, and there are forty of them.',
        check: {
          skill: 'closeQuarters',
          secondarySkill: 'brawling',
          participation: 'duo',
          criticalRisk: true,
        },
        effects: { hours: 1, crewStress: 8 },
        outcomes: {
          exceptional: {
            text: 'Two people, separated, sat down, without a punch landing on anyone. The room loses its focal point and its nerve at the same time.',
            effects: { morale: 8, credits: 200, personalXp: 55 },
          },
          success: {
            text: 'You get between them and the moment passes. Somebody buys your crew a drink about it later.',
            effects: { morale: 5, personalXp: 35 },
          },
          partial: {
            text: 'You break it up and take a chair across the back doing it.',
            effects: { morale: 2, wound: { severityScore: 26, damageType: 'blunt' }, personalXp: 15 },
          },
          failure: {
            text: 'You get shoved back out of it by people who did not ask for a stranger in the middle of their argument.',
            effects: { morale: -4, crewStress: 7, personalXp: 8 },
          },
          criticalFailure: {
            text: 'Putting hands on a shift worker in a canteen full of shift workers goes exactly as well as it sounds.',
            effects: { morale: -9, crewStress: 15, combat: 'enc_mutinous_workers' },
          },
        },
      },
      {
        id: 'feed-them',
        label: 'Open your own stores and feed the canteen',
        hint: '4 hours and real food. Arguments are shorter on a full stomach.',
        requires: { minFood: 12 },
        check: {
          skill: 'cooking',
          participation: 'trio',
        },
        effects: { hours: 4, food: -12 },
        outcomes: {
          exceptional: {
            text: 'Your crew serve two hundred people a proper meal and the room forgets what it was angry about. Three separate people ask what your ship needs.',
            effects: { morale: 12, repairParts: 40, credits: 250, crewXp: 55, flag: { key: 'moon_captain_trusted', value: true } },
          },
          success: {
            text: 'Everyone eats and the canteen empties peacefully by the end of the shift.',
            effects: { morale: 8, repairParts: 20, crewXp: 35 },
          },
          partial: {
            text: 'You feed about half of them and the other half notice.',
            effects: { morale: 3, crewStress: 4, crewXp: 15 },
          },
          failure: {
            text: 'Handing out food into a room that is already arguing about ration fairness makes the argument about you.',
            effects: { morale: -5, crewStress: 8 },
          },
          criticalFailure: {
            text: 'The distribution turns into a scramble and then into the thing it was always going to turn into.',
            effects: { food: -4, morale: -9, crewStress: 15, combat: 'enc_mutinous_workers' },
          },
        },
      },
      {
        id: 'leave-canteen',
        label: 'Get your crew out of the canteen',
        hint: 'Sensible. Also visible.',
        effects: { hours: 1 },
        result: {
          text: 'You walk your people out through the service door while it is still an argument. Behind you it stops being an argument about twenty minutes later.',
          effects: { morale: -4, crewStress: 5 },
        },
      },
    ],
  },

  {
    id: 'moon-admin-lockdown',
    scope: ['moon'],
    title: 'Administration Has Stopped Answering',
    body: 'The colony administration block has been sealed from the inside for four days. There is still power, still atmosphere, and still somebody moving past the windows on the upper floor. Outside it are three hundred people who want ration authorisations, transport allocations, and someone to tell them what is happening.',
    weight: 9,
    conditions: { once: true },
    tags: ['administration', 'lockdown', 'colony'],
    choices: [
      {
        id: 'talk-through-door',
        label: 'Get whoever is inside to talk to you',
        hint: '3 hours at an intercom talking to a man who has stopped answering anyone.',
        check: {
          skill: 'persuasion',
          attributes: ['composure', 'socialAwareness'],
          participation: 'individual',
        },
        effects: { hours: 3, crewStress: 4 },
        outcomes: {
          exceptional: {
            text: 'It is the deputy administrator, alone, holding a building because he thinks that is what is left of his job. You get him out, and he brings the ration authority codes with him.',
            effects: { food: 20, credits: 500, morale: 11, personalXp: 65, flag: { key: 'moon_admin_favour', value: true } },
          },
          success: {
            text: 'He opens the door on the fourth hour and hands over the authorisation terminal without a word.',
            effects: { food: 12, credits: 300, morale: 7, personalXp: 42 },
          },
          partial: {
            text: 'He passes the ration codes out through the hatch and shuts it again. It is what the camp needed and not what he needed.',
            effects: { food: 8, morale: 3, personalXp: 18 },
          },
          failure: {
            text: 'He listens to three hours of you and says nothing back. The building stays sealed.',
            effects: { morale: -4, crewStress: 5, personalXp: 8 },
          },
          criticalFailure: {
            text: 'You push and the intercom goes dead. Whatever was going to happen inside that building happens without anyone able to reach it.',
            effects: { morale: -9, crewStress: 11, flag: { key: 'moon_admin_hostile', value: true } },
          },
        },
      },
      {
        id: 'network-in',
        label: 'Get into the admin network from outside',
        hint: '5 hours. The authorisations matter more than the door.',
        check: {
          skill: 'computers',
          participation: 'individual',
        },
        effects: { hours: 5 },
        outcomes: {
          exceptional: {
            text: 'You reissue every pending ration and transport authorisation from an unattended terminal in the annexe, and pull the colony inventory while you are in there.',
            effects: { food: 18, dataCores: 2, credits: 400, morale: 9, personalXp: 60, flag: { key: 'moon_colony_favour', value: true } },
          },
          success: {
            text: 'The ration authorisations go through and three hundred people get fed without the door ever opening.',
            effects: { food: 12, credits: 250, morale: 6, personalXp: 40 },
          },
          partial: {
            text: 'You get the ration system and not the transport allocations. Half a solution.',
            effects: { food: 7, morale: 2, personalXp: 16 },
          },
          failure: {
            text: 'The admin network is air-gapped from the annexe, which was a very sensible decision by somebody who is no longer on this moon.',
            effects: { morale: -3, personalXp: 8 },
          },
          criticalFailure: {
            text: 'Your intrusion trips the block security posture and the building goes into a full lockdown that nobody local can lift.',
            effects: { morale: -8, crewStress: 10, flag: { key: 'moon_admin_hostile', value: true } },
          },
        },
      },
      {
        id: 'force-entry',
        label: 'Force the service entrance',
        hint: '3 hours. Ends the standoff. Starts something else.',
        check: {
          skill: 'lockpicking',
          secondarySkill: 'mechanicalEngineering',
          participation: 'duo',
        },
        effects: { hours: 3, crewStress: 7 },
        outcomes: {
          exceptional: {
            text: 'The service entrance opens without a sound and you are in the authorisation office before anyone upstairs knows. Nothing has to become a confrontation.',
            effects: { food: 16, credits: 350, dataCores: 1, personalXp: 55 },
          },
          success: {
            text: 'You get in, get the terminal, and get out. The deputy administrator watches from the stair and does not come down.',
            effects: { food: 10, credits: 200, personalXp: 35 },
          },
          partial: {
            text: 'The service door opens onto a corridor that has been barricaded from the other side.',
            effects: { crewStress: 5, personalXp: 14 },
          },
          failure: {
            text: 'Every external door on the block is a proper security fitting and you are not getting through one of them today.',
            effects: { morale: -3, crewStress: 4, personalXp: 6 },
          },
          criticalFailure: {
            text: 'The block security units are still on contract and still powered, and they treat a forced service door exactly the way they were programmed to.',
            effects: { morale: -8, crewStress: 14, combat: 'enc_maintenance_drones', flag: { key: 'moon_admin_hostile', value: true } },
          },
        },
      },
      {
        id: 'organise-outside',
        label: 'Forget the building and help the camp organise without it',
        hint: '6 hours setting up something that does not need an administrator.',
        effects: { hours: 6, crewStress: 4 },
        result: {
          text: 'You spend the day helping shift stewards build a distribution roster on paper. It works, badly, and it works, and the block stays sealed behind you.',
          effects: { food: 6, morale: 6, crewXp: 35, flag: { key: 'moon_camp_contacts', value: true } },
        },
      },
    ],
  },

  {
    id: 'moon-greenhouse-blight',
    scope: ['moon'],
    title: 'Something Is Wrong in the Growing Domes',
    body: 'The agricultural domes supply most of the fresh food on this moon and two of the four are showing progressive leaf necrosis that the remaining agronomist cannot identify. Her lab equipment is fine. Her reference library is on the Homeworld and the link has been down for a week. She is losing about a dome a fortnight.',
    weight: 10,
    tags: ['agriculture', 'blight', 'research'],
    choices: [
      {
        id: 'diagnose-blight',
        label: 'Work the problem in her lab',
        hint: '8 hours of culture plates and process of elimination.',
        check: {
          skill: 'medicalResearch',
          secondarySkill: 'medicalDiagnostics',
          participation: 'individual',
        },
        effects: { hours: 8 },
        outcomes: {
          exceptional: {
            text: 'It is not a pathogen at all — it is a trace metal in the recycled feedwater from a failing heat exchanger. One repair and four domes recover.',
            effects: { food: 30, credits: 800, items: [{ itemId: 'fresh_produce', qty: 8 }, { itemId: 'trade_produce', qty: 4 }], morale: 10, personalXp: 70, flag: { key: 'moon_colony_favour', value: true } },
          },
          success: {
            text: 'You identify the organism and a treatment she can actually make on site. Two domes hold.',
            effects: { food: 18, credits: 500, items: [{ itemId: 'fresh_produce', qty: 4 }], morale: 6, personalXp: 45 },
          },
          partial: {
            text: 'You narrow it to a family and she can work from there, slowly, while the domes keep declining.',
            effects: { food: 8, credits: 220, personalXp: 20 },
          },
          failure: {
            text: 'Eight hours of plates and you have eliminated things it is not. That is science and it is not what she needed today.',
            effects: { morale: -3, personalXp: 8 },
          },
          criticalFailure: {
            text: 'A contaminated transfer carries it from dome two into dome four, which was the clean one.',
            effects: { food: -6, morale: -11, crewStress: 10, flag: { key: 'moon_colony_hostile', value: true } },
          },
        },
      },
      {
        id: 'harvest-early',
        label: 'Help her harvest the affected domes before they are lost',
        hint: '7 hours cutting and preserving everything that can still be eaten.',
        check: {
          skill: 'cooking',
          secondarySkill: 'scavenging',
          participation: 'group',
        },
        effects: { hours: 7, crewStress: 5 },
        outcomes: {
          exceptional: {
            text: 'You strip both domes and preserve the lot properly, and she gives your ship a full share because a share of something is what she has.',
            effects: { food: 32, items: [{ itemId: 'fresh_produce', qty: 6 }, { itemId: 'preserved_meal', qty: 8 }, { itemId: 'trade_produce', qty: 3 }], morale: 8, crewXp: 60 },
          },
          success: {
            text: 'A hard day of cutting and packing, and about two thirds of the crop saved.',
            effects: { food: 20, items: [{ itemId: 'fresh_produce', qty: 4 }, { itemId: 'trade_produce', qty: 2 }], morale: 5, crewXp: 40 },
          },
          partial: {
            text: 'You save what is furthest from the affected beds. The rest goes into the composter.',
            effects: { food: 10, items: [{ itemId: 'fresh_produce', qty: 2 }], crewXp: 20 },
          },
          failure: {
            text: 'By the time you have gowned up and started, most of the crop is past anything you would put in front of people.',
            effects: { food: 4, morale: -3, crewXp: 8 },
          },
          criticalFailure: {
            text: 'Something in the dome ductwork has been living on the crop for a fortnight, and it has bred.',
            effects: { food: 2, morale: -7, crewStress: 12, combat: 'enc_hull_vermin' },
          },
        },
      },
      {
        id: 'buy-clean-stock',
        label: 'Buy seed stock and produce from the clean domes',
        hint: 'Straight purchase, while there is still something to buy.',
        requires: { minCredits: 400 },
        effects: { hours: 2, credits: -400 },
        result: {
          text: 'She sells you produce and viable seed stock from dome one at a fair price, and asks that you plant some of it somewhere, eventually, wherever you end up.',
          effects: { food: 18, items: [{ itemId: 'fresh_produce', qty: 6 }, { itemId: 'trade_produce', qty: 3 }], morale: 4 },
        },
      },
      {
        id: 'leave-domes',
        label: 'Not your field',
        effects: { hours: 1 },
        result: {
          text: 'She walks you out through dome three, which is still green, and does not ask again.',
          effects: { morale: -2 },
        },
      },
    ],
  },

  {
    id: 'moon-medbay-shutdown',
    scope: ['moon'],
    title: 'The Colony Bay Is Closing',
    body: 'The colony medical bay has one physician left and she is on a confirmed berth off this moon in two days. After that there is a stocked facility, a treatment queue of forty people, and nobody qualified to open the doors. She wants to clear as much of that queue as she can before she goes, and she has more equipment than she can possibly take.',
    weight: 9,
    conditions: { once: true },
    tags: ['medical', 'shutdown', 'recruitment'],
    choices: [
      {
        id: 'work-the-queue',
        label: 'Work the treatment queue with her',
        hint: '12 hours. Forty people and two days left.',
        check: {
          skill: 'surgery',
          secondarySkill: 'medicalDiagnostics',
          participation: 'duo',
        },
        effects: { hours: 12, crewStress: 8, medicine: -3 },
        outcomes: {
          exceptional: {
            text: 'You clear thirty-one cases between you. She signs the facility stock over to your ship and one of her nursing staff asks to come with you.',
            effects: { medicine: 15, items: [{ itemId: 'surgical_kit', qty: 1, condition: 90 }, { itemId: 'blood_substitute', qty: 3 }, { itemId: 'antibiotics', qty: 4 }], recruit: true, morale: 11, personalXp: 70 },
          },
          success: {
            text: 'Twenty-two cases done and the worst of the queue cleared. She restocks you from the facility as payment.',
            effects: { medicine: 11, items: [{ itemId: 'medkit_field', qty: 2 }, { itemId: 'antibiotics', qty: 2 }], morale: 7, personalXp: 45 },
          },
          partial: {
            text: 'You get through the straightforward cases. The complex ones need a facility that will not exist in two days.',
            effects: { medicine: 6, morale: 2, crewStress: 6, personalXp: 20 },
          },
          failure: {
            text: 'You are slowing her down more than you are helping and she says so kindly. You spend the shift on instruments and dressings.',
            effects: { medicine: 3, morale: -3, personalXp: 8 },
          },
          criticalFailure: {
            text: 'A case goes wrong on the table in a bay that has no second surgeon and no transfer option. She finishes the shift alone.',
            effects: { medicine: 2, morale: -12, crewStress: 17, personalXp: 5 },
          },
        },
      },
      {
        id: 'take-the-stock',
        label: 'Offer to take the facility stock off-world',
        hint: '4 hours of inventory and crating. She would rather it went somewhere than nowhere.',
        check: {
          skill: 'medicalDiagnostics',
          secondarySkill: 'computers',
          attributes: ['memory', 'evaluation'],
          participation: 'individual',
        },
        effects: { hours: 4 },
        outcomes: {
          exceptional: {
            text: 'You inventory the whole facility properly, flag what is past shelf life, and crate the rest. She hands you the pharmacy keys and the cold store as well.',
            effects: { medicine: 15, items: [{ itemId: 'surgical_kit', qty: 1, condition: 92 }, { itemId: 'blood_substitute', qty: 4 }, { itemId: 'stim_shot', qty: 3 }, { itemId: 'medkit_field', qty: 2 }], morale: 6, personalXp: 55 },
          },
          success: {
            text: 'Crated, listed, and loaded. It is the single most valuable cargo on your manifest and none of it is for sale.',
            effects: { medicine: 12, items: [{ itemId: 'medkit_basic', qty: 3 }, { itemId: 'antibiotics', qty: 3 }], personalXp: 35 },
          },
          partial: {
            text: 'You take what you can identify and leave the rest, which is more than you would like.',
            effects: { medicine: 7, items: [{ itemId: 'medkit_basic', qty: 2 }], personalXp: 15 },
          },
          failure: {
            text: 'Half the store is unlabelled institutional stock and neither of you will put an unknown ampoule on a ship.',
            effects: { medicine: 3, morale: -2, personalXp: 8 },
          },
          criticalFailure: {
            text: 'A cold store you left open for ten minutes ruins the entire biologics inventory. She does not shout. She just closes the door.',
            effects: { medicine: 1, morale: -9, crewStress: 9 },
          },
        },
      },
      {
        id: 'find-successor',
        label: 'Find someone in the colony she can hand the bay to',
        hint: '6 hours looking for a qualification that may not exist here.',
        check: {
          skill: 'persuasion',
          secondarySkill: 'firstAid',
          participation: 'individual',
        },
        effects: { hours: 6 },
        outcomes: {
          exceptional: {
            text: 'A mine rescue paramedic with fifteen years of trauma experience and no interest in leaving. She spends her last day training him and the bay stays open.',
            effects: { medicine: 8, morale: 12, credits: 400, personalXp: 60, flag: { key: 'moon_clinic_favour', value: true } },
          },
          success: {
            text: 'Two mine medics agree to run it between them. It is not a physician and it is not nothing.',
            effects: { medicine: 5, morale: 8, personalXp: 38 },
          },
          partial: {
            text: 'One volunteer, undertrained and willing. She writes him forty pages of notes and hopes.',
            effects: { medicine: 3, morale: 4, personalXp: 16 },
          },
          failure: {
            text: 'Everyone with clinical training on this moon left on the last three rotations. There is nobody to find.',
            effects: { morale: -4, personalXp: 8 },
          },
          criticalFailure: {
            text: 'You put forward someone who overstated their training badly, and it becomes clear in front of the queue.',
            effects: { morale: -8, crewStress: 8, flag: { key: 'moon_camp_cold', value: true } },
          },
        },
      },
      {
        id: 'buy-medicine',
        label: 'Buy medicine from the closing stock and go',
        requires: { minCredits: 500 },
        effects: { hours: 2, credits: -500 },
        result: {
          text: 'She sells you a crate at institutional pricing and does not haggle, because in two days it is going to be a locked room full of expiry dates.',
          effects: { medicine: 12, items: [{ itemId: 'antibiotics', qty: 3 }, { itemId: 'painkillers', qty: 3 }] },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Hostile ground
  // -------------------------------------------------------------------------
  {
    id: 'moon-claim-jumpers',
    scope: ['moon'],
    title: 'Somebody Is Working the Northern Claim',
    body: 'A registered rare-minerals claim in the northern field is being actively worked by people who do not hold it. The claim holder is a small operation with six staff, no way to enforce anything, and a standing offer to anyone who can make the problem go away. There are eight of them up there with cutting gear and at least two rifles.',
    weight: 9,
    conditions: { minDanger: 25, minCrew: 2 },
    tags: ['claim-dispute', 'hostile', 'mining'],
    choices: [
      {
        id: 'confront-armed',
        label: 'Go up armed and tell them to clear the claim',
        hint: 'Direct. They may fold. They may not.',
        check: {
          skill: 'firearms',
          secondarySkill: 'persuasion',
          attributes: ['steadiness', 'composure'],
          participation: 'group',
          criticalRisk: true,
        },
        effects: { hours: 5, crewStress: 10 },
        outcomes: {
          exceptional: {
            text: 'You arrive from a direction they were not watching, at a distance that makes the decision for them. They load their gear and leave without a shot fired.',
            effects: { credits: 1200, items: [{ itemId: 'trade_rare_minerals', qty: 4 }, { itemId: 'mining_pick', qty: 2 }], morale: 8, crewXp: 70 },
          },
          success: {
            text: 'A tense hour at forty metres and then they start packing. Nobody has to find out how it would have gone.',
            effects: { credits: 800, items: [{ itemId: 'trade_rare_minerals', qty: 2 }], morale: 5, crewXp: 45 },
          },
          partial: {
            text: 'They leave, slowly, taking most of what they had cut. The claim holder pays for the claim, not the ore.',
            effects: { credits: 420, crewStress: 7, crewXp: 25 },
          },
          failure: {
            text: 'They call your position and do not move. You are not going to start a firefight over somebody else mineral rights, and they know it.',
            effects: { morale: -5, crewStress: 9, crewXp: 10 },
          },
          criticalFailure: {
            text: 'Somebody up there decides the approach is an attack, and after that nobody has any choices left.',
            effects: { morale: -8, crewStress: 16, combat: 'enc_claim_jumpers' },
          },
        },
      },
      {
        id: 'prep-first',
        label: 'Service and load the crew weapons before you go',
        hint: '3 hours in the workshop first. Then go up.',
        check: {
          skill: 'weaponsmithing',
          participation: 'individual',
        },
        effects: { hours: 3 },
        outcomes: {
          exceptional: {
            text: 'Everything cycles, everything is loaded, and you build two spare magazines out of the claim holder scrap bin. The crew walk up that hill differently.',
            effects: { items: [{ itemId: 'ammo_rifle', qty: 40 }, { itemId: 'ammo_pistol', qty: 30 }], morale: 6, crewXp: 40, personalXp: 45, flag: { key: 'moon_crew_armed', value: true } },
          },
          success: {
            text: 'Three weapons serviced and every magazine full. It is a small thing and it is not nothing.',
            effects: { items: [{ itemId: 'ammo_rifle', qty: 20 }], morale: 3, personalXp: 30, flag: { key: 'moon_crew_armed', value: true } },
          },
          partial: {
            text: 'You get two of them working properly and the third stays as unreliable as it was.',
            effects: { items: [{ itemId: 'ammo_pistol', qty: 10 }], personalXp: 12 },
          },
          failure: {
            text: 'Three hours of stripping and reassembling and nothing is meaningfully better than it was.',
            effects: { morale: -2, personalXp: 6 },
          },
          criticalFailure: {
            text: 'You reassemble a service rifle wrong and it lets go on the bench. The crew notice.',
            effects: { morale: -6, crewStress: 8, wound: { severityScore: 36, damageType: 'pierce' } },
          },
        },
      },
      {
        id: 'observe-first',
        label: 'Go up quietly and watch them for a shift',
        hint: '6 hours of lying in cold regolith learning who they are.',
        check: {
          skill: 'stealth',
          secondarySkill: 'exploration',
          participation: 'duo',
        },
        effects: { hours: 6, crewStress: 5 },
        outcomes: {
          exceptional: {
            text: 'They are a stranded rotation crew from the failed southern site, working a claim because nobody is paying them and nobody is coming. That is a conversation, not a fight, and it costs the claim holder almost nothing.',
            effects: { credits: 900, morale: 9, recruit: true, personalXp: 60, crewXp: 40 },
          },
          success: {
            text: 'You learn their shift pattern, their numbers, and that only one of the rifles is loaded. The claim holder finds that very useful.',
            effects: { credits: 500, morale: 4, personalXp: 40 },
          },
          partial: {
            text: 'Six hours of cold and a partial picture. Eight people, two rifles, no idea who they are.',
            effects: { credits: 200, crewStress: 4, personalXp: 16 },
          },
          failure: {
            text: 'They have somebody watching the approach and you spend six hours pinned behind a spoil heap.',
            effects: { morale: -4, crewStress: 8, personalXp: 8 },
          },
          criticalFailure: {
            text: 'Their lookout is better than yours and the first you know about it is when the shooting starts.',
            effects: { morale: -7, crewStress: 15, combat: 'enc_claim_jumpers' },
          },
        },
      },
      {
        id: 'refuse-claim-job',
        label: 'Turn the job down',
        effects: { hours: 1 },
        result: {
          text: 'You tell the claim holder that eight people with rifles is not a job, it is a war, and he agrees with you and asks anyway. You still say no.',
          effects: { morale: -2 },
        },
      },
    ],
  },

  {
    id: 'moon-dust-window',
    scope: ['moon'],
    title: 'Regolith Storm Inbound',
    body: 'A charged dust front is coming across the plain toward the landing field and the pad crew are calling a two-hour window before surface operations stop. Anything still on the apron after that stays there, gets scoured, and does not fly again without a full strip-down. Half the colony transport fleet is out and unaccounted for.',
    weight: 11,
    conditions: { requiresShip: true },
    tags: ['weather', 'piloting', 'window'],
    choices: [
      {
        id: 'fly-out-now',
        label: 'Get {ship} off the surface before the front arrives',
        hint: '2 hours. Rushed departure, incomplete loading.',
        check: {
          skill: 'piloting',
          secondarySkill: 'navigation',
          participation: 'individual',
          modifiers: [{ label: 'Charged particulate, degraded sensors', value: -9 }],
        },
        effects: { hours: 2, fuel: -4, crewStress: 6 },
        outcomes: {
          exceptional: {
            text: 'Clean lift with fifteen minutes of margin and a departure profile that puts the front behind you the whole way up.',
            effects: { morale: 6, personalXp: 55, flag: { key: 'moon_storm_avoided', value: true } },
          },
          success: {
            text: 'Off the apron and above the front. Nothing on the hull that a wash will not fix.',
            effects: { hull: -3, personalXp: 35, flag: { key: 'moon_storm_avoided', value: true } },
          },
          partial: {
            text: 'You lift into the leading edge and take a scouring on the way through. Sensors are going to need attention.',
            effects: { hull: -8, systems: { sensors: -12 }, crewStress: 5, personalXp: 16 },
          },
          failure: {
            text: 'You abort the lift with the front already over the field and set back down to ride it out.',
            effects: { hull: -12, systems: { sensors: -15, engines: -8 }, morale: -5, crewStress: 8 },
          },
          criticalFailure: {
            text: 'A charged gust takes the ship sideways twenty metres up and the set-down is not a landing so much as an arrival.',
            effects: { hull: -20, systems: { engines: -18, sensors: -20 }, morale: -9, crewStress: 15, wound: { severityScore: 40, damageType: 'blunt' } },
          },
        },
      },
      {
        id: 'seal-and-ride',
        label: 'Seal up and ride the storm out on the apron',
        hint: '14 hours sitting inside a scouring front. Costs time, not fuel.',
        check: {
          skill: 'mechanicalEngineering',
          participation: 'group',
        },
        effects: { hours: 14, crewStress: 7 },
        outcomes: {
          exceptional: {
            text: 'Every intake sealed, every seam taped, and a crew who found three pre-existing faults while they were at it. The ship comes out of the front better than it went in.',
            effects: { hull: 6, systems: { lifeSupport: 6, sensors: 4 }, morale: 5, crewXp: 65 },
          },
          success: {
            text: 'Sealed tight and unbothered. Fourteen hours of noise and nothing else.',
            effects: { hull: -2, morale: 2, crewXp: 40 },
          },
          partial: {
            text: 'Dust gets into two intakes and the sensor housings. Nothing fatal, everything gritty.',
            effects: { hull: -5, systems: { sensors: -10, engines: -5 }, crewXp: 20 },
          },
          failure: {
            text: 'You miss a filter housing and the life support draws grit for fourteen straight hours.',
            effects: { hull: -8, systems: { lifeSupport: -15, sensors: -12 }, morale: -5, crewStress: 6 },
          },
          criticalFailure: {
            text: 'An unsealed intake packs solid and the power plant runs hot enough to cook a coolant run before anyone gets to it.',
            effects: { hull: -12, systems: { power: -22, engines: -14, sensors: -14 }, morale: -9, crewStress: 12, repairParts: -20 },
          },
        },
      },
      {
        id: 'bring-them-in',
        label: 'Use the window to help bring the outbound transports home',
        hint: '2 hours on the pad net talking people down through a closing window.',
        check: {
          skill: 'navigation',
          secondarySkill: 'piloting',
          participation: 'individual',
        },
        effects: { hours: 2, crewStress: 6 },
        outcomes: {
          exceptional: {
            text: 'You take over the approach sequencing and land every outbound transport with time to spare, including two that had written themselves off.',
            effects: { credits: 800, morale: 11, fuel: 8, personalXp: 60, flag: { key: 'moon_pad_favour', value: true } },
          },
          success: {
            text: 'Five of seven down safely. The pad chief will not forget it.',
            effects: { credits: 500, morale: 7, fuel: 4, personalXp: 40, flag: { key: 'moon_pad_favour', value: true } },
          },
          partial: {
            text: 'Three down, two diverted to the north strip, two you never raised at all.',
            effects: { credits: 240, morale: 2, crewStress: 5, personalXp: 16 },
          },
          failure: {
            text: 'The pad net is saturated and nobody can hear anybody. You spend two hours shouting into static.',
            effects: { morale: -4, crewStress: 7, personalXp: 8 },
          },
          criticalFailure: {
            text: 'You sequence two transports into the same approach in degraded visibility. They do not hit each other, and that is the only good thing about it.',
            effects: { morale: -10, crewStress: 14, flag: { key: 'moon_pad_hostile', value: true } },
          },
        },
      },
      {
        id: 'ignore-front',
        label: 'Keep loading and take the scouring',
        hint: 'Time is worth more than paint.',
        effects: { hours: 6, crewStress: 5 },
        result: {
          text: 'You finish the load with the front already on the field and pay for it in hull condition and sensor optics. The cargo is aboard.',
          effects: { hull: -10, systems: { sensors: -14 }, repairParts: 40, food: 10 },
        },
      },
    ],
  },

  {
    id: 'moon-fuel-tender-offer',
    scope: ['moon'],
    title: 'The Tender Master Has Options',
    body: 'The volatiles operation still has product and a tender that can transfer it, but the freight contract that used to take it home is dead and the tender master has been sitting on a full load for a week. He can sell it, he can hold it, or he can be talked into the arrangement that suits him best. He is in no hurry and he wants you to know that.',
    weight: 12,
    tags: ['fuel', 'trade', 'negotiation'],
    choices: [
      {
        id: 'negotiate-fuel',
        label: 'Negotiate for the full tender load',
        hint: '3 hours. He has product and no market. You have a market and no product.',
        check: {
          skill: 'negotiation',
          attributes: ['evaluation', 'socialAwareness'],
          participation: 'individual',
        },
        effects: { hours: 3 },
        outcomes: {
          exceptional: {
            text: 'You point out that a full tender is worth nothing on a moon nobody is coming back to, and he agrees so completely that he fills you and sells you the spare canisters.',
            effects: { credits: -300, fuel: 34, items: [{ itemId: 'fuel_canister', qty: 4 }, { itemId: 'trade_volatiles', qty: 2 }], personalXp: 55 },
          },
          success: {
            text: 'A full transfer at a price that is fair to both of you, which is rarer than it should be.',
            effects: { credits: -520, fuel: 26, items: [{ itemId: 'fuel_canister', qty: 2 }], personalXp: 35 },
          },
          partial: {
            text: 'He will part with two thirds of the load and holds the rest back for a buyer he still believes in.',
            effects: { credits: -540, fuel: 17, personalXp: 15 },
          },
          failure: {
            text: 'He wants Homeworld contract pricing for a product with no Homeworld left to sell it to, and he will not be moved off it.',
            effects: { credits: -600, fuel: 10, morale: -3 },
          },
          criticalFailure: {
            text: 'You tell him exactly how worthless his position is and he decides he would rather hold a full tender than be spoken to like that.',
            effects: { fuel: 0, morale: -6, crewStress: 5, flag: { key: 'moon_tender_closed', value: true } },
          },
        },
      },
      {
        id: 'trade-parts-fuel',
        label: 'Trade parts and stores instead of credits',
        hint: 'He needs pumps more than he needs money.',
        requires: { minRepairParts: 60 },
        effects: { hours: 3, repairParts: -60 },
        result: {
          text: 'He takes the parts, looks at them properly, and gives you more fuel than the credit price would have bought. Everyone on this moon is short of components and long on product.',
          effects: { fuel: 30, items: [{ itemId: 'trade_volatiles', qty: 2 }] },
        },
      },
      {
        id: 'run-transfer',
        label: 'Run the transfer yourself for a share of the load',
        hint: '5 hours on the transfer rig. His crew rotated out and never came back.',
        check: {
          skill: 'mechanicalEngineering',
          secondarySkill: 'electricalEngineering',
          participation: 'duo',
          criticalRisk: true,
        },
        effects: { hours: 5, crewStress: 5 },
        outcomes: {
          exceptional: {
            text: 'A clean transfer at full rate with no boil-off, and he gives you a third of the load for it plus whatever you want out of his stores.',
            effects: { fuel: 32, items: [{ itemId: 'fuel_canister', qty: 3 }, { itemId: 'coolant_flask', qty: 3 }], personalXp: 60 },
          },
          success: {
            text: 'Transfer completed and the agreed share pumped into your tanks.',
            effects: { fuel: 22, items: [{ itemId: 'fuel_canister', qty: 1 }], personalXp: 40 },
          },
          partial: {
            text: 'The rig cycles slowly and you lose a good fraction to boil-off. Your share shrinks accordingly.',
            effects: { fuel: 12, crewStress: 4, personalXp: 16 },
          },
          failure: {
            text: 'The transfer rig will not hold pressure and neither of you can find why in five hours.',
            effects: { morale: -4, crewStress: 6, personalXp: 8 },
          },
          criticalFailure: {
            text: 'A coupling lets go under pressure and vents a substantial fraction of the tender across the apron. He is going to be talking about this for a long time.',
            effects: { fuel: 4, credits: -400, morale: -9, crewStress: 14, wound: { severityScore: 44, damageType: 'burn' }, flag: { key: 'moon_tender_closed', value: true } },
          },
        },
      },
      {
        id: 'walk-tender',
        label: 'Leave him with his full tender',
        effects: { hours: 1 },
        result: {
          text: 'You tell him what you would pay, he tells you what he wants, and you both go back to what you were doing. The tender is still full in the morning.',
          effects: {},
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Routine / low-stakes
  // -------------------------------------------------------------------------
  {
    id: 'moon-shift-canteen',
    scope: ['moon'],
    title: 'Second Shift Meal Break',
    body: 'The canteen off the freight apron still runs three services a day out of stubbornness and institutional habit. The food is dull, the coffee is excellent for reasons nobody can explain, and it is the only warm room on this side of the colony that is not somebody workplace.',
    weight: 13,
    routine: true,
    tags: ['canteen', 'rest', 'colony'],
    choices: [
      {
        id: 'eat-there',
        label: 'Bring the crew in for a hot meal',
        hint: '2 hours and a handful of credits.',
        effects: { hours: 2, credits: -60 },
        result: {
          text: 'Everyone sits down at the same table for the first time in days and complains about the food, which is a good sign.',
          effects: { food: 3, morale: 4, crewStress: -5, items: [{ itemId: 'stim_coffee', qty: 2 }] },
        },
      },
      {
        id: 'cook-swap',
        label: 'Trade a shift in their kitchen for stores',
        hint: '5 hours on the line. They are short-handed like everyone else.',
        check: {
          skill: 'cooking',
          participation: 'individual',
        },
        effects: { hours: 5 },
        outcomes: {
          exceptional: {
            text: 'You do something to the institutional protein that has the second shift asking who is on the line. The kitchen manager loads you up.',
            effects: { food: 16, items: [{ itemId: 'preserved_meal', qty: 4 }, { itemId: 'stim_coffee', qty: 4 }], morale: 6, crewStress: -4, personalXp: 35 },
          },
          success: {
            text: 'A solid service and a crate of stores as payment.',
            effects: { food: 10, items: [{ itemId: 'stim_coffee', qty: 2 }], morale: 3, crewStress: -3, personalXp: 22 },
          },
          partial: {
            text: 'You keep up, mostly. They pay you in what they can spare, which is not much.',
            effects: { food: 5, personalXp: 10 },
          },
          failure: {
            text: 'A colony canteen line is a machine and you are not part of it. Five hours on the pot wash.',
            effects: { food: 3, morale: -1 },
          },
          criticalFailure: {
            text: 'You put out a service that half the shift cannot finish. The kitchen manager is polite and does not ask you back.',
            effects: { food: 1, morale: -4 },
          },
        },
      },
      {
        id: 'skip-canteen',
        label: 'Eat aboard as usual',
        effects: { hours: 1 },
        result: {
          text: 'Ration packs in the hold again. Nobody says anything about it, which is its own kind of comment.',
          effects: { food: -2, morale: -2 },
        },
      },
    ],
  },

  {
    id: 'moon-beacon-drift',
    scope: ['moon'],
    title: 'The Approach Beacon Is Off',
    body: 'The surface approach beacon for the landing field has drifted out of alignment and nobody has recalibrated it since the last technician rotation. Every ship coming in is compensating by hand and one of them has already put a skid off the apron edge. The pad chief mentions it the way you mention weather.',
    weight: 12,
    routine: true,
    tags: ['navigation', 'maintenance', 'pad'],
    choices: [
      {
        id: 'recalibrate',
        label: 'Recalibrate it',
        hint: '3 hours with a survey set and a lot of patience.',
        check: {
          skill: 'navigation',
          secondarySkill: 'electricalEngineering',
          participation: 'individual',
        },
        effects: { hours: 3 },
        outcomes: {
          exceptional: {
            text: 'You align it better than its original commissioning and leave the pad chief a procedure he can run himself next month.',
            effects: { credits: 350, fuel: 5, morale: 4, personalXp: 40, flag: { key: 'moon_pad_favour', value: true } },
          },
          success: {
            text: 'Beacon back within tolerance and every approach after that is easier.',
            effects: { credits: 220, personalXp: 25, flag: { key: 'moon_pad_favour', value: true } },
          },
          partial: {
            text: 'Closer than it was, not as close as it should be. Good enough for a field that will not be here in a year.',
            effects: { credits: 110, personalXp: 10 },
          },
          failure: {
            text: 'The drift is in the mount, not the electronics, and fixing a mount takes a crane.',
            effects: { morale: -1, personalXp: 5 },
          },
          criticalFailure: {
            text: 'You leave it worse aligned than you found it and the next inbound has to go around twice.',
            effects: { credits: -100, morale: -4 },
          },
        },
      },
      {
        id: 'note-offset',
        label: 'Just work out the offset and share it',
        hint: '1 hour. Fixes nothing, helps everyone.',
        effects: { hours: 1 },
        result: {
          text: 'You measure the error on your own approach plot and post the correction on the pad board. Three other captains copy it down within the hour.',
          effects: { morale: 2, personalXp: 12 },
        },
      },
      {
        id: 'ignore-beacon',
        label: 'Fly it by hand like everyone else',
        effects: { hours: 1 },
        result: {
          text: 'You have flown worse approaches. The skid marks off the apron edge stay where they are.',
          effects: {},
        },
      },
    ],
  },

  {
    id: 'moon-suit-locker-check',
    scope: ['moon'],
    title: 'The Locker Room Nobody Emptied',
    body: 'The surface crew locker room by the north airlock still has three rows of personal kit belonging to people who rotated out and did not come back. Hardsuits, rebreathers, tools, and in one case a very good pair of boots. The colony has not decided what to do with any of it and probably never will.',
    weight: 12,
    routine: true,
    tags: ['salvage', 'equipment', 'routine'],
    choices: [
      {
        id: 'sort-lockers',
        label: 'Go through the lockers properly',
        hint: '3 hours. Somebody has to and nobody wants to.',
        check: {
          skill: 'scavenging',
          participation: 'individual',
        },
        effects: { hours: 3 },
        outcomes: {
          exceptional: {
            text: 'Two serviceable hardsuits, a full tool roll, and a locker belonging to someone who clearly took equipment maintenance personally.',
            effects: { items: [{ itemId: 'hardsuit_work', qty: 2, condition: 82 }, { itemId: 'multitool', qty: 1, condition: 88 }, { itemId: 'rebreather', qty: 3 }, { itemId: 'helmet_industrial', qty: 1, condition: 78 }], personalXp: 35 },
          },
          success: {
            text: 'A hardsuit, breathing gear, and a good handful of hand tools.',
            effects: { items: [{ itemId: 'hardsuit_work', qty: 1, condition: 70 }, { itemId: 'rebreather', qty: 2 }, { itemId: 'utility_knife', qty: 1 }], personalXp: 22 },
          },
          partial: {
            text: 'Mostly personal effects and worn-out kit. You take what is usable and leave the photographs.',
            effects: { items: [{ itemId: 'rebreather', qty: 1 }, { itemId: 'glow_rods', qty: 3 }, { itemId: 'personal_effects', qty: 2 }], personalXp: 10 },
          },
          failure: {
            text: 'Every locker worth opening was opened weeks ago. What is left is other people lives, in boxes.',
            effects: { items: [{ itemId: 'personal_effects', qty: 1 }], morale: -2 },
          },
          criticalFailure: {
            text: 'A north-shift worker finds you going through his crewmate locker and has a great deal to say about it, most of it fair.',
            effects: { morale: -5, crewStress: 4, flag: { key: 'moon_camp_cold', value: true } },
          },
        },
      },
      {
        id: 'ask-permission',
        label: 'Ask the colony store to sign the kit over first',
        hint: '2 hours of paperwork. Less haul, no argument.',
        effects: { hours: 2, credits: -80 },
        result: {
          text: 'The storekeeper writes a disposal note, takes your credits, and tells you which two rows have already been claimed by families.',
          effects: { items: [{ itemId: 'hardsuit_work', qty: 1, condition: 66 }, { itemId: 'rebreather', qty: 2 }, { itemId: 'thermal_blanket', qty: 2 }], morale: 2 },
        },
      },
      {
        id: 'leave-lockers',
        label: 'Leave them',
        effects: { hours: 1 },
        result: {
          text: 'You look at three rows of other people names on tape and close the door.',
          effects: {},
        },
      },
    ],
  },

  {
    id: 'moon-tram-delay',
    scope: ['moon'],
    title: 'The Surface Tram Is Down Again',
    body: 'The tram between the landing field and the main colony has stopped in the tunnel for the fourth time this week, which means a two kilometre walk in pressure suits or a wait for a maintenance crew that is down to one person. There are eleven other people at the platform in exactly the same position.',
    weight: 13,
    routine: true,
    tags: ['transit', 'delay', 'routine'],
    choices: [
      {
        id: 'fix-tram',
        label: 'Look at the tram yourself',
        hint: '2 hours. It is probably the same fault as last time.',
        check: {
          skill: 'electricalEngineering',
          participation: 'individual',
        },
        effects: { hours: 2 },
        outcomes: {
          exceptional: {
            text: 'A dry contactor, cleaned and reseated in twenty minutes, and you leave the maintenance man a note about the three others that will do the same thing.',
            effects: { credits: 200, morale: 4, personalXp: 35, flag: { key: 'moon_colony_favour', value: true } },
          },
          success: {
            text: 'Running again inside the hour and eleven people get where they were going.',
            effects: { credits: 120, morale: 3, personalXp: 22 },
          },
          partial: {
            text: 'It moves at walking pace, which is still better than walking.',
            effects: { credits: 50, personalXp: 10 },
          },
          failure: {
            text: 'The fault is in a section of the traction supply that runs under the tunnel floor. Everyone walks.',
            effects: { hours: 2, crewStress: 3 },
          },
          criticalFailure: {
            text: 'You isolate the wrong section and take the tunnel lighting out with the tram. Now everyone walks in the dark.',
            effects: { hours: 3, morale: -4, crewStress: 5 },
          },
        },
      },
      {
        id: 'walk-it',
        label: 'Suit up and walk',
        hint: '3 hours across the surface. Cold, quiet, and it always works.',
        effects: { hours: 3, crewStress: 3 },
        result: {
          text: 'Two kilometres of regolith under a black sky with the Homeworld sitting in it, half lit, looking exactly like it always has. Nobody talks much on the way.',
          effects: { morale: -2, crewXp: 10 },
        },
      },
      {
        id: 'wait-tram',
        label: 'Wait for the maintenance crew',
        hint: 'Four hours of platform bench and other people conversations.',
        effects: { hours: 4, crewStress: 2 },
        result: {
          text: 'The maintenance man arrives after three hours, fixes it in eleven minutes, and apologises to everyone individually. You learn a great deal about the colony from the bench.',
          effects: { morale: 1, flag: { key: 'moon_camp_contacts', value: true } },
        },
      },
    ],
  },
];

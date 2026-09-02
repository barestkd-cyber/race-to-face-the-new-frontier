/**
 * Hostile events — the moments before, during, and instead of violence.
 * Every one of these offers a way out that does not involve shooting.
 * Pure data; no logic.
 */

import type { GameEventDef } from '../../engine/types';

export const HOSTILE_EVENTS: GameEventDef[] = [
  // -------------------------------------------------------------------------
  {
    id: 'hos-toll-demand',
    scope: ['hostile'],
    title: 'A Toll For the Lane',
    body:
      'A ship with no registry and too many external mounts falls into formation off your quarter and opens a channel. The voice is bored, professional, and wants twelve percent of whatever {ship} is carrying to pass through the lane past {location}. They have done this before, {captain}, and they are not in a hurry.',
    weight: 12,
    conditions: { minDanger: 30 },
    tags: ['extortion', 'raiders', 'standoff'],
    choices: [
      {
        id: 'pay',
        label: 'Pay the toll',
        hint: 'Immediate. Expensive. Works.',
        requires: { minCredits: 600 },
        effects: { hours: 1, credits: -600 },
        result: {
          text: 'The transfer clears and they peel off without another word. It is the cheapest violence you will ever avoid, and everyone aboard watches you do it.',
          effects: { morale: -5, crewStress: -4 },
        },
      },
      {
        id: 'talk-them-down',
        label: 'Negotiate the figure down',
        hint: 'They are businesspeople. Businesspeople negotiate.',
        check: {
          skill: 'negotiation',
          secondarySkill: 'persuasion',
          participation: 'individual',
        },
        effects: { hours: 2 },
        outcomes: {
          exceptional: {
            text: 'You establish, in under ten minutes, that the hold is not worth their fuel and that you know two names they respect. They wave you through for nothing and pass on a warning about the next lane.',
            effects: { morale: 11, crewXp: 14, flag: { key: 'raider_lane_warning', value: true } },
          },
          success: {
            text: 'You get it down to four percent and a promise of better cargo next time. They take it because it is easy money and easy money is the whole business model.',
            effects: { credits: -220, morale: 5, crewXp: 8 },
          },
          partial: {
            text: 'They come down a little and lose patience quickly. You pay most of what they asked.',
            effects: { credits: -450, crewStress: 4 },
          },
          failure: {
            text: 'The bored voice stops being bored. The price is now the original figure plus a surcharge for wasting their time.',
            effects: { credits: -850, morale: -6, crewStress: 8 },
          },
          criticalFailure: {
            text: 'Something you say is taken as an insult by people who cannot afford to accept insults. The channel closes and the mounts come around.',
            effects: { crewStress: 12, combat: 'enc_pirate_raiders' },
          },
        },
      },
      {
        id: 'run-for-it',
        label: 'Burn hard and make them work for it',
        hint: 'Fuel and nerve.',
        requires: { minFuel: 5 },
        check: {
          skill: 'piloting',
          attributes: ['handEye', 'decisionMaking'],
          participation: 'individual',
          criticalRisk: true,
        },
        effects: { hours: 3, fuel: -5 },
        outcomes: {
          exceptional: {
            text: 'You put {ship} into a debris shadow they will not follow into and come out on a vector they cannot match. They do not even try for long.',
            effects: { morale: 12, crewXp: 16, crewStress: -3 },
          },
          success: {
            text: 'Two hours of hard burn and they give up on a target that costs more fuel than it is worth.',
            effects: { morale: 7, crewXp: 9, crewStress: 3 },
          },
          partial: {
            text: 'You lose them and the burn takes something out of the engines that will need looking at.',
            effects: { systems: { engines: -8 }, crewStress: 7 },
          },
          failure: {
            text: 'They are faster than you and they close the whole distance while you burn fuel proving it.',
            effects: { fuel: -3, crewStress: 11, combat: 'enc_pirate_raiders' },
          },
          criticalFailure: {
            text: 'The evasion puts you into a rock field at a speed the hull was not designed for, and they are still behind you when you come out of it.',
            effects: {
              systems: { hull: -16, engines: -10 },
              crewStress: 14,
              combat: 'enc_pirate_raiders',
            },
          },
        },
      },
      {
        id: 'refuse',
        label: 'Tell them no and bring the guns up',
        hint: 'A fight, on your terms.',
        effects: { hours: 1, crewStress: 8 },
        result: {
          text: 'You close the channel and the gunner takes the seat. Whatever else happens, they do not get to think this lane is free.',
          effects: { combat: 'enc_pirate_raiders', morale: 2 },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'hos-boarding-attempt',
    scope: ['hostile'],
    title: 'Something Is On the Hull',
    body:
      'The proximity alarm goes and then stops, and then there is a sound against the outer airlock that is metal on metal, deliberate and unhurried. Somebody has matched velocity with {ship} without being seen and is cutting their way in. You have perhaps four minutes, {captain}, and the crew is already looking to you.',
    weight: 11,
    conditions: { minDanger: 40 },
    tags: ['boarding', 'airlock', 'defence'],
    choices: [
      {
        id: 'ambush-the-lock',
        label: 'Set an ambush on the inner hatch',
        hint: 'Meet them where you choose.',
        check: {
          skill: 'closeQuarters',
          secondarySkill: 'firearms',
          participation: 'trio',
        },
        effects: { hours: 1, crewStress: 9 },
        outcomes: {
          exceptional: {
            text: 'Cover, angles, and everybody where they should be before the hatch even glows. When it opens, it is over in eleven seconds and none of it is yours.',
            effects: { morale: 12, crewXp: 18, items: [{ itemId: 'salvage_scrap', qty: 2 }], credits: 400 },
          },
          success: {
            text: 'You meet them at the hatch with the whole crew set and ready. It is short, brutal, and it goes your way.',
            effects: { combat: 'enc_pirate_boarders', morale: 5, crewXp: 10 },
          },
          partial: {
            text: 'Half the positions are right and half of them are somewhere useless. The hatch comes down anyway.',
            effects: { combat: 'enc_pirate_boarders', crewStress: 6 },
          },
          failure: {
            text: 'They cut through somewhere else entirely — a service hatch nobody was covering — and they are inside behind you.',
            effects: { combat: 'enc_pirate_boarders', morale: -6, crewStress: 12 },
          },
          criticalFailure: {
            text: 'Somebody opens fire early into a sealed lock and the round goes through into the corridor. Now you have a breach and boarders both.',
            effects: {
              systems: { hull: -12 },
              combat: 'enc_pirate_boarders',
              morale: -8,
              crewStress: 15,
              wound: { severityScore: 36, damageType: 'pierce' },
            },
          },
        },
      },
      {
        id: 'vent-the-lock',
        label: 'Vent the lock section before they get through',
        hint: 'Technical, decisive, no shooting.',
        check: {
          skill: 'computers',
          secondarySkill: 'electricalEngineering',
          participation: 'individual',
        },
        effects: { hours: 1, crewStress: 7 },
        outcomes: {
          exceptional: {
            text: 'You override the interlocks and blow the lock section at the exact moment their seal is at its weakest. They are gone before they were ever really aboard, and their cutting rig is still attached to your hull.',
            effects: {
              morale: 13,
              crewXp: 16,
              items: [{ itemId: 'plasma_cutter', qty: 1, condition: 60 }],
            },
          },
          success: {
            text: 'The lock section vents and takes their breaching seal with it. Whoever was in there is no longer a problem.',
            effects: { systems: { hull: -5 }, morale: 8, crewXp: 10 },
          },
          partial: {
            text: 'The vent goes late. It takes their equipment and not all of them, and two of them are in the corridor.',
            effects: { systems: { hull: -6 }, combat: 'enc_pirate_boarders', crewStress: 9 },
          },
          failure: {
            text: 'The interlocks refuse to override in the time you have. The hatch comes down with everybody standing in the open.',
            effects: { combat: 'enc_pirate_boarders', crewStress: 12, morale: -5 },
          },
          criticalFailure: {
            text: 'You vent the wrong section. The lock holds, the aft compartment does not, and there are boarders in the corridor while you are chasing a decompression alarm.',
            effects: {
              systems: { hull: -18, lifeSupport: -8 },
              combat: 'enc_pirate_boarders',
              morale: -9,
              crewStress: 17,
            },
          },
        },
      },
      {
        id: 'hide-the-cargo',
        label: 'Hide everything that matters and let them take the rest',
        hint: 'They want cargo, not a fight.',
        check: {
          skill: 'stealth',
          secondarySkill: 'scavenging',
          participation: 'duo',
        },
        effects: { hours: 2, crewStress: 8 },
        outcomes: {
          exceptional: {
            text: 'Everything of value goes into voids they will never find, and the decoy cargo you leave out is convincing enough that they take it and go quickly.',
            effects: { credits: -150, morale: 7, crewXp: 14 },
          },
          success: {
            text: 'They come aboard, take what is in plain sight, and leave without going through the ship. It costs you a hold’s worth of nothing much.',
            effects: { credits: -450, morale: 2, crewXp: 8 },
          },
          partial: {
            text: 'They find one of the caches. They take it and look harder at everything after that.',
            effects: { credits: -900, crewStress: 8, morale: -4 },
          },
          failure: {
            text: 'The hiding is obvious to people who do this for a living. They strip the hold and take a great deal of pleasure in doing it slowly.',
            effects: { credits: -1400, food: -3, morale: -9, crewStress: 12 },
          },
          criticalFailure: {
            text: 'Somebody is found in a compartment they should not have been in and it turns immediately into a fight nobody was set up for.',
            effects: { combat: 'enc_pirate_boarders', morale: -8, crewStress: 15 },
          },
        },
      },
      {
        id: 'talk-through-the-hatch',
        label: 'Open the channel and talk to them through the hatch',
        hint: 'Nobody has fired yet.',
        check: {
          skill: 'persuasion',
          attributes: ['charisma', 'composure'],
          participation: 'individual',
        },
        effects: { hours: 1, crewStress: 6 },
        outcomes: {
          exceptional: {
            text: 'You establish who they are, what they need, and that {ship} is carrying nothing worth the fuel they have already spent. They stop cutting and ask for water, and you give them water.',
            effects: { food: -1, morale: 10, crewXp: 16, crewStress: -5 },
          },
          success: {
            text: 'A negotiated withdrawal: a share of your stores and no violence. They stop cutting.',
            effects: { food: -2, credits: -250, morale: 4, crewXp: 9 },
          },
          partial: {
            text: 'They keep talking and keep cutting. You buy ninety seconds and everyone uses it to get into position.',
            effects: { combat: 'enc_pirate_boarders', crewStress: 8 },
          },
          failure: {
            text: 'They have no interest in a conversation. The hatch glows through and the talking stops.',
            effects: { combat: 'enc_pirate_boarders', crewStress: 11 },
          },
          criticalFailure: {
            text: 'You let something slip about the cargo and their tone changes entirely. Whatever they came for, they want it much more now.',
            effects: { combat: 'enc_pirate_boarders', morale: -7, crewStress: 14 },
          },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'hos-shadow-in-the-lane',
    scope: ['hostile'],
    title: 'The Ship That Keeps Pace',
    body:
      'There has been a contact on the same vector for eleven hours now, sitting at the edge of sensor range and matching every course change {ship} makes. It has not hailed. It has not closed. {actor} has been watching the plot since the sixth hour and has stopped pretending it is a coincidence.',
    weight: 11,
    conditions: { minDanger: 25 },
    tags: ['pursuit', 'tension', 'evasion'],
    choices: [
      {
        id: 'go-dark',
        label: 'Go dark and change course',
        hint: 'Cold, quiet, and slow.',
        check: {
          skill: 'stealth',
          secondarySkill: 'piloting',
          participation: 'duo',
        },
        effects: { hours: 4, crewStress: 5 },
        outcomes: {
          exceptional: {
            text: 'Emissions down to nothing, one long unpowered drift, and a course change made on cold gas alone. When you come back up they are ninety degrees off and hunting empty space.',
            effects: { morale: 11, crewXp: 16, crewStress: -4 },
          },
          success: {
            text: 'Dark for six hours and a new heading. The contact is gone from the plot by the next watch.',
            effects: { morale: 6, crewXp: 9 },
          },
          partial: {
            text: 'They lose you and reacquire two hours later, further back than before. You have bought distance, not safety.',
            effects: { crewStress: 6 },
          },
          failure: {
            text: 'Whatever they are tracking you with does not care about your emissions. They are exactly where they were.',
            effects: { morale: -5, crewStress: 9, fuel: -2 },
          },
          criticalFailure: {
            text: 'Running dark you miss a debris return until it is close enough to matter, and the contact closes while you are dealing with the consequences.',
            effects: {
              systems: { hull: -11 },
              crewStress: 13,
              combat: 'enc_smuggler_ambush',
            },
          },
        },
      },
      {
        id: 'hail-them',
        label: 'Hail them first and ask what they want',
        hint: 'Takes the initiative away from them.',
        check: {
          skill: 'persuasion',
          attributes: ['composure', 'socialAwareness'],
          participation: 'individual',
        },
        effects: { hours: 2 },
        outcomes: {
          exceptional: {
            text: 'It turns out they were shadowing you because they thought you were somebody else, and the conversation ends with a route warning and a working frequency. You have made a contact rather than an enemy.',
            effects: { morale: 10, crewXp: 14, flag: { key: 'lane_contact_made', value: true } },
          },
          success: {
            text: 'A short, careful exchange. They break off within the hour without ever saying why they were there.',
            effects: { morale: 6, crewXp: 8, crewStress: -3 },
          },
          partial: {
            text: 'They answer in monosyllables and stay exactly where they are. Now they know you have noticed.',
            effects: { crewStress: 6 },
          },
          failure: {
            text: 'The hail confirms for them that you are worried, which confirms for them that you are worth following.',
            effects: { morale: -5, crewStress: 9 },
          },
          criticalFailure: {
            text: 'They answer, ask two specific questions about your cargo, and close to weapons range while you are still deciding how to reply.',
            effects: { crewStress: 12, combat: 'enc_smuggler_ambush' },
          },
        },
      },
      {
        id: 'turn-and-face',
        label: 'Turn and put the guns on them',
        hint: 'Ends the ambiguity one way or another.',
        check: {
          skill: 'shipWeapons',
          secondarySkill: 'piloting',
          participation: 'duo',
        },
        effects: { hours: 2, crewStress: 8 },
        outcomes: {
          exceptional: {
            text: 'You come about hard with a firing solution already locked and hold it. They break off so fast they burn fuel they clearly could not afford.',
            effects: { morale: 12, crewXp: 15 },
          },
          success: {
            text: 'A turn, a lock, and a very clear message. The contact falls away and does not come back.',
            effects: { morale: 8, crewXp: 9, fuel: -2 },
          },
          partial: {
            text: 'They match your turn and sit just outside effective range. Nothing is resolved and everybody is now very tired.',
            effects: { fuel: -3, crewStress: 8 },
          },
          failure: {
            text: 'Turning toward them was what they were waiting for. They close hard.',
            effects: { crewStress: 11, combat: 'enc_smuggler_ambush' },
          },
          criticalFailure: {
            text: 'The turn scrubs your speed and the firing solution never locks. They are inside your envelope before the gunner has anything to shoot at.',
            effects: {
              fuel: -3,
              systems: { shields: -8 },
              crewStress: 14,
              combat: 'enc_smuggler_ambush',
            },
          },
        },
      },
      {
        id: 'do-nothing',
        label: 'Do nothing and keep flying',
        hint: 'Costs nothing but sleep.',
        effects: { hours: 2 },
        result: {
          text: 'You hold course and let them sit out there. They shadow you for another nineteen hours and then, without ever explaining themselves, they are gone. Nobody sleeps well.',
          effects: { crewStress: 10, morale: -3 },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'hos-scavenger-standoff',
    scope: ['hostile'],
    title: 'They Were Here First',
    body:
      'The wreck you came to strip already has people in it, and they have come out to the edge of the hull to make that point. Six or seven of them, mixed weapons, nobody in charge that you can identify. Nobody has raised anything yet, {captain}, and the moment somebody does, it will be too late to have this conversation.',
    weight: 12,
    conditions: { minDanger: 20 },
    tags: ['salvage', 'territory', 'standoff'],
    choices: [
      {
        id: 'split-the-wreck',
        label: 'Propose splitting the wreck',
        hint: 'There is usually enough.',
        check: {
          skill: 'negotiation',
          secondarySkill: 'persuasion',
          participation: 'individual',
        },
        effects: { hours: 3 },
        outcomes: {
          exceptional: {
            text: 'You divide it by section, agree on a boundary, and end up trading tools across it by the second hour. Both crews come away with more than either would have taken alone.',
            effects: {
              morale: 11,
              crewXp: 14,
              items: [
                { itemId: 'salvage_scrap', qty: 3 },
                { itemId: 'trade_machine_parts', qty: 1 },
              ],
              credits: 250,
            },
          },
          success: {
            text: 'A boundary line and a nod. Your people work the aft third and nobody bothers anybody.',
            effects: { morale: 6, crewXp: 8, items: [{ itemId: 'salvage_scrap', qty: 2 }] },
          },
          partial: {
            text: 'They agree to a split and take the better half. You are not in a position to argue about it.',
            effects: { items: [{ itemId: 'salvage_scrap', qty: 1 }], crewStress: 4 },
          },
          failure: {
            text: 'They tell you the wreck is theirs and they were here first, which is true. You leave with nothing.',
            effects: { morale: -5, crewStress: 6 },
          },
          criticalFailure: {
            text: 'Somebody in the back of their group decides the negotiation is a stalling tactic and moves first.',
            effects: { crewStress: 11, combat: 'enc_scavenger_gang' },
          },
        },
      },
      {
        id: 'buy-them-out',
        label: 'Buy their claim',
        hint: 'Credits instead of blood.',
        requires: { minCredits: 400 },
        effects: { hours: 2, credits: -400 },
        result: {
          text: 'Four hundred credits and they pack up and leave you the whole wreck. It is more than their share was worth and considerably less than a fight.',
          effects: { morale: 4, crewStress: -3, items: [{ itemId: 'salvage_scrap', qty: 3 }] },
        },
      },
      {
        id: 'back-out',
        label: 'Back out and find another wreck',
        hint: 'Costs hours and nothing else.',
        effects: { hours: 4 },
        result: {
          text: 'You put your hands where they can be seen and walk your people back to the ship. Four hours gone and everyone still has all their parts.',
          effects: { morale: -3, crewStress: -2 },
        },
      },
      {
        id: 'take-it',
        label: 'Take the wreck',
        hint: 'They are not soldiers.',
        effects: { hours: 1, crewStress: 9 },
        result: {
          text: 'You move first and you move together, and whatever these people were before the evacuation, they are not equipped for this.',
          effects: { combat: 'enc_scavenger_gang', morale: -4 },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'hos-two-at-the-hatch',
    scope: ['hostile'],
    title: 'Two of Them at the Ramp',
    body:
      'A pair of scavengers have got as far as the base of the loading ramp and are trying to work out whether {ship} is occupied. They are thin, badly armed, and about as dangerous as any two desperate people with a pry bar. They have not seen you yet.',
    weight: 13,
    routine: true,
    conditions: { minDanger: 5, maxDanger: 55 },
    tags: ['scavengers', 'routine', 'intrusion'],
    choices: [
      {
        id: 'shout-them-off',
        label: 'Show yourself and tell them to move on',
        hint: 'Usually enough.',
        check: { skill: 'persuasion', participation: 'individual' },
        effects: { hours: 1 },
        outcomes: {
          exceptional: {
            text: 'You come down the ramp with your hands empty and send them off with a ration pack each. One of them tells you which of the local salvage yards pays honestly.',
            effects: { food: -1, morale: 6, crewXp: 8, flag: { key: 'honest_yard_tip', value: true } },
          },
          success: {
            text: 'They see the crew, decide against it, and go. Nobody has to do anything else.',
            effects: { morale: 2, crewXp: 4 },
          },
          partial: {
            text: 'They back off to the edge of the pad and wait there, which means somebody has to stay on the ramp all night.',
            effects: { crewStress: 4 },
          },
          failure: {
            text: 'They call your bluff and keep working at the ramp mechanism, and now it has to be dealt with properly.',
            effects: { crewStress: 5, combat: 'enc_scavenger_pair' },
          },
          criticalFailure: {
            text: 'One of them panics at the sight of you and swings the pry bar before anybody can say anything.',
            effects: { crewStress: 7, combat: 'enc_scavenger_pair' },
          },
        },
      },
      {
        id: 'give-them-something',
        label: 'Give them food and send them on their way',
        hint: 'One crew-day of rations.',
        requires: { minFood: 1 },
        effects: { hours: 1, food: -1 },
        result: {
          text: 'Two ration packs handed down the ramp and a direction to walk in. They take both and they go, and word gets around that this ship does not shoot people.',
          effects: { morale: 5, crewStress: -3 },
        },
      },
      {
        id: 'run-them-off',
        label: 'Run them off hard',
        hint: 'Fast and unkind.',
        effects: { hours: 1 },
        result: {
          text: 'Two of your crew come down the ramp shouting with weapons visible and the pair scatter into the dark. It works and nobody feels good about it.',
          effects: { morale: -3, crewStress: 2 },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'hos-desperate-looters',
    scope: ['hostile'],
    title: 'They Only Want the Food',
    body:
      'Four of them come out of the shelter blocks at {location} and go straight for the cargo ramp, and they are not carrying anything you would call a weapon. They are carrying children’s bags and pry bars. {actor} has a clear shot and is waiting for you to say something, {captain}.',
    weight: 11,
    conditions: { minDanger: 10, maxDanger: 70 },
    tags: ['refugees', 'desperation', 'mercy'],
    choices: [
      {
        id: 'feed-them',
        label: 'Give them food and let them go',
        hint: 'Costs stores you need.',
        requires: { minFood: 3 },
        effects: { hours: 2, food: -3 },
        result: {
          text: 'You put three days of rations on the ramp and step back. They take it and one of them stops to say something you do not catch, and then they are gone into the blocks.',
          effects: { morale: 8, crewStress: -5, crewXp: 4 },
        },
      },
      {
        id: 'talk-them-down',
        label: 'Talk them out of it',
        hint: 'They do not want this either.',
        check: {
          skill: 'persuasion',
          attributes: ['charisma', 'socialAwareness'],
          participation: 'individual',
        },
        effects: { hours: 2 },
        outcomes: {
          exceptional: {
            text: 'You get them talking instead of moving, and by the end you know where the shelter’s remaining stores are and they know where the relief convoy is landing. Nobody takes anything and nobody needed to.',
            effects: { morale: 12, crewXp: 15, crewStress: -6, flag: { key: 'shelter_contact', value: true } },
          },
          success: {
            text: 'They stop, listen, and leave without the pry bars ever coming up. It costs you nothing but nerve.',
            effects: { morale: 8, crewXp: 9, crewStress: -3 },
          },
          partial: {
            text: 'Two of them listen. Two of them take what they can reach and run, and nobody chases them.',
            effects: { food: -2, morale: 3, crewStress: 4 },
          },
          failure: {
            text: 'They are past talking. They are at the ramp and they are not stopping for words.',
            effects: { crewStress: 8, combat: 'enc_desperate_looters' },
          },
          criticalFailure: {
            text: 'Something you say is heard as a threat to people who have been threatened all week. It goes badly and fast.',
            effects: { morale: -6, crewStress: 12, combat: 'enc_desperate_looters' },
          },
        },
      },
      {
        id: 'hire-one',
        label: 'Offer one of them work instead',
        hint: 'A berth costs less than a fight.',
        check: {
          skill: 'negotiation',
          attributes: ['evaluation', 'charisma'],
          participation: 'individual',
        },
        effects: { hours: 3 },
        outcomes: {
          exceptional: {
            text: 'One of them turns out to have twelve years in a fabrication yard and nothing left to stay for. They walk up the ramp with you and the rest go with food and a message.',
            effects: { food: -2, recruit: true, morale: 10, crewXp: 12 },
          },
          success: {
            text: 'You take one aboard on trial terms and send the others off with rations. It is not charity and it is not robbery.',
            effects: { food: -2, recruit: true, morale: 6, crewXp: 8 },
          },
          partial: {
            text: 'Nobody wants a berth on a ship going further out. They take the food you offered and go.',
            effects: { food: -2, morale: 3 },
          },
          failure: {
            text: 'The offer is heard as an attempt to buy them off, and the mood turns. They leave angry and empty-handed.',
            effects: { morale: -5, crewStress: 7 },
          },
          criticalFailure: {
            text: 'One of them takes the offer as a chance to get close to the ramp. It stops being a negotiation immediately.',
            effects: { crewStress: 11, combat: 'enc_desperate_looters' },
          },
        },
      },
      {
        id: 'defend-the-hold',
        label: 'Defend the hold',
        hint: 'The stores are the crew’s survival too.',
        effects: { hours: 1, crewStress: 10 },
        result: {
          text: 'You give the order and your people move to the ramp. It is over quickly, and it is going to sit with everybody for a long time.',
          effects: { combat: 'enc_desperate_looters', morale: -8 },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'hos-claim-jumpers',
    scope: ['hostile'],
    title: 'Somebody Else’s Marker',
    body:
      'Your survey team has been working the seam for six hours when a second crew comes over the ridge with a survey marker of their own and a foreman who is already shouting. They claim the ground, they have the equipment to work it, and they have three rifles between them for a reason. Out here at {location}, claims are whatever both parties agree they are.',
    weight: 10,
    conditions: { minDanger: 25 },
    tags: ['claim', 'mining', 'dispute'],
    choices: [
      {
        id: 'argue-the-claim',
        label: 'Argue the claim on the record',
        hint: 'Paperwork beats rifles, sometimes.',
        check: {
          skill: 'negotiation',
          attributes: ['reasoning', 'socialAwareness'],
          participation: 'individual',
        },
        effects: { hours: 4 },
        outcomes: {
          exceptional: {
            text: 'You produce timestamps, survey logs, and a filing reference, and the foreman’s whole posture changes. You end up with the seam and a standing offer to buy your ore at their price.',
            effects: {
              credits: 600,
              items: [{ itemId: 'trade_rare_minerals', qty: 1 }],
              morale: 10,
              crewXp: 15,
            },
          },
          success: {
            text: 'Your claim is better documented than theirs and they know it. They take the lower seam and leave you the good ground.',
            effects: { items: [{ itemId: 'trade_ore_crate', qty: 2 }], morale: 6, crewXp: 9 },
          },
          partial: {
            text: 'Neither claim is clean. You split the seam and both crews work it badly, watching each other.',
            effects: { items: [{ itemId: 'trade_ore_crate', qty: 1 }], crewStress: 5 },
          },
          failure: {
            text: 'Their filing predates yours by two days. You pack up your equipment under supervision.',
            effects: { morale: -6, crewStress: 7 },
          },
          criticalFailure: {
            text: 'The argument gets loud enough that somebody’s rifle comes off their shoulder, and after that the paperwork stops mattering.',
            effects: { crewStress: 12, combat: 'enc_claim_jumpers' },
          },
        },
      },
      {
        id: 'buy-the-claim',
        label: 'Buy them out of the ground',
        hint: 'Costs credits, saves everything else.',
        requires: { minCredits: 700 },
        effects: { hours: 3, credits: -700 },
        result: {
          text: 'The foreman takes the money because the money is real and the seam is a maybe. Both crews shake on it and one of them drives away.',
          effects: { items: [{ itemId: 'trade_ore_crate', qty: 2 }], morale: 4, crewXp: 5 },
        },
      },
      {
        id: 'work-fast-and-leave',
        label: 'Strip what you can before it escalates',
        hint: 'Speed over rights.',
        check: {
          skill: 'scavenging',
          secondarySkill: 'exploration',
          participation: 'trio',
        },
        effects: { hours: 5, crewStress: 6 },
        outcomes: {
          exceptional: {
            text: 'Your people load the best of the seam in ninety minutes while the foreman is still radioing his office. You are two ridges away before anyone thinks to follow.',
            effects: {
              items: [
                { itemId: 'trade_rare_minerals', qty: 2 },
                { itemId: 'trade_ore_crate', qty: 1 },
              ],
              morale: 7,
              crewXp: 12,
            },
          },
          success: {
            text: 'You take a full load and go, leaving them the ground and no reason to chase you.',
            effects: { items: [{ itemId: 'trade_ore_crate', qty: 2 }], crewXp: 7 },
          },
          partial: {
            text: 'Half a load before they physically stand in front of the cutter. You leave with what is already crated.',
            effects: { items: [{ itemId: 'trade_ore_crate', qty: 1 }], crewStress: 5 },
          },
          failure: {
            text: 'They stop the work within the hour and stand over your equipment while you pack it. Nothing gained.',
            effects: { morale: -5, crewStress: 8 },
          },
          criticalFailure: {
            text: 'Somebody drops a crate of your gear during the rush and one of theirs takes it as an act of aggression.',
            effects: { crewStress: 12, combat: 'enc_claim_jumpers' },
          },
        },
      },
      {
        id: 'hold-the-ground',
        label: 'Hold the ground',
        hint: 'You were here first.',
        effects: { hours: 1, crewStress: 10 },
        result: {
          text: 'You put the survey team behind cover and tell the foreman exactly where the line is. He tests it.',
          effects: { combat: 'enc_claim_jumpers', morale: -2 },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'hos-security-shakedown',
    scope: ['hostile'],
    title: 'A Compliance Inspection',
    body:
      'Six station security officers in riot kit are standing at the base of your ramp with a clipboard and no warrant, and the sergeant explains that {ship} has been selected for a compliance inspection. The inspection fee is payable now, in cash, and the alternative is an impound that takes four to six weeks to appeal. This is not law, {captain}. It is dressed like law.',
    weight: 10,
    conditions: { minDanger: 30 },
    tags: ['corruption', 'authority', 'extortion'],
    choices: [
      {
        id: 'pay-the-fee',
        label: 'Pay the fee',
        hint: 'Fast and galling.',
        requires: { minCredits: 500 },
        effects: { hours: 2, credits: -500 },
        result: {
          text: 'The sergeant signs a form that means nothing and the squad walks away. {ship} is cleared for departure and everybody aboard has to swallow it.',
          effects: { morale: -6, crewStress: -3 },
        },
      },
      {
        id: 'lawyer-them',
        label: 'Demand the paperwork and the regulation it cites',
        hint: 'Bureaucracy as a weapon.',
        check: {
          skill: 'negotiation',
          attributes: ['memory', 'composure'],
          participation: 'individual',
        },
        effects: { hours: 4 },
        outcomes: {
          exceptional: {
            text: 'You cite the docking code back at him, by section, and ask for his authorising officer by name. The squad is gone in six minutes and you are not on the list next time either.',
            effects: { morale: 12, crewXp: 15, flag: { key: 'station_security_backed_off', value: true } },
          },
          success: {
            text: 'The paperwork does not exist and the sergeant does not want it on record that you asked. The fee evaporates.',
            effects: { morale: 8, crewXp: 9 },
          },
          partial: {
            text: 'He halves the fee to make you go away and marks your registry for a real inspection next visit.',
            effects: { credits: -250, crewStress: 4 },
          },
          failure: {
            text: 'He listens to all of it, agrees that you are correct, and doubles the fee for the inconvenience.',
            effects: { credits: -900, morale: -7, crewStress: 8 },
          },
          criticalFailure: {
            text: 'Somewhere in the fourth minute you embarrass him in front of his squad, and the batons come off the belts.',
            effects: { crewStress: 13, combat: 'enc_security_patrol' },
          },
        },
      },
      {
        id: 'let-them-search',
        label: 'Let them inspect the ship',
        hint: 'Costs time and whatever they decide to confiscate.',
        effects: { hours: 6 },
        result: {
          text: 'Six hours of six people going through your ship and taking anything that catches their eye. They find nothing illegal and leave with three hundred credits of your equipment anyway.',
          effects: { credits: -300, repairParts: -1, morale: -5, crewStress: 7 },
        },
      },
      {
        id: 'button-up-and-go',
        label: 'Close the ramp and lift without clearance',
        hint: 'Burns the port. Keeps the money.',
        requires: { minFuel: 4 },
        check: {
          skill: 'piloting',
          secondarySkill: 'computers',
          participation: 'duo',
          criticalRisk: true,
        },
        effects: { hours: 2, fuel: -4 },
        outcomes: {
          exceptional: {
            text: 'Ramp up, clamps blown, and away on a vector their traffic control cannot legally pursue. Somebody aboard is going to be telling this story for years.',
            effects: { morale: 13, crewXp: 16, flag: { key: 'banned_from_port', value: true } },
          },
          success: {
            text: 'You are off the pad before the squad has finished shouting. That port is closed to you now, and it was not much of a port.',
            effects: { morale: 7, crewXp: 9, flag: { key: 'banned_from_port', value: true } },
          },
          partial: {
            text: 'You get off the ground and take a docking clamp with you. The hull will need work.',
            effects: {
              systems: { hull: -9 },
              morale: 2,
              crewStress: 8,
              flag: { key: 'banned_from_port', value: true },
            },
          },
          failure: {
            text: 'The clamps do not release in time and the squad is up the ramp before it seals.',
            effects: { crewStress: 12, combat: 'enc_security_patrol' },
          },
          criticalFailure: {
            text: 'A clamp holds on one side and the ship pivots into the gantry. Now you have a damaged hull, a wrecked pad, and a squad with an actual reason.',
            effects: {
              systems: { hull: -17, engines: -8 },
              morale: -6,
              crewStress: 16,
              combat: 'enc_security_patrol',
            },
          },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'hos-rogue-drone',
    scope: ['hostile'],
    title: 'It Has Painted You',
    body:
      'An automated defence drone from a war nobody aboard remembers has come up off the surface and locked onto {ship}. Its transponder is dead and its target discrimination is forty years out of date. {actor} says it is running an approach profile and it is not answering hails.',
    weight: 10,
    conditions: { minDanger: 20 },
    tags: ['drone', 'automation', 'threat'],
    choices: [
      {
        id: 'spoof-it',
        label: 'Spoof a friendly transponder code',
        hint: 'Beat it with software.',
        check: {
          skill: 'computers',
          secondarySkill: 'electricalEngineering',
          participation: 'individual',
        },
        effects: { hours: 3 },
        outcomes: {
          exceptional: {
            text: 'You find the era, find the code family, and broadcast a maintenance recall. The drone breaks lock, comes alongside, and powers down for servicing that will never come.',
            effects: {
              morale: 12,
              crewXp: 18,
              items: [
                { itemId: 'sensor_module', qty: 1, condition: 70 },
                { itemId: 'power_cell', qty: 2 },
              ],
            },
          },
          success: {
            text: 'A plausible friendly code and the lock drops. It goes back to patrolling empty sky.',
            effects: { morale: 7, crewXp: 11 },
          },
          partial: {
            text: 'The code confuses it for ninety seconds, which is long enough to get out of its engagement envelope and no longer.',
            effects: { fuel: -2, crewStress: 7 },
          },
          failure: {
            text: 'It rejects the code and escalates. Whatever it thinks you are, it is now certain about it.',
            effects: { crewStress: 10, combat: 'enc_rogue_drone' },
          },
          criticalFailure: {
            text: 'Your broadcast matches a hostile profile in its ancient library. It stops approaching and starts attacking.',
            effects: { systems: { shields: -6 }, crewStress: 13, combat: 'enc_rogue_drone' },
          },
        },
      },
      {
        id: 'outfly-it',
        label: 'Outfly it into terrain',
        hint: 'It is old. You are not.',
        requires: { minFuel: 3 },
        check: {
          skill: 'piloting',
          attributes: ['handEye', 'perception'],
          participation: 'individual',
        },
        effects: { hours: 2, fuel: -3 },
        outcomes: {
          exceptional: {
            text: 'You take it into a canyon system its guidance was never written for and it puts itself into a wall at three hundred metres per second.',
            effects: { morale: 11, crewXp: 16, items: [{ itemId: 'salvage_scrap', qty: 2 }] },
          },
          success: {
            text: 'Terrain masking and a hard break, and it loses you against the ground clutter.',
            effects: { morale: 6, crewXp: 9 },
          },
          partial: {
            text: 'You break the lock and clip something doing it.',
            effects: { systems: { hull: -7 }, crewStress: 6 },
          },
          failure: {
            text: 'It is slower than you and it does not get tired. It reacquires and closes.',
            effects: { fuel: -2, crewStress: 10, combat: 'enc_rogue_drone' },
          },
          criticalFailure: {
            text: 'You misjudge a ridge line at speed and take real damage from the terrain before the drone has fired a shot.',
            effects: {
              systems: { hull: -15, engines: -7 },
              crewStress: 14,
              combat: 'enc_rogue_drone',
            },
          },
        },
      },
      {
        id: 'shoot-it-down',
        label: 'Shoot it down',
        hint: 'It is a machine. Machines break.',
        effects: { hours: 1, crewStress: 6 },
        result: {
          text: 'The gunner takes the seat and puts the mount on it. Nobody has to feel anything complicated about this one.',
          effects: { combat: 'enc_rogue_drone' },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'hos-derelict-squatters',
    scope: ['hostile'],
    title: 'The Lights Are On Inside',
    body:
      'The derelict you have docked with is not as dead as the survey said. There are lights in the aft section, a hand-lettered warning at the junction, and the smell of people who have been living here a while. Whoever they are, they know you are aboard now.',
    weight: 10,
    conditions: { minDanger: 15 },
    tags: ['derelict', 'squatters', 'territory'],
    choices: [
      {
        id: 'announce-yourselves',
        label: 'Call out and announce who you are',
        hint: 'Removes the ambush from both sides.',
        check: {
          skill: 'persuasion',
          attributes: ['charisma', 'composure'],
          participation: 'individual',
        },
        effects: { hours: 2 },
        outcomes: {
          exceptional: {
            text: 'You shout down the corridor before anybody rounds a corner, and what comes back is a woman asking whether you have any antibiotics. You trade medicine for the location of everything worth taking aboard.',
            effects: {
              medicine: -1,
              items: [
                { itemId: 'data_core', qty: 1 },
                { itemId: 'salvage_scrap', qty: 2 },
              ],
              morale: 10,
              crewXp: 14,
            },
          },
          success: {
            text: 'They come out with their hands visible and an arrangement gets made: you take the forward sections, they keep the aft.',
            effects: { items: [{ itemId: 'salvage_scrap', qty: 2 }], morale: 6, crewXp: 8 },
          },
          partial: {
            text: 'They answer, they do not come out, and both parties spend the next three hours working very carefully around each other.',
            effects: { items: [{ itemId: 'salvage_scrap', qty: 1 }], crewStress: 5 },
          },
          failure: {
            text: 'The answer is a warning shot into the deck plating and an instruction to leave. You leave.',
            effects: { morale: -5, crewStress: 7 },
          },
          criticalFailure: {
            text: 'Somebody in there has been waiting a long time for people like you to come aboard, and they do not want to talk.',
            effects: { crewStress: 11, combat: 'enc_derelict_squatters' },
          },
        },
      },
      {
        id: 'work-quietly',
        label: 'Strip the forward sections quietly and leave',
        hint: 'They never have to know.',
        check: {
          skill: 'stealth',
          secondarySkill: 'scavenging',
          participation: 'trio',
        },
        effects: { hours: 5 },
        outcomes: {
          exceptional: {
            text: 'Four hours of very careful work and you are back aboard with a full load before anybody in the aft section knows the forward hatch was ever opened.',
            effects: {
              items: [
                { itemId: 'salvage_scrap', qty: 3 },
                { itemId: 'sensor_module', qty: 1, condition: 50 },
                { itemId: 'antique_navcomp', qty: 1 },
              ],
              morale: 8,
              crewXp: 15,
            },
          },
          success: {
            text: 'You get what you came for and get out without being seen.',
            effects: { items: [{ itemId: 'salvage_scrap', qty: 2 }], crewXp: 9 },
          },
          partial: {
            text: 'Somebody knocks something over two compartments away. You take half a load and go early.',
            effects: { items: [{ itemId: 'salvage_scrap', qty: 1 }], crewStress: 6 },
          },
          failure: {
            text: 'They find you in the forward hold with your hands full. There is a long, ugly conversation and you leave with nothing.',
            effects: { morale: -5, crewStress: 9 },
          },
          criticalFailure: {
            text: 'You walk into a tripline strung across a dark junction, and the people who strung it are already moving.',
            effects: {
              crewStress: 13,
              wound: { severityScore: 28, damageType: 'blunt' },
              combat: 'enc_derelict_squatters',
            },
          },
        },
      },
      {
        id: 'trade-for-passage',
        label: 'Offer food for free run of the forward sections',
        hint: 'Simple, honest, costs stores.',
        requires: { minFood: 2 },
        effects: { hours: 3, food: -2 },
        result: {
          text: 'Two crew-days of rations pushed down the corridor and an agreement shouted back. They keep to their half and you strip yours in peace.',
          effects: { items: [{ itemId: 'salvage_scrap', qty: 2 }], morale: 5, crewXp: 5 },
        },
      },
      {
        id: 'clear-the-hulk',
        label: 'Clear them out',
        hint: 'The whole wreck, and the whole cost.',
        effects: { hours: 2, crewStress: 10 },
        result: {
          text: 'You go in by sections with the crew spread and the lamps on. Whatever these people were doing here, they are not doing it after tonight.',
          effects: { combat: 'enc_derelict_squatters', morale: -6 },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'hos-smuggler-ambush',
    scope: ['hostile'],
    title: 'The Cargo Was Not Theirs to Sell',
    body:
      'Halfway through a straightforward pickup in a service corridor at {location}, the crew you are buying from stop talking and start moving to the walls. Somebody else has come through the far hatch, and from the way both groups are standing, this cargo has been sold twice. {actor} is holding a crate that has suddenly become the least important thing in the room.',
    weight: 10,
    conditions: { minDanger: 35 },
    tags: ['ambush', 'smuggling', 'crossfire'],
    choices: [
      {
        id: 'get-out',
        label: 'Drop the crate and get your people out',
        hint: 'Lose the deal, keep the crew.',
        check: {
          skill: 'stealth',
          secondarySkill: 'closeQuarters',
          participation: 'group',
        },
        effects: { hours: 1, crewStress: 8 },
        outcomes: {
          exceptional: {
            text: 'You are through the service hatch and two decks down before either group has finished deciding who to shoot at. You even keep the crate.',
            effects: {
              items: [{ itemId: 'trade_chemicals', qty: 1 }],
              morale: 9,
              crewXp: 15,
            },
          },
          success: {
            text: 'Everybody out, nothing fired, deal gone. It cost you the deposit and nothing else.',
            effects: { credits: -300, morale: 4, crewXp: 9 },
          },
          partial: {
            text: 'You get out with one person separated from the group for a very long two minutes.',
            effects: { credits: -300, crewStress: 10, morale: -3 },
          },
          failure: {
            text: 'The far hatch is covered and the near one is where they came from. You are in it.',
            effects: { crewStress: 12, combat: 'enc_smuggler_ambush' },
          },
          criticalFailure: {
            text: 'Somebody breaks the wrong way across an open corridor and takes a round doing it. Now you are fighting and carrying.',
            effects: {
              crewStress: 15,
              wound: { severityScore: 51, damageType: 'pierce' },
              combat: 'enc_smuggler_ambush',
            },
          },
        },
      },
      {
        id: 'broker-it',
        label: 'Put yourself between them and broker it',
        hint: 'Enormously risky. Occasionally brilliant.',
        check: {
          skill: 'negotiation',
          secondarySkill: 'persuasion',
          attributes: ['composure', 'socialAwareness'],
          participation: 'individual',
          criticalRisk: true,
        },
        effects: { hours: 2, crewStress: 6 },
        outcomes: {
          exceptional: {
            text: 'You buy the cargo twice, at half price each, in front of both parties, and walk out of the corridor with the crate and two new contacts. Nobody quite understands how that happened.',
            effects: {
              credits: -500,
              items: [
                { itemId: 'trade_chemicals', qty: 2 },
                { itemId: 'trade_volatiles', qty: 1 },
              ],
              morale: 14,
              crewXp: 20,
            },
          },
          success: {
            text: 'You get both sides talking about money instead of angles. Everyone leaves poorer and intact.',
            effects: { credits: -600, items: [{ itemId: 'trade_chemicals', qty: 1 }], morale: 8, crewXp: 12 },
          },
          partial: {
            text: 'They agree to sort it out between themselves elsewhere. You leave with your deposit gone and your crew whole.',
            effects: { credits: -400, crewStress: 6 },
          },
          failure: {
            text: 'You are standing in the middle of a corridor between two groups who have stopped listening.',
            effects: { crewStress: 13, combat: 'enc_smuggler_ambush' },
          },
          criticalFailure: {
            text: 'Both sides decide, simultaneously, that you are the one who set this up.',
            effects: {
              crewStress: 16,
              morale: -7,
              wound: { severityScore: 47, damageType: 'pierce' },
              combat: 'enc_smuggler_ambush',
            },
          },
        },
      },
      {
        id: 'shoot-first',
        label: 'Take the near group before they are set',
        hint: 'The only advantage available is surprise.',
        effects: { hours: 1, crewStress: 11 },
        result: {
          text: 'You move first, into the group you can see, in a corridor with no cover for anybody. It is the worst kind of fight and it is the one you chose.',
          effects: { combat: 'enc_smuggler_ambush', morale: -4 },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'hos-lone-gunman',
    scope: ['hostile'],
    title: 'One Shooter, Good Position',
    body:
      'The first round takes a chunk out of the crate beside {actor} and nobody heard the shot before it arrived. One shooter, elevated, patient, somewhere in the structures above the loading yard at {location}. Everyone is behind something now and nobody can move without finding out how good they are.',
    weight: 9,
    conditions: { minDanger: 40 },
    tags: ['sniper', 'pinned', 'firefight'],
    choices: [
      {
        id: 'flank-under-smoke',
        label: 'Put smoke out and flank the position',
        hint: 'The only way to end it is to reach them.',
        check: {
          skill: 'stealth',
          secondarySkill: 'closeQuarters',
          participation: 'duo',
          criticalRisk: true,
        },
        effects: { hours: 1, crewStress: 12 },
        outcomes: {
          exceptional: {
            text: 'Smoke, a wide loop through the drainage cut, and two of your people come up behind the position without a shot fired. It ends with a rifle on the deck and somebody very surprised.',
            effects: {
              morale: 14,
              crewXp: 20,
              items: [
                { itemId: 'rifle_marksman', qty: 1, condition: 65 },
                { itemId: 'ammo_rifle', qty: 12 },
              ],
              credits: 300,
            },
          },
          success: {
            text: 'The flank works and the shooter has to fight at a range they never wanted.',
            effects: { combat: 'enc_lone_gunman', morale: 5, crewXp: 12 },
          },
          partial: {
            text: 'The smoke drifts wrong and the flank stalls halfway. You are closer and still exposed.',
            effects: { combat: 'enc_lone_gunman', crewStress: 8 },
          },
          failure: {
            text: 'They see the movement through the smoke and shift position before you get there.',
            effects: {
              combat: 'enc_lone_gunman',
              crewStress: 11,
              wound: { severityScore: 44, damageType: 'pierce' },
            },
          },
          criticalFailure: {
            text: 'The flanking pair break cover into exactly the lane the shooter was watching. One of them does not make the next piece of cover.',
            effects: {
              combat: 'enc_lone_gunman',
              morale: -8,
              crewStress: 16,
              wound: { severityScore: 69, damageType: 'pierce' },
            },
          },
        },
      },
      {
        id: 'counter-fire',
        label: 'Return fire and make the position untenable',
        hint: 'A shooting contest at range.',
        check: {
          skill: 'firearms',
          attributes: ['handEye', 'steadiness'],
          participation: 'duo',
        },
        effects: { hours: 1, crewStress: 10 },
        outcomes: {
          exceptional: {
            text: 'Two of your people put steady, accurate fire onto the position and keep it there. The shooter abandons the rifle and the yard and does not look back.',
            effects: {
              morale: 12,
              crewXp: 18,
              items: [{ itemId: 'rifle_marksman', qty: 1, condition: 55 }],
            },
          },
          success: {
            text: 'Enough return fire to break their rhythm and force them down into a fight on level terms.',
            effects: { combat: 'enc_lone_gunman', morale: 4, crewXp: 10 },
          },
          partial: {
            text: 'You suppress them long enough for everyone to get behind proper cover, and no longer.',
            effects: { combat: 'enc_lone_gunman', crewStress: 7 },
          },
          failure: {
            text: 'You waste a great deal of ammunition on a position you cannot actually see.',
            effects: { combat: 'enc_lone_gunman', crewStress: 11, morale: -4 },
          },
          criticalFailure: {
            text: 'The muzzle flash tells them exactly where your best shooter is, and they were waiting for that.',
            effects: {
              combat: 'enc_lone_gunman',
              morale: -8,
              crewStress: 15,
              wound: { severityScore: 63, damageType: 'pierce' },
            },
          },
        },
      },
      {
        id: 'talk-to-them',
        label: 'Shout across the yard and find out what they want',
        hint: 'They have not killed anybody yet, which is information.',
        check: {
          skill: 'persuasion',
          attributes: ['composure', 'resilience'],
          participation: 'individual',
        },
        effects: { hours: 2, crewStress: 9 },
        outcomes: {
          exceptional: {
            text: 'The first round was a warning and the second one never comes. They want the yard, not you, and they let you walk out of it with your cargo and a name to drop next time.',
            effects: { morale: 13, crewXp: 16, flag: { key: 'yard_shooter_truce', value: true } },
          },
          success: {
            text: 'They tell you to leave the crates and go. You leave the crates and go, and nobody dies over freight.',
            effects: { credits: -400, morale: 5, crewXp: 10 },
          },
          partial: {
            text: 'A long silence, then one more round into the ground in front of you. Message received.',
            effects: { credits: -600, crewStress: 8, morale: -3 },
          },
          failure: {
            text: 'The only answer is another round through the crate you are behind.',
            effects: { combat: 'enc_lone_gunman', crewStress: 12 },
          },
          criticalFailure: {
            text: 'Standing up to shout was the mistake. You are down behind the crate again with a graze you will feel for a fortnight, and now everyone is shooting.',
            effects: {
              combat: 'enc_lone_gunman',
              crewStress: 15,
              wound: { severityScore: 42, damageType: 'pierce' },
            },
          },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'hos-mutinous-workers',
    scope: ['hostile'],
    title: 'The Yard Crew Has Had Enough',
    body:
      'The contract crew loading your hold at {location} have stopped working, and the reason is three months of unpaid wages owed by somebody who is not you. They are between your cargo and your ramp with pry bars and pipe wrenches, and they have decided that your freight is the closest thing to leverage they can reach.',
    weight: 9,
    conditions: { minDanger: 20 },
    tags: ['labour', 'grievance', 'standoff'],
    choices: [
      {
        id: 'hear-the-grievance',
        label: 'Hear them out properly',
        hint: 'They want to be heard more than they want your cargo.',
        check: {
          skill: 'persuasion',
          attributes: ['socialAwareness', 'leadership'],
          participation: 'individual',
        },
        effects: { hours: 3 },
        outcomes: {
          exceptional: {
            text: 'You listen to all of it, agree with most of it out loud, and then help them draft the demand they should have sent the yard office weeks ago. They load your hold for free and one of them asks about a berth.',
            effects: { morale: 12, crewXp: 15, recruit: true },
          },
          success: {
            text: 'An hour of genuine listening and they stand aside. The freight goes aboard slowly and without incident.',
            effects: { morale: 7, crewXp: 9 },
          },
          partial: {
            text: 'They let your cargo through and keep two crates as a message to the yard office. You are not the intended recipient.',
            effects: { credits: -250, crewStress: 4 },
          },
          failure: {
            text: 'You are wearing a captain’s coat and that is all they can see. The pry bars stay where they are.',
            effects: { morale: -5, crewStress: 8 },
          },
          criticalFailure: {
            text: 'You say something about contracts to people who have been beaten with contracts for three months.',
            effects: { crewStress: 12, combat: 'enc_mutinous_workers' },
          },
        },
      },
      {
        id: 'pay-them',
        label: 'Pay them out of your own pocket',
        hint: 'Not your debt. Solves it anyway.',
        requires: { minCredits: 800 },
        effects: { hours: 2, credits: -800 },
        result: {
          text: 'You pay a month of wages you never owed to eleven people you will never see again. The hold is loaded in ninety minutes and they load it carefully.',
          effects: { morale: 9, crewStress: -5, crewXp: 6 },
        },
      },
      {
        id: 'load-it-yourself',
        label: 'Pull your own crew in and load it yourselves',
        hint: 'Slow, heavy, and it walks past them.',
        requires: { minCrew: 3 },
        effects: { hours: 8, crewStress: 8 },
        result: {
          text: 'Your people move the whole load by hand while the yard crew watches and says nothing. It takes most of a day and nobody touches anybody.',
          effects: { morale: -3, crewXp: 5 },
        },
      },
      {
        id: 'force-the-ramp',
        label: 'Force the ramp',
        hint: 'They are dock workers, not fighters.',
        effects: { hours: 1, crewStress: 10 },
        result: {
          text: 'You put your crew forward and push through. They are not soldiers and they fight like people who have nothing left to lose, which is worse.',
          effects: { combat: 'enc_mutinous_workers', morale: -7 },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'hos-fauna-charge',
    scope: ['hostile'],
    title: 'Something Came Out of the Scrub',
    body:
      'The survey party has been on the ground four hours when the scrub on the ridge line moves in a way that scrub does not. Whatever lives here is big, fast, and has decided that {actor} is the interesting one. There is a ravine behind you and open ground in every other direction.',
    weight: 10,
    conditions: { minDanger: 15 },
    tags: ['fauna', 'wilderness', 'survival'],
    choices: [
      {
        id: 'back-away',
        label: 'Back away slowly toward the ravine',
        hint: 'Territorial animals want you gone, not eaten.',
        check: {
          skill: 'exploration',
          attributes: ['composure', 'perception'],
          participation: 'group',
        },
        effects: { hours: 2, crewStress: 7 },
        outcomes: {
          exceptional: {
            text: 'Nobody runs, nobody turns their back, and the whole party withdraws in a line to the ravine mouth. It follows to the edge of its ground and stops exactly there.',
            effects: { morale: 9, crewXp: 14 },
          },
          success: {
            text: 'A slow, awful two hundred metres, and it loses interest at the boundary of whatever it was defending.',
            effects: { morale: 5, crewXp: 8 },
          },
          partial: {
            text: 'Somebody breaks discipline near the end and it follows to the ravine before giving up.',
            effects: { crewStress: 9 },
          },
          failure: {
            text: 'Backing away reads as prey behaviour to something that has never seen a person before.',
            effects: { crewStress: 11, combat: 'enc_hostile_fauna' },
          },
          criticalFailure: {
            text: 'Somebody runs. It does exactly what you would expect a large fast animal to do about that.',
            effects: {
              crewStress: 14,
              wound: { severityScore: 46, damageType: 'slash' },
              combat: 'enc_hostile_fauna',
            },
          },
        },
      },
      {
        id: 'flares-and-noise',
        label: 'Flares, noise, and everything you have',
        hint: 'Spectacle instead of violence.',
        check: {
          skill: 'energyWeapons',
          attributes: ['decisionMaking', 'composure'],
          participation: 'duo',
        },
        effects: { hours: 1, crewStress: 6 },
        outcomes: {
          exceptional: {
            text: 'A flare into the ground in front of it, every voice on the survey team at once, and it turns and goes. Two more come out of the scrub, see the flare, and go with it.',
            effects: { morale: 10, crewXp: 13 },
          },
          success: {
            text: 'Light, noise, and size. It decides you are more trouble than you are worth.',
            effects: { morale: 6, crewXp: 8 },
          },
          partial: {
            text: 'It backs off thirty metres and circles. The survey is over either way.',
            effects: { crewStress: 8 },
          },
          failure: {
            text: 'Noise is not a deterrent to something with no reason to fear noise.',
            effects: { crewStress: 10, combat: 'enc_hostile_fauna' },
          },
          criticalFailure: {
            text: 'The flare goes into dry scrub and the ground catches. Now you are between a fire and something that is no longer cautious.',
            effects: {
              crewStress: 14,
              wound: { severityScore: 32, damageType: 'burn' },
              combat: 'enc_hostile_fauna',
            },
          },
        },
      },
      {
        id: 'shoot-it',
        label: 'Put it down before it closes',
        hint: 'You have the range advantage. For now.',
        effects: { hours: 1, crewStress: 8 },
        result: {
          text: 'The party goes to a firing line and takes it at range. Whatever it was, it was not expecting anything like this.',
          effects: { combat: 'enc_hostile_fauna' },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'hos-drones-turn',
    scope: ['hostile'],
    title: 'The Facility Still Has Staff',
    body:
      'The abandoned processing facility is not entirely abandoned: its maintenance drones are still running a work cycle forty years after the last shift ended, and they have reclassified your salvage party as debris to be cleared. They are slow, methodical, and there are more of them coming up out of the sublevels.',
    weight: 10,
    conditions: { minDanger: 15, maxDanger: 75 },
    tags: ['drones', 'facility', 'automation'],
    choices: [
      {
        id: 'shut-down-the-cycle',
        label: 'Find the controller and end the work cycle',
        hint: 'One terminal ends all of them.',
        check: {
          skill: 'computers',
          secondarySkill: 'lockpicking',
          participation: 'duo',
        },
        effects: { hours: 4, crewStress: 7 },
        outcomes: {
          exceptional: {
            text: 'You reach the supervisory terminal, end the cycle, and put the whole fleet into a docked maintenance state. Then you strip every one of them at your leisure.',
            effects: {
              items: [
                { itemId: 'power_cell', qty: 3 },
                { itemId: 'sensor_module', qty: 2, condition: 60 },
                { itemId: 'salvage_scrap', qty: 3 },
              ],
              morale: 12,
              crewXp: 18,
            },
          },
          success: {
            text: 'The cycle ends and the drones stop where they stand. The facility is suddenly very quiet and entirely yours.',
            effects: {
              items: [
                { itemId: 'power_cell', qty: 2 },
                { itemId: 'salvage_scrap', qty: 2 },
              ],
              morale: 7,
              crewXp: 11,
            },
          },
          partial: {
            text: 'You stop the ones in this section. The sublevels are on a separate controller you cannot reach.',
            effects: { items: [{ itemId: 'salvage_scrap', qty: 1 }], crewStress: 6 },
          },
          failure: {
            text: 'The terminal wants credentials that died with the company. They keep coming.',
            effects: { crewStress: 10, combat: 'enc_maintenance_drones' },
          },
          criticalFailure: {
            text: 'Your attempt at the terminal registers as tampering and the facility escalates the whole fleet to obstruction-clearing priority.',
            effects: { crewStress: 13, combat: 'enc_maintenance_drones' },
          },
        },
      },
      {
        id: 'walk-out',
        label: 'Walk out ahead of them and take what you are carrying',
        hint: 'They are slow. You are not.',
        effects: { hours: 3 },
        result: {
          text: 'You leave at a brisk walk with whatever was already crated and let them clear the debris they think you left behind. Half a load and no casualties.',
          effects: { items: [{ itemId: 'salvage_scrap', qty: 1 }], morale: 2, crewStress: 4 },
        },
      },
      {
        id: 'trap-the-corridor',
        label: 'Funnel them into a corridor and drop the ceiling',
        hint: 'Explosives, in an old building.',
        requires: { skill: { skill: 'explosives', min: 25 } },
        check: {
          skill: 'explosives',
          secondarySkill: 'mechanicalEngineering',
          participation: 'duo',
          criticalRisk: true,
        },
        effects: { hours: 3, crewStress: 8 },
        outcomes: {
          exceptional: {
            text: 'A shaped charge on a load-bearing member, timed perfectly, and the corridor comes down on eleven drones at once. The wreckage is worth more than the salvage you came for.',
            effects: {
              items: [
                { itemId: 'power_cell', qty: 4 },
                { itemId: 'sensor_module', qty: 2, condition: 50 },
                { itemId: 'salvage_scrap', qty: 4 },
              ],
              morale: 13,
              crewXp: 20,
            },
          },
          success: {
            text: 'The ceiling comes down where you wanted it and takes most of them with it. The rest reroute and take an hour doing it.',
            effects: {
              items: [
                { itemId: 'power_cell', qty: 2 },
                { itemId: 'salvage_scrap', qty: 2 },
              ],
              morale: 8,
              crewXp: 13,
            },
          },
          partial: {
            text: 'The charge brings down half of what you wanted. Enough of them get through to be a problem.',
            effects: { crewStress: 9, combat: 'enc_maintenance_drones' },
          },
          failure: {
            text: 'The member you chose was not load-bearing. All you have done is make a very loud noise in a corridor full of machines.',
            effects: { crewStress: 12, combat: 'enc_maintenance_drones' },
          },
          criticalFailure: {
            text: 'The structure fails further back than intended and the ceiling comes down between your people and the exit, with somebody underneath the edge of it.',
            effects: {
              crewStress: 16,
              morale: -8,
              wound: { severityScore: 67, damageType: 'blunt' },
              combat: 'enc_maintenance_drones',
            },
          },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'hos-vermin-nest',
    scope: ['hostile'],
    title: 'Things in the Void Spaces',
    body:
      'Something has been getting into the food stores through the void spaces behind the galley bulkhead, and this morning it took a bite out of a cable run instead. Whatever came aboard at the last port has bred. On {ship} that is a problem that only gets worse while you think about it.',
    weight: 12,
    routine: true,
    conditions: { requiresShip: true, maxDanger: 80 },
    tags: ['vermin', 'routine', 'infestation'],
    choices: [
      {
        id: 'clear-the-voids',
        label: 'Open the void spaces and clear them out',
        hint: 'Unpleasant, close, and thorough.',
        effects: { hours: 4, crewStress: 5 },
        result: {
          text: 'Two of you go into the void spaces with lamps and clubs and do the job properly. It is filthy, cramped work and the stores stop disappearing.',
          effects: { combat: 'enc_hull_vermin', food: 1 },
        },
      },
      {
        id: 'seal-and-starve',
        label: 'Seal the voids and starve them out',
        hint: 'Slow, no contact.',
        check: {
          skill: 'mechanicalEngineering',
          secondarySkill: 'scavenging',
          participation: 'individual',
        },
        effects: { hours: 6 },
        outcomes: {
          exceptional: {
            text: 'Every access point identified, sealed, and screened, and the food stores moved behind proper barriers. Within a fortnight the ship is clean and it stays clean.',
            effects: { food: 2, systems: { hull: 4 }, morale: 6, crewXp: 12 },
          },
          success: {
            text: 'The voids are sealed and the stores are protected. They die out or they leave.',
            effects: { food: 1, morale: 3, crewXp: 6 },
          },
          partial: {
            text: 'Most of the access points are sealed. They find the one you missed within a week.',
            effects: { food: -1, crewStress: 3 },
          },
          failure: {
            text: 'The void spaces on this ship connect to everything and you cannot seal what you cannot map.',
            effects: { food: -2, crewStress: 5, morale: -3 },
          },
          criticalFailure: {
            text: 'Sealing them in drives them further into the ship, and by the end of the week they are in the electrical runs.',
            effects: { food: -2, systems: { power: -8 }, morale: -5, crewStress: 8 },
          },
        },
      },
      {
        id: 'ignore-the-vermin',
        label: 'Set traps and get on with the day',
        hint: 'Minimal effort.',
        effects: { hours: 1 },
        result: {
          text: 'A few traps behind the galley and a note to check them. It catches some of them, which is not the same as solving it.',
          effects: { food: -1, crewStress: 2 },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'hos-false-distress',
    scope: ['hostile'],
    title: 'A Distress Call That Is Slightly Wrong',
    body:
      'A mayday comes in on the emergency band from a hauler with a failed life support system, drifting eleven hours off your track. The voice is frightened and the details are good. {actor} points out, quietly, that the beacon signature is newer than the ship it claims to be coming from, and that this is how it is done out here.',
    weight: 10,
    conditions: { minDanger: 30 },
    tags: ['decoy', 'distress', 'judgement'],
    choices: [
      {
        id: 'verify-first',
        label: 'Verify the signal before committing',
        hint: 'Costs hours. Costs nothing else.',
        check: {
          skill: 'computers',
          secondarySkill: 'navigation',
          participation: 'individual',
        },
        effects: { hours: 3 },
        outcomes: {
          exceptional: {
            text: 'You pull the registry history, the beacon serial, and three months of transit records, and prove it is a decoy without ever going near it. You also pull the position of the ship actually running it.',
            effects: { morale: 11, crewXp: 16, flag: { key: 'decoy_ambush_known', value: true } },
          },
          success: {
            text: 'The signature does not match the registry. It is bait, and you fly on past it.',
            effects: { morale: 7, crewXp: 10 },
          },
          partial: {
            text: 'Inconclusive. Something is wrong with it and you cannot prove what, so you keep your distance and never find out.',
            effects: { crewStress: 5 },
          },
          failure: {
            text: 'The records check out because somebody spent real money making them check out.',
            effects: { morale: -4, crewStress: 7 },
          },
          criticalFailure: {
            text: 'Your query goes out on an open channel and tells them exactly where you are and that you are cautious. They come to you.',
            effects: { crewStress: 12, combat: 'enc_pirate_raiders' },
          },
        },
      },
      {
        id: 'answer-it',
        label: 'Answer the mayday',
        hint: 'Eleven hours and a real risk. It might be real.',
        requires: { minFuel: 4 },
        effects: { hours: 4, fuel: -4, crewStress: 9 },
        result: {
          text: 'You divert, because sometimes it is a hauler with a failed scrubber and four people in it. This time there are three ships waiting behind the beacon and no hauler at all.',
          effects: { combat: 'enc_pirate_boarders', morale: -3 },
        },
      },
      {
        id: 'relay-and-continue',
        label: 'Relay the call to anyone else and hold course',
        hint: 'The compromise.',
        effects: { hours: 1 },
        result: {
          text: 'You rebroadcast the mayday with your own position stripped out and keep flying. If it is real, somebody closer will take it. If it is not, somebody else finds out.',
          effects: { morale: -2, crewStress: 4 },
        },
      },
      {
        id: 'approach-carefully',
        label: 'Approach on a cold, oblique vector and look',
        hint: 'Have a look without being where they expect.',
        check: {
          skill: 'piloting',
          secondarySkill: 'stealth',
          participation: 'duo',
        },
        effects: { hours: 5, fuel: -3, crewStress: 7 },
        outcomes: {
          exceptional: {
            text: 'You come in cold, from above and behind, and get close enough to see three ships holding station in the beacon’s sensor shadow. You are gone before any of them knows you were there.',
            effects: { morale: 12, crewXp: 17 },
          },
          success: {
            text: 'A careful look confirms it: a beacon and no ship. You withdraw the way you came.',
            effects: { morale: 7, crewXp: 10 },
          },
          partial: {
            text: 'You get close enough to be suspicious and not close enough to be sure, and you burn a lot of fuel doing it.',
            effects: { fuel: -2, crewStress: 6 },
          },
          failure: {
            text: 'They have somebody watching the approach you thought was clever.',
            effects: { crewStress: 11, combat: 'enc_pirate_raiders' },
          },
          criticalFailure: {
            text: 'The oblique vector puts you between two of them with no room to turn and no speed to run.',
            effects: {
              systems: { shields: -8 },
              crewStress: 15,
              combat: 'enc_pirate_raiders',
            },
          },
        },
      },
    ],
  },
];

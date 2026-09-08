/**
 * Authored event hooks — the eight patterns design named by hand.
 *
 * These are not a new event system. They are ordinary events in the ordinary
 * table, written to hit specific shapes the procedural set does not reach on
 * its own: a robbery where standing still is genuinely the right call, a
 * choice with no third option, somebody gambling money that was not theirs,
 * and the day a crew member is offered a ship of their own.
 *
 * Pure data; no logic.
 */

import type { GameEventDef } from '../../engine/types';

export const AUTHORED_EVENTS: GameEventDef[] = [
  // -------------------------------------------------------------------------
  // Doing nothing, on purpose
  // -------------------------------------------------------------------------
  {
    id: 'aut-holdup-comply',
    scope: ['station', 'planet', 'homeworld'],
    title: 'Hands Where They Are',
    body:
      'Four of them come through the dock office at {location} with the doors already covered, and the one doing the talking says it plainly: nobody moves, nobody gets hurt, this takes ninety seconds. He is not shouting. He is not enjoying it. He has clearly done this before and would like to do it again next month, which is exactly the reason to believe him — and exactly the reason he cannot afford to be argued with.',
    weight: 9,
    conditions: { minCrew: 1 },
    tags: ['robbery', 'standoff', 'community'],
    choices: [
      {
        id: 'read-them',
        label: 'Read them before you decide anything',
        hint: 'Costs you nothing but the seconds.',
        tags: ['verify', 'plan'],
        check: {
          skill: 'persuasion',
          secondarySkill: 'negotiation',
          attributes: ['evaluation', 'perception'],
          participation: 'individual',
        },
        effects: { hours: 0.2 },
        outcomes: {
          exceptional: {
            text: 'Everything about them is routine. The weapons are carried, not aimed. The talker keeps checking a watch. These are people doing a job on a schedule, and the job does not include you.',
            effects: { flag: { key: 'holdup_read_credible', value: true }, crewXp: 8 },
          },
          success: {
            text: 'They are professionals, and professionals do not want the paperwork a body creates. Probably.',
            effects: { flag: { key: 'holdup_read_credible', value: true }, crewXp: 5 },
          },
          partial: {
            text: 'You cannot tell. One of them at the back is holding his weapon like it is heavier than he expected.',
            effects: { crewStress: 4 },
          },
          failure: {
            text: 'You have no read on them at all. Every second you spend looking is a second one of them spends looking at you.',
            effects: { crewStress: 7 },
          },
          criticalFailure: {
            text: 'The talker notices you noticing, and the room changes temperature.',
            effects: { crewStress: 12, morale: -5 },
          },
        },
      },
      {
        id: 'stay-still',
        label: 'Do nothing. Let it happen.',
        hint: 'They said nobody gets hurt. If that is true, this is over in ninety seconds.',
        tags: ['calm', 'deescalation', 'nonviolence'],
        effects: { hours: 0.4 },
        result: {
          text: 'You keep your hands visible and your mouth shut, and so does everyone with you. They take the office float, they take two crates that were not yours, and they go. Ninety seconds, more or less, exactly as advertised. Nobody is hurt. It is the least heroic thing you have ever done and it was obviously correct.',
          effects: { credits: -140, crewStress: 6, morale: -3 },
        },
      },
      {
        id: 'resist',
        label: 'They are four and you are here. Do something.',
        hint: 'Fast, loud, and not reversible.',
        tags: ['confrontation', 'violence', 'physical_risk'],
        check: {
          skill: 'closeQuarters',
          secondarySkill: 'brawling',
          participation: 'individual',
          criticalRisk: true,
        },
        effects: { hours: 0.3 },
        outcomes: {
          exceptional: {
            text: 'You take the talker off his feet before the others have turned, and the whole thing collapses into people running for the doors. The office manager will tell this story wrong for years and you will let her.',
            effects: { morale: 14, crewXp: 22, credits: 180 },
          },
          success: {
            text: 'It works, in the sense that they leave without the float. It does not work in the sense that everyone in the room now knows your face.',
            effects: { morale: 6, crewXp: 12, crewStress: 10 },
          },
          partial: {
            text: 'You get a hand on somebody and it turns into a scramble that ends with them gone and you on the floor.',
            effects: { crewStress: 14, wound: { severityScore: 34, damageType: 'blunt' } },
          },
          failure: {
            text: 'The room does exactly what the talker warned it not to do, and it goes badly for the people who were only standing there.',
            effects: { crewStress: 20, morale: -12, wound: { severityScore: 52, damageType: 'blunt' } },
          },
          criticalFailure: {
            text: 'He was telling the truth right up until you made it untrue.',
            effects: { crewStress: 26, morale: -18, combat: 'enc_desperate_looters' },
          },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Choose one. Lose the other. There is no third option.
  // -------------------------------------------------------------------------
  {
    id: 'aut-one-or-the-other',
    scope: ['travel', 'hostile'],
    title: 'Two Calls, One Ship',
    body:
      'Two beacons, forty minutes apart on divergent vectors, both squawking the same emergency class. One is a family hauler with an atmosphere breach and eleven aboard. The other is a survey team on a rock with six hours of air and a transponder that has already started repeating. {ship} can reach one of them. Not both, not in sequence, not with a clever burn. One.',
    weight: 7,
    conditions: { minDanger: 20, requiresShip: true, once: true },
    tags: ['rescue', 'dilemma'],
    choices: [
      {
        id: 'take-the-hauler',
        label: 'The hauler. Eleven people.',
        hint: 'More lives, worse odds. The other beacon keeps repeating.',
        tags: ['rescue', 'protect_others', 'abandon_others'],
        check: { skill: 'piloting', secondarySkill: 'navigation', participation: 'individual' },
        effects: { hours: 9, fuel: -12 },
        outcomes: {
          exceptional: {
            text: 'You get alongside, seal to their lock, and pull all eleven across. Somewhere behind you a transponder is still repeating and it will keep repeating for another five hours.',
            effects: { morale: 10, crewXp: 26, crewStress: 8 },
          },
          success: {
            text: 'Nine come across. Two were already gone when the breach opened. You do not go looking for the second beacon afterwards, and nobody suggests it.',
            effects: { morale: 4, crewXp: 18, crewStress: 12 },
          },
          partial: {
            text: 'You get most of them. The hauler is bleeding air faster than the seal can hold and the last minutes are ugly.',
            effects: { morale: -3, crewXp: 12, crewStress: 18 },
          },
          failure: {
            text: 'You arrive to a hull that stopped holding pressure eleven minutes ago. You chose this one, and it was already over.',
            effects: { morale: -16, crewStress: 24 },
          },
          criticalFailure: {
            text: 'You arrive late and take damage doing it, for nothing at all.',
            effects: { morale: -20, crewStress: 28, hull: -14 },
          },
        },
      },
      {
        id: 'take-the-survey',
        label: 'The survey team. Six hours of air.',
        hint: 'Fewer lives, a clock you can actually beat.',
        tags: ['rescue', 'protect_others', 'abandon_others', 'plan'],
        check: { skill: 'navigation', secondarySkill: 'piloting', participation: 'individual' },
        effects: { hours: 7, fuel: -9 },
        outcomes: {
          exceptional: {
            text: 'You put down beside them with ninety minutes to spare and all four walk aboard under their own power. Nobody aboard says the word hauler for two days.',
            effects: { morale: 9, crewXp: 24, crewStress: 6 },
          },
          success: {
            text: 'All four, with the margin you expected and none to spare. The hauler is not on any channel by the time you are back on your vector.',
            effects: { morale: 4, crewXp: 16, crewStress: 10 },
          },
          partial: {
            text: 'Three of them. The fourth had already opened a valve rather than watch the clock run down.',
            effects: { morale: -6, crewXp: 11, crewStress: 18 },
          },
          failure: {
            text: 'The rock is harder to reach than the numbers said and the air ran out while you were still working the descent.',
            effects: { morale: -15, crewStress: 22 },
          },
          criticalFailure: {
            text: 'You are still working the approach when the transponder stops. Then you have to fly home past where the other one was.',
            effects: { morale: -22, crewStress: 28 },
          },
        },
      },
      {
        id: 'relay-both',
        label: 'Relay both and hold your course',
        hint: 'Somebody closer might make it. You are not somebody closer.',
        tags: ['abandon_others', 'duty', 'routine'],
        effects: { hours: 0.5 },
        result: {
          text: 'You put both positions out on the emergency band with your own registry attached, and you keep your vector. It is the correct decision for a ship with your fuel and your crew, and it does not feel like one.',
          effects: { morale: -12, crewStress: 14 },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Somebody's selfish call that might work out for everyone
  // -------------------------------------------------------------------------
  {
    id: 'aut-unauthorised-gamble',
    scope: ['station', 'social'],
    title: 'It Was Not Their Money',
    body:
      "You find out the way you always find out — sideways, from somebody who assumed you already knew. One of your crew took a serious piece of the ship's credits into a back room at {location} and put all of it on a game they were confident about. They did not ask. They have not mentioned it. The game is still running.",
    weight: 8,
    conditions: { minCrew: 2 },
    tags: ['gambling', 'trust', 'community'],
    choices: [
      {
        id: 'pull-them-out',
        label: 'Walk in and pull them out now',
        hint: 'Whatever is on the table stays on the table.',
        tags: ['authority', 'confrontation', 'humiliation', 'save'],
        effects: { hours: 1, credits: -400 },
        result: {
          text: 'You take them out of the chair in front of the room. The stake stays where it is, because that is what happens when you leave a game early. They do not argue, which is somehow worse, and half your crew think you were right while the other half watched a friend get walked out of a bar.',
          effects: { morale: -6, crewStress: 8 },
        },
      },
      {
        id: 'let-it-ride',
        label: 'Say nothing. Let the hand finish.',
        hint: 'It is already gone or it is already won.',
        tags: ['gamble', 'trust', 'delegation'],
        check: {
          skill: 'negotiation',
          secondarySkill: 'persuasion',
          attributes: ['evaluation', 'composure'],
          participation: 'individual',
        },
        effects: { hours: 2 },
        outcomes: {
          exceptional: {
            text: 'They win, enormously, and — this is the part nobody expects — they carry the whole lot straight back to the ship and put it in the shared account in front of everyone. It was still a selfish thing to do. It also just paid for the next two legs.',
            effects: { credits: 2000, morale: 12, crewXp: 10 },
          },
          success: {
            text: 'They win. Not the way the stories go, but well clear of what they put in, and they hand it over without being asked.',
            effects: { credits: 900, morale: 6 },
          },
          partial: {
            text: 'They come out roughly even and very quiet. Nobody made anything except a point.',
            effects: { credits: -60, crewStress: 6 },
          },
          failure: {
            text: 'It is gone. All of it. They sit in the mess for a long time before they come and tell you, which at least they do themselves.',
            effects: { credits: -400, morale: -12, crewStress: 14 },
          },
          criticalFailure: {
            text: 'It is gone, and there is more owed on top of it to somebody at {location} who will be following up.',
            effects: { credits: -650, morale: -16, crewStress: 18, flag: { key: 'gambling_debt', value: true } },
          },
        },
      },
      {
        id: 'terms-after',
        label: 'Let it finish, then set terms',
        hint: 'The outcome is the outcome. The rule is separate.',
        tags: ['authority', 'accountability', 'punishment'],
        effects: { hours: 2.5 },
        result: {
          text: 'You wait, you watch it end — badly, as these things mostly do — and then you say, once and in front of everyone, what the rule is about the shared account. Nobody has to be humiliated for a rule to be understood.',
          effects: { credits: -400, morale: -2, crewStress: 4, crewXp: 6 },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Someone who will not take no
  // -------------------------------------------------------------------------
  {
    id: 'aut-forced-boarding',
    scope: ['travel', 'station'],
    title: 'They Are Not Leaving',
    body:
      'The man at the lock has been talking for eleven minutes. He has a story and some of it is probably true. He has no berth, no papers you can check, and no intention of standing back from the hatch. He says he will not be trouble. He is currently being trouble. Behind you, your crew have stopped what they were doing to watch what you do.',
    weight: 8,
    conditions: { minCrew: 2, requiresShip: true },
    tags: ['stranger', 'standoff'],
    choices: [
      {
        id: 'let-him-aboard',
        label: 'Let him aboard',
        hint: 'A berth, a mouth, and an unknown.',
        tags: ['trust', 'compassion', 'aid'],
        effects: { hours: 1 },
        result: {
          text: 'You stand aside. He thanks you twice, too fast, and goes where he is told without argument. Half the crew think that was decent. The other half spend the next week checking where he is.',
          effects: { morale: 3, crewStress: 5, recruit: true },
        },
      },
      {
        id: 'refuse-firmly',
        label: 'Refuse, and mean it',
        hint: 'No hands on anyone. Just a door that stays shut.',
        tags: ['authority', 'confrontation', 'deescalation'],
        check: {
          skill: 'persuasion',
          secondarySkill: 'negotiation',
          attributes: ['leadership', 'composure'],
          participation: 'individual',
        },
        effects: { hours: 1 },
        outcomes: {
          exceptional: {
            text: 'You give him a reason he can accept, a direction that might actually help, and nothing to push against. He goes. It costs you nothing and it takes everything you have.',
            effects: { morale: 6, crewXp: 12 },
          },
          success: {
            text: 'He goes, eventually, angry and on his own feet.',
            effects: { crewStress: 4 },
          },
          partial: {
            text: 'He goes as far as the far side of the bay and sits down where you can see him.',
            effects: { crewStress: 9, morale: -3 },
          },
          failure: {
            text: 'He gets a hand on the frame and it becomes a physical problem in front of your whole crew.',
            effects: { crewStress: 14, morale: -8 },
          },
          criticalFailure: {
            text: 'It goes past words entirely, and it goes there fast.',
            effects: { crewStress: 20, morale: -12, combat: 'enc_lone_gunman' },
          },
        },
      },
      {
        id: 'lethal-force',
        label: 'End it. Whatever that takes.',
        hint: 'This is not a threat you can walk back.',
        tags: ['violence', 'punishment', 'confrontation'],
        effects: { hours: 0.5 },
        result: {
          text: 'It takes four seconds and it is not close. Afterwards the bay is very quiet and everyone who was watching is still watching. Some of them will decide you kept them safe. Some of them will decide something else, and they will not say which.',
          effects: { morale: -20, crewStress: 24, flag: { key: 'lethal_at_the_lock', value: true } },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Two roles, and you pick who takes which
  // -------------------------------------------------------------------------
  {
    id: 'aut-rope-and-descent',
    scope: ['scavenge', 'planet', 'moon'],
    title: 'Somebody Goes Down',
    body:
      'The good material is forty metres below the lip, in a cut too narrow for anything but a person on a line. Two jobs: one goes over the edge, one stays up top and works the rope. Neither is the safe job — the one on the line is trusting somebody with their weight, and the one on the rope has to live with how that ends.',
    weight: 9,
    conditions: { minCrew: 2 },
    tags: ['salvage', 'pairwork'],
    choices: [
      {
        id: 'best-climber-descends',
        label: 'Send the best hands down',
        hint: 'The strongest climber on the line, whoever is left on the rope.',
        tags: ['physical_risk', 'danger', 'trust'],
        check: {
          skill: 'exploration',
          secondarySkill: 'scavenging',
          participation: 'duo',
          criticalRisk: true,
        },
        effects: { hours: 4 },
        outcomes: {
          exceptional: {
            text: 'Down, worked, and back up with more than the survey suggested, and the two of them come over the lip talking like people who have just decided something about each other.',
            effects: { crewXp: 24, morale: 8, items: [{ itemId: 'trade_machine_parts', qty: 3 }] },
          },
          success: {
            text: 'A slow descent, careful work, and a clean recovery. The rope never once did anything surprising.',
            effects: { crewXp: 14, items: [{ itemId: 'trade_machine_parts', qty: 2 }] },
          },
          partial: {
            text: 'They get some of it. Halfway back up the line snags and there are ten seconds nobody up top enjoys.',
            effects: { crewXp: 8, crewStress: 10, items: [{ itemId: 'trade_machine_parts', qty: 1 }] },
          },
          failure: {
            text: 'The anchor shifts. They come off the wall, swing hard into rock, and get hauled up by somebody whose hands are shaking.',
            effects: { crewStress: 16, wound: { severityScore: 46, damageType: 'blunt' } },
          },
          criticalFailure: {
            text: 'The line runs. It runs a long way before it stops.',
            effects: { crewStress: 26, morale: -14, wound: { severityScore: 74, damageType: 'blunt' } },
          },
        },
      },
      {
        id: 'strongest-on-rope',
        label: 'Put the strongest hands on the rope',
        hint: 'A weaker climber, held by somebody who will not let go.',
        tags: ['physical_risk', 'protect_others', 'trust', 'cooperation'],
        check: {
          skill: 'scavenging',
          secondarySkill: 'exploration',
          participation: 'duo',
        },
        effects: { hours: 5 },
        outcomes: {
          exceptional: {
            text: 'Slower than it needed to be and safer than it had any right to be. The person on the rope never sat down once.',
            effects: { crewXp: 18, morale: 9, items: [{ itemId: 'trade_machine_parts', qty: 2 }] },
          },
          success: {
            text: 'It takes an hour longer than planned and nothing goes wrong at any point in it.',
            effects: { crewXp: 12, items: [{ itemId: 'trade_machine_parts', qty: 2 }] },
          },
          partial: {
            text: 'They get part of the way, take one look at the cut, and call it. Coming back up is the right decision and it still feels like a failure.',
            effects: { crewXp: 6, crewStress: 8 },
          },
          failure: {
            text: 'A bad slip, a hard catch, and a rope burn that goes through a glove.',
            effects: { crewStress: 12, wound: { severityScore: 30, damageType: 'blunt' } },
          },
          criticalFailure: {
            text: 'The catch holds. Almost everything else does not.',
            effects: { crewStress: 22, morale: -10, wound: { severityScore: 62, damageType: 'blunt' } },
          },
        },
      },
      {
        id: 'leave-it',
        label: 'Leave it in the ground',
        hint: 'Nothing down there is worth a person.',
        tags: ['calm', 'protect_others', 'conserve'],
        effects: { hours: 0.5 },
        result: {
          text: 'You look at the cut for a while and then you walk away from it. Somebody says it was probably fine. Nobody argues, and nobody offers to go back.',
          effects: { morale: -2 },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  // They do not agree, and you have to say a word
  // -------------------------------------------------------------------------
  {
    id: 'aut-destination-argument',
    scope: ['travel', 'social'],
    title: 'Where Next',
    body:
      'It starts as two people talking in the galley and it is a proper argument by the time you hear about it. One of them wants the long way round, where there is work and people and a chance to fill the hold. The other wants the direct leg, because every extra day is an extra day and they have done the arithmetic out loud more than once. They are both right. They have both stopped listening. They are both waiting for you.',
    weight: 10,
    conditions: { minCrew: 3 },
    tags: ['crewconflict', 'community'],
    choices: [
      {
        id: 'back-the-long-way',
        label: 'Back the long way round',
        hint: 'Work, people, cargo — and days you may not have.',
        tags: ['authority', 'opportunity', 'recognition'],
        effects: { hours: 1 },
        result: {
          text: 'You say it once and you do not explain it twice. One of them is visibly relieved. The other says "fine" in the particular way that means it is not, and goes back to work, and remembers.',
          effects: { morale: 2, crewStress: 5, flag: { key: 'chose_the_long_way', value: true } },
        },
      },
      {
        id: 'back-the-direct-leg',
        label: 'Back the direct leg',
        hint: 'Faster, thinner, and there is no going back for what you skipped.',
        tags: ['authority', 'decisive_action', 'conserve'],
        effects: { hours: 1 },
        result: {
          text: 'You side with the clock. The one who wanted the long way takes it professionally and takes it personally, both at once, which is the only way anybody takes anything on a small ship.',
          effects: { morale: 2, crewStress: 5, flag: { key: 'chose_the_direct_leg', value: true } },
        },
      },
      {
        id: 'make-them-settle-it',
        label: 'Make them settle it between themselves',
        hint: 'It is their argument. You are not in it.',
        tags: ['delegation', 'autonomy', 'cooperation'],
        check: {
          skill: 'persuasion',
          attributes: ['leadership', 'socialAwareness'],
          participation: 'individual',
        },
        effects: { hours: 3 },
        outcomes: {
          exceptional: {
            text: 'They come back with a route neither of them proposed and both of them signed. You had almost nothing to do with it, which is the point.',
            effects: { morale: 10, crewXp: 12 },
          },
          success: {
            text: 'They work it out, grudgingly, and the version they bring you is workable.',
            effects: { morale: 5, crewXp: 6 },
          },
          partial: {
            text: 'They agree on something to stop having the conversation. Neither of them believes it.',
            effects: { crewStress: 6 },
          },
          failure: {
            text: 'They come back angrier and now it is about something else entirely, and you have to decide anyway.',
            effects: { morale: -7, crewStress: 12 },
          },
          criticalFailure: {
            text: 'It stops being about the route. Everyone hears it. You should have said a word two days ago.',
            effects: { morale: -14, crewStress: 18 },
          },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  // A good ship is worth taking
  // -------------------------------------------------------------------------
  {
    id: 'aut-worth-taking',
    scope: ['travel'],
    title: 'Somebody Has Been Looking At Her',
    body:
      'The same contact has appeared on the edge of your sensor envelope on three separate watches, at three different bearings, always at the range where they can see you and you can barely see them. Nothing about it is illegal. Nothing about it is a coincidence either. {theShip} sits high on somebody\'s list of things worth the fuel.',
    weight: 8,
    conditions: { minDanger: 25, requiresShip: true },
    tags: ['pirates', 'standoff'],
    choices: [
      {
        id: 'go-dark',
        label: 'Go quiet and change your profile',
        hint: 'Cold running, off the obvious lane.',
        tags: ['plan', 'delay', 'conserve'],
        check: { skill: 'navigation', secondarySkill: 'piloting', participation: 'individual' },
        effects: { hours: 8, fuel: -6 },
        outcomes: {
          exceptional: {
            text: 'You come off the lane, run cold for a shift, and rejoin somewhere they were not watching. Whatever they were, they are behind you now.',
            effects: { morale: 8, crewXp: 16 },
          },
          success: {
            text: 'It works. It costs a day and a good deal of fuel, and the contact does not come back.',
            effects: { crewXp: 10 },
          },
          partial: {
            text: 'You lose them for six hours. Then they are there again, further out, still matching.',
            effects: { crewStress: 10 },
          },
          failure: {
            text: 'Running cold on an unfamiliar vector puts you somewhere you did not plan to be, and they are still there.',
            effects: { crewStress: 14, fuel: -4 },
          },
          criticalFailure: {
            text: 'You give away exactly what you were trying to hide, and they close.',
            effects: { crewStress: 18, combat: 'enc_pirate_raiders' },
          },
        },
      },
      {
        id: 'hail-them',
        label: 'Hail them directly and ask',
        hint: 'People behave differently once you have used their registry.',
        tags: ['confrontation', 'honesty', 'deescalation'],
        check: {
          skill: 'persuasion',
          secondarySkill: 'negotiation',
          participation: 'individual',
        },
        effects: { hours: 1 },
        outcomes: {
          exceptional: {
            text: 'They answer, which nobody expected, and it turns out they were weighing you up and have decided against it. They say so, almost politely, and drop off the envelope.',
            effects: { morale: 9, crewXp: 14 },
          },
          success: {
            text: 'They do not answer, but they do fall back. Being looked at directly is not what they were after.',
            effects: { crewXp: 8 },
          },
          partial: {
            text: 'Nothing comes back. They hold station exactly where they were.',
            effects: { crewStress: 8 },
          },
          failure: {
            text: 'You have now confirmed that you have noticed, which tells them their window is closing.',
            effects: { crewStress: 12 },
          },
          criticalFailure: {
            text: 'They take the hail as an invitation.',
            effects: { crewStress: 16, combat: 'enc_pirate_raiders' },
          },
        },
      },
      {
        id: 'hold-course',
        label: 'Hold course and be ready',
        hint: 'Let them decide. Be worth reconsidering.',
        tags: ['calm', 'decisive_action', 'routine'],
        effects: { hours: 2 },
        result: {
          text: 'You put people where they would need to be, you leave the lights alone, and you keep the lane. Somewhere in the next watch the contact stops appearing. You never find out whether that was you.',
          effects: { crewStress: 8, crewXp: 5 },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  // A ship of their own
  // -------------------------------------------------------------------------
  {
    id: 'aut-offered-command',
    scope: ['station', 'planet'],
    title: 'They Have Been Offered A Ship',
    body:
      'They tell you themselves, which is more than they had to do. Somebody at {location} is short a master for a working hull and has spent two days deciding it should be one of your crew. It is real, it is theirs, and it starts in four days. They are not asking permission. They are asking what you think, which is a different and much harder question.',
    weight: 7,
    conditions: { minCrew: 3, once: true },
    tags: ['recruitment', 'community'],
    choices: [
      {
        id: 'tell-them-to-take-it',
        label: 'Tell them to take it',
        hint: 'You will be one down, and they will have their own deck.',
        tags: ['recognition', 'autonomy', 'separation', 'honesty'],
        effects: { hours: 2 },
        result: {
          text: 'You say the true thing, which is that they are ready and that you would take it. They shake your hand on the dock four days later and the crew stands around afterwards not quite knowing where to put themselves. You are down a person you cannot replace and you would say it again.',
          effects: { morale: -4, crewStress: 6, loseCrew: true, crewXp: 10 },
        },
      },
      {
        id: 'ask-them-to-stay',
        label: 'Ask them to stay',
        hint: 'Honestly asked. They can still say no.',
        tags: ['honesty', 'crew', 'trust'],
        check: {
          skill: 'persuasion',
          attributes: ['leadership', 'charisma'],
          participation: 'individual',
        },
        effects: { hours: 3 },
        outcomes: {
          exceptional: {
            text: 'You do not oversell it. You tell them what this crew is and what it is trying to do, and they turn the hull down the next morning without any visible regret. That is a debt, and you both know it.',
            effects: { morale: 12, crewXp: 12 },
          },
          success: {
            text: 'They stay. There is a fortnight of them being slightly elsewhere and then there is not.',
            effects: { morale: 5, crewStress: 4 },
          },
          partial: {
            text: 'They stay, and everybody can see it was a near thing, and nobody mentions it.',
            effects: { crewStress: 8 },
          },
          failure: {
            text: 'They go. Asking made it harder for both of you than simply saying yes would have.',
            effects: { morale: -9, crewStress: 10, loseCrew: true },
          },
          criticalFailure: {
            text: 'You make it about the crew instead of about them, and they hear it, and they go — and they go colder than they were going to.',
            effects: { morale: -15, crewStress: 14, loseCrew: true },
          },
        },
      },
      {
        id: 'say-nothing-useful',
        label: 'Tell them it is their call and leave it there',
        hint: 'No steer either way.',
        tags: ['delegation', 'autonomy', 'privacy'],
        effects: { hours: 1 },
        result: {
          text: 'You say it is theirs to decide, which is true, and unhelpful, and they were hoping for something else. They take the hull. On the dock they say they understand, and neither of you is certain that is the whole of it.',
          effects: { morale: -8, crewStress: 8, loseCrew: true },
        },
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Authored ship hooks — things that are true about one particular hull
// ---------------------------------------------------------------------------

export const SHIP_HOOK_EVENTS: GameEventDef[] = [
  {
    id: 'aut-hidden-compartment',
    scope: ['technical', 'travel'],
    title: 'That Panel Should Not Sound Like That',
    body:
      'Somebody is chasing a rattle in the aft passage and knocks on a bulkhead that answers wrong. Behind the panel, welded in when the hull was assembled and finished well enough to survive an inspection, is a space. It has been part of {ship} since the day she was built and nobody ever mentioned it.',
    weight: 14,
    conditions: {
      requiresShip: true,
      once: true,
      shipQuirk: { id: 'hiddenCompartment', revealed: false },
    },
    tags: ['salvage', 'discovery'],
    choices: [
      {
        id: 'open-it',
        label: 'Open it',
        hint: 'It was built to hold something.',
        tags: ['explore', 'mystery', 'novelty'],
        effects: { hours: 1.5, revealQuirk: 'hiddenCompartment' },
        result: {
          text: 'It comes open cleanly, which tells you it was opened often. Inside there is dust, a smell nobody can place, and enough space to hide a great deal from a routine scan. Whatever it held last, it went with somebody.',
          effects: { morale: 5, crewXp: 8 },
        },
      },
      {
        id: 'weld-it-shut',
        label: 'Weld it shut and never mention it',
        hint: 'What you do not have, you cannot be found carrying.',
        tags: ['conserve', 'plan', 'privacy'],
        effects: { hours: 2, repairParts: -6, revealQuirk: 'hiddenCompartment' },
        result: {
          text: 'You seal it properly, better than it was sealed before, and you tell the crew what it was. Some of them think that was a waste of a very good hiding place. They are not wrong, and neither are you.',
          effects: { crewStress: -2 },
        },
      },
    ],
  },
  {
    id: 'aut-co2-contamination',
    scope: ['technical', 'travel'],
    title: 'The Air Is Wrong',
    body:
      'It starts as a headache in the aft compartments and a scrubber reading nobody likes. Exhaust from the engine space is finding its way into crew air through a seal that has been failing quietly for longer than anyone realised. Life support can clear it. Life support cannot clear it with people standing in it breathing.',
    weight: 10,
    conditions: { requiresShip: true, minCrew: 2 },
    tags: ['emergency', 'lifesupport'],
    choices: [
      {
        id: 'evacuate-and-flush',
        label: 'Everyone out. Let the ship clean itself.',
        hint: 'Suits, the lock, and several hours of nothing to do but wait.',
        tags: ['protect_others', 'delay', 'plan'],
        effects: { hours: 7, systems: { lifeSupport: 6 } },
        result: {
          text: 'You put the whole crew outside — suited, tethered, bored, and safe — and let life support run flat out with nobody adding to the problem. It takes most of a shift. When you come back in, the air is air again, and the seal is on the list.',
          effects: { crewStress: 9, morale: -3, crewXp: 6 },
        },
      },
      {
        id: 'work-through-it',
        label: 'Seal it from the inside and keep working',
        hint: 'Faster. Everyone keeps breathing it while you do.',
        tags: ['physical_risk', 'decisive_action', 'craft_quality'],
        check: {
          skill: 'mechanicalEngineering',
          secondarySkill: 'electricalEngineering',
          participation: 'individual',
          criticalRisk: true,
        },
        effects: { hours: 3, repairParts: -14 },
        outcomes: {
          exceptional: {
            text: 'The seal is found, cut out and replaced in under three hours by somebody working in a mask and swearing steadily. The air clears while they are still packing up.',
            effects: { systems: { lifeSupport: 8 }, crewXp: 18, morale: 6 },
          },
          success: {
            text: 'It holds. Everybody has a headache for a day and nobody has anything worse.',
            effects: { systems: { lifeSupport: 4 }, crewStress: 8, crewXp: 10 },
          },
          partial: {
            text: 'The seal is patched rather than fixed, and the readings come down slowly enough that nobody trusts them.',
            effects: { crewStress: 14 },
          },
          failure: {
            text: 'Three hours of breathing it for nothing. The patch fails while they are still holding it.',
            effects: { crewStress: 20, morale: -8, systems: { lifeSupport: -4 } },
          },
          criticalFailure: {
            text: 'Somebody goes down in the aft passage and has to be carried out, and now you are doing the evacuation anyway, badly, with an unconscious person in it.',
            effects: {
              crewStress: 26,
              morale: -14,
              wound: { severityScore: 44, damageType: 'burn' },
              systems: { lifeSupport: -8 },
            },
          },
        },
      },
    ],
  },
  {
    id: 'aut-unlatched-door',
    scope: ['technical'],
    title: 'It Was Latched. Somebody Was Sure.',
    body:
      'An emergency door in the mid-section is showing latched on the board and is not latched. It has probably been like that for two days. On its own it is a five-minute job. If anything else goes wrong on the other side of it in the meantime it stops being a five-minute job very quickly, and whoever signed it off is standing right here.',
    weight: 11,
    conditions: { requiresShip: true, minCrew: 2 },
    tags: ['maintenance', 'crewconflict'],
    choices: [
      {
        id: 'fix-it-quietly',
        label: 'Fix it and say nothing about who',
        hint: 'The door is the problem. The person is not, today.',
        tags: ['privacy', 'mercy', 'craft_quality'],
        effects: { hours: 1, repairParts: -3, systems: { hull: 2 } },
        result: {
          text: 'You reset the latch, check the other nine while you are at it, and let the matter end there. The person who missed it knows exactly what you did, and so does everyone else, which is its own kind of message.',
          effects: { morale: 4, crewXp: 4 },
        },
      },
      {
        id: 'name-it',
        label: 'Fix it and say whose it was',
        hint: 'The board said latched because somebody said latched.',
        tags: ['accountability', 'authority', 'humiliation'],
        effects: { hours: 1, repairParts: -3, systems: { hull: 2 } },
        result: {
          text: 'You say it once, in the mess, without heat: this is what was signed off, this is what was actually true, and this is what happens next time. Nobody enjoys it. Nobody checks a latch carelessly for a month either.',
          effects: { morale: -4, crewStress: 6, crewXp: 8 },
        },
      },
      {
        id: 'leave-it-for-later',
        label: 'Put it on the list',
        hint: 'There are eleven things on the list. This is one of them.',
        tags: ['routine', 'delay'],
        effects: { hours: 0.2 },
        result: {
          text: 'It goes on the list, below two things that are actually on fire and above three that have been there a fortnight. It will get done. Probably before anything needs it.',
          effects: { systems: { hull: -3 }, flag: { key: 'unlatched_door_pending', value: true } },
        },
      },
    ],
  },
];

/**
 * Medical events — illness, injury, shortage, and the decisions a captain makes
 * when the nearest hospital is three weeks away. Pure data; no logic.
 */

import type { GameEventDef } from '../../engine/types';

export const MEDICAL_EVENTS: GameEventDef[] = [
  // -------------------------------------------------------------------------
  {
    id: 'med-septic-wound',
    scope: ['medical'],
    title: 'The Wound That Turned',
    body:
      "{actor}'s forearm gash was dressed four days ago and it has gone the wrong colour, with red tracking up toward the elbow and a fever that came on overnight. They have been hiding it because there is work to do. On {ship}, out past {location}, sepsis is not something you treat later.",
    weight: 12,
    conditions: { minCrew: 2 },
    tags: ['infection', 'sepsis', 'wound'],
    choices: [
      {
        id: 'antibiotic-course',
        label: 'Full antibiotic course and strict rest',
        hint: 'Spends medicine. Costs their labour for days.',
        requires: { minMedicine: 2 },
        check: {
          skill: 'medicalDiagnostics',
          secondarySkill: 'firstAid',
          participation: 'individual',
        },
        effects: { hours: 6, medicine: -2 },
        outcomes: {
          exceptional: {
            text: 'You pick the right agent on the first try and the tracking starts receding within eight hours. {actor} is furious about the bed rest, which is a very good sign.',
            effects: { morale: 7, crewStress: -6, crewXp: 12 },
          },
          success: {
            text: 'The fever breaks on the second day and the arm goes down. Four days off the watch bill and they will keep the hand.',
            effects: { morale: 4, crewStress: -3, crewXp: 7 },
          },
          partial: {
            text: 'The infection is contained but not cleared. It will need a second course you may not have.',
            effects: { crewStress: 4, medicine: -1 },
          },
          failure: {
            text: 'The agent you chose does nothing. The fever climbs and the red line is above the elbow by morning.',
            effects: {
              morale: -6,
              crewStress: 9,
              wound: { severityScore: 55, damageType: 'pierce' },
            },
          },
          criticalFailure: {
            text: 'You treat the fever and miss that the wound has undermined beneath the dressing. By the time you reopen it, the tissue underneath is gone.',
            effects: {
              morale: -10,
              crewStress: 14,
              medicine: -1,
              wound: { severityScore: 74, damageType: 'pierce' },
            },
          },
        },
      },
      {
        id: 'debride',
        label: 'Open it up and debride the wound',
        hint: 'Surgical. Immediate. Ugly.',
        requires: { minMedicine: 1 },
        check: {
          skill: 'surgery',
          secondarySkill: 'firstAid',
          participation: 'duo',
          criticalRisk: true,
        },
        effects: { hours: 4, medicine: -1 },
        outcomes: {
          exceptional: {
            text: 'You take out every scrap of dead tissue, irrigate it properly, and pack it open. It is a horrible forty minutes and the arm is saved outright.',
            effects: { morale: 8, crewStress: -5, crewXp: 16 },
          },
          success: {
            text: 'Debrided, irrigated, packed. The fever drops the same night and the wound starts looking like a wound again.',
            effects: { morale: 5, crewStress: -3, crewXp: 9 },
          },
          partial: {
            text: 'You get most of it. The wound is cleaner and it is still angry, and {actor} is in a great deal of pain.',
            effects: { crewStress: 5, wound: { severityScore: 35, damageType: 'slash' } },
          },
          failure: {
            text: 'You open it and lose control of the bleeding for two minutes that feel like ten. The wound is bigger and no cleaner.',
            effects: {
              morale: -6,
              crewStress: 11,
              medicine: -1,
              wound: { severityScore: 58, damageType: 'slash' },
            },
          },
          criticalFailure: {
            text: 'You open into a vessel you did not know was there and the compartment turns into a scene. {actor} is alive at the end of it, which is the only good thing anybody can say.',
            effects: {
              morale: -14,
              crewStress: 19,
              medicine: -2,
              wound: { severityScore: 84, damageType: 'slash' },
            },
          },
        },
      },
      {
        id: 'wait-and-watch',
        label: 'Dress it, dose the fever, and see how the night goes',
        hint: 'Cheap. A gamble on their immune system.',
        effects: { hours: 2 },
        result: {
          text: 'Clean dressing, painkillers, fluids, and somebody sitting with them. The fever is a degree higher by morning and the arm is no better.',
          effects: {
            crewStress: 7,
            morale: -4,
            wound: { severityScore: 48, damageType: 'pierce' },
          },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'med-fever-unknown',
    scope: ['medical'],
    title: 'Nobody Knows What This Is',
    body:
      '{actor} has been running a fever for three days with no obvious source — no wound, no cough, nothing on the panel. Two other people are complaining of headaches. Whatever this is, it came aboard at the last port and it is now on a ship where everybody breathes the same air.',
    weight: 11,
    conditions: { minCrew: 3 },
    tags: ['illness', 'diagnosis', 'contagion'],
    choices: [
      {
        id: 'work-it-up',
        label: 'Work it up properly — history, samples, the whole process',
        hint: 'Slow, methodical, the only way to actually know.',
        check: {
          skill: 'medicalDiagnostics',
          secondarySkill: 'medicalResearch',
          participation: 'individual',
        },
        effects: { hours: 8 },
        outcomes: {
          exceptional: {
            text: 'You trace it to a water tank that was topped up at the last port and never chlorinated. Source identified, tank flushed, and the whole outbreak stops in two days.',
            effects: { morale: 10, crewStress: -9, crewXp: 16, systems: { lifeSupport: 4 } },
          },
          success: {
            text: 'A common enteric bug, unpleasant and self-limiting. Knowing that is worth more than any drug you have.',
            effects: { morale: 6, crewStress: -6, crewXp: 9 },
          },
          partial: {
            text: 'You rule out the frightening things without identifying the actual one. Everybody feels a little better about not knowing.',
            effects: { crewStress: -2, crewXp: 4 },
          },
          failure: {
            text: 'Eight hours of careful work and no answer. The fever is the same and now two more people have headaches.',
            effects: { morale: -5, crewStress: 8 },
          },
          criticalFailure: {
            text: 'You settle confidently on the wrong diagnosis and treat for it. The treatment makes {actor} considerably worse before anyone questions it.',
            effects: {
              morale: -9,
              crewStress: 13,
              medicine: -2,
              wound: { severityScore: 44, damageType: 'burn' },
            },
          },
        },
      },
      {
        id: 'broad-spectrum',
        label: 'Broad-spectrum antibiotics and hope',
        hint: 'Spends medicine on a guess.',
        requires: { minMedicine: 2 },
        effects: { hours: 2, medicine: -2 },
        result: {
          text: 'You dose everyone symptomatic with what you have and wait. Two of them improve, which proves nothing, and you are down two units of medicine.',
          effects: { morale: 2, crewStress: -3 },
        },
      },
      {
        id: 'isolate-symptomatic',
        label: 'Isolate everyone with symptoms immediately',
        hint: 'Slows the spread, halves the crew.',
        effects: { hours: 3 },
        result: {
          text: 'Symptomatic crew go into the aft compartment with a bucket, a curtain, and a comm panel. The ship runs shorthanded and nobody new gets sick.',
          effects: { morale: -5, crewStress: 5, crewXp: 4 },
        },
      },
      {
        id: 'push-through',
        label: 'Tell everyone to push through it',
        hint: 'Free. It usually is.',
        effects: { hours: 1 },
        result: {
          text: 'The watch bill stays as written and everyone works sick. Two days later four people have it and the fevers are higher.',
          effects: { morale: -8, crewStress: 12 },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'med-medicine-shortage',
    scope: ['medical'],
    title: 'Counting What Is Left',
    body:
      'You do the medicine inventory yourself and the number is smaller than you had been carrying in your head. There is enough for one serious injury or two mild illnesses, and there are more than two people aboard {ship}. {actor} asks, quietly, what happens after that.',
    weight: 11,
    conditions: { minCrew: 2 },
    tags: ['shortage', 'triage', 'stores'],
    choices: [
      {
        id: 'stretch-doses',
        label: 'Work out how to stretch what you have',
        hint: 'Careful pharmacology. No new supplies.',
        check: {
          skill: 'medicalResearch',
          secondarySkill: 'medicalDiagnostics',
          participation: 'individual',
        },
        effects: { hours: 6 },
        outcomes: {
          exceptional: {
            text: 'You work out which agents can be split, which can be substituted, and which are doing nothing at all. Effectively you have doubled the stock without buying anything.',
            effects: { medicine: 3, morale: 7, crewXp: 16 },
          },
          success: {
            text: 'Reduced dosing schedules and a couple of clean substitutions. Meaningfully more capacity than you had this morning.',
            effects: { medicine: 2, morale: 4, crewXp: 9 },
          },
          partial: {
            text: 'You find one substitution that works and two that do not. A little more room.',
            effects: { medicine: 1, crewStress: 2 },
          },
          failure: {
            text: 'Six hours with the reference texts and everything you have is already at minimum effective dose. There is no slack to find.',
            effects: { crewStress: 6, morale: -3 },
          },
          criticalFailure: {
            text: 'You mis-compound a substitution and ruin a full unit doing it. The stock is smaller than when you started.',
            effects: { medicine: -1, morale: -6, crewStress: 9 },
          },
        },
      },
      {
        id: 'synthesise',
        label: 'Try to synthesise more from what is aboard',
        hint: 'Ambitious. Uses stores either way.',
        requires: { minRepairParts: 1 },
        check: {
          skill: 'medicalResearch',
          attributes: ['reasoning', 'steadiness'],
          participation: 'duo',
          criticalRisk: true,
        },
        effects: { hours: 10, repairParts: -1 },
        outcomes: {
          exceptional: {
            text: 'A crude but genuinely effective batch comes out of the improvised setup, and the process is repeatable. That is a capability the ship did not have yesterday.',
            effects: {
              medicine: 4,
              morale: 9,
              crewXp: 18,
              flag: { key: 'field_synthesis_known', value: true },
            },
          },
          success: {
            text: 'One usable batch, lower potency than the real thing, but it is medicine and it is yours.',
            effects: { medicine: 2, morale: 5, crewXp: 10 },
          },
          partial: {
            text: 'Half the batch is usable and half is sludge. Ten hours for one unit.',
            effects: { medicine: 1, crewStress: 5 },
          },
          failure: {
            text: 'The synthesis fails at the last step and the whole batch has to be discarded. Time and parts gone.',
            effects: { crewStress: 8, morale: -4 },
          },
          criticalFailure: {
            text: 'A reaction runs away in a closed compartment and puts fumes through the deck. Two people are coughing blood-flecked sputum by evening.',
            effects: {
              medicine: -1,
              morale: -9,
              crewStress: 15,
              systems: { lifeSupport: -8 },
              wound: { severityScore: 47, damageType: 'burn' },
            },
          },
        },
      },
      {
        id: 'lock-the-cabinet',
        label: 'Lock the cabinet and ration by captain’s authority only',
        hint: 'Preserves stock. Costs trust.',
        effects: { hours: 1 },
        result: {
          text: 'The medicine goes behind a lock only you can open, and every dose from now on is a decision with your name on it. Nobody argues. Everybody notices.',
          effects: { medicine: 1, morale: -6, crewStress: 5 },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'med-quarantine-call',
    scope: ['medical'],
    title: 'The Quarantine Question',
    body:
      '{actor} came back from the surface at {location} with a cough and a temperature, and the two people who shared the shuttle with them are fine so far. You can seal them in the aft compartment for eight days, or you can decide this is nothing. One of those choices is very hard to reverse.',
    weight: 10,
    conditions: { minCrew: 3 },
    tags: ['quarantine', 'contagion', 'decision'],
    choices: [
      {
        id: 'full-quarantine',
        label: 'Full quarantine — eight days, no exceptions',
        hint: 'Loses a crew member from the roster for over a week.',
        effects: { hours: 4 },
        result: {
          text: '{actor} goes into the aft compartment with rations, a terminal, and a promise that somebody will talk to them every day. It is lonely, it is correct, and nobody else gets sick.',
          effects: { morale: -4, crewStress: 4, crewXp: 5 },
        },
      },
      {
        id: 'test-first',
        label: 'Work out what it actually is before deciding',
        hint: 'Twelve hours of exposure risk while you find out.',
        check: {
          skill: 'medicalDiagnostics',
          secondarySkill: 'medicalResearch',
          participation: 'individual',
        },
        effects: { hours: 7 },
        outcomes: {
          exceptional: {
            text: 'You identify it inside a day as a non-transmissible reaction to something they inhaled on the surface. No quarantine needed, and {actor} is back on the watch bill by evening.',
            effects: { morale: 9, crewStress: -8, crewXp: 15 },
          },
          success: {
            text: 'Mildly contagious, three days rather than eight. You can plan around three days.',
            effects: { morale: 5, crewStress: -4, crewXp: 8 },
          },
          partial: {
            text: 'You narrow it to two possibilities and quarantine on the worse one, just in case.',
            effects: { morale: -1, crewStress: 3, crewXp: 4 },
          },
          failure: {
            text: 'The workup is inconclusive and you have burned a day of everyone breathing the same air.',
            effects: { morale: -5, crewStress: 8 },
          },
          criticalFailure: {
            text: 'You clear them as non-infectious. Within four days three more people are coughing and one of them is worse than {actor} ever was.',
            effects: { morale: -11, crewStress: 16, medicine: -2 },
          },
        },
      },
      {
        id: 'persuade-to-isolate',
        label: 'Ask {actor} to isolate voluntarily',
        hint: 'Keeps their dignity. Requires them to agree.',
        check: {
          skill: 'persuasion',
          attributes: ['socialAwareness', 'composure'],
          participation: 'individual',
        },
        effects: { hours: 2 },
        outcomes: {
          exceptional: {
            text: '{actor} not only agrees, they suggest the protocol themselves and take charge of enforcing it. The crew reads the whole thing as care rather than suspicion.',
            effects: { morale: 10, crewStress: -7, crewXp: 12 },
          },
          success: {
            text: 'They go willingly. The compartment door closes with a joke rather than an argument.',
            effects: { morale: 5, crewStress: -3 },
          },
          partial: {
            text: 'They agree and resent it, and they cut corners on it when nobody is watching.',
            effects: { crewStress: 4 },
          },
          failure: {
            text: '{actor} refuses, insists they are fine, and now you either use authority or back down in front of the crew.',
            effects: { morale: -6, crewStress: 8 },
          },
          criticalFailure: {
            text: 'The conversation turns into an accusation of who brought what aboard. Two people take sides and {actor} does not isolate at all.',
            effects: { morale: -10, crewStress: 12 },
          },
        },
      },
      {
        id: 'call-it-nothing',
        label: 'Call it nothing and carry on',
        hint: 'No cost today.',
        effects: { hours: 1 },
        result: {
          text: 'You decide it is a cough and a bad night. Sometimes that is exactly what it is. This time it takes a week to find out.',
          effects: { crewStress: 6, morale: -2 },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'med-emergency-surgery',
    scope: ['medical'],
    title: 'On the Galley Table',
    body:
      '{actor} is bleeding internally and the nearest surgical facility is nine days away. Their abdomen is rigid, their pressure is falling, and the only sterile flat surface on {ship} is the galley table with a light rigged over it. You have to decide now, {captain}, and everyone in the corridor knows it.',
    weight: 9,
    conditions: { minCrew: 3 },
    tags: ['surgery', 'emergency', 'bleeding'],
    choices: [
      {
        id: 'operate',
        label: 'Operate',
        hint: 'The highest-risk thing anyone aboard will ever do.',
        requires: { minMedicine: 2 },
        check: {
          skill: 'surgery',
          secondarySkill: 'firstAid',
          participation: 'trio',
          modifiers: [
            { label: 'Galley table, improvised light', value: -12 },
            { label: 'Two assistants scrubbed in', value: 5 },
          ],
          criticalRisk: true,
        },
        effects: { hours: 5, medicine: -2 },
        outcomes: {
          exceptional: {
            text: 'You find the bleeder in eleven minutes, tie it off, and close cleanly. {actor} is awake and complaining about the anaesthetic by the second watch. The crew looks at you differently afterwards.',
            effects: { morale: 15, crewStress: -8, crewXp: 22 },
          },
          success: {
            text: 'Long, slow, and successful. The bleeding stops, the pressure comes back, and the wound is closed by somebody who will not stop shaking for an hour afterwards.',
            effects: { morale: 10, crewStress: -4, crewXp: 14 },
          },
          partial: {
            text: 'You stop the worst of it and cannot fix all of it. {actor} survives with something inside them that will need a real surgeon eventually.',
            effects: {
              morale: 3,
              crewStress: 6,
              wound: { severityScore: 54, damageType: 'slash' },
            },
          },
          failure: {
            text: 'You cannot find the source and close on packing and prayer. They are alive at dawn, barely, and the packing has to come out sometime.',
            effects: {
              morale: -6,
              crewStress: 13,
              medicine: -1,
              wound: { severityScore: 72, damageType: 'slash' },
            },
          },
          criticalFailure: {
            text: 'The bleeding is worse than anything you can control and it is over in four minutes. You are the one who has to come out into the corridor and say it.',
            effects: { morale: -20, crewStress: 24, loseCrew: true },
          },
        },
      },
      {
        id: 'stabilise-and-run',
        label: 'Stabilise, transfuse, and burn for the nearest facility',
        hint: 'Fuel and hours against their odds.',
        requires: { minMedicine: 1, minFuel: 6 },
        check: { skill: 'firstAid', secondarySkill: 'piloting', participation: 'duo' },
        effects: { hours: 8, medicine: -1, fuel: -6 },
        outcomes: {
          exceptional: {
            text: 'Fluids, pressure support, and the hardest burn the old engines have done in years. You hand them over conscious and stable, and somebody with a real theatre finishes the job.',
            effects: { morale: 12, crewStress: -6, crewXp: 14 },
          },
          success: {
            text: 'They hold on through the transit. It costs a great deal of fuel and it is the right call.',
            effects: { morale: 7, crewStress: -2, crewXp: 8 },
          },
          partial: {
            text: 'You get there and they are much worse than when you left. Whatever was bleeding kept bleeding.',
            effects: {
              morale: -2,
              crewStress: 9,
              wound: { severityScore: 68, damageType: 'blunt' },
            },
          },
          failure: {
            text: 'The burn costs more fuel than planned and buys nothing. They are no better on arrival than they were on departure.',
            effects: { fuel: -3, morale: -7, crewStress: 12 },
          },
          criticalFailure: {
            text: 'The burn is harder than the hull likes and something in the engine mounting complains. You arrive with a quarter of your fuel gone and {actor} barely holding on.',
            effects: {
              fuel: -4,
              systems: { engines: -10 },
              morale: -14,
              crewStress: 20,
              wound: { severityScore: 88, damageType: 'blunt' },
            },
          },
        },
      },
      {
        id: 'comfort-only',
        label: 'Comfort measures only',
        hint: 'The honest choice when there is no good one.',
        requires: { minMedicine: 1 },
        effects: { hours: 4, medicine: -1 },
        result: {
          text: 'Painkillers, a hand to hold, and the crew taking turns sitting with them. Sometimes they come through it on their own. Sometimes the honest thing is all you have.',
          effects: {
            morale: -8,
            crewStress: 10,
            wound: { severityScore: 70, damageType: 'blunt' },
          },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'med-chronic-flare',
    scope: ['medical'],
    title: 'The Thing {actor} Never Mentioned',
    body:
      '{actor} has a condition they did not declare when they signed on, and it has chosen this week to flare. They have been managing it with something they brought aboard and that something has run out. They are still working. They are working badly and in a lot of pain.',
    weight: 10,
    conditions: { minCrew: 2 },
    tags: ['chronic', 'disclosure', 'management'],
    choices: [
      {
        id: 'build-a-regimen',
        label: 'Work out a regimen from ship stores',
        hint: 'Medical work, and the medicine cabinet.',
        requires: { minMedicine: 1 },
        check: {
          skill: 'medicalDiagnostics',
          secondarySkill: 'medicalResearch',
          participation: 'individual',
        },
        effects: { hours: 6, medicine: -1 },
        outcomes: {
          exceptional: {
            text: 'You build a substitute regimen out of what is aboard that controls it better than what they were taking. {actor} has not felt this well in two years and says so.',
            effects: { morale: 11, crewStress: -8, crewXp: 15 },
          },
          success: {
            text: 'A workable regimen at a manageable cost in stores. They can do their job again.',
            effects: { morale: 6, crewStress: -5, crewXp: 8 },
          },
          partial: {
            text: 'It takes the edge off. They can work light duties and not much more.',
            effects: { crewStress: 3 },
          },
          failure: {
            text: 'Nothing aboard touches it. You have spent a unit of medicine confirming that.',
            effects: { morale: -4, crewStress: 7 },
          },
          criticalFailure: {
            text: 'A substitution interacts badly with the residue of what they were taking. The flare becomes a crisis and takes three days out of them.',
            effects: {
              medicine: -2,
              morale: -8,
              crewStress: 12,
              wound: { severityScore: 42, damageType: 'burn' },
            },
          },
        },
      },
      {
        id: 'light-duties',
        label: 'Put them on light duties and reassign the rest',
        hint: 'Costs the crew, not the cabinet.',
        requires: { minCrew: 3 },
        effects: { hours: 3 },
        result: {
          text: 'The watch bill absorbs it. Everybody works a little more and {actor} works a lot less, and nobody makes an issue of it in front of them.',
          effects: { morale: 3, crewStress: 5 },
        },
      },
      {
        id: 'ask-why-hidden',
        label: 'Ask why they did not tell you',
        hint: 'The conversation matters more than the answer.',
        check: {
          skill: 'persuasion',
          attributes: ['socialAwareness', 'composure'],
          participation: 'individual',
        },
        effects: { hours: 2 },
        outcomes: {
          exceptional: {
            text: 'They tell you about the last three ships that turned them down for it. You tell them this one is not those ships, and mean it, and they believe you.',
            effects: { morale: 10, crewStress: -7, crewXp: 12 },
          },
          success: {
            text: 'They explain, badly and honestly. It goes in the medical file where it should have been from the start.',
            effects: { morale: 5, crewStress: -3 },
          },
          partial: {
            text: 'You get the facts and not the reason. It will do.',
            effects: { crewStress: 1 },
          },
          failure: {
            text: 'The question lands as an accusation of fraud. They apologise in a way that means they will hide the next thing too.',
            effects: { morale: -5, crewStress: 6 },
          },
          criticalFailure: {
            text: 'It becomes an argument about what else people aboard have not declared, in a corridor, at volume. Two other people go very quiet.',
            effects: { morale: -9, crewStress: 11 },
          },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'med-exhaustion-collapse',
    scope: ['medical'],
    title: 'Down in the Passageway',
    body:
      'Somebody finds {actor} sitting on the deck in the main passageway, conscious but not entirely present, having stood four watches in three days because the ship is short-handed. This is not illness. This is arithmetic, and the arithmetic is yours, {captain}.',
    weight: 12,
    conditions: { minCrew: 2 },
    tags: ['exhaustion', 'fatigue', 'watch-bill'],
    choices: [
      {
        id: 'stand-down-everyone',
        label: 'Stand the whole crew down for a full sleep cycle',
        hint: 'Ten hours of the ship doing nothing.',
        effects: { hours: 10 },
        result: {
          text: 'You put the ship on minimum watch and send everybody to their bunks, including yourself. The next morning is the first morning in a fortnight that anybody has been rested.',
          effects: { morale: 9, crewStress: -14, crewXp: 4 },
        },
      },
      {
        id: 'stims',
        label: 'Stim shot and back to the watch bill',
        hint: 'Buys hours. Charges interest.',
        requires: { minMedicine: 1 },
        effects: { hours: 1, medicine: -1 },
        result: {
          text: '{actor} is on their feet in twenty minutes and functional for another twelve hours. What happens after those twelve hours is worse than what happened before them.',
          effects: { morale: -3, crewStress: 8 },
        },
      },
      {
        id: 'rebalance-watches',
        label: 'Rewrite the watch bill so this stops happening',
        hint: 'Fixes the cause, not the symptom.',
        check: {
          skill: 'medicalDiagnostics',
          attributes: ['reasoning', 'decisionMaking'],
          participation: 'individual',
        },
        effects: { hours: 4 },
        outcomes: {
          exceptional: {
            text: 'You rebuild the rotation around who actually recovers fastest from what, and the whole crew gets more sleep out of the same number of hours. It should have been done in the first week.',
            effects: { morale: 10, crewStress: -12, crewXp: 12 },
          },
          success: {
            text: 'A better rotation, evenly loaded, with real rest built into it. The ship runs slightly slower and everybody sleeps.',
            effects: { morale: 6, crewStress: -8, crewXp: 6 },
          },
          partial: {
            text: 'The new bill helps two people and makes it worse for one, who does not complain.',
            effects: { crewStress: -3 },
          },
          failure: {
            text: 'There are not enough hands to cover the ship no matter how you arrange them. You knew that and now it is written down.',
            effects: { morale: -4, crewStress: 5 },
          },
          criticalFailure: {
            text: 'The new rotation leaves the engine watch uncovered for six hours and something goes unnoticed that should not have.',
            effects: { systems: { engines: -9 }, morale: -7, crewStress: 10 },
          },
        },
      },
      {
        id: 'hot-meal-and-bunk',
        label: 'Hot food, a bunk, and someone else takes the watch',
        hint: 'Simple. Effective for one person.',
        requires: { minFood: 1 },
        effects: { hours: 3, food: -1 },
        result: {
          text: 'Somebody cooks, somebody else stands the watch, and {actor} sleeps eleven hours. It is not a systemic fix and it is exactly what they needed.',
          effects: { morale: 5, crewStress: -6 },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'med-malnutrition',
    scope: ['medical'],
    title: 'What the Rations Are Missing',
    body:
      'Two people have bleeding gums, one has been getting numbness in the feet, and everyone is slower than they were a month ago. The ration packs have calories and very little else, and the crew of {ship} has been living on them since {location}. {actor} points out that this gets worse, not better, on its own.',
    weight: 10,
    conditions: { minCrew: 3 },
    tags: ['nutrition', 'deficiency', 'food'],
    choices: [
      {
        id: 'cook-properly',
        label: 'Rebuild the menu around what the stores actually contain',
        hint: 'Cooking as medicine.',
        requires: { minFood: 2 },
        check: {
          skill: 'cooking',
          secondarySkill: 'medicalResearch',
          participation: 'individual',
        },
        effects: { hours: 5, food: -1 },
        outcomes: {
          exceptional: {
            text: 'You work out what is missing and find it in the least likely stores aboard — the culture medium, the pickled stock, the things nobody was eating. Symptoms reverse within the week and the food is better.',
            effects: { morale: 12, crewStress: -9, crewXp: 15 },
          },
          success: {
            text: 'A rotation that covers the gaps using what is aboard. The gums stop bleeding and the meals stop being identical.',
            effects: { morale: 8, crewStress: -6, crewXp: 8 },
          },
          partial: {
            text: 'You cover some of the deficiency. The numbness stops progressing and does not go away.',
            effects: { morale: 3, crewStress: -2 },
          },
          failure: {
            text: 'There is nothing aboard that supplies what is missing. You have spent stores proving it.',
            effects: { morale: -4, crewStress: 5 },
          },
          criticalFailure: {
            text: 'A substitution out of the hydroponics stock turns out to be mildly toxic in quantity, and four people spend a night being extremely unwell.',
            effects: {
              food: -2,
              medicine: -1,
              morale: -8,
              crewStress: 12,
              wound: { severityScore: 31, damageType: 'burn' },
            },
          },
        },
      },
      {
        id: 'supplement',
        label: 'Break into the medical stores for supplements',
        hint: 'Spends medicine on a food problem.',
        requires: { minMedicine: 2 },
        effects: { hours: 2, medicine: -2 },
        result: {
          text: 'The supplement stock covers the deficiency directly and efficiently, and it was meant for injuries. The gums heal and the cabinet is emptier.',
          effects: { morale: 6, crewStress: -5 },
        },
      },
      {
        id: 'buy-fresh',
        label: 'Spend credits on fresh produce at the next opportunity',
        hint: 'Straightforward, if you can afford it.',
        requires: { minCredits: 400 },
        effects: { hours: 3, credits: -400 },
        result: {
          text: 'Fresh produce and protein culture, bought at outbound prices and eaten in four days. Everyone is measurably better and the strongbox is measurably lighter.',
          effects: { food: 4, morale: 9, crewStress: -7 },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'med-tainted-water',
    scope: ['medical'],
    title: 'Something in the Water',
    body:
      'The reclaimed water has developed a taste, and three people have been up all night with cramps. The reclamation loop is the one system nobody aboard {ship} fully understands, and it has been running without a service since before you owned the ship. Everybody is still drinking from it because there is nothing else.',
    weight: 10,
    conditions: { minCrew: 2, requiresShip: true },
    tags: ['water', 'contamination', 'life-support'],
    choices: [
      {
        id: 'culture-and-identify',
        label: 'Culture a sample and find out what is growing',
        hint: 'Slow. Tells you what you are fighting.',
        check: {
          skill: 'medicalResearch',
          secondarySkill: 'medicalDiagnostics',
          participation: 'individual',
        },
        effects: { hours: 9 },
        outcomes: {
          exceptional: {
            text: 'A biofilm in a dead leg of pipe that has been there for years, identified precisely. You know exactly where it is and exactly what kills it.',
            effects: {
              systems: { lifeSupport: 12 },
              morale: 8,
              crewStress: -7,
              crewXp: 16,
              flag: { key: 'water_loop_mapped', value: true },
            },
          },
          success: {
            text: 'A common water organism, treatable with what is aboard. The loop gets shocked and flushed and the taste is gone in two days.',
            effects: { systems: { lifeSupport: 8 }, morale: 5, crewStress: -5, crewXp: 9 },
          },
          partial: {
            text: 'You identify something and are not certain it is the something. Treatment is a guess with evidence behind it.',
            effects: { systems: { lifeSupport: 3 }, crewStress: 3 },
          },
          failure: {
            text: 'Nine hours and the culture grows nothing you can name. The cramps continue.',
            effects: { crewStress: 7, morale: -4 },
          },
          criticalFailure: {
            text: 'You contaminate the sample with the thing you were testing against, treat for the wrong organism, and dump a sterilant into the loop that ruins a filter bed.',
            effects: {
              systems: { lifeSupport: -14 },
              repairParts: -1,
              morale: -8,
              crewStress: 13,
            },
          },
        },
      },
      {
        id: 'boil-everything',
        label: 'Boil every drop and strip the loop',
        hint: 'Brute force. Power and hours.',
        effects: { hours: 7 },
        result: {
          text: 'Every litre aboard goes through a rolling boil and the loop gets pulled apart and scrubbed by hand. It works. It costs a full day and a great deal of power.',
          effects: {
            systems: { lifeSupport: 9, power: -6 },
            morale: 2,
            crewStress: 6,
          },
        },
      },
      {
        id: 'treat-symptoms',
        label: 'Treat the cramps and keep drinking',
        hint: 'Cheapest option available.',
        requires: { minMedicine: 1 },
        effects: { hours: 2, medicine: -1 },
        result: {
          text: 'Antispasmodics and fluids for the worst of it, and everyone keeps drinking the same water. Two more people are ill by the end of the week.',
          effects: { systems: { lifeSupport: -5 }, morale: -6, crewStress: 9 },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'med-crush-injury',
    scope: ['medical'],
    title: 'Under the Cargo Rail',
    body:
      'A load shifted in the hold and {actor} got a leg under it before anyone could shout. The limb is out now and it is the wrong shape below the knee, and they are conscious enough to be asking whether they are going to keep it. The med bay on {ship} is a bunk, a light, and whatever is in the cabinet.',
    weight: 11,
    conditions: { minCrew: 2 },
    tags: ['trauma', 'fracture', 'emergency'],
    choices: [
      {
        id: 'reduce-and-splint',
        label: 'Reduce the fracture and splint it properly',
        hint: 'Fast, painful, and often enough.',
        requires: { minMedicine: 1 },
        check: {
          skill: 'firstAid',
          secondarySkill: 'surgery',
          participation: 'duo',
        },
        effects: { hours: 4, medicine: -1 },
        outcomes: {
          exceptional: {
            text: 'The reduction goes in on the first attempt and the alignment is textbook. Splinted, elevated, and pulses good in the foot. They will walk on it.',
            effects: { morale: 9, crewStress: -6, crewXp: 15 },
          },
          success: {
            text: 'Reduced and splinted. It will heal crooked and it will heal.',
            effects: {
              morale: 5,
              crewStress: -2,
              crewXp: 9,
              wound: { severityScore: 44, damageType: 'blunt' },
            },
          },
          partial: {
            text: 'The alignment is poor and the swelling is bad. You will be watching the circulation in that foot for a week.',
            effects: {
              crewStress: 6,
              wound: { severityScore: 56, damageType: 'blunt' },
            },
          },
          failure: {
            text: 'Three attempts at reduction and the limb will not go. {actor} passes out from the pain partway through the third.',
            effects: {
              medicine: -1,
              morale: -6,
              crewStress: 11,
              wound: { severityScore: 66, damageType: 'blunt' },
            },
          },
          criticalFailure: {
            text: 'You force it and tear something that was intact. The foot goes cold and mottled within the hour and everyone in the compartment understands what that means.',
            effects: {
              medicine: -2,
              morale: -11,
              crewStress: 16,
              wound: { severityScore: 79, damageType: 'blunt' },
            },
          },
        },
      },
      {
        id: 'surgical-repair',
        label: 'Open the leg and fix what is broken inside it',
        hint: 'Real surgery in a bad room.',
        requires: { minMedicine: 2 },
        check: {
          skill: 'surgery',
          participation: 'trio',
          modifiers: [{ label: 'No proper theatre', value: -10 }],
          criticalRisk: true,
        },
        effects: { hours: 7, medicine: -2 },
        outcomes: {
          exceptional: {
            text: 'You pin it with hardware improvised from the workshop, close, and the limb is straight and perfused. It is the best work anybody aboard has ever done.',
            effects: { morale: 14, crewStress: -8, crewXp: 20 },
          },
          success: {
            text: 'The repair holds and the leg is saved. Six weeks in a splint and a limp afterwards.',
            effects: {
              morale: 8,
              crewStress: -3,
              crewXp: 12,
              wound: { severityScore: 47, damageType: 'blunt' },
            },
          },
          partial: {
            text: 'You save the limb and not the function. It will be a leg that goes where it is put and not much more.',
            effects: {
              morale: 1,
              crewStress: 8,
              wound: { severityScore: 64, damageType: 'blunt' },
            },
          },
          failure: {
            text: 'Blood loss forces you to close early with the repair unfinished. Whatever happens next happens on its own.',
            effects: {
              medicine: -1,
              morale: -8,
              crewStress: 14,
              wound: { severityScore: 77, damageType: 'blunt' },
            },
          },
          criticalFailure: {
            text: 'The bleeding cannot be controlled in a room with one light and no suction. It takes eleven minutes and then it is over.',
            effects: { morale: -19, crewStress: 23, loseCrew: true },
          },
        },
      },
      {
        id: 'pain-and-immobilise',
        label: 'Painkillers, immobilise, and do not touch it',
        hint: 'Waits for a real doctor.',
        requires: { minMedicine: 1 },
        effects: { hours: 2, medicine: -1 },
        result: {
          text: 'You strap it, dose them hard, and refuse to do anything a surgeon should be doing. It is the humble choice, and the leg is exactly as broken tomorrow.',
          effects: {
            morale: -3,
            crewStress: 6,
            wound: { severityScore: 59, damageType: 'blunt' },
          },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'med-allergic-reaction',
    scope: ['medical'],
    title: 'Swelling Fast',
    body:
      '{actor} ate something out of a salvaged ration lot and their face is changing shape as you watch. The wheeze started two minutes ago and it is getting louder. Whatever this is, it is measured in minutes rather than hours.',
    weight: 10,
    conditions: { minCrew: 2 },
    tags: ['allergy', 'airway', 'urgent'],
    choices: [
      {
        id: 'adrenaline',
        label: 'Hit them with everything in the cabinet, now',
        hint: 'Immediate. Uses medicine.',
        requires: { minMedicine: 1 },
        check: {
          skill: 'firstAid',
          attributes: ['steadiness', 'decisionMaking'],
          participation: 'individual',
        },
        effects: { hours: 1, medicine: -1 },
        outcomes: {
          exceptional: {
            text: 'Right drug, right dose, right minute. The wheeze stops before the swelling peaks and {actor} is embarrassed rather than dead.',
            effects: { morale: 9, crewStress: -5, crewXp: 14 },
          },
          success: {
            text: 'The reaction turns around in about four minutes. They are shaky and breathing.',
            effects: { morale: 6, crewStress: -2, crewXp: 8 },
          },
          partial: {
            text: 'It slows but does not stop. A second dose gets it and now the cabinet is lighter than you wanted.',
            effects: { medicine: -1, crewStress: 5 },
          },
          failure: {
            text: 'The dose is late and the airway closes further before it opens. They are alive with a voice that will not be right for a week.',
            effects: {
              morale: -5,
              crewStress: 10,
              wound: { severityScore: 40, damageType: 'stun' },
            },
          },
          criticalFailure: {
            text: 'You reach for the wrong ampoule under pressure. It does nothing useful and costs the ninety seconds that mattered.',
            effects: {
              medicine: -1,
              morale: -10,
              crewStress: 16,
              wound: { severityScore: 71, damageType: 'stun' },
            },
          },
        },
      },
      {
        id: 'surgical-airway',
        label: 'Open an airway surgically',
        hint: 'Only if the throat is closing. Terrifying.',
        requires: { minMedicine: 1 },
        check: {
          skill: 'surgery',
          attributes: ['steadiness', 'composure'],
          participation: 'duo',
          criticalRisk: true,
        },
        effects: { hours: 2, medicine: -1 },
        outcomes: {
          exceptional: {
            text: 'One clean incision, tube in, air moving. It takes forty seconds and it is the difference between two outcomes.',
            effects: { morale: 12, crewStress: -4, crewXp: 20 },
          },
          success: {
            text: 'Messy and successful. They breathe through a tube for six hours and then through their own throat again.',
            effects: {
              morale: 7,
              crewXp: 12,
              wound: { severityScore: 34, damageType: 'slash' },
            },
          },
          partial: {
            text: 'It works on the second attempt. There is a great deal of blood and a scar that will be a story.',
            effects: {
              crewStress: 8,
              wound: { severityScore: 50, damageType: 'slash' },
            },
          },
          failure: {
            text: 'You cannot find the landmark in a swollen neck. The reaction eases on its own before you make it worse.',
            effects: {
              morale: -6,
              crewStress: 12,
              wound: { severityScore: 45, damageType: 'slash' },
            },
          },
          criticalFailure: {
            text: 'You cut too deep in the wrong place and the bleeding is arterial. Two people hold pressure for twenty minutes and somehow that is enough, and it very nearly was not.',
            effects: {
              medicine: -2,
              morale: -15,
              crewStress: 21,
              wound: { severityScore: 86, damageType: 'slash' },
            },
          },
        },
      },
      {
        id: 'sit-them-up',
        label: 'Sit them up, keep them calm, and wait it out',
        hint: 'No medicine spent. No control either.',
        effects: { hours: 2 },
        result: {
          text: 'You keep them upright, keep them talking, and keep your own face steady. The swelling peaks and then, slowly, recedes. It could very easily have gone the other way.',
          effects: {
            morale: -2,
            crewStress: 9,
            wound: { severityScore: 37, damageType: 'stun' },
          },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'med-burn-dressing',
    scope: ['medical'],
    title: 'Steam and Skin',
    body:
      'A line let go in the engine bay and {actor} caught the steam across one forearm and the side of the neck. The pain is enormous, the burn is deeper than anyone wants to say out loud, and burns are the injuries that kill you three weeks later rather than today.',
    weight: 11,
    conditions: { minCrew: 2 },
    tags: ['burn', 'dressing', 'infection-risk'],
    choices: [
      {
        id: 'proper-dressing',
        label: 'Cool it, debride it, and dress it properly',
        hint: 'Hours of work now, weeks of difference later.',
        requires: { minMedicine: 2 },
        check: {
          skill: 'firstAid',
          secondarySkill: 'medicalDiagnostics',
          participation: 'duo',
        },
        effects: { hours: 5, medicine: -2 },
        outcomes: {
          exceptional: {
            text: 'Cooled long enough, debrided carefully, dressed in a way that will actually stay sterile aboard a working ship. This burn will heal without a graft.',
            effects: { morale: 9, crewStress: -6, crewXp: 15 },
          },
          success: {
            text: 'Good dressing, good pain control, and a schedule for changing it that somebody will actually keep to.',
            effects: {
              morale: 5,
              crewXp: 9,
              wound: { severityScore: 38, damageType: 'burn' },
            },
          },
          partial: {
            text: 'The arm is well dressed and the neck is awkward and will not stay covered. That is where the trouble will come from.',
            effects: {
              crewStress: 5,
              wound: { severityScore: 49, damageType: 'burn' },
            },
          },
          failure: {
            text: 'You dress it too tight and too early. By morning the swelling underneath has made it worse than the burn itself.',
            effects: {
              medicine: -1,
              morale: -6,
              crewStress: 10,
              wound: { severityScore: 61, damageType: 'burn' },
            },
          },
          criticalFailure: {
            text: 'The dressing goes on over contamination nobody spotted. Four days later the whole area is infected and there is very little medicine left.',
            effects: {
              medicine: -2,
              morale: -9,
              crewStress: 14,
              wound: { severityScore: 73, damageType: 'burn' },
            },
          },
        },
      },
      {
        id: 'painkillers-and-film',
        label: 'Painkillers and a sterile film, changed daily',
        hint: 'Less medicine, more ongoing work.',
        requires: { minMedicine: 1 },
        effects: { hours: 3, medicine: -1 },
        result: {
          text: 'Film dressing, hard analgesia, and somebody changing it every single day for a fortnight. It is more work than the proper job and it uses less of the cabinet.',
          effects: {
            morale: 1,
            crewStress: 5,
            wound: { severityScore: 46, damageType: 'burn' },
          },
        },
      },
      {
        id: 'cold-water-only',
        label: 'Cold water, clean cloth, and grit',
        hint: 'Costs nothing but them.',
        effects: { hours: 2 },
        result: {
          text: 'Twenty minutes under running water and a clean cloth over it. {actor} says nothing while you do it, which is somehow worse than screaming.',
          effects: {
            morale: -5,
            crewStress: 9,
            wound: { severityScore: 57, damageType: 'burn' },
          },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'med-withdrawal',
    scope: ['medical'],
    title: 'The Shakes on the Third Day',
    body:
      'Whatever {actor} was taking ran out three days ago and the ship is now dealing with the consequences: tremor, sweating, a heart rate that has no business being that high, and a temper nobody recognises. This is not a discipline problem, {captain}. Untreated, it is a medical emergency that looks like a discipline problem.',
    weight: 9,
    conditions: { minCrew: 3 },
    tags: ['withdrawal', 'dependency', 'care'],
    choices: [
      {
        id: 'medical-taper',
        label: 'Manage it medically with a taper',
        hint: 'Uses medicine. Uses days.',
        requires: { minMedicine: 2 },
        check: {
          skill: 'medicalDiagnostics',
          secondarySkill: 'medicalResearch',
          participation: 'individual',
        },
        effects: { hours: 8, medicine: -2 },
        outcomes: {
          exceptional: {
            text: 'A controlled taper, sedation where it is needed, and someone in the compartment the whole time. {actor} comes out the other side clear-eyed and owing the crew more than they can say.',
            effects: { morale: 11, crewStress: -9, crewXp: 16 },
          },
          success: {
            text: 'Rough, monitored, survived. The worst of it is over in four days and nobody got hurt.',
            effects: { morale: 6, crewStress: -4, crewXp: 9 },
          },
          partial: {
            text: 'The taper controls the physical symptoms and not the rest of it. They are difficult to be around for a fortnight.',
            effects: { crewStress: 5 },
          },
          failure: {
            text: 'The dosing is wrong and the tremor becomes a seizure at 0300. You get them through it with what is left in the cabinet.',
            effects: {
              medicine: -1,
              morale: -6,
              crewStress: 12,
              wound: { severityScore: 43, damageType: 'stun' },
            },
          },
          criticalFailure: {
            text: 'You misjudge the taper badly and they seize with nobody in the room. They are found in time by minutes rather than seconds, and the damage is done.',
            effects: {
              morale: -14,
              crewStress: 20,
              medicine: -2,
              wound: { severityScore: 82, damageType: 'stun' },
            },
          },
        },
      },
      {
        id: 'find-a-substitute',
        label: 'Find something aboard that will hold them steady',
        hint: 'Pragmatic. Not a cure.',
        check: {
          skill: 'medicalResearch',
          attributes: ['reasoning', 'evaluation'],
          participation: 'individual',
        },
        effects: { hours: 5 },
        outcomes: {
          exceptional: {
            text: 'You find something that holds the physiology steady with almost none of the effect they were chasing, and it is available at every port. That is a real solution.',
            effects: { morale: 9, crewStress: -7, crewXp: 14 },
          },
          success: {
            text: 'A substitute that keeps the tremor down and buys time to do this properly later.',
            effects: { morale: 5, crewStress: -4, crewXp: 7 },
          },
          partial: {
            text: 'What you find works and comes with its own problems. You have traded one dependency for a slightly better one.',
            effects: { crewStress: 3 },
          },
          failure: {
            text: 'Nothing aboard touches it. Five hours confirming that they are going to have to go through this the hard way.',
            effects: { morale: -4, crewStress: 7 },
          },
          criticalFailure: {
            text: 'The substitute interacts with the withdrawal and puts them on the deck twitching. Two people have to hold them still.',
            effects: {
              medicine: -1,
              morale: -8,
              crewStress: 13,
              wound: { severityScore: 39, damageType: 'stun' },
            },
          },
        },
      },
      {
        id: 'ride-it-out',
        label: 'Confine them, watch them, and let it run',
        hint: 'No medicine. Someone sits with them the whole time.',
        requires: { minCrew: 3 },
        effects: { hours: 12 },
        result: {
          text: 'They go into a bunk with somebody beside them in shifts for three days. It is horrible for everyone and at the end of it {actor} is still aboard and still theirs.',
          effects: { morale: 3, crewStress: 11, crewXp: 6 },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'med-radiation-dose',
    scope: ['medical'],
    title: 'The Badge Went Dark',
    body:
      'The dosimetry badge on {actor} has gone dark and the one in the shield locker agrees with it. Somebody spent a shift in a compartment that was not as shielded as the schematic claimed, and now the question is how much and how bad. The nausea started an hour ago, which is information you did not want.',
    weight: 8,
    conditions: { minCrew: 2, requiresShip: true },
    tags: ['radiation', 'exposure', 'prognosis'],
    choices: [
      {
        id: 'assess-dose',
        label: 'Work out the actual dose before treating anything',
        hint: 'Knowledge first.',
        check: {
          skill: 'medicalResearch',
          secondarySkill: 'medicalDiagnostics',
          participation: 'individual',
        },
        effects: { hours: 6 },
        outcomes: {
          exceptional: {
            text: 'You reconstruct the exposure from the badge, the shift log, and the compartment survey, and the number is far lower than the symptoms suggested. Most of this is fear and it can be treated as fear.',
            effects: { morale: 10, crewStress: -10, crewXp: 16 },
          },
          success: {
            text: 'A moderate dose, unpleasant and survivable, with a clear picture of what the next fortnight looks like.',
            effects: { morale: 5, crewStress: -4, crewXp: 9 },
          },
          partial: {
            text: 'You get a range rather than a number. The bottom of the range is fine and the top of it is not.',
            effects: { crewStress: 5 },
          },
          failure: {
            text: 'The badge data is unusable and the shift log is wrong. You are treating blind.',
            effects: { morale: -5, crewStress: 9 },
          },
          criticalFailure: {
            text: 'You underestimate it badly and clear {actor} for duty. The blood counts three days later say something very different.',
            effects: {
              morale: -9,
              crewStress: 15,
              medicine: -1,
              wound: { severityScore: 63, damageType: 'burn' },
            },
          },
        },
      },
      {
        id: 'aggressive-treatment',
        label: 'Treat aggressively on the assumption it was bad',
        hint: 'Spends heavily. Might be unnecessary.',
        requires: { minMedicine: 3 },
        effects: { hours: 4, medicine: -3 },
        result: {
          text: 'Chelation, fluids, anti-emetics, and everything else in the cabinet that could conceivably help. Three units of medicine on a dose you never measured, and {actor} is up and eating by the third day.',
          effects: { morale: 6, crewStress: -6 },
        },
      },
      {
        id: 'find-the-leak',
        label: 'Seal the compartment before anyone else goes in',
        hint: 'Protects the rest of the crew.',
        check: {
          skill: 'electricalEngineering',
          secondarySkill: 'medicalResearch',
          participation: 'duo',
        },
        effects: { hours: 5 },
        outcomes: {
          exceptional: {
            text: 'You find the failed shield section, map the whole affected volume, and seal it with salvaged plating. Nobody else takes a dose and the schematic is finally correct.',
            effects: { systems: { hull: 6, power: 4 }, morale: 8, crewXp: 15 },
          },
          success: {
            text: 'Source located, compartment sealed and marked. The rest of the crew is safe.',
            effects: { systems: { hull: 3 }, morale: 5, crewXp: 8 },
          },
          partial: {
            text: 'You find roughly where it is and seal more than you need to. The ship loses the use of two compartments.',
            effects: { morale: -2, crewStress: 4 },
          },
          failure: {
            text: 'You cannot localise it, so the whole section goes off limits indefinitely. That section contains things you need.',
            effects: { morale: -6, crewStress: 8, systems: { power: -6 } },
          },
          criticalFailure: {
            text: 'The survey team spends four hours in exactly the wrong place. Now there are two people with dark badges.',
            effects: {
              medicine: -2,
              morale: -10,
              crewStress: 16,
              wound: { severityScore: 52, damageType: 'burn' },
            },
          },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'med-sick-call',
    scope: ['medical'],
    title: 'Morning Sick Call',
    body:
      'Three people are waiting outside the med bay before the first watch: a jammed thumb, a persistent cough, and something {actor} will only describe as "not right". None of it is urgent. All of it gets worse if nobody looks at it.',
    weight: 13,
    routine: true,
    conditions: { minCrew: 3 },
    tags: ['routine', 'clinic', 'maintenance'],
    choices: [
      {
        id: 'see-them-all',
        label: 'See all three properly',
        hint: 'A couple of hours of somebody’s morning.',
        check: { skill: 'medicalDiagnostics', participation: 'individual' },
        effects: { hours: 3 },
        outcomes: {
          exceptional: {
            text: 'Thumb strapped, cough identified as dust rather than infection, and the thing {actor} could not describe turns out to be an early hernia caught before it became an emergency.',
            effects: { morale: 8, crewStress: -6, crewXp: 12 },
          },
          success: {
            text: 'All three sorted before the first watch. Nothing dramatic, which is exactly what sick call is for.',
            effects: { morale: 4, crewStress: -4, crewXp: 6 },
          },
          partial: {
            text: 'Two of the three are straightforward. The third gets told to come back if it gets worse.',
            effects: { morale: 2, crewStress: -1 },
          },
          failure: {
            text: 'You reassure all three and are wrong about one of them, though not in a way that shows for another week.',
            effects: { crewStress: 3 },
          },
          criticalFailure: {
            text: 'You dismiss the cough as dust. It is not dust, and by the weekend two more people have it.',
            effects: { morale: -6, crewStress: 9, medicine: -1 },
          },
        },
      },
      {
        id: 'quick-triage',
        label: 'Triage quickly and send the minor ones away',
        hint: 'One hour.',
        effects: { hours: 1 },
        result: {
          text: 'Thumb strapped, cough noted, and {actor} told to come back if it changes. Two out of three is the usual ratio.',
          effects: { morale: 1, crewStress: -1 },
        },
      },
      {
        id: 'no-clinic',
        label: 'No clinic today — the schedule will not allow it',
        hint: 'Free.',
        effects: { hours: 1 },
        result: {
          text: 'They go back to work. The thumb heals badly, the cough spreads, and {actor} stops mentioning things.',
          effects: { morale: -4, crewStress: 5 },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'med-expired-stock',
    scope: ['medical'],
    title: 'Dates on the Ampoules',
    body:
      'Half the medical stock aboard {ship} is past its printed date, some of it by years. Most drugs lose potency slowly and a few become genuinely dangerous, and the labels do not tell you which is which. {actor} wants to know what to throw away before somebody needs it at three in the morning.',
    weight: 12,
    routine: true,
    tags: ['routine', 'stores', 'pharmacy'],
    choices: [
      {
        id: 'test-potency',
        label: 'Test what you can and sort the stock honestly',
        hint: 'Slow, careful, worth it.',
        check: {
          skill: 'medicalResearch',
          attributes: ['learning', 'evaluation'],
          participation: 'individual',
        },
        effects: { hours: 5 },
        outcomes: {
          exceptional: {
            text: 'You sort the whole cabinet into what is fine, what is weak, and what is now poison, and label all of it. Two thirds of the "expired" stock turns out to be perfectly usable.',
            effects: { medicine: 3, morale: 6, crewXp: 14 },
          },
          success: {
            text: 'A properly sorted cabinet with honest labels. Some of the old stock is back in play.',
            effects: { medicine: 2, crewXp: 7 },
          },
          partial: {
            text: 'You sort about half of it before the reagents run out. The rest keeps its question mark.',
            effects: { medicine: 1 },
          },
          failure: {
            text: 'Nothing you can test aboard tells you anything useful about potency. The cabinet is exactly as ambiguous as it was.',
            effects: { crewStress: 3 },
          },
          criticalFailure: {
            text: 'You mislabel a degraded batch as good. Somebody will reach for it in an emergency and it will not work.',
            effects: { medicine: -1, crewStress: 5, flag: { key: 'bad_medicine_batch', value: true } },
          },
        },
      },
      {
        id: 'discard-expired',
        label: 'Throw out everything past its date',
        hint: 'Safe. Expensive.',
        effects: { hours: 2, medicine: -2 },
        result: {
          text: 'Anything past its date goes into the disposal, no arguments. The cabinet is smaller and everything in it can be trusted.',
          effects: { morale: 2, crewStress: -3 },
        },
      },
      {
        id: 'keep-everything',
        label: 'Keep it all and hope',
        hint: 'Free.',
        effects: { hours: 1 },
        result: {
          text: 'Everything stays on the shelf. In an emergency, whoever reaches into that cabinet is rolling dice they do not know they are rolling.',
          effects: { crewStress: 3, flag: { key: 'unsorted_medicine', value: true } },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'med-scrapes-and-splinters',
    scope: ['medical'],
    title: 'The Small Damage',
    body:
      'A week of working in a ship full of sharp edges has left the crew with the usual harvest: cuts, a burn from a hot line, a hand that got caught in a hatch. None of it matters individually. On a ship with limited medicine, the small damage is how the big problems start.',
    weight: 13,
    routine: true,
    conditions: { minCrew: 2 },
    tags: ['routine', 'minor-injury', 'prevention'],
    choices: [
      {
        id: 'clean-and-close',
        label: 'Clean and close everything properly',
        hint: 'An hour or two and a little medicine.',
        check: { skill: 'firstAid', participation: 'individual' },
        effects: { hours: 2 },
        outcomes: {
          exceptional: {
            text: 'Every cut irrigated and closed, every burn dressed, and a five-minute lecture about gloves that people actually listen to. Nothing aboard gets infected this month.',
            effects: { morale: 6, crewStress: -5, crewXp: 10 },
          },
          success: {
            text: 'All of it cleaned and closed. Boring, quick, and the reason nobody gets sepsis.',
            effects: { morale: 3, crewStress: -3, crewXp: 5 },
          },
          partial: {
            text: 'Most of it dealt with. One cut gets a plaster it needed stitches for.',
            effects: { morale: 1 },
          },
          failure: {
            text: 'You run out of clean dressings halfway through and finish with improvised ones.',
            effects: { crewStress: 2 },
          },
          criticalFailure: {
            text: 'A wound gets closed over contamination and is hot and swollen within three days. Now it is a real problem.',
            effects: {
              medicine: -1,
              crewStress: 6,
              wound: { severityScore: 33, damageType: 'pierce' },
            },
          },
        },
      },
      {
        id: 'fix-the-edges',
        label: 'Spend the time removing the sharp edges instead',
        hint: 'Fixes the cause.',
        effects: { hours: 4 },
        result: {
          text: 'Somebody spends an afternoon with a file and a roll of tape going over every edge, hatch, and bracket on the working decks. The injury rate halves.',
          effects: { morale: 4, crewStress: -4, systems: { hull: 2 } },
        },
      },
      {
        id: 'plasters',
        label: 'Hand out dressings and let people sort themselves out',
        hint: 'Minutes.',
        effects: { hours: 1 },
        result: {
          text: 'A box of dressings on the galley table and a note. Most of it heals. Some of it does not, and you will hear about that in a fortnight.',
          effects: { crewStress: 2 },
        },
      },
    ],
  },
];

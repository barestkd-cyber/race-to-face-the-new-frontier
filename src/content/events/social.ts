/**
 * Social events — crew friction, grief, morale, loyalty, and the small human
 * weather of a cramped ship. Pure data; no logic.
 */

import type { GameEventDef } from '../../engine/types';

export const SOCIAL_EVENTS: GameEventDef[] = [
  // -------------------------------------------------------------------------
  {
    id: 'soc-ration-ledger',
    scope: ['social'],
    title: 'The Ledger in the Galley',
    body:
      "{actor} is standing at the ration locker with a hand-written tally, and the numbers do not add up in someone's favour. Two of your crew are on either side of the counter, very still, in the way people go still just before something breaks. Aboard {ship} there is no room anyone can walk away to, so this gets settled in front of everybody or it festers.",
    weight: 11,
    conditions: { minCrew: 3 },
    tags: ['rations', 'conflict', 'trust'],
    choices: [
      {
        id: 'hear-both',
        label: 'Hear both of them out, in the open',
        hint: 'Slow, public, and it costs you the afternoon.',
        check: {
          skill: 'persuasion',
          secondarySkill: 'negotiation',
          participation: 'individual',
          modifiers: [{ label: 'Everyone is watching', value: -5 }],
        },
        effects: { hours: 3 },
        outcomes: {
          exceptional: {
            text: "You let both of them talk until the story collapses on its own: a miscounted case, not a thief. {actor} apologises without being told to, and the crew watches you hand out fairness instead of blame.",
            effects: { morale: 9, crewStress: -6, crewXp: 12 },
          },
          success: {
            text: 'The tally was off by one crate. Nobody stole anything, and everyone gets to say so out loud before they go back to work.',
            effects: { morale: 5, crewStress: -3, crewXp: 6 },
          },
          partial: {
            text: 'You get the shouting to stop, but not the suspicion. They shake hands like men signing a truce they both intend to break.',
            effects: { morale: 1, crewStress: 2 },
          },
          failure: {
            text: 'The conversation turns into a list of every other grievance aboard. You end it by ending it, and nothing is resolved.',
            effects: { morale: -5, crewStress: 6 },
          },
          criticalFailure: {
            text: "You pick the wrong detail to press on and {actor} hears it as an accusation. The galley empties, and by night watch half the crew isn't speaking to the other half.",
            effects: { morale: -11, crewStress: 12 },
          },
        },
      },
      {
        id: 'flat-shares',
        label: 'Cut every share equally and post the numbers',
        hint: 'Nobody is happy. Nobody can argue.',
        effects: { hours: 1 },
        result: {
          text: 'You chalk the new ration split on the galley bulkhead and initial it. It is a thinner meal for everyone, and it is the same thinner meal for everyone.',
          effects: { food: 2, morale: -4, crewStress: 3, log: 'Rations cut to a flat equal share.' },
        },
      },
      {
        id: 'search-lockers',
        label: 'Search the lockers yourself',
        hint: 'You will know the truth. They will know you searched.',
        check: {
          skill: 'scavenging',
          attributes: ['perception', 'evaluation'],
          participation: 'individual',
        },
        effects: { hours: 2, morale: -2 },
        outcomes: {
          exceptional: {
            text: 'Behind a coolant baffle you find a hoard of ration wrappers and two unopened packs. You put the food back in the locker and never say whose bunk it was near.',
            effects: { food: 2, morale: 4, personalXp: 10 },
          },
          success: {
            text: 'You find the missing packs wedged behind a stanchion, forgotten rather than stolen. The relief in the galley is audible.',
            effects: { food: 1, morale: 3, personalXp: 6 },
          },
          partial: {
            text: 'You find nothing, but you find where somebody has been sleeping badly. It explains some of the temper, if not the numbers.',
            effects: { crewStress: 1 },
          },
          failure: {
            text: 'Empty lockers, opened bunks, and a crew that now knows their captain goes through their things.',
            effects: { morale: -6, crewStress: 5 },
          },
          criticalFailure: {
            text: "You turn out {actor}'s footlocker in front of everyone and find a photograph, a debt slip, and nothing else. The apology does not land.",
            effects: { morale: -10, crewStress: 9 },
          },
        },
      },
      {
        id: 'walk-away',
        label: 'Say nothing and let them sort it out',
        hint: 'They are adults. Probably.',
        effects: { hours: 1 },
        result: {
          text: 'You leave the galley. The argument runs another two hours and finishes with a shoved shoulder and a slammed hatch, and it is still going in silence a week later.',
          effects: { morale: -7, crewStress: 7 },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'soc-galley-cards',
    scope: ['social'],
    title: 'Three Rounds and a Watch',
    body:
      "Somebody has produced a deck of cards and somebody else has produced things worth betting, and the galley table at {location} has quietly become a casino. {actor} is up four hundred credits and two shifts of somebody else's watch rotation. The mood is good right now, which is exactly how these end badly.",
    weight: 9,
    conditions: { minCrew: 3 },
    tags: ['gambling', 'downtime', 'morale'],
    choices: [
      {
        id: 'sit-in',
        label: 'Sit in for a few hands',
        hint: 'A captain who plays is a captain who can lose.',
        check: {
          skill: 'negotiation',
          attributes: ['evaluation', 'composure'],
          participation: 'individual',
        },
        effects: { hours: 3 },
        outcomes: {
          exceptional: {
            text: 'You read the table better than the table reads you, take a respectable pile, and then hand the watch-rotation debts back as a joke. They talk about it for weeks.',
            effects: { credits: 180, morale: 10, crewXp: 8 },
          },
          success: {
            text: 'You break even and lose gracefully at the end so nobody feels beaten. That is the whole point of playing.',
            effects: { credits: 25, morale: 6 },
          },
          partial: {
            text: 'You lose a little and laugh about it. Someone notes that you laughed slightly too late.',
            effects: { credits: -40, morale: 2 },
          },
          failure: {
            text: 'You lose steadily for three hours. The crew is delighted, which is worth something, but the strongbox is lighter.',
            effects: { credits: -140, morale: 3 },
          },
          criticalFailure: {
            text: 'You chase a bad hand with ship money in front of the whole crew and lose it. Nobody says anything, which is worse.',
            effects: { credits: -320, morale: -7, crewStress: 4 },
          },
        },
      },
      {
        id: 'shut-it-down',
        label: 'End the game before it turns',
        hint: 'Unpopular now, cheaper later.',
        check: { skill: 'persuasion', participation: 'individual' },
        effects: { hours: 1 },
        outcomes: {
          exceptional: {
            text: 'You call last hand instead of no hand, sit through it, and everyone folds up feeling like it was their idea. The debts get voided in the general good humour.',
            effects: { morale: 4, crewStress: -3 },
          },
          success: {
            text: 'The deck goes back in a drawer with no hard feelings and the watch rotation stays the ship’s to set, not the table’s.',
            effects: { morale: -1, crewStress: -2 },
          },
          partial: {
            text: 'They pack it in, slowly, while making sure you can hear exactly how they feel about it.',
            effects: { morale: -4, crewStress: 1 },
          },
          failure: {
            text: 'You are told, politely, that off-shift hours are theirs. You are also right, which does not help.',
            effects: { morale: -6, crewStress: 4 },
          },
          criticalFailure: {
            text: "You end the game by taking the cards, and {actor} — four hundred up and about to be paid — takes it as theft. The grudge outlives the deck.",
            effects: { morale: -9, crewStress: 8 },
          },
        },
      },
      {
        id: 'void-debts',
        label: 'Let it run, but void all debts at midnight',
        hint: 'The fun without the wreckage.',
        effects: { hours: 2 },
        result: {
          text: 'You post a rule: play for chips, settle for nothing. Half of them groan and all of them keep playing, and in the morning nobody owes anybody a watch.',
          effects: { morale: 5, crewStress: -4 },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'soc-bottle-in-the-hold',
    scope: ['social'],
    title: 'What {actor} Keeps in the Hold',
    body:
      "There is a smell in the aft cargo run that is not coolant, and behind a stack of crates you find the still: tubing, a heater coil, and a jar three quarters full. {actor} comes around the corner while you are looking at it and does not bother to lie. Two watches were missed this week and now you know why.",
    weight: 10,
    conditions: { minCrew: 2 },
    tags: ['drinking', 'discipline', 'trait'],
    choices: [
      {
        id: 'talk-privately',
        label: 'Take {actor} somewhere quiet and ask why',
        hint: 'Slow. Might actually work.',
        check: {
          skill: 'persuasion',
          attributes: ['socialAwareness', 'composure'],
          participation: 'individual',
        },
        effects: { hours: 3 },
        outcomes: {
          exceptional: {
            text: "{actor} talks for an hour about a brother who did not get on a ship, and then hands you the jar without being asked. It is not fixed, but it is out in the open now, and they know you did not humiliate them for it.",
            effects: { morale: 8, crewStress: -7, crewXp: 10 },
          },
          success: {
            text: 'They agree to cut it down and take the worst watches for a month to make up the missed ones. You believe about eighty per cent of it.',
            effects: { morale: 4, crewStress: -3 },
          },
          partial: {
            text: 'You get an apology and a promise, both delivered a little too quickly. The still stays where it is.',
            effects: { crewStress: -1 },
          },
          failure: {
            text: '{actor} tells you the missed watches were exhaustion, not drink, and dares you to prove otherwise. You cannot, tonight.',
            effects: { morale: -3, crewStress: 4 },
          },
          criticalFailure: {
            text: 'You push and they break, loudly, in a corridor where four people can hear. Whatever this was, it is now everyone’s.',
            effects: { morale: -8, crewStress: 10 },
          },
        },
      },
      {
        id: 'pour-it-out',
        label: 'Pour it out and strip the still for parts',
        hint: 'Decisive. Not free.',
        effects: { hours: 2 },
        result: {
          text: 'The jar goes down the recycler and the tubing goes into the spares bin, which is at least honest salvage. {actor} watches the whole thing without a word and does not look at you for three days.',
          effects: { repairParts: 1, morale: -5, crewStress: 6, items: [{ itemId: 'salvage_scrap', qty: 1 }] },
        },
      },
      {
        id: 'cover-the-watch',
        label: 'Cover the missed watches yourself and say nothing',
        hint: 'Costs you sleep, not the crew.',
        effects: { hours: 6 },
        result: {
          text: 'You stand the mid watch twice and log it under your own name. Nobody else finds out, which means nobody else learns anything either.',
          effects: { morale: 2, crewStress: 2, personalXp: 4 },
        },
      },
      {
        id: 'set-terms',
        label: 'Set hard terms in front of the crew',
        hint: 'Make the rule visible.',
        check: {
          skill: 'negotiation',
          attributes: ['leadership', 'discipline'],
          participation: 'individual',
        },
        effects: { hours: 2 },
        outcomes: {
          exceptional: {
            text: 'You make the rule about the watch bill rather than the bottle, and {actor} signs on to it in front of everyone. The crew reads it as fair, not cruel.',
            effects: { morale: 6, crewStress: -4, crewXp: 8 },
          },
          success: {
            text: 'Terms are set, witnessed, and grudgingly accepted. It will hold as long as the run stays easy.',
            effects: { morale: 1, crewStress: 1 },
          },
          partial: {
            text: 'The terms stick but the shame does too, and {actor} works the next week like someone serving a sentence.',
            effects: { morale: -3, crewStress: 5 },
          },
          failure: {
            text: 'You make an example of them and the crew quietly decides they would rather be lied to than be next.',
            effects: { morale: -7, crewStress: 7 },
          },
          criticalFailure: {
            text: '{actor} walks out mid-sentence and locks themselves in the aft hold. The still comes back within the week, better hidden.',
            effects: { morale: -10, crewStress: 11 },
          },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'soc-homesick-watch',
    scope: ['social'],
    title: 'The Old Broadcast',
    body:
      "You find {actor} alone on the mid watch with the comm panel tuned to a dead civil band, listening to nothing at all. They have been running the same six seconds of a weather report from home on a loop, {captain}, and they have been doing it for a while. Outside there is only {location} and the long dark past it.",
    weight: 10,
    conditions: { minCrew: 2 },
    tags: ['homesickness', 'grief', 'watch'],
    choices: [
      {
        id: 'sit-with-them',
        label: 'Sit down and listen to it with them',
        hint: 'You lose the watch. They get a witness.',
        check: {
          skill: 'persuasion',
          attributes: ['socialAwareness', 'resilience'],
          participation: 'individual',
        },
        effects: { hours: 3 },
        outcomes: {
          exceptional: {
            text: 'You say almost nothing for two hours and it turns out that was the right amount. By the end {actor} is telling you about the street they grew up on, in the present tense, and smiling.',
            effects: { morale: 8, crewStress: -9, crewXp: 8 },
          },
          success: {
            text: 'They talk, you listen, the loop gets switched off around 0300. It is the first full night of sleep they have had in a week.',
            effects: { morale: 5, crewStress: -6 },
          },
          partial: {
            text: 'They tell you they are fine three separate times. You stay anyway, and the loop keeps playing.',
            effects: { crewStress: -2 },
          },
          failure: {
            text: 'You reach for the wrong thing to say and it lands like a door closing. They finish the watch alone.',
            effects: { morale: -3, crewStress: 3 },
          },
          criticalFailure: {
            text: 'You tell them the world back there is already gone, out loud, in the flattest possible way. It is true. It was not the thing to say.',
            effects: { morale: -8, crewStress: 10 },
          },
        },
      },
      {
        id: 'cook-from-home',
        label: 'Cook something from back home',
        hint: 'Costs food. Buys more than food.',
        requires: { minFood: 2 },
        check: { skill: 'cooking', participation: 'individual' },
        effects: { hours: 2, food: -1 },
        outcomes: {
          exceptional: {
            text: 'You get it close enough that {actor} stops mid-bite. Half the off-watch crew drifts into the galley for the smell, and for an hour the ship feels like a place people live.',
            effects: { morale: 11, crewStress: -8, crewXp: 6 },
          },
          success: {
            text: 'It is not quite right and that is somehow the point. They eat all of it.',
            effects: { morale: 6, crewStress: -4 },
          },
          partial: {
            text: 'The texture is wrong and the seasoning is a guess, but the gesture is legible.',
            effects: { morale: 2, crewStress: -1 },
          },
          failure: {
            text: 'You burn the base and the whole deck smells like it for two days. {actor} thanks you for trying, which stings.',
            effects: { morale: -2, food: -1 },
          },
          criticalFailure: {
            text: 'You get it almost exactly right, and {actor} pushes the bowl away and leaves the galley. Some doors should stay shut.',
            effects: { morale: -6, crewStress: 8, food: -1 },
          },
        },
      },
      {
        id: 'give-the-night',
        label: 'Take the rest of the watch yourself',
        hint: 'Six hours of your sleep.',
        effects: { hours: 6 },
        result: {
          text: 'You send them to their bunk and stand the panel until dawn cycle. They sleep. You do not.',
          effects: { morale: 3, crewStress: -4, personalXp: 4 },
        },
      },
      {
        id: 'back-to-work',
        label: 'Tell them to switch it off and finish the watch',
        hint: 'The ship still needs running.',
        effects: { hours: 1 },
        result: {
          text: 'The band goes dead and the panel goes back to traffic. {actor} finishes the watch correctly and does not look up once.',
          effects: { morale: -4, crewStress: 5 },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'soc-remembrance',
    scope: ['social'],
    title: 'Names on the Bulkhead',
    body:
      'Somebody has started scratching names into the paint by the aft hatch — people left behind, people who did not make the ship, a whole column of them. {actor} asks you, in front of others, whether the crew is allowed to hold a proper remembrance while {ship} is under way. Everyone in the corridor is waiting to see what you say.',
    weight: 9,
    conditions: { minCrew: 3 },
    tags: ['grief', 'ritual', 'morale'],
    choices: [
      {
        id: 'hold-it-properly',
        label: 'Stop work and hold it properly',
        hint: 'Three hours of the ship doing nothing at all.',
        check: {
          skill: 'persuasion',
          attributes: ['leadership', 'composure'],
          participation: 'group',
        },
        effects: { hours: 3 },
        outcomes: {
          exceptional: {
            text: 'You read the names badly and nobody minds. By the end people are adding names you never heard of and telling stories about them, and the corridor feels less like a hull and more like a hall.',
            effects: { morale: 13, crewStress: -12, crewXp: 12 },
          },
          success: {
            text: 'The crew stands together for an hour and the list gets read out loud. Afterwards the ship is quiet in a different way than before.',
            effects: { morale: 8, crewStress: -8, crewXp: 6 },
          },
          partial: {
            text: 'It is stiff and a little embarrassing, and it still helps two of them more than they will admit.',
            effects: { morale: 3, crewStress: -3 },
          },
          failure: {
            text: 'Nobody knows what to do with their hands. It ends early and leaves everyone rawer than it found them.',
            effects: { morale: -3, crewStress: 4 },
          },
          criticalFailure: {
            text: 'Two people want different names read and neither will yield. The remembrance turns into an argument about who is allowed to be mourned.',
            effects: { morale: -9, crewStress: 11 },
          },
        },
      },
      {
        id: 'good-rations',
        label: 'Open the good rations for it',
        hint: 'Food you cannot spare, spent on people you cannot get back.',
        requires: { minFood: 3 },
        check: { skill: 'cooking', secondarySkill: 'persuasion', participation: 'individual' },
        effects: { hours: 3, food: -2 },
        outcomes: {
          exceptional: {
            text: 'You put out a real meal — the preserved things you were saving, plated like it mattered — and the crew eats it standing, telling stories. Nobody mentions the cost.',
            effects: { morale: 14, crewStress: -11, crewXp: 8 },
          },
          success: {
            text: 'It is the best food anyone has had since departure, and it is eaten in honour of people who never got any.',
            effects: { morale: 9, crewStress: -7 },
          },
          partial: {
            text: 'The meal is fine. The occasion sits heavier than the food, and half of it goes uneaten.',
            effects: { morale: 3, crewStress: -2 },
          },
          failure: {
            text: 'You spend the stores and get a subdued hour out of it. Someone points out, later, exactly how many days that was.',
            effects: { morale: -1, crewStress: 2 },
          },
          criticalFailure: {
            text: 'Halfway through, somebody says out loud that this is two days of survival spent on the dead. The room agrees with them.',
            effects: { morale: -8, crewStress: 9 },
          },
        },
      },
      {
        id: 'let-actor-lead',
        label: 'Tell {actor} to run it however they want',
        hint: 'It stops being your ritual.',
        effects: { hours: 2 },
        result: {
          text: '{actor} organises it in their own way, with their own words, and does it better than you would have. You stand at the back like anyone else.',
          effects: { morale: 7, crewStress: -6, crewXp: 5 },
        },
      },
      {
        id: 'keep-flying',
        label: 'Say the ship comes first and keep the watch bill',
        hint: 'No hours lost.',
        effects: { hours: 1 },
        result: {
          text: 'You tell them the names are not going anywhere and neither is the grief, but the burn window is. Work continues. The scratching by the hatch gets deeper that night.',
          effects: { morale: -6, crewStress: 7 },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'soc-quiet-attachment',
    scope: ['social'],
    title: 'Two Coffees on One Watch',
    body:
      'Two of your crew have started arranging their shifts so that they overlap, and everyone aboard {ship} has noticed except, apparently, the two of them. It is careful and quiet and nobody has done anything wrong. It also means that on the third watch you have two people whose judgement about each other you can no longer entirely trust.',
    weight: 8,
    conditions: { minCrew: 4 },
    tags: ['relationships', 'watch-bill', 'discretion'],
    choices: [
      {
        id: 'leave-it',
        label: 'Leave it alone',
        hint: 'They are adults and the ship still flies.',
        effects: { hours: 1 },
        result: {
          text: 'You say nothing, sign the watch bill as submitted, and let people have the one good thing they have found out here. It works, for now.',
          effects: { morale: 5, crewStress: -3 },
        },
      },
      {
        id: 'split-the-watch',
        label: 'Split their shifts without explaining why',
        hint: 'Clean on paper.',
        effects: { hours: 1 },
        result: {
          text: 'The new rotation goes up without comment. They read it correctly within about four minutes, and the resentment is polite and total.',
          effects: { morale: -6, crewStress: 6 },
        },
      },
      {
        id: 'say-it-plainly',
        label: 'Talk to both of them, plainly, once',
        hint: 'One awkward hour, no ambiguity afterwards.',
        check: {
          skill: 'persuasion',
          attributes: ['socialAwareness', 'charisma'],
          participation: 'duo',
        },
        effects: { hours: 2 },
        outcomes: {
          exceptional: {
            text: 'You tell them you do not care who they spend their off hours with, only that the watch bill stays honest, and they visibly stop bracing. They volunteer the split themselves.',
            effects: { morale: 9, crewStress: -6, crewXp: 8 },
          },
          success: {
            text: 'It is a short, uncomfortable, entirely reasonable conversation. Everybody comes out of it knowing where they stand.',
            effects: { morale: 3, crewStress: -2 },
          },
          partial: {
            text: 'They agree to keep it off the bridge. One of them will not meet your eye for a week.',
            effects: { crewStress: 2 },
          },
          failure: {
            text: 'You manage to make it sound like an accusation, and now two of your crew think you have been watching them.',
            effects: { morale: -5, crewStress: 6 },
          },
          criticalFailure: {
            text: 'You raise it in front of a third person by accident. Whatever this was, it now belongs to the whole ship, and neither of them forgives that quickly.',
            effects: { morale: -9, crewStress: 10 },
          },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'soc-course-questioned',
    scope: ['social'],
    title: 'Where Exactly Are We Going',
    body:
      '{actor} asks the question at the worst possible moment, in the galley, with everyone eating: what is the actual plan, and does the captain have one. It is not mutiny, {captain}. It is worse — it is a fair question, and six people just stopped chewing to hear the answer.',
    weight: 11,
    conditions: { minCrew: 3 },
    tags: ['mission-doubt', 'leadership', 'trust'],
    choices: [
      {
        id: 'answer-honestly',
        label: 'Tell them the truth, including the parts you do not know',
        hint: 'Honesty is a gamble in a small room.',
        check: {
          skill: 'persuasion',
          attributes: ['charisma', 'resilience'],
          participation: 'group',
          criticalRisk: true,
        },
        effects: { hours: 2 },
        outcomes: {
          exceptional: {
            text: 'You lay out what you know, what you are guessing at, and what happens if the guess is wrong. Nobody expected candour, and the crew closes around the plan instead of around the doubt.',
            effects: { morale: 12, crewStress: -9, crewXp: 12 },
          },
          success: {
            text: 'You are honest about the odds. It is not reassuring, but they believe you, and belief is the scarcer resource.',
            effects: { morale: 6, crewStress: -3, crewXp: 6 },
          },
          partial: {
            text: 'Half of them are satisfied. The other half go back to their bowls with the question still in their teeth.',
            effects: { morale: 1, crewStress: 2 },
          },
          failure: {
            text: 'You say too much about how thin the margin is. The galley empties quietly and nobody argues, which is the problem.',
            effects: { morale: -6, crewStress: 8 },
          },
          criticalFailure: {
            text: 'You admit, out loud, that you are improvising. {actor} says what everyone is thinking and two people agree with them before you can answer.',
            effects: { morale: -12, crewStress: 13 },
          },
        },
      },
      {
        id: 'show-the-math',
        label: 'Put the route and the fuel figures on the table',
        hint: 'Numbers do not argue back. Unless they are bad.',
        check: {
          skill: 'navigation',
          attributes: ['reasoning', 'charisma'],
          participation: 'individual',
        },
        effects: { hours: 2 },
        outcomes: {
          exceptional: {
            text: 'You walk them through every leg, every reserve, every fallback port. By the end two of them are arguing about the next hop instead of about you.',
            effects: { morale: 10, crewStress: -7, crewXp: 10 },
          },
          success: {
            text: 'The plan survives contact with the crew. They may not like the margins, but they can see the margins.',
            effects: { morale: 5, crewStress: -3, crewXp: 5 },
          },
          partial: {
            text: 'The numbers hold up until somebody asks what happens if a system fails, and you do not have that page.',
            effects: { morale: 1, crewStress: 1 },
          },
          failure: {
            text: 'Somebody spots an optimistic assumption in the fuel curve. You have to correct it in front of everyone.',
            effects: { morale: -5, crewStress: 6 },
          },
          criticalFailure: {
            text: 'The figures do not survive five minutes of a former freight hand looking at them. The plan is now a rumour with a chart attached.',
            effects: { morale: -10, crewStress: 11 },
          },
        },
      },
      {
        id: 'pull-rank',
        label: 'Pull rank and end the conversation',
        hint: 'Fast. Blunt.',
        effects: { hours: 1 },
        result: {
          text: 'You remind them whose name is on the registry and whose ship this is. The subject drops immediately and the question does not.',
          effects: { morale: -7, crewStress: 6 },
        },
      },
      {
        id: 'offer-the-door',
        label: 'Offer {actor} passage off at the next port',
        hint: 'Terms, not threats.',
        check: { skill: 'negotiation', participation: 'individual' },
        effects: { hours: 2 },
        outcomes: {
          exceptional: {
            text: 'You put a real offer on the table — passage, a share, no hard words — and {actor} turns it down in front of everybody. Nothing you could have said would have bought that.',
            effects: { morale: 11, crewStress: -6, crewXp: 10 },
          },
          success: {
            text: 'They think about it and stay. The offer standing there, unforced, does more than an argument would have.',
            effects: { morale: 5, crewStress: -2 },
          },
          partial: {
            text: 'They say they will decide at the next port. It hangs over the whole leg.',
            effects: { morale: -2, crewStress: 4 },
          },
          failure: {
            text: 'The offer reads as a threat no matter how you phrase it, and the crew hears it that way too.',
            effects: { morale: -7, crewStress: 7 },
          },
          criticalFailure: {
            text: '{actor} takes the offer on the spot and starts packing. Two others quietly ask whether the same terms are available to them.',
            effects: { morale: -11, crewStress: 12, loseCrew: true },
          },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'soc-trait-surfaces',
    scope: ['social'],
    title: 'A Small Wrong Thing',
    body:
      'It is nothing you could write up: {actor} takes a second helping when the count is short, or checks the airlock log twice, or laughs at something that was not funny. It is the third time this week you have noticed the same shape of behaviour. You could look closer, or you could go on not knowing what kind of person you are flying with.',
    weight: 10,
    conditions: { minCrew: 3 },
    tags: ['trait', 'observation', 'trust'],
    choices: [
      {
        id: 'read-them',
        label: 'Watch them for a few days without saying anything',
        hint: 'Patient. Slightly cold.',
        check: {
          skill: 'negotiation',
          attributes: ['evaluation', 'perception'],
          participation: 'individual',
        },
        effects: { hours: 4 },
        outcomes: {
          exceptional: {
            text: 'By the third day you have the whole pattern: what sets it off, what settles it, and what {actor} is protecting. You can work with that.',
            effects: { morale: 3, personalXp: 14, crewXp: 6 },
          },
          success: {
            text: 'You get a clear enough read to know it is not malice, just a shape they were bent into a long time ago.',
            effects: { personalXp: 8 },
          },
          partial: {
            text: 'You learn something, and it raises two more questions. Watching costs time you needed elsewhere.',
            effects: { personalXp: 4, crewStress: 1 },
          },
          failure: {
            text: 'Four days of paying attention and all you have is a feeling. Feelings do not crew a ship.',
            effects: { crewStress: 2 },
          },
          criticalFailure: {
            text: '{actor} notices you noticing, and the conclusion they draw is that the captain does not trust them. They are, technically, correct.',
            effects: { morale: -7, crewStress: 8 },
          },
        },
      },
      {
        id: 'ask-a-friend',
        label: 'Ask someone who knew them before',
        hint: 'Fast, but it spreads.',
        requires: { minCrew: 4 },
        check: { skill: 'persuasion', participation: 'duo' },
        effects: { hours: 2 },
        outcomes: {
          exceptional: {
            text: 'You get the whole history in one sitting, told kindly, with the request that you never let on where it came from. You agree.',
            effects: { personalXp: 12, crewXp: 6, morale: 2 },
          },
          success: {
            text: 'You get most of the shape of it and a warning about which subject not to raise.',
            effects: { personalXp: 7 },
          },
          partial: {
            text: 'You get a shrug and one useful sentence, delivered reluctantly.',
            effects: { personalXp: 3, crewStress: 2 },
          },
          failure: {
            text: 'Asking about a crewmate behind their back earns you exactly the answer that behaviour deserves.',
            effects: { morale: -4, crewStress: 4 },
          },
          criticalFailure: {
            text: 'It gets back to {actor} within a day, embellished. Now two people are angry and one of them is angry at you.',
            effects: { morale: -9, crewStress: 10 },
          },
        },
      },
      {
        id: 'ask-directly',
        label: 'Ask them straight out',
        hint: 'No subtlety, no surveillance.',
        effects: { hours: 1 },
        result: {
          text: 'You ask. {actor} gives you a partial, careful answer and then, unexpectedly, a real one. It does not explain everything and it is more than you had.',
          effects: { morale: 4, crewStress: -2, personalXp: 6 },
        },
      },
      {
        id: 'ignore-it',
        label: 'Decide it is none of your business',
        hint: 'Free. For now.',
        effects: { hours: 1 },
        result: {
          text: 'You let it go. Whatever it is stays folded up inside {actor}, waiting for a worse week to come out in.',
          effects: { crewStress: 1 },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'soc-poaching-offer',
    scope: ['social'],
    title: 'A Better Berth',
    body:
      'Somebody at {location} has been talking to {actor} about a clean ship with a working galley and a route that does not end anywhere frightening. {actor} tells you about it themselves, which is either loyalty or a negotiation. Either way the conversation is happening now, in the corridor, with their bag not quite packed.',
    weight: 9,
    conditions: { minCrew: 3 },
    tags: ['loyalty', 'recruitment', 'departure'],
    choices: [
      {
        id: 'match-the-offer',
        label: 'Match the offer in credits',
        hint: 'Expensive and it works, mostly.',
        requires: { minCredits: 500 },
        effects: { hours: 1, credits: -500 },
        result: {
          text: 'You put the credits in their hand and their name back on the roster. It is a transaction, and both of you know it, and the ship keeps its engineer.',
          effects: { morale: 3, crewStress: -3 },
        },
      },
      {
        id: 'appeal',
        label: 'Ask them to stay because of what this crew is',
        hint: 'Costs nothing. Risks everything.',
        check: {
          skill: 'persuasion',
          attributes: ['charisma', 'socialAwareness'],
          participation: 'individual',
          criticalRisk: true,
        },
        effects: { hours: 2 },
        outcomes: {
          exceptional: {
            text: 'You do not offer them anything. You tell them what they are to this crew and let it sit. {actor} unpacks the bag and tells the other ship exactly where to go.',
            effects: { morale: 13, crewStress: -8, crewXp: 12 },
          },
          success: {
            text: 'They stay. They will think about the other ship on bad nights, but they stay.',
            effects: { morale: 7, crewStress: -4 },
          },
          partial: {
            text: 'They agree to finish this leg and decide after. It is a stay of execution, not a decision.',
            effects: { morale: 1, crewStress: 3 },
          },
          failure: {
            text: 'The appeal lands as guilt rather than warmth. They stay resentful, which may be worse than losing them.',
            effects: { morale: -6, crewStress: 7 },
          },
          criticalFailure: {
            text: 'You misjudge every note of it, and {actor} walks down the ramp with their bag while the crew watches from the hatch.',
            effects: { morale: -13, crewStress: 12, loseCrew: true },
          },
        },
      },
      {
        id: 'give-them-the-work',
        label: 'Offer them the job they actually want aboard {ship}',
        hint: 'Reshuffles the roster.',
        check: {
          skill: 'negotiation',
          attributes: ['evaluation', 'socialAwareness'],
          participation: 'individual',
        },
        effects: { hours: 3 },
        outcomes: {
          exceptional: {
            text: 'You work out that what they wanted was never a better galley — it was a job with their name on it. You give them one, and they stay for it.',
            effects: { morale: 10, crewStress: -6, crewXp: 10 },
          },
          success: {
            text: 'A reshuffled watch bill and a title, and {actor} stays. Two other people notice that asking gets results.',
            effects: { morale: 6, crewStress: -3 },
          },
          partial: {
            text: 'They accept the new posting without enthusiasm. The other ship stays in the back of their mind.',
            effects: { morale: 1, crewStress: 2 },
          },
          failure: {
            text: 'Your reshuffle takes work away from somebody else, who notices immediately. Now two people are unhappy.',
            effects: { morale: -6, crewStress: 6 },
          },
          criticalFailure: {
            text: 'The offer reads as desperation. {actor} concludes the ship needs them more than they need the ship, and starts negotiating for real.',
            effects: { morale: -9, crewStress: 9, credits: -300 },
          },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'soc-galley-feast',
    scope: ['social'],
    title: 'Something Hot',
    body:
      'It has been a week of the same brown packet and the galley smells like nothing at all. {actor} offers to cook properly if you will authorise the stores for it. Everyone aboard {ship} pretends not to be listening for your answer.',
    weight: 12,
    routine: true,
    conditions: { minCrew: 2 },
    tags: ['cooking', 'downtime', 'morale'],
    choices: [
      {
        id: 'full-meal',
        label: 'Authorise a real meal',
        hint: 'Two crew-days of food.',
        requires: { minFood: 3 },
        check: { skill: 'cooking', participation: 'individual' },
        effects: { hours: 3, food: -2 },
        outcomes: {
          exceptional: {
            text: 'It is genuinely good. People come off watch early for it and stay late after, and for two hours nobody mentions fuel, range, or home.',
            effects: { morale: 12, crewStress: -10, crewXp: 6 },
          },
          success: {
            text: 'Hot food, three courses of a sort, eaten together at one table. The ship is measurably lighter afterwards.',
            effects: { morale: 8, crewStress: -6 },
          },
          partial: {
            text: 'The main dish works and the rest is filler, but it beats a packet.',
            effects: { morale: 4, crewStress: -3 },
          },
          failure: {
            text: 'It is edible. That is the kindest available word, and everybody uses it.',
            effects: { morale: 1, crewStress: -1 },
          },
          criticalFailure: {
            text: 'The protein culture goes over in the pan and takes the whole batch with it. Two days of stores into the recycler.',
            effects: { morale: -5, food: -1, crewStress: 3 },
          },
        },
      },
      {
        id: 'simple-hot',
        label: 'One hot pot, nothing fancy',
        hint: 'Cheap and reliable.',
        effects: { hours: 2, food: -1 },
        result: {
          text: 'Everything goes in one pot with the last of the seasoning. It is not a feast and it is hot, and the table fills up anyway.',
          effects: { morale: 5, crewStress: -4 },
        },
      },
      {
        id: 'not-today',
        label: 'Not today — the stores are the stores',
        hint: 'Free.',
        effects: { hours: 1 },
        result: {
          text: 'You say no and give the real reason, which is the fuel curve. They take it. The galley smells like nothing for another week.',
          effects: { morale: -3, crewStress: 2 },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'soc-blame-after-loss',
    scope: ['social'],
    title: 'The Call You Made',
    body:
      'The decision you made three days ago cost the crew something, and now the accounting is being done out loud. {actor} is not shouting — that is the worrying part. They are asking, calmly, in front of the others, whether you would make the same call again.',
    weight: 10,
    conditions: { minCrew: 3 },
    tags: ['blame', 'leadership', 'aftermath'],
    choices: [
      {
        id: 'take-it',
        label: 'Take responsibility without qualifying it',
        hint: 'No excuses offered.',
        check: {
          skill: 'persuasion',
          attributes: ['composure', 'resilience'],
          participation: 'group',
        },
        effects: { hours: 2 },
        outcomes: {
          exceptional: {
            text: 'You say it was your call, it was wrong, and here is what you will do differently. Nobody has ever seen a captain do that cleanly, and the room changes shape.',
            effects: { morale: 12, crewStress: -10, crewXp: 12 },
          },
          success: {
            text: 'You own it. The anger has nowhere to go and dissipates into something more like exhaustion.',
            effects: { morale: 6, crewStress: -5 },
          },
          partial: {
            text: 'You own most of it and hedge the last part. They notice the hedge.',
            effects: { morale: 1, crewStress: 1 },
          },
          failure: {
            text: 'It comes out as self-pity instead of accountability, and now they have to manage your feelings on top of their own.',
            effects: { morale: -6, crewStress: 7 },
          },
          criticalFailure: {
            text: 'You apologise so completely that the crew stops believing you can make the next call at all. That is a hole you will be climbing out of for weeks.',
            effects: { morale: -11, crewStress: 12 },
          },
        },
      },
      {
        id: 'defend-the-call',
        label: 'Defend the call — it was the right one with what you knew',
        hint: 'True is not the same as persuasive.',
        check: {
          skill: 'negotiation',
          attributes: ['reasoning', 'leadership'],
          participation: 'group',
        },
        effects: { hours: 2 },
        outcomes: {
          exceptional: {
            text: 'You walk them through the information you had at the time, including the parts nobody else saw. By the end, {actor} says out loud that they would have called it the same way.',
            effects: { morale: 10, crewStress: -8, crewXp: 10 },
          },
          success: {
            text: 'The reasoning holds. They do not like the outcome and they can no longer say the decision was careless.',
            effects: { morale: 5, crewStress: -3 },
          },
          partial: {
            text: 'You convince the ones who were already on your side.',
            effects: { crewStress: 2 },
          },
          failure: {
            text: 'Defending it reads as refusing to learn from it. The room hardens.',
            effects: { morale: -7, crewStress: 8 },
          },
          criticalFailure: {
            text: 'Somewhere in the third minute you say the loss was acceptable. You meant it tactically. Nobody hears it that way.',
            effects: { morale: -12, crewStress: 13 },
          },
        },
      },
      {
        id: 'give-them-a-say',
        label: 'Give the crew a vote on the next leg',
        hint: 'Cheap now, complicated later.',
        effects: { hours: 3 },
        result: {
          text: 'You put the next routing decision to the whole crew and abide by it. Morale rises immediately and you have just set a precedent that will be quoted back at you.',
          effects: { morale: 8, crewStress: -6, flag: { key: 'crew_vote_precedent', value: true } },
        },
      },
      {
        id: 'end-it',
        label: 'End the discussion',
        hint: 'Nothing gets said. Nothing gets resolved.',
        effects: { hours: 1 },
        result: {
          text: 'You tell them the matter is closed. It closes. It does not go away.',
          effects: { morale: -8, crewStress: 8 },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'soc-stolen-keepsake',
    scope: ['social'],
    title: 'Missing From a Footlocker',
    body:
      "{actor} comes to you white-faced: the one thing they brought off the homeworld is gone from their footlocker. A watch, a photograph, somebody's ring — it does not matter what it is, it matters that it was theirs and now it is not. On a ship this size, whoever took it is eating dinner with them tonight.",
    weight: 9,
    conditions: { minCrew: 4 },
    tags: ['theft', 'trust', 'investigation'],
    choices: [
      {
        id: 'quiet-search',
        label: 'Look into it quietly yourself',
        hint: 'Slow, discreet, uncertain.',
        check: {
          skill: 'scavenging',
          attributes: ['perception', 'evaluation'],
          participation: 'individual',
        },
        effects: { hours: 4 },
        outcomes: {
          exceptional: {
            text: 'You find it in a maintenance void with three other small things that went missing this month. You return them all without ever naming anybody, and the taking stops.',
            effects: {
              morale: 9,
              crewStress: -6,
              personalXp: 12,
              items: [{ itemId: 'personal_effects', qty: 1 }],
            },
          },
          success: {
            text: 'You find it wedged behind a panel near the crew head. It looks like carelessness, and you let everyone believe it was.',
            effects: { morale: 6, crewStress: -4, items: [{ itemId: 'heirloom_watch', qty: 1, condition: 70 }] },
          },
          partial: {
            text: 'You find where it was, not where it went. {actor} thanks you for trying and stops leaving anything in the locker.',
            effects: { morale: -1, crewStress: 3 },
          },
          failure: {
            text: 'Four hours of quiet searching turns up nothing but other people’s private business you now have to pretend you did not see.',
            effects: { morale: -4, crewStress: 5 },
          },
          criticalFailure: {
            text: 'You are caught going through a bunk that turns out to belong to somebody entirely innocent. The theft is now the second-biggest problem aboard.',
            effects: { morale: -10, crewStress: 11 },
          },
        },
      },
      {
        id: 'amnesty',
        label: 'Announce an amnesty — back in the locker by morning, no questions',
        hint: 'Requires the crew to believe you.',
        check: { skill: 'persuasion', participation: 'group' },
        effects: { hours: 2 },
        outcomes: {
          exceptional: {
            text: 'It is on the mess table before the night watch changes, along with a scrap of paper that just says sorry. Nobody ever finds out who, and the ship is better for it.',
            effects: { morale: 11, crewStress: -8, crewXp: 8 },
          },
          success: {
            text: 'It comes back in the morning. The amnesty holds because you held to it.',
            effects: { morale: 7, crewStress: -5 },
          },
          partial: {
            text: 'Something comes back. Not the thing that was taken, but something, left where you would find it.',
            effects: { morale: 2, crewStress: 1 },
          },
          failure: {
            text: 'Morning comes and the locker is still empty. An amnesty nobody takes is just an announcement that you cannot find the thief.',
            effects: { morale: -5, crewStress: 6 },
          },
          criticalFailure: {
            text: 'The offer is read as an accusation aimed at one particular person, who says so, loudly. Two others take their side.',
            effects: { morale: -9, crewStress: 10 },
          },
        },
      },
      {
        id: 'buy-it-back',
        label: 'Offer credits, no questions asked',
        hint: 'Works. Teaches the wrong lesson.',
        requires: { minCredits: 200 },
        effects: { hours: 2, credits: -200 },
        result: {
          text: 'The item appears within the day and the credits disappear with it. {actor} gets their keepsake back, and everyone aboard now knows what theft pays here.',
          effects: { morale: 3, crewStress: 2, items: [{ itemId: 'heirloom_watch', qty: 1, condition: 65 }] },
        },
      },
      {
        id: 'muster-and-search',
        label: 'Muster everyone and search every locker',
        hint: 'Certain to find something. Certain to cost you.',
        effects: { hours: 3 },
        result: {
          text: 'You stand the crew in the corridor and open every locker in front of them. You do not find the keepsake. You do find out exactly how much good will you had.',
          effects: { morale: -11, crewStress: 12 },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'soc-old-rivalry',
    scope: ['social'],
    title: 'Two Sides of an Old Line',
    body:
      'Back home, two of your crew stood on opposite sides of something — a strike, a district, a family. It did not matter out here until this week, when one of them said the name of a place and the other one stopped working. Now they are being scrupulously professional at each other in a corridor two metres wide.',
    weight: 9,
    conditions: { minCrew: 4 },
    tags: ['rivalry', 'history', 'friction'],
    choices: [
      {
        id: 'same-job',
        label: 'Put them on the same job until it is done',
        hint: 'Forced proximity. Could go either way.',
        check: {
          skill: 'persuasion',
          attributes: ['leadership', 'socialAwareness'],
          participation: 'duo',
        },
        effects: { hours: 5 },
        outcomes: {
          exceptional: {
            text: 'Six hours in a crawlspace with one lamp between them, and they come out arguing about something completely different. Whatever the old line was, it does not survive shared work.',
            effects: { morale: 11, crewStress: -8, crewXp: 12, systems: { hull: 4 } },
          },
          success: {
            text: 'The job gets done and they speak to each other like colleagues afterwards. It is a start.',
            effects: { morale: 6, crewStress: -4, systems: { hull: 3 } },
          },
          partial: {
            text: 'The work is completed in total silence and to a slightly lower standard than either of them is capable of.',
            effects: { crewStress: 2, systems: { hull: 1 } },
          },
          failure: {
            text: 'They down tools an hour in and come to you separately to complain. The job is unfinished.',
            effects: { morale: -5, crewStress: 6 },
          },
          criticalFailure: {
            text: 'It goes physical in the crawlspace. Somebody comes out with a split lip and somebody comes out with a story they will tell for years.',
            effects: {
              morale: -10,
              crewStress: 12,
              wound: { severityScore: 26, damageType: 'blunt' },
            },
          },
        },
      },
      {
        id: 'supervised-bout',
        label: 'Let them settle it with gloves on, supervised',
        hint: 'Old-fashioned. Risky.',
        check: { skill: 'brawling', participation: 'duo', criticalRisk: true },
        effects: { hours: 2 },
        outcomes: {
          exceptional: {
            text: 'Three rounds in the cargo bay with half the crew watching, and it ends with both of them on the deck laughing and unable to breathe. The line is gone.',
            effects: { morale: 12, crewStress: -10, crewXp: 10 },
          },
          success: {
            text: 'They hit each other until it stops meaning anything, then shake hands. It is stupid and it works.',
            effects: { morale: 7, crewStress: -6 },
          },
          partial: {
            text: 'It ends in a draw neither of them accepts, and both are sore for a week.',
            effects: { morale: 1, crewStress: 2, wound: { severityScore: 22, damageType: 'blunt' } },
          },
          failure: {
            text: 'One of them takes it too seriously and the other takes a hard shot. You stop it, late.',
            effects: {
              morale: -6,
              crewStress: 7,
              wound: { severityScore: 34, damageType: 'blunt' },
            },
          },
          criticalFailure: {
            text: 'Somebody goes down badly on the deck plating and does not get up on their own. You authorised this.',
            effects: {
              morale: -12,
              crewStress: 14,
              wound: { severityScore: 52, damageType: 'blunt' },
              medicine: -1,
            },
          },
        },
      },
      {
        id: 'separate-shifts',
        label: 'Rewrite the watch bill so they never overlap',
        hint: 'Manages the symptom.',
        effects: { hours: 2 },
        result: {
          text: 'Opposite rotations, separate meals, no shared spaces. The ship runs quietly and two people are lonelier than they were.',
          effects: { morale: -2, crewStress: -3 },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'soc-night-watch-quiet',
    scope: ['social'],
    title: 'Nothing On the Scope',
    body:
      'Third watch, nothing on the scope, and {actor} is the only other person awake on {ship}. The panel hums, the coffee is old, and there are four hours until anyone else stirs. These are the hours that decide whether a crew is a crew.',
    weight: 12,
    routine: true,
    conditions: { minCrew: 2 },
    tags: ['downtime', 'bonding', 'watch'],
    choices: [
      {
        id: 'talk',
        label: 'Talk about nothing in particular',
        hint: 'The most efficient two hours you will spend.',
        check: {
          skill: 'persuasion',
          attributes: ['socialAwareness', 'charisma'],
          participation: 'duo',
        },
        effects: { hours: 2 },
        outcomes: {
          exceptional: {
            text: 'Somewhere around the third hour {actor} tells you something they have never told anyone aboard, and then makes a joke about it. You both watch the dark and it is companionable.',
            effects: { morale: 7, crewStress: -6, crewXp: 8 },
          },
          success: {
            text: 'You trade small histories until the watch turns over. Nothing important is said and something important happens.',
            effects: { morale: 4, crewStress: -4 },
          },
          partial: {
            text: 'The conversation stalls twice and restarts twice. It is fine.',
            effects: { morale: 1, crewStress: -1 },
          },
          failure: {
            text: 'You run out of things to say in twenty minutes and the remaining hours are long.',
            effects: { crewStress: 1 },
          },
          criticalFailure: {
            text: 'You ask about family. {actor} has none left, and now neither of you can leave the compartment gracefully.',
            effects: { morale: -4, crewStress: 6 },
          },
        },
      },
      {
        id: 'brew-coffee',
        label: 'Make the good coffee',
        hint: 'Uses stores. Worth it.',
        requires: { minFood: 1 },
        effects: { hours: 1, food: -1 },
        result: {
          text: 'You break out the real stim coffee instead of the recycled sludge. Two mugs, four hours, no conversation necessary.',
          effects: { morale: 4, crewStress: -4 },
        },
      },
      {
        id: 'read-alone',
        label: 'Take opposite ends of the compartment',
        hint: 'Quiet is also a kind of rest.',
        effects: { hours: 3 },
        result: {
          text: 'You each find a corner and the watch passes in silence. It is not unfriendly, and everyone is a little more rested for it.',
          effects: { crewStress: -3 },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'soc-newcomer-friction',
    scope: ['social'],
    title: 'The New One',
    body:
      'The person you took aboard at the last port does everything slightly wrong — stows gear in the wrong place, sits in somebody’s seat, laughs a beat behind. Nobody has been cruel yet. {actor} has started routing around them, which is how it begins, and the rest of the crew is watching to see whether you notice.',
    weight: 9,
    conditions: { minCrew: 4 },
    tags: ['newcomer', 'integration', 'friction'],
    choices: [
      {
        id: 'pair-with-veteran',
        label: 'Pair them with your steadiest hand for a week',
        hint: 'Costs the veteran’s productivity.',
        check: {
          skill: 'persuasion',
          attributes: ['leadership', 'evaluation'],
          participation: 'duo',
        },
        effects: { hours: 4 },
        outcomes: {
          exceptional: {
            text: 'By the end of the week the newcomer is doing things the ship’s way and the veteran is defending them at the table. You could not have bought that.',
            effects: { morale: 10, crewStress: -7, crewXp: 12 },
          },
          success: {
            text: 'They learn the ship’s habits from someone who has them, which is faster than learning them from being resented.',
            effects: { morale: 6, crewStress: -4, crewXp: 6 },
          },
          partial: {
            text: 'The pairing is tolerated on both sides. Some of it sticks.',
            effects: { morale: 2 },
          },
          failure: {
            text: 'Your steadiest hand does not want a shadow and says so. Now the newcomer knows they are a chore.',
            effects: { morale: -5, crewStress: 5 },
          },
          criticalFailure: {
            text: 'The pairing goes badly enough that the veteran asks to be reassigned and the newcomer asks what they did wrong. You do not have a good answer.',
            effects: { morale: -9, crewStress: 9 },
          },
        },
      },
      {
        id: 'find-their-work',
        label: 'Find the one job they are genuinely good at',
        hint: 'Requires actually knowing what that is.',
        check: {
          skill: 'negotiation',
          attributes: ['evaluation', 'perception'],
          participation: 'individual',
        },
        effects: { hours: 3 },
        outcomes: {
          exceptional: {
            text: 'You put them on the thing they are quietly excellent at and let the crew watch them be excellent at it. The routing-around stops within two days.',
            effects: { morale: 11, crewStress: -6, crewXp: 10 },
          },
          success: {
            text: 'You find work that suits them and the ship gets measurably better at one small thing.',
            effects: { morale: 6, crewStress: -3, crewXp: 5 },
          },
          partial: {
            text: 'You guess wrong twice before guessing right, and the two wrong guesses were public.',
            effects: { morale: 1, crewStress: 2 },
          },
          failure: {
            text: 'You put them somewhere they cannot cope and it shows. The crew’s opinion hardens.',
            effects: { morale: -5, crewStress: 5 },
          },
          criticalFailure: {
            text: 'You hand them a job that goes wrong expensively, in front of everybody, and the ship pays for it.',
            effects: { morale: -9, crewStress: 9, repairParts: -1, systems: { power: -5 } },
          },
        },
      },
      {
        id: 'let-them-earn-it',
        label: 'Let them earn their place unaided',
        hint: 'Traditional. Slow. Sometimes fatal to morale.',
        effects: { hours: 1 },
        result: {
          text: 'You do nothing and let the crew set the terms. The newcomer will either grind their way in over months or stop trying by the next port.',
          effects: { morale: -4, crewStress: 4 },
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'soc-broadcast-from-home',
    scope: ['social'],
    title: 'Traffic on the Old Band',
    body:
      'The relay at {location} is carrying compressed civil traffic from home, six days stale and full of static. It is names, mostly. Evacuation lists, shelter numbers, and a voice reading them out with the patience of somebody who has been reading them for weeks. Everyone aboard {ship} knows the file has finished downloading.',
    weight: 11,
    routine: true,
    conditions: { minCrew: 2 },
    tags: ['homeworld', 'news', 'grief'],
    choices: [
      {
        id: 'play-it',
        label: 'Play it in the galley for everyone at once',
        hint: 'Shared, whatever it says.',
        effects: { hours: 2 },
        result: {
          text: 'The crew sits through all forty minutes of it together. Two people find names they were looking for. One person finds a name they were not.',
          effects: { morale: -2, crewStress: -4, crewXp: 4 },
        },
      },
      {
        id: 'screen-first',
        label: 'Screen it yourself before anyone hears it',
        hint: 'You carry it first.',
        check: {
          skill: 'persuasion',
          attributes: ['composure', 'memory'],
          participation: 'individual',
        },
        effects: { hours: 2 },
        outcomes: {
          exceptional: {
            text: 'You go through it alone, find what each person needs to know, and tell them one at a time in the right order. Nobody has to hear the worst of it from a machine.',
            effects: { morale: 8, crewStress: -8, personalXp: 10 },
          },
          success: {
            text: 'You take the weight of it first and hand it on carefully. It costs you a bad night.',
            effects: { morale: 4, crewStress: -5, personalXp: 6 },
          },
          partial: {
            text: 'You screen most of it, miss one name, and somebody hears it in the raw file later anyway.',
            effects: { crewStress: 2 },
          },
          failure: {
            text: 'Deciding what the crew may hear is a thing captains do and a thing crews resent. Word gets around that you edited it.',
            effects: { morale: -6, crewStress: 6 },
          },
          criticalFailure: {
            text: 'You withhold a name to be kind, and {actor} finds it on their own two days later. Kindness looks exactly like a lie from the outside.',
            effects: { morale: -10, crewStress: 11 },
          },
        },
      },
      {
        id: 'private-copies',
        label: 'Put a copy on every personal terminal and leave them to it',
        hint: 'No ceremony, no interference.',
        effects: { hours: 1 },
        result: {
          text: 'Each of them listens alone, at their own hour, in their own way. Some of them never say what they heard, and you never ask.',
          effects: { morale: 1, crewStress: -2 },
        },
      },
    ],
  },
];

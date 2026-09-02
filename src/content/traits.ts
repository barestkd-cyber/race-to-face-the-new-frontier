/**
 * PERSONALITY TRAITS — pure authored data, no logic.
 *
 * Traits are hidden tendencies, not moral alignment. `valence` exists only so the
 * generator can weight a set (see TRAITS_TUNING.uniformValenceChance); it is never
 * shown to the player as good or bad. Whether a tendency helps or hurts depends on
 * Discipline, Composure, Decision Making, stress, relationships, and opportunity —
 * so every `behaviour` line names both the cost and the situation where it pays.
 */

import type { TraitDef, TraitKey } from '../engine/types';

export const TRAIT_DEFS: Record<TraitKey, TraitDef> = {
  loyal: {
    key: 'loyal',
    label: 'Loyal',
    valence: 'positive',
    description:
      'Puts the people they have chosen ahead of rules, orders and their own interests.',
    behaviour:
      'Stands by a crewmate under pressure, and may refuse a sound order that writes someone off.',
  },
  protective: {
    key: 'protective',
    label: 'Protective',
    valence: 'positive',
    description: 'Reads risk to other people faster than risk to themselves.',
    behaviour:
      'Volunteers for the exposed position, and can wreck a plan covering someone who did not need it.',
  },
  compassionate: {
    key: 'compassionate',
    label: 'Compassionate',
    valence: 'positive',
    description: 'Feels another person’s condition strongly and finds it hard to leave suffering alone.',
    behaviour:
      'Spends medicine, hours and goodwill on strangers, sometimes at the crew’s direct expense.',
  },
  dutiful: {
    key: 'dutiful',
    label: 'Dutiful',
    valence: 'positive',
    description:
      'Treats an accepted responsibility as binding whether or not anyone is checking.',
    behaviour:
      'Finishes the job as agreed, and holds to a bad arrangement long after walking away was the smart move.',
  },
  patient: {
    key: 'patient',
    label: 'Patient',
    valence: 'positive',
    description: 'Absorbs delay, repetition and uncertainty without the pressure building up.',
    behaviour:
      'Steady on long careful work, though they will let a closing window shut while still preparing.',
  },
  generous: {
    key: 'generous',
    label: 'Generous',
    valence: 'positive',
    description: 'Gives away supplies, time and credit more readily than most people would.',
    behaviour:
      'Lifts morale and relationships quickly, and will hand over stores the crew was counting on.',
  },
  brave: {
    key: 'brave',
    label: 'Brave',
    valence: 'positive',
    description: 'Fear registers but does not decide; steps toward danger when something is at stake.',
    behaviour:
      'Holds position when others break, and walks into situations a more careful crewmate survives by avoiding.',
  },
  cooperative: {
    key: 'cooperative',
    label: 'Cooperative',
    valence: 'positive',
    description: 'Defaults to working through other people rather than around them.',
    behaviour:
      'Raises the whole party’s performance on group work, and defers at moments when somebody simply had to decide.',
  },
  curious: {
    key: 'curious',
    label: 'Curious',
    valence: 'positive',
    description: 'Pulled toward the unexplained; wants to know what is behind the door.',
    behaviour:
      'Turns up finds nobody was looking for, and opens things that should have stayed sealed.',
  },
  honest: {
    key: 'honest',
    label: 'Honest',
    valence: 'positive',
    description: 'Says the true thing, including when a lie would cost nothing.',
    behaviour:
      'Builds trust fast, and can lose a negotiation by answering the one question straight.',
  },
  vindictive: {
    key: 'vindictive',
    label: 'Vindictive',
    valence: 'negative',
    description: 'Keeps a ledger of wrongs and waits for the chance to settle it.',
    behaviour:
      'Will endanger someone who crossed them, and is relentless once a genuine enemy is identified.',
  },
  reckless: {
    key: 'reckless',
    label: 'Reckless',
    valence: 'negative',
    description: 'Discounts consequences that have not happened yet and acts before the cost is clear.',
    behaviour:
      'Takes the fast dangerous option, which occasionally turns out to be the only one that works.',
  },
  selfPreserving: {
    key: 'selfPreserving',
    label: 'Self-Preserving',
    valence: 'negative',
    description: 'Weighs their own survival heavily in every decision.',
    behaviour:
      'First to break off and last to volunteer, which is also why they are still alive to be asked.',
  },
  greedy: {
    key: 'greedy',
    label: 'Greedy',
    valence: 'negative',
    description: 'Wants more than their share and notices exactly what everyone else got.',
    behaviour:
      'Pushes hard in trade and salvage, and will quietly pocket what the crew needed.',
  },
  jealous: {
    key: 'jealous',
    label: 'Jealous',
    valence: 'negative',
    description: 'Measures their standing against others and resents being displaced.',
    behaviour:
      'Sours on favoured crewmates, and works harder than anyone to close the gap they resent.',
  },
  cowardly: {
    key: 'cowardly',
    label: 'Cowardly',
    valence: 'negative',
    description: 'Fear reaches the decision before anything else does.',
    behaviour:
      'Freezes or runs under pressure, though the instinct to leave early is sometimes the correct read.',
  },
  impulsive: {
    key: 'impulsive',
    label: 'Impulsive',
    valence: 'negative',
    description: 'Acts on the first strong idea before the second one arrives.',
    behaviour: 'Moves without being told, which wins moments and ruins plans in roughly equal measure.',
  },
  controlling: {
    key: 'controlling',
    label: 'Controlling',
    valence: 'negative',
    description: 'Needs decisions to run through them and struggles to leave things to others.',
    behaviour:
      'Takes charge whether or not it is theirs to take, and is a steady hand when nobody else has one.',
  },
  suspicious: {
    key: 'suspicious',
    label: 'Suspicious',
    valence: 'negative',
    description: 'Assumes a hidden motive until shown otherwise.',
    behaviour:
      'Slow to trust and hard to talk round, and the one who spots the setup nobody else questioned.',
  },
  alcoholic: {
    key: 'alcoholic',
    label: 'Alcoholic',
    valence: 'negative',
    description: 'Reaches for drink to manage pressure, and reaches harder as the pressure grows.',
    behaviour:
      'Performance drops when stress runs high and supply is at hand; the craving itself is one more thing to manage.',
  },
  aggressive: {
    key: 'aggressive',
    label: 'Aggressive',
    valence: 'negative',
    description: 'Escalates by default and treats confrontation as the shortest route.',
    behaviour:
      'Turns arguments into fights, and is usually the one who actually holds a boarding corridor.',
  },
  cautious: {
    key: 'cautious',
    label: 'Cautious',
    valence: 'negative',
    description: 'Wants more information and a way out before committing to anything.',
    behaviour:
      'Slows the crew down, and survives situations a braver crewmate does not come back from.',
  },
  opportunistic: {
    key: 'opportunistic',
    label: 'Opportunistic',
    valence: 'negative',
    description: 'Reads every situation for what can be taken out of it.',
    behaviour:
      'Finds angles and profit others miss, and abandons a plan the moment a better one appears.',
  },
  stubborn: {
    key: 'stubborn',
    label: 'Stubborn',
    valence: 'negative',
    description: 'Once committed, changing their mind costs far more than it should.',
    behaviour:
      'Cannot be talked off a bad course, and cannot be talked off a right one either.',
  },
};

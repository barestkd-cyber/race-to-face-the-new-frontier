/**
 * Combat encounter templates. Pure data — the engine rolls counts, builds
 * hostile characters from the tier bands, and hands out drops on victory.
 *
 * Tier reference (set by the engine, not here):
 *   weak     attributes 3-7   combat skills  6-24
 *   standard attributes 5-9   combat skills 22-44
 *   tough    attributes 7-11  combat skills 40-62
 *   elite    attributes 9-13  combat skills 58-82
 *
 * An empty `weaponIds` means the enemy is unarmed and the engine grants it
 * natural attacks — correct for vermin and fauna, wrong for anything else.
 */

import type { EncounterTemplate } from './contentTypes';

export const ENCOUNTER_TEMPLATES: EncounterTemplate[] = [
  // -------------------------------------------------------------------------
  // Scavengers and the desperate
  // -------------------------------------------------------------------------
  {
    id: 'enc_scavenger_pair',
    title: 'Scavenger Pair',
    description:
      'Two figures rise from behind a gutted cargo frame, breathing gear fogged, tools already turned the wrong way round in their hands. Neither of them says anything, which is how you know they have decided.',
    scopes: ['scavenge', 'hostile', 'homeworld'],
    danger: [5, 35],
    enemies: [
      {
        name: 'Scavenger',
        count: [1, 2],
        tier: 'weak',
        weaponIds: ['pipe_wrench'],
        drops: [
          { itemId: 'salvage_scrap', qty: [1, 3], chance: 0.4 },
          { itemId: 'ration_pack', qty: [1, 1], chance: 0.2 },
        ],
        creditDrop: [0, 25],
      },
      {
        name: 'Scarred Scavenger',
        count: [1, 1],
        tier: 'standard',
        weaponIds: ['utility_knife'],
        armorId: 'vest_padded',
        drops: [
          { itemId: 'glow_rods', qty: [1, 2], chance: 0.35 },
          { itemId: 'personal_effects', qty: [1, 1], chance: 0.3 },
        ],
        creditDrop: [10, 45],
      },
    ],
    canFlee: true,
    startRange: 'close',
    victoryText:
      'You go through their pockets because leaving anything behind out here would be its own kind of stupid.',
  },
  {
    id: 'enc_scavenger_gang',
    title: 'Scavenger Gang',
    description:
      'They come out of three separate gaps at once, which means they have done this before and worked out who stands where. A woman at the back keeps her pistol low and lets the others walk in first.',
    scopes: ['scavenge', 'hostile', 'station', 'moon'],
    danger: [25, 65],
    enemies: [
      {
        name: 'Gang Scavenger',
        count: [3, 5],
        tier: 'weak',
        weaponIds: ['improvised_club'],
        armorId: 'vest_padded',
        drops: [
          { itemId: 'salvage_scrap', qty: [1, 3], chance: 0.45 },
          { itemId: 'ration_pack', qty: [1, 1], chance: 0.2 },
        ],
        creditDrop: [0, 30],
      },
      {
        name: 'Gang Cutter',
        count: [1, 2],
        tier: 'standard',
        weaponIds: ['machete'],
        armorId: 'jacket_reinforced',
        drops: [
          { itemId: 'painkillers', qty: [1, 2], chance: 0.3 },
          { itemId: 'multitool', qty: [1, 1], chance: 0.2 },
        ],
        creditDrop: [15, 60],
      },
      {
        name: 'Gang Boss',
        count: [1, 1],
        tier: 'tough',
        weaponIds: ['pistol_service'],
        armorId: 'vest_ballistic',
        drops: [
          { itemId: 'ammo_pistol', qty: [4, 12], chance: 0.6 },
          { itemId: 'medkit_basic', qty: [1, 1], chance: 0.3 },
          { itemId: 'lockpick_set', qty: [1, 1], chance: 0.2 },
        ],
        creditDrop: [45, 130],
      },
    ],
    canFlee: true,
    startRange: 'medium',
    victoryText:
      'The ones still standing drag their own away without looking at you. The ground they were holding turns out to be worth almost nothing.',
  },
  {
    id: 'enc_desperate_looters',
    title: 'Desperate Looters',
    description:
      'Half a dozen people in street clothes and mismatched respirators, carrying whatever came off a wall. They are not here for you — they are here for anything, and you are standing in front of it.',
    scopes: ['homeworld', 'hostile', 'scavenge'],
    danger: [10, 45],
    enemies: [
      {
        name: 'Looter',
        count: [2, 4],
        tier: 'weak',
        weaponIds: ['improvised_club'],
        drops: [
          { itemId: 'personal_effects', qty: [1, 1], chance: 0.35 },
          { itemId: 'ration_pack', qty: [1, 2], chance: 0.25 },
        ],
        creditDrop: [0, 20],
      },
      {
        name: 'Wrench-Hand',
        count: [1, 2],
        tier: 'weak',
        weaponIds: ['pipe_wrench'],
        drops: [
          { itemId: 'salvage_scrap', qty: [1, 2], chance: 0.35 },
          { itemId: 'hull_patch', qty: [1, 1], chance: 0.15 },
        ],
        creditDrop: [0, 25],
      },
      {
        name: 'Ringleader',
        count: [1, 1],
        tier: 'standard',
        weaponIds: ['utility_knife'],
        armorId: 'jacket_reinforced',
        drops: [
          { itemId: 'preserved_meal', qty: [1, 2], chance: 0.4 },
          { itemId: 'heirloom_watch', qty: [1, 1], chance: 0.12 },
        ],
        creditDrop: [10, 50],
      },
    ],
    canFlee: true,
    startRange: 'close',
    victoryText:
      'They scatter down the service stair. Somebody left a child’s coat on the deck, and nobody comes back for it.',
  },

  // -------------------------------------------------------------------------
  // Pirates
  // -------------------------------------------------------------------------
  {
    id: 'enc_pirate_boarders',
    title: 'Boarders in the Corridor',
    description:
      'The lock blows inward and they are through it before the smoke clears, moving in pairs down a corridor too narrow to back out of. Behind them the seal has already dropped — nobody is leaving this passage until it is settled.',
    scopes: ['travel', 'hostile'],
    danger: [45, 85],
    enemies: [
      {
        name: 'Boarder',
        count: [2, 4],
        tier: 'standard',
        weaponIds: ['shotgun_breaching'],
        armorId: 'vest_ballistic',
        drops: [
          { itemId: 'ammo_shotgun', qty: [3, 8], chance: 0.55 },
          { itemId: 'rebreather', qty: [1, 1], chance: 0.2 },
        ],
        creditDrop: [15, 55],
      },
      {
        name: 'Boarding Axeman',
        count: [1, 2],
        tier: 'standard',
        weaponIds: ['boarding_axe'],
        armorId: 'hardsuit_work',
        drops: [
          { itemId: 'hull_patch', qty: [1, 2], chance: 0.35 },
          { itemId: 'stim_shot', qty: [1, 1], chance: 0.25 },
        ],
        creditDrop: [15, 55],
      },
      {
        name: 'Boarding Officer',
        count: [1, 1],
        tier: 'tough',
        weaponIds: ['carbine_worn'],
        armorId: 'vest_ballistic',
        drops: [
          { itemId: 'ammo_rifle', qty: [6, 16], chance: 0.6 },
          { itemId: 'medkit_field', qty: [1, 1], chance: 0.3 },
          { itemId: 'portable_terminal', qty: [1, 1], chance: 0.2 },
        ],
        creditDrop: [70, 170],
      },
    ],
    canFlee: false,
    startRange: 'engaged',
    victoryText:
      'You get the corridor back. The seal takes two hours and most of your patch stock, and the air in here will smell like burnt insulation for a week.',
  },
  {
    id: 'enc_pirate_raiders',
    title: 'Pirate Raiders',
    description:
      'A raiding party spread wide across the dock apron, unhurried, weapons already shouldered. These are not opportunists — somebody paid for the plate they are wearing, and they expect the job to go their way.',
    scopes: ['travel', 'hostile', 'station'],
    danger: [60, 95],
    enemies: [
      {
        name: 'Raider',
        count: [2, 4],
        tier: 'standard',
        weaponIds: ['carbine_worn'],
        armorId: 'vest_ballistic',
        drops: [
          { itemId: 'ammo_rifle', qty: [5, 14], chance: 0.55 },
          { itemId: 'ration_pack', qty: [1, 2], chance: 0.25 },
        ],
        creditDrop: [20, 70],
      },
      {
        name: 'Raider Gunner',
        count: [1, 2],
        tier: 'tough',
        weaponIds: ['shotgun_field'],
        armorId: 'plate_carrier',
        drops: [
          { itemId: 'ammo_shotgun', qty: [4, 10], chance: 0.6 },
          { itemId: 'helmet_combat', qty: [1, 1], chance: 0.25 },
          { itemId: 'stim_shot', qty: [1, 2], chance: 0.3 },
        ],
        creditDrop: [50, 140],
      },
      {
        name: 'Raid Leader',
        count: [1, 1],
        tier: 'elite',
        weaponIds: ['rifle_service'],
        armorId: 'plate_carrier',
        drops: [
          { itemId: 'ammo_rifle', qty: [10, 24], chance: 0.7 },
          { itemId: 'grenade_frag', qty: [1, 2], chance: 0.2 },
          { itemId: 'medkit_field', qty: [1, 1], chance: 0.35 },
          { itemId: 'data_core', qty: [1, 1], chance: 0.15 },
        ],
        creditDrop: [150, 300],
      },
    ],
    canFlee: true,
    startRange: 'medium',
    victoryText:
      'Their transport lifts without them. Whoever hired this crew will notice inside the week, and will not care much either way.',
  },

  // -------------------------------------------------------------------------
  // Authority
  // -------------------------------------------------------------------------
  {
    id: 'enc_security_patrol',
    title: 'Security Patrol',
    description:
      'Four in station colours, batons out, moving up the concourse in a line they have clearly walked a thousand times. The sergeant does not draw — she just tells you to put it down, and means it exactly once.',
    scopes: ['station', 'hostile', 'homeworld'],
    danger: [55, 90],
    enemies: [
      {
        name: 'Security Officer',
        count: [2, 4],
        tier: 'standard',
        weaponIds: ['riot_baton'],
        armorId: 'vest_riot',
        drops: [
          { itemId: 'helmet_combat', qty: [1, 1], chance: 0.2 },
          { itemId: 'medkit_basic', qty: [1, 1], chance: 0.25 },
        ],
        creditDrop: [15, 55],
      },
      {
        name: 'Patrol Gunner',
        count: [1, 2],
        tier: 'tough',
        weaponIds: ['smg_compact'],
        armorId: 'vest_riot',
        drops: [
          { itemId: 'ammo_pistol', qty: [8, 20], chance: 0.6 },
          { itemId: 'helmet_combat', qty: [1, 1], chance: 0.3 },
        ],
        creditDrop: [40, 120],
      },
      {
        name: 'Patrol Sergeant',
        count: [1, 1],
        tier: 'elite',
        weaponIds: ['smg_compact'],
        armorId: 'plate_carrier',
        drops: [
          { itemId: 'ammo_pistol', qty: [12, 28], chance: 0.65 },
          { itemId: 'medkit_field', qty: [1, 1], chance: 0.35 },
          { itemId: 'portable_terminal', qty: [1, 1], chance: 0.3 },
        ],
        creditDrop: [120, 260],
      },
    ],
    canFlee: true,
    startRange: 'medium',
    victoryText:
      'You leave before the second patrol arrives. Your ship’s registry is on a list somewhere now, and lists travel further than you do.',
  },

  // -------------------------------------------------------------------------
  // Vermin, drones, fauna
  // -------------------------------------------------------------------------
  {
    id: 'enc_hull_vermin',
    title: 'Hull Vermin',
    description:
      'Something has been living behind the conduit run, and there is more than one of it. They come out low and fast along the pipework, and they are not frightened of the light.',
    scopes: ['travel', 'technical', 'hostile'],
    danger: [5, 30],
    enemies: [
      {
        name: 'Hull Rat',
        count: [3, 6],
        tier: 'weak',
        weaponIds: [],
        drops: [{ itemId: 'salvage_scrap', qty: [1, 1], chance: 0.15 }],
      },
      {
        name: 'Nest Breeder',
        count: [1, 1],
        tier: 'standard',
        weaponIds: [],
        drops: [
          { itemId: 'salvage_scrap', qty: [1, 3], chance: 0.4 },
          { itemId: 'personal_effects', qty: [1, 1], chance: 0.15 },
        ],
      },
    ],
    canFlee: true,
    startRange: 'engaged',
    victoryText:
      'You burn out the nest and find nine metres of chewed cable insulation. That is a repair job, not a victory.',
  },
  {
    id: 'enc_rogue_drone',
    title: 'Rogue Drone',
    description:
      'A maintenance unit the size of a footlocker pivots toward you, running lights cycling through a fault pattern nobody has serviced in years. The arc head on its manipulator comes up charged.',
    scopes: ['technical', 'hostile', 'scavenge'],
    danger: [30, 65],
    enemies: [
      {
        name: 'Rogue Drone',
        count: [1, 1],
        tier: 'tough',
        weaponIds: ['arc_projector'],
        armorId: 'hardsuit_work',
        drops: [
          { itemId: 'power_cell', qty: [1, 2], chance: 0.6 },
          { itemId: 'salvage_scrap', qty: [2, 4], chance: 0.55 },
          { itemId: 'sensor_module', qty: [1, 1], chance: 0.3 },
          { itemId: 'energy_cell', qty: [1, 3], chance: 0.25 },
        ],
      },
    ],
    canFlee: true,
    startRange: 'medium',
    victoryText:
      'It settles onto its housing with the fault light still blinking. Whatever it was told to protect, nobody has come to collect it.',
  },
  {
    id: 'enc_maintenance_drones',
    title: 'Maintenance Swarm',
    description:
      'The bay lights come up and half a dozen service units unclamp from their rails at once, welding arms extended. Their supervisor node is long dead and they have been running the last order they were given.',
    scopes: ['technical', 'station', 'hostile'],
    danger: [20, 55],
    enemies: [
      {
        name: 'Service Drone',
        count: [3, 6],
        tier: 'weak',
        weaponIds: ['shock_prod'],
        drops: [
          { itemId: 'power_cell', qty: [1, 1], chance: 0.35 },
          { itemId: 'salvage_scrap', qty: [1, 2], chance: 0.45 },
        ],
      },
      {
        name: 'Rail Unit',
        count: [1, 2],
        tier: 'standard',
        weaponIds: ['shock_prod'],
        armorId: 'helmet_industrial',
        drops: [
          { itemId: 'sensor_module', qty: [1, 1], chance: 0.25 },
          { itemId: 'salvage_scrap', qty: [1, 3], chance: 0.5 },
          { itemId: 'power_cell', qty: [1, 2], chance: 0.3 },
        ],
      },
    ],
    canFlee: true,
    startRange: 'close',
    victoryText:
      'You stack the wreckage against the bulkhead. Between them there is enough intact cell stock to make the fight worth the noise.',
  },
  // -------------------------------------------------------------------------
  // Working people with a reason
  // -------------------------------------------------------------------------
  {
    id: 'enc_claim_jumpers',
    title: 'Claim Jumpers',
    description:
      'They are dug in along the cut with picks laid down and rifles up, holding a seam that was never theirs on paper. Their boss shouts the boundary at you across two hundred metres of tailings, as if saying it makes it true.',
    scopes: ['moon', 'hostile', 'scavenge'],
    danger: [35, 70],
    enemies: [
      {
        name: 'Claim Jumper',
        count: [2, 4],
        tier: 'standard',
        weaponIds: ['mining_pick'],
        armorId: 'helmet_industrial',
        drops: [
          { itemId: 'trade_ore_crate', qty: [1, 1], chance: 0.3 },
          { itemId: 'glow_rods', qty: [1, 2], chance: 0.3 },
        ],
        creditDrop: [10, 50],
      },
      {
        name: 'Jumper Rifleman',
        count: [1, 2],
        tier: 'standard',
        weaponIds: ['rifle_hunting'],
        armorId: 'jacket_reinforced',
        drops: [
          { itemId: 'ammo_rifle', qty: [4, 10], chance: 0.5 },
          { itemId: 'ration_pack', qty: [1, 2], chance: 0.25 },
        ],
        creditDrop: [15, 60],
      },
      {
        name: 'Claim Boss',
        count: [1, 1],
        tier: 'tough',
        weaponIds: ['revolver_heavy'],
        armorId: 'hardsuit_work',
        drops: [
          { itemId: 'trade_rare_minerals', qty: [1, 1], chance: 0.25 },
          { itemId: 'handheld_scanner', qty: [1, 1], chance: 0.3 },
          { itemId: 'ammo_pistol', qty: [4, 10], chance: 0.45 },
        ],
        creditDrop: [70, 165],
      },
    ],
    canFlee: true,
    startRange: 'long',
    victoryText:
      'The seam is still there when it is over. So is the survey stake, with somebody else’s registry number burned into it.',
  },
  {
    id: 'enc_mutinous_workers',
    title: 'Mutinous Workers',
    description:
      'The shift has stopped working and started blocking the gantry, wrenches in hand, helmets still on. Their foreman tells you plainly that nothing leaves this level until somebody up top answers for the last rotation.',
    scopes: ['moon', 'hostile', 'social'],
    danger: [30, 65],
    enemies: [
      {
        name: 'Striking Worker',
        count: [3, 5],
        tier: 'weak',
        weaponIds: ['pipe_wrench'],
        armorId: 'helmet_industrial',
        drops: [
          { itemId: 'salvage_scrap', qty: [1, 2], chance: 0.35 },
          { itemId: 'ration_pack', qty: [1, 1], chance: 0.3 },
        ],
        creditDrop: [0, 30],
      },
      {
        name: 'Shift Foreman',
        count: [1, 1],
        tier: 'standard',
        weaponIds: ['crowbar'],
        armorId: 'hardsuit_work',
        drops: [
          { itemId: 'multitool', qty: [1, 1], chance: 0.35 },
          { itemId: 'repair_kit', qty: [1, 1], chance: 0.25 },
        ],
        creditDrop: [15, 60],
      },
      {
        name: 'Strike Marshal',
        count: [1, 1],
        tier: 'tough',
        weaponIds: ['nail_driver'],
        armorId: 'jacket_reinforced',
        drops: [
          { itemId: 'repair_kit', qty: [1, 2], chance: 0.35 },
          { itemId: 'painkillers', qty: [1, 2], chance: 0.3 },
          { itemId: 'portable_terminal', qty: [1, 1], chance: 0.2 },
        ],
        creditDrop: [30, 95],
      },
    ],
    canFlee: true,
    startRange: 'close',
    victoryText:
      'The gantry clears. They were owed something real, and you are not the one who was ever going to pay it.',
  },

  // -------------------------------------------------------------------------
  // Ambush, squatters, the good shot
  // -------------------------------------------------------------------------
  {
    id: 'enc_smuggler_ambush',
    title: 'Smuggler Ambush',
    description:
      'The hatch behind you drops on a timer nobody mentioned, and three of them step out of the container rows with the exits already covered. Their cargo boss looks genuinely sorry about it, and does not stop.',
    scopes: ['planet', 'station', 'hostile'],
    danger: [40, 78],
    enemies: [
      {
        name: 'Smuggler',
        count: [2, 3],
        tier: 'standard',
        weaponIds: ['pistol_service'],
        armorId: 'jacket_reinforced',
        drops: [
          { itemId: 'ammo_pistol', qty: [4, 12], chance: 0.5 },
          { itemId: 'painkillers', qty: [1, 2], chance: 0.25 },
        ],
        creditDrop: [20, 75],
      },
      {
        name: 'Smuggler Enforcer',
        count: [1, 2],
        tier: 'tough',
        weaponIds: ['smg_compact'],
        armorId: 'vest_ballistic',
        drops: [
          { itemId: 'ammo_pistol', qty: [8, 18], chance: 0.55 },
          { itemId: 'stim_shot', qty: [1, 2], chance: 0.3 },
        ],
        creditDrop: [55, 145],
      },
      {
        name: 'Cargo Boss',
        count: [1, 1],
        tier: 'tough',
        weaponIds: ['revolver_heavy'],
        armorId: 'vest_ballistic',
        drops: [
          { itemId: 'data_core', qty: [1, 1], chance: 0.25 },
          { itemId: 'trade_rare_minerals', qty: [1, 1], chance: 0.2 },
          { itemId: 'medkit_field', qty: [1, 1], chance: 0.3 },
          { itemId: 'lockpick_set', qty: [1, 1], chance: 0.2 },
        ],
        creditDrop: [90, 210],
      },
    ],
    canFlee: false,
    startRange: 'close',
    victoryText:
      'You get the hatch open with a cutting torch and forty minutes. Two of the containers turn out to hold exactly what the manifest said, which is somehow the worst part.',
  },
  {
    id: 'enc_derelict_squatters',
    title: 'Derelict Squatters',
    description:
      'People have been living in this wreck long enough to run cable and hang curtains, and they heard your seals long before you saw their lamps. An old man with a shotgun tells you to go back the way you came.',
    scopes: ['scavenge', 'travel', 'hostile', 'station'],
    danger: [25, 60],
    enemies: [
      {
        name: 'Squatter',
        count: [2, 4],
        tier: 'weak',
        weaponIds: ['pipe_wrench'],
        drops: [
          { itemId: 'glow_rods', qty: [1, 2], chance: 0.35 },
          { itemId: 'ration_pack', qty: [1, 1], chance: 0.3 },
          { itemId: 'salvage_scrap', qty: [1, 2], chance: 0.3 },
        ],
        creditDrop: [0, 25],
      },
      {
        name: 'Squatter Sentry',
        count: [1, 2],
        tier: 'standard',
        weaponIds: ['cutting_spear'],
        armorId: 'vest_padded',
        drops: [
          { itemId: 'rebreather', qty: [1, 1], chance: 0.25 },
          { itemId: 'hull_patch', qty: [1, 2], chance: 0.3 },
        ],
        creditDrop: [5, 40],
      },
      {
        name: 'Squatter Elder',
        count: [1, 1],
        tier: 'tough',
        weaponIds: ['shotgun_field'],
        armorId: 'hardsuit_void',
        drops: [
          { itemId: 'ammo_shotgun', qty: [3, 8], chance: 0.5 },
          { itemId: 'emergency_beacon', qty: [1, 1], chance: 0.2 },
          { itemId: 'antibiotics', qty: [1, 2], chance: 0.25 },
        ],
        creditDrop: [20, 80],
      },
    ],
    canFlee: true,
    startRange: 'close',
    victoryText:
      'The lamps are still burning in the compartments further in. You take what you came for and do not go looking at the rest of it.',
  },
  {
    id: 'enc_hostile_fauna',
    title: 'Hostile Fauna',
    description:
      'They come up out of the shallows in a loose line, low-slung and unbothered by the noise you are making. The big one at the back is waiting to see which way you break.',
    scopes: ['planet', 'hostile', 'travel'],
    danger: [25, 60],
    enemies: [
      {
        name: 'Shore Runner',
        count: [2, 4],
        tier: 'standard',
        weaponIds: [],
      },
      {
        name: 'Pack Alpha',
        count: [1, 1],
        tier: 'tough',
        weaponIds: [],
      },
    ],
    canFlee: true,
    startRange: 'medium',
    victoryText:
      'The pack breaks for the water and does not come back. Locals will tell you afterwards that you were standing in their crossing.',
  },
  {
    id: 'enc_lone_gunman',
    title: 'The Lone Gunman',
    description:
      'The first shot takes a chunk out of the plating beside your head, and the second is already in the air. Whoever is up there is patient, has the range, and has done this for a living.',
    scopes: ['hostile', 'station', 'scavenge'],
    danger: [55, 95],
    enemies: [
      {
        name: 'The Gunman',
        count: [1, 1],
        tier: 'elite',
        weaponIds: ['rifle_marksman'],
        armorId: 'jacket_reinforced',
        drops: [
          { itemId: 'ammo_rifle', qty: [8, 20], chance: 0.7 },
          { itemId: 'handheld_scanner', qty: [1, 1], chance: 0.3 },
          { itemId: 'painkillers', qty: [1, 2], chance: 0.35 },
          { itemId: 'personal_effects', qty: [1, 1], chance: 0.4 },
          { itemId: 'heirloom_watch', qty: [1, 1], chance: 0.12 },
        ],
        creditDrop: [80, 230],
      },
    ],
    canFlee: true,
    startRange: 'long',
    victoryText:
      'You find one bag, one rifle, and a folded list of names in a language nobody aboard reads. There is no explanation anywhere on the body.',
  },
];

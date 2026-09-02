/**
 * Scavenge site archetypes for the outer route: trade and transit stations, the
 * inhabited ocean world, the travel world, and the temporary nodes that appear
 * beside the main path.
 *
 * The homeworld and moon archetypes live in `siteArchetypes.ts`; both files are
 * concatenated in `content/index.ts`.
 */

import type { SiteArchetype } from './contentTypes';

export const OUTER_SITE_ARCHETYPES: SiteArchetype[] = [
  // -------------------------------------------------------------------------
  // Stations
  // -------------------------------------------------------------------------
  {
    id: 'derelict-docking-arm',
    name: 'The {adj} {noun}',
    description:
      'A docking arm sealed off after a berthing accident and never reopened. The station kept growing in other directions and simply left it there, still pressurised, still full of whatever was aboard when the bulkheads dropped.',
    locationKinds: ['tradeStation', 'transitStation'],
    danger: [40, 70],
    special: true,
    nodeKinds: ['corridor', 'storage', 'machinery', 'office', 'lockedRoom', 'hazardZone', 'hiddenBranch'],
    lootTable: [
      { itemId: 'repair_kit', weight: 12, qty: [1, 2], condition: [40, 80] },
      { itemId: 'hull_patch', weight: 14, qty: [1, 4] },
      { itemId: 'power_cell', weight: 13, qty: [1, 3], condition: [30, 75] },
      { itemId: 'salvage_scrap', weight: 20, qty: [3, 12] },
      { itemId: 'multitool', weight: 8, qty: [1, 1], condition: [25, 65] },
      { itemId: 'sensor_module', weight: 6, qty: [1, 1], condition: [20, 60] },
      { itemId: 'ration_pack', weight: 10, qty: [2, 8] },
      { itemId: 'portable_terminal', weight: 5, qty: [1, 1], condition: [30, 70] },
      { itemId: 'vest_ballistic', weight: 4, qty: [1, 1], condition: [20, 55] },
      { itemId: 'data_core', weight: 3, qty: [1, 1] },
    ],
    creditRange: [80, 900],
    hazards: [
      {
        label: 'a section that never finished venting',
        damageType: 'blunt',
        severity: [35, 62],
        avoidSkill: 'exploration',
      },
      {
        label: 'a live power bus behind a stripped panel',
        damageType: 'burn',
        severity: [30, 58],
        avoidSkill: 'electricalEngineering',
      },
      {
        label: 'a docking clamp under load, ready to let go',
        damageType: 'blunt',
        severity: [45, 78],
        avoidSkill: 'mechanicalEngineering',
      },
    ],
    encounterIds: ['enc_derelict_squatters', 'enc_hull_vermin', 'enc_scavenger_gang', 'enc_maintenance_drones'],
    nameAdjectives: ['Sealed', 'Cold', 'Silent', 'Condemned', 'Forgotten', 'Dark', 'Locked', 'Old'],
    nameNouns: ['Arm', 'Berth', 'Spur', 'Gantry', 'Dock', 'Cradle', 'Mooring'],
    nodeFlavor: {
      corridor: [
        'The corridor lights come up one panel at a time as you walk, decades out of calibration.',
        'Frost has grown along the seam where two hull sections meet at slightly different temperatures.',
        'Somebody chalked deck numbers on the walls after the signage failed. The handwriting gets worse further in.',
        'A row of pressure doors, all standing open, all with their manual releases already pulled.',
      ],
      storage: [
        'Cargo netting still holds crates that were never claimed. The manifest tags have gone brittle.',
        'Shelving racks, mostly stripped, but the top row was too high to reach in a hurry.',
        'A bonded locker with its seal broken from the inside.',
        'Somebody stacked supplies here for a wait that clearly ended badly.',
      ],
      machinery: [
        'Atmospheric plant, still turning over on trickle power, moving air nobody breathes.',
        'A pump gallery with three of four units seized solid.',
        'Cable runs thick as your arm, half of them cut and capped.',
        'The berthing clamps sit in their housings, hydraulics weeping a slow black line down the wall.',
      ],
      office: [
        'A dockmaster station with the log still open on the last entry nobody finished typing.',
        'Personal effects in a drawer: a photograph, a transit pass, a key to somewhere else.',
        'Incident paperwork, stacked and signed, filed by someone who expected to come back for it.',
        'A wall board of shift rotations, the last week crossed out entirely.',
      ],
      lockedRoom: [
        'A crew safe, still on its mounts, still locked.',
        'A compartment sealed from the outside — which is the wrong side to seal it from.',
        'Secure stores. The lock is mechanical, which is either good news or bad news depending on who you brought.',
      ],
      hazardZone: [
        'The deck plating here has lifted. Below it, nothing you want to fall into.',
        'Pressure reads fine on the gauge and wrong in your ears.',
        'A section where the fire went through and the suppression never did.',
      ],
      hiddenBranch: [
        'A maintenance crawl behind a panel that was screwed back on from this side.',
        'A gap between hull layers wide enough for one person at a time.',
        'A service shaft that does not appear on any deck plan you were given.',
      ],
    },
  },

  {
    id: 'stripped-cargo-spine',
    name: '{adj} Cargo Spine',
    description:
      'The long structural backbone a station hangs its holds from. This one has been picked over by three separate crews already, which means the easy things are gone and the awkward things are still there.',
    locationKinds: ['tradeStation', 'transitStation', 'travelWorld'],
    danger: [30, 58],
    nodeKinds: ['corridor', 'storage', 'machinery', 'office', 'hazardZone'],
    lootTable: [
      { itemId: 'salvage_scrap', weight: 24, qty: [4, 15] },
      { itemId: 'trade_machine_parts', weight: 14, qty: [1, 3] },
      { itemId: 'hull_patch', weight: 12, qty: [1, 3] },
      { itemId: 'coolant_flask', weight: 10, qty: [1, 3] },
      { itemId: 'rope_line', weight: 8, qty: [1, 2], condition: [35, 80] },
      { itemId: 'glow_rods', weight: 12, qty: [2, 6] },
      { itemId: 'crowbar', weight: 7, qty: [1, 1], condition: [40, 90] },
      { itemId: 'trade_ore_crate', weight: 5, qty: [1, 1] },
    ],
    creditRange: [20, 260],
    hazards: [
      {
        label: 'an unsecured load shifting overhead',
        damageType: 'blunt',
        severity: [38, 70],
        avoidSkill: 'exploration',
      },
      {
        label: 'a cutting torch left charged and wedged',
        damageType: 'burn',
        severity: [28, 50],
        avoidSkill: 'scavenging',
      },
    ],
    encounterIds: ['enc_scavenger_pair', 'enc_scavenger_gang', 'enc_hull_vermin'],
    nameAdjectives: ['Stripped', 'Bare', 'Hollow', 'Picked', 'Rust-Streaked', 'Long', 'Empty'],
    nameNouns: ['Spine', 'Run', 'Gallery', 'Rack', 'Trunk'],
    nodeFlavor: {
      corridor: [
        'A catwalk running the length of the spine, handrail missing on one side.',
        'Your lamp does not reach the far end. The echo suggests it should have.',
        'Cut marks on every fitting worth taking, and a few that were not.',
      ],
      storage: [
        'Empty cargo cradles, and one that is not empty.',
        'A hold that was opened with a cutter rather than a key.',
        'Palletised goods with the outer layer taken and the inner layer untouched — somebody was in a hurry.',
      ],
      machinery: [
        'Load handling gear, arms folded, hydraulic lines drained.',
        'A conveyor that starts moving when you put weight on the deck.',
        'Winch housings with the cable still spooled and still rated.',
      ],
      office: [
        'A loading foreman’s booth. The clipboard is worth more than the terminal.',
        'Shipping manifests going back years, all for a company that no longer files them.',
      ],
      hazardZone: [
        'A collapsed span. Crossing it is a choice, not a formality.',
        'Somewhere below, something heavy shifts when you do.',
      ],
    },
  },

  {
    id: 'sealed-maintenance-deck',
    name: '{adj} Maintenance Deck',
    description:
      'The deck the station stopped maintaining. Sealed for a fault nobody could afford to fix, and quietly written out of the deck plans rather than repaired.',
    locationKinds: ['tradeStation', 'transitStation'],
    danger: [35, 64],
    nodeKinds: ['corridor', 'machinery', 'lockedRoom', 'hazardZone', 'storage', 'hiddenBranch'],
    lootTable: [
      { itemId: 'repair_kit', weight: 14, qty: [1, 2], condition: [45, 85] },
      { itemId: 'power_cell', weight: 14, qty: [1, 4], condition: [35, 80] },
      { itemId: 'coolant_flask', weight: 12, qty: [1, 3] },
      { itemId: 'life_support_filter', weight: 10, qty: [1, 2], condition: [40, 90] },
      { itemId: 'welding_rig', weight: 6, qty: [1, 1], condition: [30, 70] },
      { itemId: 'multitool', weight: 9, qty: [1, 1], condition: [35, 80] },
      { itemId: 'salvage_scrap', weight: 18, qty: [3, 10] },
      { itemId: 'engine_coupling', weight: 5, qty: [1, 1], condition: [25, 65] },
    ],
    creditRange: [0, 180],
    hazards: [
      {
        label: 'a coolant line that has been waiting to fail',
        damageType: 'burn',
        severity: [40, 68],
        avoidSkill: 'mechanicalEngineering',
      },
      {
        label: 'an unshielded junction still carrying station main',
        damageType: 'burn',
        severity: [45, 75],
        avoidSkill: 'electricalEngineering',
      },
      {
        label: 'atmosphere gone sour in a dead-end run',
        damageType: 'stun',
        severity: [25, 48],
        avoidSkill: 'firstAid',
      },
    ],
    encounterIds: ['enc_maintenance_drones', 'enc_rogue_drone', 'enc_hull_vermin'],
    nameAdjectives: ['Sealed', 'Condemned', 'Lower', 'Forgotten', 'Quarantined', 'Dead'],
    nameNouns: ['Deck', 'Level', 'Sublevel', 'Plant', 'Underside'],
    nodeFlavor: {
      corridor: [
        'The deck plates ring differently here. Something underneath is not where it should be.',
        'Warning tape across the passage, faded to grey, still doing its job on some level.',
        'Condensation runs down every surface and pools where the drains stopped working.',
      ],
      machinery: [
        'Scrubber banks, most of them dark, one of them still cycling on stubbornly.',
        'A heat exchanger with a hand-lettered sign taped to it: DO NOT RESTART.',
        'Pumps in a row, each one tagged out, each tag signed by the same person.',
      ],
      storage: [
        'Spares racking, properly labelled, properly stocked, properly abandoned.',
        'A parts cage with the door cut off its hinges and most of the contents still inside.',
      ],
      lockedRoom: [
        'A plant control room, locked when the deck was sealed and locked ever since.',
        'A tool crib. Somebody cared enough to lock it on the way out.',
      ],
      hazardZone: [
        'The temperature climbs as you approach. Nothing here should still be hot.',
        'A compartment where the fire suppressant discharged and never cleared.',
      ],
      hiddenBranch: [
        'A crawlway behind the exchanger, propped open with a wrench.',
        'An access hatch someone cut by hand, badly, and used often.',
      ],
    },
  },

  {
    id: 'decompressed-crew-ring',
    name: 'The {adj} {noun}',
    description:
      'A habitation ring that lost pressure and was never repopulated. Everything anyone owned is still in it, exactly where the air left it. Station authority does not advertise the section and does not stop people going in.',
    locationKinds: ['transitStation', 'tradeStation'],
    danger: [50, 82],
    special: true,
    nodeKinds: ['corridor', 'habitation', 'medical', 'office', 'lockedRoom', 'hazardZone', 'storage', 'hiddenBranch'],
    lootTable: [
      { itemId: 'personal_effects', weight: 18, qty: [1, 3] },
      { itemId: 'medkit_basic', weight: 12, qty: [1, 3], condition: [45, 90] },
      { itemId: 'painkillers', weight: 12, qty: [1, 5] },
      { itemId: 'antibiotics', weight: 9, qty: [1, 3] },
      { itemId: 'heirloom_watch', weight: 5, qty: [1, 1] },
      { itemId: 'rebreather', weight: 8, qty: [1, 2], condition: [30, 75] },
      { itemId: 'thermal_blanket', weight: 11, qty: [1, 4] },
      { itemId: 'preserved_meal', weight: 13, qty: [2, 7] },
      { itemId: 'portable_terminal', weight: 6, qty: [1, 1], condition: [25, 65] },
      { itemId: 'data_core', weight: 4, qty: [1, 2] },
    ],
    creditRange: [120, 1100],
    hazards: [
      {
        label: 'a compartment still holding partial pressure against a failing seal',
        damageType: 'blunt',
        severity: [55, 88],
        avoidSkill: 'exploration',
      },
      {
        label: 'debris shifted into the passage by the original venting',
        damageType: 'pierce',
        severity: [35, 62],
        avoidSkill: 'exploration',
      },
      {
        label: 'a hull seam that has been flexing for years',
        damageType: 'blunt',
        severity: [60, 92],
        avoidSkill: 'mechanicalEngineering',
      },
    ],
    encounterIds: ['enc_derelict_squatters', 'enc_desperate_looters', 'enc_hull_vermin', 'enc_lone_gunman'],
    nameAdjectives: ['Quiet', 'Cold', 'Sealed', 'Empty', 'Frozen', 'Still'],
    nameNouns: ['Ring', 'Habitat', 'Quarter', 'Warren', 'Terrace'],
    nodeFlavor: {
      corridor: [
        'Doors stand open along both sides. None of them were opened from this side.',
        'The floor is clear down the middle and drifted at the edges, the way a room looks after the air has been through it.',
        'Someone has been through recently. The dust has a path in it.',
      ],
      habitation: [
        'A family compartment. Two bunks made, one not.',
        'Belongings arranged with care on a shelf that has not moved in years.',
        'A child’s drawings still taped to a bulkhead, the tape long since gone brittle.',
        'The room is small, tidy, and completely intact, which is somehow worse.',
      ],
      medical: [
        'A ward station with the drug cabinet intact — nobody got this far before.',
        'Three beds, curtains drawn between them, curtains never opened since.',
        'A treatment log that stops mid-entry.',
      ],
      office: [
        'A section warden’s office. The incident report was written but never filed.',
        'Personnel records for a hundred and forty people, and a shorter list clipped to the front.',
      ],
      storage: [
        'Communal stores. Rationing had already started before the section went.',
        'A locker room, every locker still shut.',
      ],
      lockedRoom: [
        'A compartment somebody secured properly on their way out, expecting to return.',
        'A strongbox in a wall recess, behind a panel that was meant to look ordinary.',
      ],
      hazardZone: [
        'The seal on the far bulkhead is visibly working. You can hear it.',
        'A section of ring that has been holding a slow leak for a very long time.',
      ],
      hiddenBranch: [
        'A gap where the ring deck separated from the hull, just wide enough.',
        'A utility run somebody widened by hand and used as a shortcut.',
      ],
    },
  },

  // -------------------------------------------------------------------------
  // Inhabited ocean world
  // -------------------------------------------------------------------------
  {
    id: 'tidal-ruin',
    name: '{adj} Tidal Ruin',
    description:
      'Stone and coral-crete structures that are dry for six hours out of every eighteen. The local population stopped using them long ago and are politely unenthusiastic about outsiders who do.',
    locationKinds: ['inhabitedPlanet'],
    danger: [20, 50],
    nodeKinds: ['corridor', 'storage', 'habitation', 'hazardZone', 'hiddenBranch', 'lockedRoom'],
    lootTable: [
      { itemId: 'trade_textiles', weight: 12, qty: [1, 3] },
      { itemId: 'fresh_produce', weight: 14, qty: [2, 6] },
      { itemId: 'personal_effects', weight: 12, qty: [1, 2] },
      { itemId: 'heirloom_watch', weight: 4, qty: [1, 1] },
      { itemId: 'rope_line', weight: 12, qty: [1, 3], condition: [40, 85] },
      { itemId: 'salvage_scrap', weight: 14, qty: [2, 8] },
      { itemId: 'antique_navcomp', weight: 3, qty: [1, 1], condition: [20, 55] },
      { itemId: 'glow_rods', weight: 12, qty: [2, 5] },
    ],
    creditRange: [30, 340],
    hazards: [
      {
        label: 'the tide returning faster than the chart said',
        damageType: 'blunt',
        severity: [35, 66],
        avoidSkill: 'navigation',
      },
      {
        label: 'a floor gone soft with rot and salt',
        damageType: 'pierce',
        severity: [28, 52],
        avoidSkill: 'exploration',
      },
      {
        label: 'something that lives in the flooded lower level',
        damageType: 'slash',
        severity: [40, 70],
        avoidSkill: 'stealth',
      },
    ],
    encounterIds: ['enc_hostile_fauna', 'enc_scavenger_pair', 'enc_claim_jumpers'],
    nameAdjectives: ['Drowned', 'Half-Sunk', 'Old', 'Salt-Eaten', 'Lower', 'Shell'],
    nameNouns: ['Ruin', 'Terrace', 'Steps', 'Quarter', 'Hall', 'Causeway'],
    nodeFlavor: {
      corridor: [
        'A passage cut for people shorter than you, worn smooth at shoulder height on both sides.',
        'Waterline marks band the walls at regular heights, a tide chart written by the tide.',
        'The floor slopes down. Your lamp finds standing water forty paces in.',
      ],
      storage: [
        'Sealed clay vessels, most cracked, a few not.',
        'A store room built above the high-water line and stocked as if that would always be enough.',
        'Netting, floats, and hooks, all made by hand and all still serviceable.',
      ],
      habitation: [
        'Sleeping alcoves cut into the wall, each with a small niche for belongings.',
        'A hearth pit, cold, with cooking gear stacked beside it in an order that meant something.',
        'Someone lived here long after everyone else left. The repairs are recent and amateur.',
      ],
      lockedRoom: [
        'A door barred from the other side, which raises a question.',
        'A sealed chamber the locals would rather you did not open.',
      ],
      hazardZone: [
        'The water here moves against the tide.',
        'A section where the ceiling has come down and the sea gets in.',
      ],
      hiddenBranch: [
        'A gap behind a fallen slab, dry and going somewhere.',
        'Steps continuing down past where the map stops.',
      ],
    },
  },

  {
    id: 'storm-wrecked-station',
    name: '{adj} {noun} Station',
    description:
      'An off-world weather or research station on one of the outer atolls, hit hard enough by a storm season that its operators wrote it off rather than repair it.',
    locationKinds: ['inhabitedPlanet', 'travelWorld'],
    danger: [28, 56],
    nodeKinds: ['corridor', 'machinery', 'office', 'storage', 'medical', 'hazardZone'],
    lootTable: [
      { itemId: 'sensor_module', weight: 10, qty: [1, 2], condition: [25, 70] },
      { itemId: 'power_cell', weight: 14, qty: [1, 4], condition: [30, 80] },
      { itemId: 'medkit_field', weight: 8, qty: [1, 2], condition: [50, 95] },
      { itemId: 'handheld_scanner', weight: 7, qty: [1, 1], condition: [30, 75] },
      { itemId: 'emergency_beacon', weight: 8, qty: [1, 2], condition: [40, 90] },
      { itemId: 'ration_pack', weight: 15, qty: [3, 10] },
      { itemId: 'thermal_blanket', weight: 11, qty: [1, 4] },
      { itemId: 'data_core', weight: 6, qty: [1, 2] },
      { itemId: 'salvage_scrap', weight: 16, qty: [2, 9] },
    ],
    creditRange: [40, 420],
    hazards: [
      {
        label: 'a structure the last storm already half-finished',
        damageType: 'blunt',
        severity: [40, 72],
        avoidSkill: 'exploration',
      },
      {
        label: 'a shorted array still fed by its own solar bank',
        damageType: 'burn',
        severity: [32, 58],
        avoidSkill: 'electricalEngineering',
      },
    ],
    encounterIds: ['enc_hostile_fauna', 'enc_derelict_squatters', 'enc_scavenger_pair'],
    nameAdjectives: ['Wrecked', 'Abandoned', 'Outer', 'Storm-Struck', 'Windward', 'Leeward'],
    nameNouns: ['Atoll', 'Reef', 'Cay', 'Shoal', 'Point'],
    nodeFlavor: {
      corridor: [
        'The windward wall is gone. What is left of the corridor is a balcony over the water.',
        'Sand has drifted knee-deep through the whole length of it.',
        'Every door on the seaward side has been forced open by weather rather than people.',
      ],
      machinery: [
        'A generator shed, roof torn off, machinery beneath it improbably intact.',
        'Desalination plant, silted solid, filters still sealed in their wrappers.',
        'An anemometer mast folded neatly in half across the walkway.',
      ],
      office: [
        'A survey office. The data is still on the drives; the drives are still in the racks.',
        'Weather logs kept meticulously right up until the entry that stops mid-word.',
        'A duty roster and a note about evacuation priority, in that order.',
      ],
      storage: [
        'A supply room the storm never reached, still stacked for a full season.',
        'Emergency stores, opened, partly used, carefully re-sealed.',
      ],
      medical: [
        'A one-bed infirmary that was clearly used in a hurry at the end.',
        'A medical locker, latched, dry, and full.',
      ],
      hazardZone: [
        'The floor ends. Below is water and the remains of the level under this one.',
        'A section leaning far enough that your footing is a decision.',
      ],
    },
  },

  {
    id: 'submerged-research-pod',
    name: 'The {adj} {noun}',
    description:
      'A sealed research pod on the shelf floor, reachable at low water through a flooded access trunk. It has been down there long enough that the locals have stories about it, and the stories do not agree.',
    locationKinds: ['inhabitedPlanet'],
    danger: [45, 78],
    special: true,
    nodeKinds: ['corridor', 'machinery', 'office', 'medical', 'lockedRoom', 'hazardZone', 'hiddenBranch', 'storage'],
    lootTable: [
      { itemId: 'data_core', weight: 12, qty: [1, 3] },
      { itemId: 'surgical_kit', weight: 7, qty: [1, 1], condition: [40, 85] },
      { itemId: 'antibiotics', weight: 12, qty: [2, 6] },
      { itemId: 'blood_substitute', weight: 8, qty: [1, 3] },
      { itemId: 'diagnostic_scanner', weight: 7, qty: [1, 1], condition: [30, 75] },
      { itemId: 'rebreather', weight: 12, qty: [1, 3], condition: [35, 85] },
      { itemId: 'portable_terminal', weight: 8, qty: [1, 1], condition: [25, 70] },
      { itemId: 'power_cell', weight: 13, qty: [2, 5], condition: [30, 80] },
      { itemId: 'antique_navcomp', weight: 4, qty: [1, 1], condition: [20, 60] },
    ],
    creditRange: [200, 1200],
    hazards: [
      {
        label: 'a flooded trunk with a shorter window than you were told',
        damageType: 'stun',
        severity: [50, 85],
        avoidSkill: 'exploration',
      },
      {
        label: 'a pressure door that has been holding the sea back for years',
        damageType: 'blunt',
        severity: [60, 92],
        avoidSkill: 'mechanicalEngineering',
      },
      {
        label: 'something in the pod that is still using its power',
        damageType: 'burn',
        severity: [42, 74],
        avoidSkill: 'electricalEngineering',
      },
    ],
    encounterIds: ['enc_hostile_fauna', 'enc_rogue_drone', 'enc_derelict_squatters'],
    nameAdjectives: ['Drowned', 'Deep', 'Sunken', 'Sealed', 'Lost', 'Lower'],
    nameNouns: ['Pod', 'Bell', 'Station', 'Habitat', 'Shelf Lab'],
    nodeFlavor: {
      corridor: [
        'The trunk is dry to the waist and cold enough to hurt.',
        'Your lamp shows the corridor continuing downward at an angle nothing was designed for.',
        'Every surface is furred with growth that stops abruptly at the pressure door.',
      ],
      machinery: [
        'A power plant still ticking over on something. Nobody has fed it in years.',
        'Pumps that have been fighting the sea continuously and are finally losing.',
        'An atmosphere plant running for a crew that is not here.',
      ],
      office: [
        'Research logs, complete, meticulous, and increasingly worried toward the end.',
        'A whiteboard with the last week of work still on it in three different hands.',
        'Someone catalogued everything in this room and then left it all behind.',
      ],
      medical: [
        'A well-stocked medical bay for a facility this small — deliberately over-provisioned.',
        'Isolation equipment set up and used.',
      ],
      storage: [
        'Sample storage, racked and labelled, most containers still sealed.',
        'Consumables for a two-year rotation, about a third gone.',
      ],
      lockedRoom: [
        'A secure lab with its own independent power feed.',
        'A compartment locked from the inside, with the key still in it.',
      ],
      hazardZone: [
        'The pod creaks around you on a slow rhythm you can set a watch by.',
        'Water is coming in here faster than it was ten minutes ago.',
      ],
      hiddenBranch: [
        'An emergency trunk the plans do not show, dry and sealed at both ends.',
        'A void space between hulls with a hatch cut into it from inside.',
      ],
    },
  },

  // -------------------------------------------------------------------------
  // Deep space and the travel world
  // -------------------------------------------------------------------------
  {
    id: 'crashed-hauler',
    name: '{adj} Hauler Wreck',
    description:
      'A bulk hauler that came down hard and did not burn. The cargo it was carrying is mostly still aboard, which is exactly why other people are also interested in it.',
    locationKinds: ['travelWorld', 'temporary', 'moon'],
    danger: [35, 68],
    nodeKinds: ['corridor', 'storage', 'machinery', 'habitation', 'hazardZone', 'lockedRoom'],
    lootTable: [
      { itemId: 'trade_ore_crate', weight: 10, qty: [1, 2] },
      { itemId: 'trade_machine_parts', weight: 12, qty: [1, 4] },
      { itemId: 'engine_coupling', weight: 8, qty: [1, 2], condition: [25, 70] },
      { itemId: 'repair_kit', weight: 12, qty: [1, 3], condition: [40, 85] },
      { itemId: 'hull_patch', weight: 14, qty: [2, 6] },
      { itemId: 'fuel_canister', weight: 7, qty: [1, 2] },
      { itemId: 'preserved_meal', weight: 13, qty: [3, 10] },
      { itemId: 'salvage_scrap', weight: 20, qty: [4, 14] },
      { itemId: 'personal_effects', weight: 8, qty: [1, 3] },
      { itemId: 'rifle_hunting', weight: 4, qty: [1, 1], condition: [30, 70] },
    ],
    creditRange: [60, 620],
    hazards: [
      {
        label: 'a hull that settled once and can settle again',
        damageType: 'blunt',
        severity: [45, 80],
        avoidSkill: 'exploration',
      },
      {
        label: 'ruptured volatiles pooled in the low sections',
        damageType: 'burn',
        severity: [50, 88],
        avoidSkill: 'explosives',
      },
      {
        label: 'torn structure at every hand-hold',
        damageType: 'slash',
        severity: [25, 48],
        avoidSkill: 'scavenging',
      },
    ],
    encounterIds: ['enc_claim_jumpers', 'enc_scavenger_gang', 'enc_desperate_looters', 'enc_hull_vermin'],
    nameAdjectives: ['Broken', 'Burnt', 'Half-Buried', 'Split', 'Grounded', 'Cold'],
    nameNouns: ['Hauler', 'Freighter', 'Bulker', 'Hull', 'Wreck'],
    nodeFlavor: {
      corridor: [
        'The corridor is at thirty degrees to level and your legs know it before your eyes do.',
        'Impact folded this section like paper. You go through the fold, not around it.',
        'Emergency lighting still runs in a strip along what used to be the floor.',
      ],
      storage: [
        'The main hold, split along one seam, cargo still strapped in its cradles.',
        'A container burst on impact and scattered its contents down the length of the bay.',
        'Bonded cargo, seals intact, nobody having yet worked out how to move it.',
      ],
      machinery: [
        'The drive room. Whatever failed here failed comprehensively.',
        'Power distribution, mostly recoverable if you have the tools and the time.',
        'A reactor housing, cold, with its shielding still rated.',
      ],
      habitation: [
        'Crew quarters. Four bunks, four sets of belongings, no bodies.',
        'A galley with a meal still laid out, which tells you when this happened.',
        'Someone lived aboard after the crash. Not for very long.',
      ],
      lockedRoom: [
        'The captain’s locker, still secured, still on its mounts.',
        'A strongroom the impact did not open, which says something about the strongroom.',
      ],
      hazardZone: [
        'The deck under this section is unsupported. You can feel it flex.',
        'Vapour hangs at knee height and does not disperse.',
      ],
    },
  },

  {
    id: 'drifting-derelict',
    name: 'The {adj} {noun}',
    description:
      'A ship holding position on nothing, cold and dark and not squawking an identity. Nobody stripped it, which is either luck or a reason.',
    locationKinds: ['temporary', 'travelWorld'],
    danger: [50, 88],
    special: true,
    nodeKinds: ['corridor', 'machinery', 'habitation', 'office', 'medical', 'lockedRoom', 'hazardZone', 'hiddenBranch'],
    lootTable: [
      { itemId: 'salvage_scrap', weight: 16, qty: [4, 14] },
      { itemId: 'engine_coupling', weight: 9, qty: [1, 2], condition: [20, 65] },
      { itemId: 'sensor_module', weight: 9, qty: [1, 2], condition: [20, 65] },
      { itemId: 'shield_emitter', weight: 5, qty: [1, 1], condition: [20, 60] },
      { itemId: 'power_cell', weight: 14, qty: [2, 6], condition: [25, 75] },
      { itemId: 'medkit_field', weight: 8, qty: [1, 2], condition: [40, 90] },
      { itemId: 'data_core', weight: 7, qty: [1, 3] },
      { itemId: 'hardsuit_void', weight: 3, qty: [1, 1], condition: [25, 65] },
      { itemId: 'laser_carbine', weight: 4, qty: [1, 1], condition: [30, 70] },
      { itemId: 'personal_effects', weight: 10, qty: [1, 4] },
      { itemId: 'antique_navcomp', weight: 4, qty: [1, 1], condition: [25, 65] },
    ],
    creditRange: [150, 1400],
    hazards: [
      {
        label: 'a compartment that is not holding what the gauge says it is holding',
        damageType: 'blunt',
        severity: [55, 90],
        avoidSkill: 'exploration',
      },
      {
        label: 'a reactor that never fully scrammed',
        damageType: 'burn',
        severity: [55, 92],
        avoidSkill: 'electricalEngineering',
      },
      {
        label: 'debris moving on its own schedule in zero gravity',
        damageType: 'pierce',
        severity: [38, 68],
        avoidSkill: 'exploration',
      },
    ],
    encounterIds: ['enc_derelict_squatters', 'enc_pirate_boarders', 'enc_rogue_drone', 'enc_hull_vermin'],
    nameAdjectives: ['Silent', 'Cold', 'Nameless', 'Drifting', 'Dark', 'Unregistered'],
    nameNouns: ['Derelict', 'Hulk', 'Drifter', 'Ghost', 'Hull'],
    nodeFlavor: {
      corridor: [
        'No gravity, no light, no air movement. Your lamp is the only thing that has changed in here for years.',
        'Handholds every metre, worn smooth, which means somebody used them a great deal.',
        'A corridor with every hatch dogged shut in the same direction — inward.',
      ],
      machinery: [
        'The engine room is intact and cold. Nothing failed here. Somebody shut it down deliberately.',
        'Power plant scrammed and locked out, with the key removed.',
        'Life support, switched off from the panel rather than broken.',
      ],
      habitation: [
        'Quarters for twelve. Personal effects for nine.',
        'Somebody packed to leave and then unpacked again.',
        'A bunk with restraint straps done up over nothing.',
      ],
      office: [
        'The log terminal has power. The log has been wiped.',
        'A ship’s manifest for a route that does not exist.',
        'Paperwork for three different registries, none of them matching the hull.',
      ],
      medical: [
        'A med bay used hard and then cleaned thoroughly.',
        'Supplies for a crew twice this size.',
      ],
      lockedRoom: [
        'A compartment welded shut from the corridor side.',
        'The captain’s cabin, locked, with the lock intact and the frame bent.',
      ],
      hazardZone: [
        'Your lamp finds the far bulkhead and something in front of it that moves.',
        'Radiation gear starts complaining before you reach the door.',
      ],
      hiddenBranch: [
        'A compartment that does not appear in the ship’s own deck plan.',
        'A void behind the cargo bulkhead, accessed by a hatch nobody documented.',
      ],
    },
  },

  {
    id: 'salvage-field',
    name: '{adj} Salvage Field',
    description:
      'The scattered remains of something that came apart out here a long time ago. Working it is slow, cold, and occasionally very rewarding.',
    locationKinds: ['temporary', 'travelWorld', 'moon'],
    danger: [30, 62],
    nodeKinds: ['storage', 'machinery', 'hazardZone', 'corridor', 'hiddenBranch'],
    lootTable: [
      { itemId: 'salvage_scrap', weight: 26, qty: [5, 18] },
      { itemId: 'hull_patch', weight: 14, qty: [1, 5] },
      { itemId: 'power_cell', weight: 13, qty: [1, 4], condition: [20, 70] },
      { itemId: 'trade_machine_parts', weight: 11, qty: [1, 3] },
      { itemId: 'coolant_flask', weight: 9, qty: [1, 3] },
      { itemId: 'sensor_module', weight: 6, qty: [1, 1], condition: [15, 55] },
      { itemId: 'repair_kit', weight: 9, qty: [1, 2], condition: [30, 75] },
      { itemId: 'fuel_canister', weight: 5, qty: [1, 1] },
      { itemId: 'trade_rare_minerals', weight: 3, qty: [1, 1] },
    ],
    creditRange: [30, 480],
    hazards: [
      {
        label: 'a fragment tumbling faster than it looks',
        damageType: 'blunt',
        severity: [40, 74],
        avoidSkill: 'exploration',
      },
      {
        label: 'a pressure vessel that has been waiting a long time to let go',
        damageType: 'pierce',
        severity: [45, 80],
        avoidSkill: 'mechanicalEngineering',
      },
    ],
    encounterIds: ['enc_claim_jumpers', 'enc_scavenger_pair', 'enc_maintenance_drones'],
    nameAdjectives: ['Scattered', 'Cold', 'Wide', 'Slow', 'Old', 'Drifting'],
    nameNouns: ['Field', 'Spread', 'Debris', 'Scatter', 'Drift'],
    nodeFlavor: {
      corridor: [
        'A stretch of intact hull section, open at both ends, tumbling slowly.',
        'You cross open space between fragments on a line. It takes longer than it should.',
      ],
      storage: [
        'A cargo module, mostly whole, still holding its load.',
        'A container that broke open and spilled its contents into a slow-moving cloud.',
        'Sealed drums, tumbling gently, labels long since scoured off.',
      ],
      machinery: [
        'A drive assembly, torn free and remarkably intact.',
        'Power conditioning gear, still rated, still worth real money to the right yard.',
        'A section of reactor shielding you could cut down and sell four times over.',
      ],
      hazardZone: [
        'This part of the field is moving faster and in more directions.',
        'Sharp edges on everything, and nothing holding still.',
      ],
      hiddenBranch: [
        'A sealed module drifting at the edge of the field, well away from the rest.',
        'A fragment that reads as denser than it should on the scanner.',
      ],
    },
  },
];

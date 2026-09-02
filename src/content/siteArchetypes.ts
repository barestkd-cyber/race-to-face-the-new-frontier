/**
 * Scavenge site archetypes — pure authored content.
 *
 * A site is a short node-based expedition. The generator always supplies the
 * `entrance` and `exit` nodes itself, so `nodeKinds` lists only body kinds;
 * flavour is still authored for entrance/exit so those nodes read in-fiction.
 */

import type { SiteArchetype } from './contentTypes';

export const SITE_ARCHETYPES: SiteArchetype[] = [
  // -------------------------------------------------------------------------
  // Homeworld
  // -------------------------------------------------------------------------
  {
    id: 'collapsed-residential-block',
    name: '{adj} Residential Block',
    description:
      'Six floors of company housing that came down slowly enough for most people to walk out. What they could not carry is still on the shelves.',
    locationKinds: ['homeworld'],
    danger: [10, 32],
    nodeKinds: ['corridor', 'habitation', 'storage', 'lockedRoom', 'hazardZone'],
    lootTable: [
      { itemId: 'ration_pack', weight: 14, qty: [1, 3] },
      { itemId: 'preserved_meal', weight: 10, qty: [1, 2] },
      { itemId: 'personal_effects', weight: 12, qty: [1, 3] },
      { itemId: 'painkillers', weight: 8, qty: [1, 2] },
      { itemId: 'multitool', weight: 6, qty: [1, 1], condition: [25, 60] },
      { itemId: 'glow_rods', weight: 9, qty: [1, 3], condition: [30, 70] },
      { itemId: 'thermal_blanket', weight: 8, qty: [1, 2], condition: [35, 75] },
      { itemId: 'utility_knife', weight: 5, qty: [1, 1], condition: [20, 60] },
      { itemId: 'salvage_scrap', weight: 11, qty: [1, 4] },
      { itemId: 'heirloom_watch', weight: 2, qty: [1, 1], condition: [40, 85] },
    ],
    creditRange: [0, 140],
    hazards: [
      { label: 'Floor gives way underfoot', damageType: 'blunt', severity: [30, 55], avoidSkill: 'exploration' },
      { label: 'Sheared rebar in a black stairwell', damageType: 'pierce', severity: [25, 45], avoidSkill: 'scavenging' },
      { label: 'Live feeder trailing into standing water', damageType: 'burn', severity: [30, 55], avoidSkill: 'electricalEngineering' },
    ],
    encounterIds: ['enc_desperate_looters', 'enc_scavenger_pair', 'enc_hull_vermin'],
    nodeFlavor: {
      entrance: [
        'The lobby doors are chocked open with a fire extinguisher. Someone wanted this easy to leave.',
        'Evacuation notices are still taped to the mailbox wall, curling at the corners.',
        'A child’s scooter lies on its side in the entry, half buried in plaster dust.',
      ],
      corridor: [
        'The hallway lists three degrees toward the street. Doors on the low side hang open.',
        'Water stains run the length of the ceiling in one long brown seam.',
        'Someone chalked apartment numbers on the walls after the numbers fell off.',
        'Carpet has been peeled back to bare concrete, as if something heavy was dragged out.',
      ],
      habitation: [
        'A one-room flat with the bed still made. Whoever lived here left in daylight, calmly.',
        'A week of meals sits portioned in the cupboard, each tin labelled by hand.',
        'The window is boarded from the inside. Tally marks run down the frame.',
        'Photographs are gone from the walls, but the pale rectangles remain.',
      ],
      storage: [
        'A tenant storage cage, padlock cut, most of it already picked over.',
        'Cleaning stock, spare bulbs, and four sealed crates nobody bothered to open.',
        'The building manager kept his stores tidy right up until the last week.',
      ],
      lockedRoom: [
        'A flat with the door welded shut from the outside. Someone did not want it entered.',
        'A steel shutter over a corner unit. The keypad is dead but the hinge pins are good.',
        'The block shelter room. Reinforced door, and a smell of old air behind it.',
      ],
      hazardZone: [
        'The stairwell has pancaked from the fourth floor up. The gap is crossable, barely.',
        'Standing water across the sub-level, with a cable end trailing into it.',
        'Ceiling joists sag low enough to touch, and groan whenever anyone moves.',
      ],
      exit: [
        'A service door onto the loading yard, propped open with a brick.',
        'Out through a ground-floor window frame, the glass long since swept aside.',
        'The fire escape holds. Barely, and only one person at a time.',
      ],
    },
    nameAdjectives: [
      'Collapsed', 'Sagging', 'Emptied', 'Cordoned', 'Half-Standing', 'Leaning',
      'Condemned', 'Quiet', 'Settled', 'Cracked', 'Tilted', 'Vacated',
    ],
  },
  {
    id: 'evacuated-hospital-wing',
    name: '{adj} {noun} Wing',
    description:
      'Triage moved out in stages, and the last stage was rushed. Whole cabinets were signed off as lost rather than carried down eleven flights.',
    locationKinds: ['homeworld'],
    danger: [14, 38],
    nodeKinds: ['corridor', 'medical', 'storage', 'office', 'lockedRoom', 'hazardZone'],
    lootTable: [
      { itemId: 'medkit_basic', weight: 14, qty: [1, 3], condition: [45, 85] },
      { itemId: 'medkit_field', weight: 7, qty: [1, 2], condition: [40, 80] },
      { itemId: 'antibiotics', weight: 12, qty: [1, 3] },
      { itemId: 'painkillers', weight: 13, qty: [1, 4] },
      { itemId: 'surgical_kit', weight: 5, qty: [1, 1], condition: [35, 75] },
      { itemId: 'blood_substitute', weight: 6, qty: [1, 2] },
      { itemId: 'stim_shot', weight: 7, qty: [1, 2] },
      { itemId: 'diagnostic_scanner', weight: 4, qty: [1, 1], condition: [30, 70] },
      { itemId: 'portable_terminal', weight: 4, qty: [1, 1], condition: [25, 65] },
      { itemId: 'thermal_blanket', weight: 8, qty: [1, 3], condition: [40, 80] },
    ],
    creditRange: [20, 220],
    hazards: [
      { label: 'Sharps bin tipped across the floor', damageType: 'pierce', severity: [25, 45], avoidSkill: 'firstAid' },
      { label: 'Spoiled biological store, air gone foul', damageType: 'stun', severity: [28, 48], avoidSkill: 'medicalDiagnostics' },
      { label: 'Oxygen line still charged, and a spark nearby', damageType: 'burn', severity: [45, 70], avoidSkill: 'electricalEngineering' },
      { label: 'Gurney-choked stairwell gives underfoot', damageType: 'blunt', severity: [30, 52], avoidSkill: 'exploration' },
    ],
    encounterIds: ['enc_desperate_looters', 'enc_scavenger_pair', 'enc_security_patrol'],
    nodeFlavor: {
      entrance: [
        'Triage arrows are still painted on the floor, pointing at a door that no longer opens.',
        'The intake desk is stripped to the brackets. A visitor log lies open beneath it.',
        'Wheelchairs are lined up neatly against the wall, all of them facing out.',
      ],
      corridor: [
        'Emergency strips glow along the skirting, drawing on whatever is left in the batteries.',
        'Handrails on both sides, and a long smear of something dried along one of them.',
        'Every fourth ceiling panel has been pulled down and left hanging by its clips.',
        'Ward signs still hang overhead, promising departments that are two floors of ash now.',
      ],
      medical: [
        'A four-bed bay with the curtains drawn around empty frames.',
        'The treatment room was worked in hard and left fast. Wrappers are ankle-deep.',
        'A cold store hums on standby power, still holding what it was given.',
        'Monitor arms hang over nothing, their leads coiled and clipped, waiting for a patient.',
      ],
      storage: [
        'A supply cupboard the evacuation missed, still locked, still stocked to the door.',
        'Linen shelves cleared out, but the drug cage behind them was never opened.',
        'Crates marked for transfer, stacked by the lift that stopped working first.',
      ],
      office: [
        'A ward manager’s office. Rosters on the wall, all of them ending the same week.',
        'Records terminals sit dark, but the drives are still seated in their bays.',
        'Somebody wrote three names on the whiteboard and never wiped them off.',
      ],
      lockedRoom: [
        'The controlled-substance room. Steel frame, biometric lock, and no power to argue with it.',
        'A sealed isolation suite, red-tagged from the outside.',
        'Pathology stores behind a shutter that came down with the mains and stayed down.',
      ],
      hazardZone: [
        'The burns unit burned. Floor tiles have gone soft and the air still tastes wrong.',
        'A gas manifold room with the door blown outward and the lines still pressurised.',
        'Waste hold, unrefrigerated for a long time now. Nobody wants to be the one to open it.',
      ],
      exit: [
        'The ambulance ramp, its doors folded back and jammed by a dropped trolley.',
        'A ground-floor fire door, alarm dead, opening onto grey daylight.',
        'Out through the mortuary loading bay, which nobody comments on.',
      ],
    },
    nameAdjectives: [
      'Evacuated', 'Darkened', 'Sealed', 'Quiet', 'Cleared', 'Emptied',
      'Shuttered', 'Cold', 'Locked', 'Stripped',
    ],
    nameNouns: [
      'Trauma', 'Surgical', 'Isolation', 'Recovery', 'Intake', 'Maternity',
      'Dialysis', 'Burn', 'Paediatric', 'Oncology',
    ],
  },
  {
    id: 'flooded-transit-tunnel',
    name: 'The {adj} {noun}',
    description:
      'Pump failure put a metre of water through the lower transit ring. Maintenance stores and stalled rolling stock went under with it.',
    locationKinds: ['homeworld'],
    danger: [22, 46],
    nodeKinds: ['corridor', 'machinery', 'storage', 'hiddenBranch', 'hazardZone'],
    lootTable: [
      { itemId: 'salvage_scrap', weight: 14, qty: [1, 4] },
      { itemId: 'power_cell', weight: 9, qty: [1, 2], condition: [25, 60] },
      { itemId: 'coolant_flask', weight: 7, qty: [1, 2] },
      { itemId: 'multitool', weight: 6, qty: [1, 1], condition: [20, 55] },
      { itemId: 'rope_line', weight: 8, qty: [1, 2], condition: [30, 70] },
      { itemId: 'glow_rods', weight: 11, qty: [1, 3], condition: [35, 75] },
      { itemId: 'rebreather', weight: 5, qty: [1, 1], condition: [25, 60] },
      { itemId: 'crowbar', weight: 7, qty: [1, 1], condition: [30, 70] },
      { itemId: 'trade_machine_parts', weight: 6, qty: [1, 2] },
      { itemId: 'life_support_filter', weight: 4, qty: [1, 1], condition: [20, 55] },
    ],
    creditRange: [0, 150],
    hazards: [
      { label: 'Cold water past the waist, and no way to dry off', damageType: 'stun', severity: [25, 45], avoidSkill: 'exploration' },
      { label: 'Submerged conduit still carrying current', damageType: 'burn', severity: [40, 68], avoidSkill: 'electricalEngineering' },
      { label: 'Rebar and broken tile under black water', damageType: 'pierce', severity: [28, 48], avoidSkill: 'exploration' },
      { label: 'Silt-choked side bore comes down', damageType: 'blunt', severity: [35, 60], avoidSkill: 'scavenging' },
    ],
    encounterIds: ['enc_hull_vermin', 'enc_scavenger_pair', 'enc_desperate_looters'],
    nodeFlavor: {
      entrance: [
        'The platform edge slopes away into flat black water that does not move.',
        'A ticket hall with the turnstiles folded open and a tide line waist-high on the walls.',
        'Someone has left a rope tied to the stair rail, running down into the dark.',
      ],
      corridor: [
        'Wading depth, and every step sends a slow wave down the tunnel ahead.',
        'The running rail is just under the surface. You feel for it rather than see it.',
        'Cable trays overhead, sagging where the clips have rusted through.',
        'Ventilation grilles breathe cold air from somewhere further in.',
      ],
      machinery: [
        'The pump room that failed. Three units seized, one still trying, badly.',
        'A signalling cabinet, doors hanging, boards intact and dry above the waterline.',
        'Traction gear on a stalled car, still coupled, still worth cutting free.',
      ],
      storage: [
        'A permanent-way store: rail clips, sleepers, and a shelf of unopened kit above the flood.',
        'A stalled carriage with its cargo lockers untouched under the seats.',
        'A staff room turned dump, crates piled on tables to keep them clear of the water.',
      ],
      hiddenBranch: [
        'A cross-passage nobody mapped, dry because it climbs.',
        'An old ventilation adit, boarded over and long since forgotten by the operator.',
        'Behind a stack of sleepers, a maintenance bore runs off at an angle.',
      ],
      hazardZone: [
        'Where the roof came in, the water goes deep and the way through is a guess.',
        'A section still live: the third rail hums when your lamp passes it.',
        'The current pulls hard here, toward a drain nobody wants to find the far side of.',
      ],
      exit: [
        'An emergency stair climbing to a hatch that opens on a side street.',
        'Up the ventilation shaft, one rung at a time, dripping the whole way.',
        'A cross-passage into the parallel bore, and the parallel bore is dry.',
      ],
    },
    nameAdjectives: [
      'Flooded', 'Drowned', 'Silted', 'Black', 'Half-Sunk', 'Cold',
      'Backfilled', 'Standing', 'Brackish', 'Sunken',
    ],
    nameNouns: [
      'Underline', 'Interchange', 'Loop', 'Crossing', 'Trunk Line', 'Culvert',
      'Subway', 'Junction', 'Down-Line', 'Service Bore',
    ],
  },
  {
    id: 'shuttered-factory',
    name: '{adj} {noun} Works',
    description:
      'The line stopped mid-shift when the order book emptied. Tooling, stock, and half a shift of output are still where they were set down.',
    locationKinds: ['homeworld', 'moon'],
    danger: [20, 44],
    nodeKinds: ['machinery', 'storage', 'office', 'corridor', 'lockedRoom', 'hazardZone'],
    lootTable: [
      { itemId: 'salvage_scrap', weight: 14, qty: [2, 5] },
      { itemId: 'trade_machine_parts', weight: 11, qty: [1, 3] },
      { itemId: 'welding_rig', weight: 6, qty: [1, 1], condition: [25, 60] },
      { itemId: 'plasma_cutter', weight: 4, qty: [1, 1], condition: [20, 55] },
      { itemId: 'multitool', weight: 8, qty: [1, 1], condition: [25, 65] },
      { itemId: 'pipe_wrench', weight: 9, qty: [1, 1], condition: [35, 75] },
      { itemId: 'engine_coupling', weight: 5, qty: [1, 1], condition: [20, 55] },
      { itemId: 'power_cell', weight: 7, qty: [1, 2], condition: [25, 60] },
      { itemId: 'nail_driver', weight: 5, qty: [1, 1], condition: [25, 60] },
      { itemId: 'hardsuit_work', weight: 4, qty: [1, 1], condition: [20, 55] },
      { itemId: 'helmet_industrial', weight: 6, qty: [1, 1], condition: [25, 65] },
    ],
    creditRange: [10, 200],
    hazards: [
      { label: 'Stored pressure in a dead hydraulic line', damageType: 'blunt', severity: [35, 58], avoidSkill: 'mechanicalEngineering' },
      { label: 'Crane rail lets go at a rusted bracket', damageType: 'blunt', severity: [45, 72], avoidSkill: 'exploration' },
      { label: 'Grinding dust catches off a cutting torch', damageType: 'burn', severity: [35, 60], avoidSkill: 'mechanicalEngineering' },
      { label: 'Swarf and shear offcuts underfoot', damageType: 'slash', severity: [22, 40], avoidSkill: 'scavenging' },
    ],
    encounterIds: ['enc_scavenger_gang', 'enc_rogue_drone', 'enc_desperate_looters', 'enc_claim_jumpers'],
    nodeFlavor: {
      entrance: [
        'The shift gate stands open, its clock frozen at eleven minutes past.',
        'A chained roller door with a man-sized hole cut low in one corner.',
        'Safety boards in the entry still list zero days lost, in faded paint.',
      ],
      corridor: [
        'A gantry walkway above the floor, grating rung with grit and cold to the hand.',
        'Painted walkway lines run between machines that have not turned in years.',
        'The smell of cutting oil never left. It gets stronger the further in you go.',
      ],
      machinery: [
        'A press the size of a room, jaws open, a half-formed part still in the die.',
        'The line runs the length of the hall, every station left mid-operation.',
        'A tool crib beside the lathes, its racks mostly full and none of it labelled.',
        'Compressor house: three units, one of which might still hold a charge.',
      ],
      storage: [
        'Raw stock in bar and sheet, stacked by gauge and never drawn down.',
        'Finished goods on pallets, shrink-wrapped, waiting for a truck that never came.',
        'Consumables store: wire, tips, gas bottles, and a clipboard nobody signed.',
      ],
      office: [
        'A production office over the floor, windows grey with dust, order books still open.',
        'The foreman’s desk, a drawer of keys, and every key unlabelled.',
        'Payroll ledgers in a filing cabinet, the last month of them never posted.',
      ],
      lockedRoom: [
        'The bonded store, where anything expensive lived. Still shut, still bonded.',
        'A pattern vault with a mechanical lock that outlived the company.',
        'Site security office, door reinforced from inside, which is its own kind of story.',
      ],
      hazardZone: [
        'The quench bay floor has gone through. Below it is a tank of something still liquid.',
        'A roof section came down over the paint line and took the walkway with it.',
        'Gas bottles toppled and rolled together in a corner. None of them are empty.',
      ],
      exit: [
        'The goods-out dock, its shutters half raised and stuck there.',
        'A fire door onto the yard, kicked open at some point and never closed.',
        'Out along the rail spur, stepping between sleepers in the dark.',
      ],
    },
    nameAdjectives: [
      'Shuttered', 'Idle', 'Cold', 'Mothballed', 'Stripped', 'Silent',
      'Rusting', 'Padlocked', 'Derated', 'Closed',
    ],
    nameNouns: [
      'Pressing', 'Fabrication', 'Casting', 'Rolling', 'Stamping', 'Bottling',
      'Weaving', 'Assembly', 'Finishing', 'Plating',
    ],
  },
  {
    id: 'government-archive',
    name: 'The {adj} {noun}',
    description:
      'Four sub-levels of paper and cold storage the evacuation had no lift capacity for. Land deeds, patents and survey data are all still down there, and all still worth something to somebody.',
    locationKinds: ['homeworld'],
    danger: [18, 46],
    special: true,
    nodeKinds: ['corridor', 'office', 'storage', 'lockedRoom', 'hiddenBranch', 'machinery', 'hazardZone'],
    lootTable: [
      { itemId: 'data_core', weight: 14, qty: [1, 3] },
      { itemId: 'portable_terminal', weight: 9, qty: [1, 1], condition: [30, 70] },
      { itemId: 'antique_navcomp', weight: 4, qty: [1, 1], condition: [25, 65] },
      { itemId: 'personal_effects', weight: 8, qty: [1, 3] },
      { itemId: 'heirloom_watch', weight: 3, qty: [1, 1], condition: [40, 85] },
      { itemId: 'power_cell', weight: 8, qty: [1, 2], condition: [30, 65] },
      { itemId: 'diagnostic_scanner', weight: 5, qty: [1, 1], condition: [30, 70] },
      { itemId: 'lockpick_set', weight: 4, qty: [1, 1], condition: [30, 70] },
      { itemId: 'glow_rods', weight: 8, qty: [1, 3], condition: [35, 75] },
      { itemId: 'salvage_scrap', weight: 9, qty: [1, 3] },
    ],
    creditRange: [80, 700],
    hazards: [
      { label: 'Suppression dump in a sealed stack', damageType: 'stun', severity: [30, 52], avoidSkill: 'exploration' },
      { label: 'Shelf tier folds, four metres of steel and paper', damageType: 'blunt', severity: [40, 68], avoidSkill: 'exploration' },
      { label: 'Old fire charge, still armed after all this time', damageType: 'burn', severity: [35, 60], avoidSkill: 'explosives' },
      { label: 'Standby security shutter closes on a limb', damageType: 'blunt', severity: [30, 55], avoidSkill: 'electricalEngineering' },
    ],
    encounterIds: ['enc_security_patrol', 'enc_maintenance_drones', 'enc_scavenger_gang', 'enc_lone_gunman'],
    nodeFlavor: {
      entrance: [
        'A public counter with the shutters down and the queue barriers still threaded through the hall.',
        'Stone steps, a brass plate, and a door somebody has already worked on with a bar.',
        'The lobby directory lists forty departments. Thirty-eight of them are below ground.',
      ],
      corridor: [
        'Low ceilings, cable runs, and floor markings for trolleys that no longer exist.',
        'The corridor smells of paper and cold concrete. Sound does not carry far.',
        'Numbered doors, all identical, none of them labelled with anything useful.',
        'A stair down to the next tier, its handrail worn smooth by decades of clerks.',
      ],
      office: [
        'A clerk’s room: three desks, three terminals, and a wall of request slips on spikes.',
        'The duty office, coats still on the hooks, kettle still plugged in.',
        'A reading room with request forms half filled out and abandoned on the tables.',
      ],
      storage: [
        'Rolling stacks on rails, cranked shut. The handles still turn.',
        'Cold storage for media, running on a trickle, its contents ice-cold and intact.',
        'Bulk crates of deeds and titles, boxed for a transfer that was cancelled.',
        'A sorting hall knee-deep in loose paper where someone searched fast and badly.',
      ],
      lockedRoom: [
        'The bonded vault. Mechanical combination, no power required, and no obvious weakness.',
        'A restricted tier behind a barred gate, its register still open on the desk outside.',
        'A sealed room marked only with a department number that appears in no directory.',
      ],
      hiddenBranch: [
        'A stack aisle that does not appear on the tier plan, and runs further than it should.',
        'Behind a false shelf end, a short passage to a private reading cell.',
        'A disused document lift, its shaft climbable if you do not think about it too hard.',
      ],
      machinery: [
        'Environmental plant for the stacks: dehumidifiers, filters, and a lot of good spares.',
        'The document conveyor, belts perished, drives intact and worth cutting out.',
        'A standby generator bay that still turns over on the second attempt.',
      ],
      hazardZone: [
        'A flooded tier where the sump quit. The water is black and holds the cold.',
        'Collapsed racking has made a maze of steel edges and compacted paper.',
        'Suppression bottles fill this room floor to ceiling, and one of them is weeping.',
      ],
      exit: [
        'The goods lift shaft, climbed by ladder, opening on a delivery court.',
        'A staff exit onto a side street, its push bar frozen but not beaten.',
        'Up through the archive loading tunnel, past the trolleys still parked in it.',
      ],
    },
    nameAdjectives: [
      'Sealed', 'Municipal', 'Buried', 'Forgotten', 'Grey', 'Deep',
      'Provincial', 'Bonded', 'Quiet', 'Lower',
    ],
    nameNouns: [
      'Archive', 'Registry', 'Records Vault', 'Census Hall', 'Repository',
      'Stacks', 'Bureau', 'Ledger House', 'Depository', 'Filing Tiers',
    ],
  },
  {
    id: 'district-substation',
    name: '{adj} District Substation',
    description:
      'A neighbourhood step-down station taken off the grid when the district emptied. The copper alone is worth the walk, provided the busbars really are dead.',
    locationKinds: ['homeworld', 'moon'],
    danger: [24, 52],
    nodeKinds: ['machinery', 'corridor', 'office', 'storage', 'hazardZone'],
    lootTable: [
      { itemId: 'power_cell', weight: 14, qty: [1, 3], condition: [30, 70] },
      { itemId: 'salvage_scrap', weight: 13, qty: [2, 5] },
      { itemId: 'coolant_flask', weight: 8, qty: [1, 2] },
      { itemId: 'sensor_module', weight: 5, qty: [1, 1], condition: [25, 60] },
      { itemId: 'shield_emitter', weight: 3, qty: [1, 1], condition: [20, 50] },
      { itemId: 'multitool', weight: 7, qty: [1, 1], condition: [25, 65] },
      { itemId: 'welding_rig', weight: 5, qty: [1, 1], condition: [25, 60] },
      { itemId: 'trade_machine_parts', weight: 9, qty: [1, 3] },
      { itemId: 'diagnostic_scanner', weight: 5, qty: [1, 1], condition: [30, 70] },
      { itemId: 'arc_projector', weight: 2, qty: [1, 1], condition: [20, 50] },
    ],
    creditRange: [10, 180],
    hazards: [
      { label: 'Residual charge in a capacitor bank', damageType: 'burn', severity: [50, 78], avoidSkill: 'electricalEngineering' },
      { label: 'Transformer oil pooled and slick', damageType: 'burn', severity: [35, 58], avoidSkill: 'mechanicalEngineering' },
      { label: 'Gantry ladder rungs rusted through', damageType: 'blunt', severity: [28, 50], avoidSkill: 'exploration' },
      { label: 'Arc flash off a mis-cut busbar', damageType: 'burn', severity: [45, 72], avoidSkill: 'electricalEngineering' },
    ],
    encounterIds: ['enc_claim_jumpers', 'enc_scavenger_pair', 'enc_rogue_drone'],
    nodeFlavor: {
      entrance: [
        'A wire fence with a section folded back, and a warning sign nobody has read in years.',
        'The compound gate hangs on one hinge. Weeds have taken the yard.',
        'A steel personnel door, lock drilled out, swinging in whatever wind gets in here.',
      ],
      corridor: [
        'A cable gallery, trays stacked four high, most of them already stripped bare.',
        'Narrow service walk between two transformer bays. The concrete still smells of ozone.',
        'Painted safe-route lines on the floor, and someone has scuffed out the crossing point.',
      ],
      machinery: [
        'Three transformer bays. Two are gutted. The third has not been touched.',
        'Switchgear the length of the wall, every handle in the open position. Allegedly.',
        'A rectifier hall, cabinets standing open, boards pulled and boards left.',
        'The battery room: rack on rack of cells, some bulging, some perfectly fine.',
      ],
      office: [
        'A control room with a mimic board of the district, half its lamps still lit.',
        'The duty log lies open at the day the feeders were opened for the last time.',
        'A supervisor’s cubicle with drawings rolled and racked to the ceiling.',
      ],
      storage: [
        'A spares store: bushings, links, fuses, and drums of cable in odd lengths.',
        'Tool lockers along the back wall, three of them still padlocked.',
        'A yard shed full of terminations and connectors, sorted by somebody meticulous.',
      ],
      hazardZone: [
        'The capacitor room. Nothing hums, which is not the same as nothing being live.',
        'Oil has leaked across the whole bay floor and found the drain, and stopped there.',
        'A collapsed cable trench, edges sharp, depth uncertain in the dark.',
      ],
      exit: [
        'Back out through the compound gate, arms full and moving slowly.',
        'A cable tunnel that runs under the fence line and comes up two streets away.',
        'The transformer loading bay, its ramp cracked but passable.',
      ],
    },
    nameAdjectives: [
      'Abandoned', 'Derated', 'Blacked-Out', 'Tripped', 'Isolated', 'Cold',
      'Fenced', 'Silent', 'Condemned', 'Bypassed',
    ],
  },

  // -------------------------------------------------------------------------
  // Industrial moons
  // -------------------------------------------------------------------------
  {
    id: 'sealed-mining-gallery',
    name: 'The {adj} {noun}',
    description:
      'Sealed after a roof fall took a shift crew, and never reopened. The ore is still on the cars and the tools are still on the wall, because nobody would go back down for them.',
    locationKinds: ['moon'],
    danger: [46, 82],
    special: true,
    nodeKinds: ['corridor', 'machinery', 'storage', 'lockedRoom', 'hiddenBranch', 'hazardZone'],
    lootTable: [
      { itemId: 'trade_ore_crate', weight: 14, qty: [1, 3] },
      { itemId: 'trade_rare_minerals', weight: 6, qty: [1, 2] },
      { itemId: 'mining_pick', weight: 10, qty: [1, 1], condition: [30, 70] },
      { itemId: 'plasma_cutter', weight: 5, qty: [1, 1], condition: [25, 60] },
      { itemId: 'glow_rods', weight: 11, qty: [2, 4], condition: [35, 75] },
      { itemId: 'rope_line', weight: 8, qty: [1, 2], condition: [30, 70] },
      { itemId: 'climbing_rig', weight: 6, qty: [1, 1], condition: [25, 60] },
      { itemId: 'rebreather', weight: 7, qty: [1, 1], condition: [25, 60] },
      { itemId: 'hardsuit_work', weight: 4, qty: [1, 1], condition: [20, 55] },
      { itemId: 'helmet_industrial', weight: 6, qty: [1, 1], condition: [25, 65] },
      { itemId: 'grenade_frag', weight: 3, qty: [1, 2], condition: [30, 70] },
      { itemId: 'salvage_scrap', weight: 9, qty: [1, 4] },
    ],
    creditRange: [40, 500],
    hazards: [
      { label: 'Roof fall in an unsupported section', damageType: 'blunt', severity: [60, 88], avoidSkill: 'exploration' },
      { label: 'Pocket of stale gas behind the seal', damageType: 'stun', severity: [45, 70], avoidSkill: 'exploration' },
      { label: 'Unshot charge still sitting in the face', damageType: 'burn', severity: [62, 90], avoidSkill: 'explosives' },
      { label: 'Winze drop hidden under fallen rock', damageType: 'blunt', severity: [50, 75], avoidSkill: 'scavenging' },
    ],
    encounterIds: ['enc_claim_jumpers', 'enc_mutinous_workers', 'enc_hull_vermin', 'enc_scavenger_gang'],
    nodeFlavor: {
      entrance: [
        'The seal is a wall of poured plug with a company plate bolted to it, and a hole cut low and recent.',
        'A headframe stands over the shaft, its cage still hanging where the power failed.',
        'The portal is timbered and drifted with dust. Someone has scraped a path through.',
      ],
      corridor: [
        'The drift runs level for a hundred metres, props every two, half of them bowed.',
        'Rail underfoot, and the ceiling low enough that everyone walks with their neck bent.',
        'Water drips somewhere ahead, steadily, and has been dripping for years.',
        'A crosscut branches off, its number stencilled on the rock in fading paint.',
      ],
      machinery: [
        'The hoist room: drums, brake gear, and a control desk with the keys still in it.',
        'A continuous miner parked at the face, cutting head buried, still full of good parts.',
        'Ventilation fans in a chamber of their own. One of them turns when you push it.',
        'A pump station on the lower level, mostly under the water it was meant to move.',
      ],
      storage: [
        'The tool wall: picks, bars, and drill steel hung in outline as if for inspection.',
        'Ore cars standing loaded on the siding, tipped for a shift that never ended.',
        'A supply cuddy cut into the rib, stacked with consumables and lamp charges.',
      ],
      lockedRoom: [
        'The magazine, steel door, ventilation grille, and a lock that has not been tested.',
        'A bonded store for assay samples, sealed and stamped by an inspector long gone.',
        'The refuge chamber. Sealed from the inside, which is the part nobody talks about.',
      ],
      hiddenBranch: [
        'An abandoned stope above the level, reachable if the ladderway holds.',
        'A bootleg drift cut off the main gallery by someone working a seam off the books.',
        'A raise climbs into the dark, and the air coming down it is fresher than it should be.',
      ],
      hazardZone: [
        'The fall itself. Rock to the roof, and a gap along the rib you could crawl through.',
        'A section where the props have gone. The rock ticks and settles as you pass.',
        'Bad air. The lamp burns lower here, and the ground slopes down, which is the wrong way.',
      ],
      exit: [
        'Out through the plug, sideways, passing the load out one piece at a time.',
        'Up the ventilation raise, hand over hand, into thin grey daylight.',
        'The service adit comes out half a kilometre from where you went in.',
      ],
    },
    nameAdjectives: [
      'Sealed', 'Deep', 'Flooded', 'Collapsed', 'Cold', 'Abandoned',
      'Gassed', 'Lower', 'Dark', 'Condemned',
    ],
    nameNouns: [
      'Gallery', 'Drift', 'Stope', 'Adit', 'Seam', 'Shaft',
      'Cut', 'Level', 'Face', 'Winze',
    ],
  },
  {
    id: 'failed-greenhouse-dome',
    name: '{adj} Greenhouse Dome',
    description:
      'A subsidised food dome that never made its yield targets and was written off on paper. Some beds are still fed by a leaking line and still growing.',
    locationKinds: ['moon'],
    danger: [18, 44],
    nodeKinds: ['corridor', 'storage', 'machinery', 'office', 'hazardZone'],
    lootTable: [
      { itemId: 'fresh_produce', weight: 13, qty: [1, 3] },
      { itemId: 'protein_culture', weight: 9, qty: [1, 2] },
      { itemId: 'trade_produce', weight: 10, qty: [1, 3] },
      { itemId: 'preserved_meal', weight: 8, qty: [1, 2] },
      { itemId: 'ration_pack', weight: 9, qty: [1, 3] },
      { itemId: 'life_support_filter', weight: 7, qty: [1, 2], condition: [25, 60] },
      { itemId: 'coolant_flask', weight: 6, qty: [1, 2] },
      { itemId: 'multitool', weight: 6, qty: [1, 1], condition: [25, 65] },
      { itemId: 'handheld_scanner', weight: 4, qty: [1, 1], condition: [25, 60] },
      { itemId: 'thermal_blanket', weight: 6, qty: [1, 2], condition: [35, 75] },
      { itemId: 'salvage_scrap', weight: 8, qty: [1, 3] },
    ],
    creditRange: [0, 160],
    hazards: [
      { label: 'Frosted pane lets go overhead', damageType: 'slash', severity: [30, 55], avoidSkill: 'exploration' },
      { label: 'Mould bloom thick enough to choke on', damageType: 'stun', severity: [25, 45], avoidSkill: 'medicalDiagnostics' },
      { label: 'Nutrient line under pressure, and the mix is caustic', damageType: 'burn', severity: [28, 50], avoidSkill: 'mechanicalEngineering' },
      { label: 'Growbed catwalk rusted through at the welds', damageType: 'blunt', severity: [25, 45], avoidSkill: 'exploration' },
    ],
    encounterIds: ['enc_desperate_looters', 'enc_hull_vermin', 'enc_scavenger_pair'],
    nodeFlavor: {
      entrance: [
        'The airlock cycles slowly and smells of wet earth on the far side.',
        'A vestibule of boot racks and hanging aprons, every hook still occupied.',
        'Condensation runs down the inside of the entry glazing in long clean lines.',
      ],
      corridor: [
        'A service spine between beds, warm and damp, roots pushing up through the grating.',
        'The walkway is overgrown. Something with broad leaves has claimed both sides.',
        'Grow lamps flicker in sequence down the aisle, running on whatever the panels make.',
      ],
      storage: [
        'Seed store: sealed foil packets in labelled drawers, most of them still viable.',
        'A harvest room with crates stacked and a scale that still reads zero.',
        'Nutrient drums along the wall, three of them full and heavy.',
      ],
      machinery: [
        'The water plant: pumps, filters, and a reservoir grown thick and green.',
        'Atmospheric processors in a hot little room, one running, three not.',
        'Lamp ballast racks, most of them stripped, a few untouched behind a panel.',
      ],
      office: [
        'The agronomist’s desk, crop logs open, columns of yields all trending the wrong way.',
        'A soil lab with sample trays labelled by bed number and never assessed.',
        'A wall of graphs and, under them, the letter closing the site.',
      ],
      hazardZone: [
        'A collapsed dome segment, glazing down in sheets and the cold coming straight in.',
        'The composting bay. Nothing has vented in years and the air moves oddly.',
        'A bed section overgrown to the roof, and the floor beneath it is not visible.',
      ],
      exit: [
        'Out through the produce lock, ducking under a curtain of vines.',
        'The maintenance hatch on the low side, ice-rimmed but workable.',
        'Back the way you came, arms full, the airlock cycling with agonising patience.',
      ],
    },
    nameAdjectives: [
      'Frosted', 'Failed', 'Cracked', 'Dim', 'Cold', 'Blighted',
      'Depressurised', 'Neglected', 'Half-Glazed', 'Fogged',
    ],
  },
  {
    id: 'ice-harvesting-rig',
    name: 'The {adj} {noun}',
    description:
      'A mobile ice cutter that froze into its own tailings and was left where it stood. The hoppers never got emptied and the crew quarters never got cleared.',
    locationKinds: ['moon'],
    danger: [30, 58],
    nodeKinds: ['machinery', 'storage', 'habitation', 'corridor', 'hazardZone'],
    lootTable: [
      { itemId: 'trade_ice_block', weight: 14, qty: [1, 3] },
      { itemId: 'trade_volatiles', weight: 7, qty: [1, 2] },
      { itemId: 'coolant_flask', weight: 9, qty: [1, 3] },
      { itemId: 'power_cell', weight: 9, qty: [1, 2], condition: [25, 60] },
      { itemId: 'fuel_canister', weight: 7, qty: [1, 2] },
      { itemId: 'plasma_cutter', weight: 4, qty: [1, 1], condition: [20, 55] },
      { itemId: 'welding_rig', weight: 5, qty: [1, 1], condition: [25, 60] },
      { itemId: 'thermal_blanket', weight: 9, qty: [1, 3], condition: [35, 75] },
      { itemId: 'climbing_rig', weight: 5, qty: [1, 1], condition: [25, 60] },
      { itemId: 'hardsuit_work', weight: 4, qty: [1, 1], condition: [20, 55] },
      { itemId: 'ration_pack', weight: 8, qty: [1, 2] },
    ],
    creditRange: [10, 220],
    hazards: [
      { label: 'Cold soak through a failing suit seal', damageType: 'stun', severity: [40, 65], avoidSkill: 'exploration' },
      { label: 'Ice bridge over the cut collapses', damageType: 'blunt', severity: [45, 70], avoidSkill: 'exploration' },
      { label: 'Charged cutting head kicks back', damageType: 'slash', severity: [40, 65], avoidSkill: 'mechanicalEngineering' },
      { label: 'Volatile pocket vents out of the hopper', damageType: 'burn', severity: [35, 58], avoidSkill: 'scavenging' },
    ],
    encounterIds: ['enc_claim_jumpers', 'enc_scavenger_pair', 'enc_rogue_drone'],
    nodeFlavor: {
      entrance: [
        'The boarding ladder is welded into a column of ice. The lower rungs have been chopped clear.',
        'A crew lock at track level, half drifted over, its handle bent from being forced.',
        'The rig leans four degrees into the cut, and every step aboard reminds you of it.',
      ],
      corridor: [
        'Narrow trunking between decks, every surface furred with frost.',
        'A gangway along the hopper side, grating slick, handrail cold enough to bite.',
        'The passage bends around the cutter mount, and headroom disappears entirely.',
      ],
      machinery: [
        'The cutter head, three metres across, teeth still set, still worth more than the rig.',
        'Drive bay: motors, gearing, and a floor of frozen lubricant you have to chip through.',
        'The melt plant, tanks split by expansion, pumps intact behind the split ones.',
        'A generator house that fires on the fourth try and holds for as long as anyone dares.',
      ],
      storage: [
        'Hoppers still loaded, ice cut and graded and never trucked out.',
        'A consumables locker with a season of stores and a season of ice on top of them.',
        'The spares bay: cutter teeth, belts, and a drum of hydraulic fluid nobody wanted to carry.',
      ],
      habitation: [
        'Four bunks, two of them stripped, two of them made and frozen solid.',
        'A mess with the table still set and everything on it fused to the surface.',
        'The crew room, cards laid out mid-hand, the last hand anyone played here.',
      ],
      hazardZone: [
        'The cut face, twelve metres down, with a lip of overhanging ice above it.',
        'Where the hull split, the cold comes in as a solid wall and does not stop.',
        'A hopper that has partly thawed and refrozen, and now shifts underfoot.',
      ],
      exit: [
        'Down the ice ramp the rig cut itself, slow and braced the whole way.',
        'Out through the split in the hull, which is wider than the door and closer.',
        'Back down the ladder, packs lowered on a line first.',
      ],
    },
    nameAdjectives: [
      'Frozen', 'Stranded', 'Abandoned', 'Iced-In', 'Cold', 'Silent',
      'Buried', 'Toppled', 'Derated', 'Idle',
    ],
    nameNouns: [
      'Rig', 'Harvester', 'Derrick', 'Crawler', 'Platform', 'Cutter',
      'Sled', 'Bore', 'Hoist', 'Mast',
    ],
  },
  {
    id: 'chemical-processing-plant',
    name: '{adj} {noun} Plant',
    description:
      'Shut down after a release nobody was fined for. Full drums remain in the day tanks because purging them cost more than walking away.',
    locationKinds: ['moon'],
    danger: [38, 68],
    nodeKinds: ['machinery', 'storage', 'corridor', 'office', 'lockedRoom', 'hazardZone'],
    lootTable: [
      { itemId: 'trade_chemicals', weight: 14, qty: [1, 3] },
      { itemId: 'trade_volatiles', weight: 9, qty: [1, 2] },
      { itemId: 'coolant_flask', weight: 10, qty: [1, 3] },
      { itemId: 'fuel_canister', weight: 8, qty: [1, 2] },
      { itemId: 'life_support_filter', weight: 7, qty: [1, 2], condition: [25, 60] },
      { itemId: 'rebreather', weight: 8, qty: [1, 1], condition: [25, 60] },
      { itemId: 'hardsuit_work', weight: 5, qty: [1, 1], condition: [20, 55] },
      { itemId: 'welding_rig', weight: 5, qty: [1, 1], condition: [25, 60] },
      { itemId: 'power_cell', weight: 6, qty: [1, 2], condition: [25, 60] },
      { itemId: 'grenade_smoke', weight: 3, qty: [1, 2], condition: [30, 70] },
      { itemId: 'salvage_scrap', weight: 9, qty: [1, 4] },
    ],
    creditRange: [20, 300],
    hazards: [
      { label: 'Residue vents from a cracked flange', damageType: 'burn', severity: [45, 72], avoidSkill: 'mechanicalEngineering' },
      { label: 'Oxygen-poor pocket in the tank farm', damageType: 'stun', severity: [45, 70], avoidSkill: 'exploration' },
      { label: 'Corroded grating over a sump', damageType: 'pierce', severity: [30, 52], avoidSkill: 'exploration' },
      { label: 'Reagent drum ruptures under a boot', damageType: 'burn', severity: [35, 60], avoidSkill: 'scavenging' },
    ],
    encounterIds: ['enc_mutinous_workers', 'enc_rogue_drone', 'enc_scavenger_gang', 'enc_smuggler_ambush'],
    nodeFlavor: {
      entrance: [
        'A decontamination lock with the showers dry and the inner door chocked open.',
        'The muster point sign is still legible. The muster point itself is under a collapsed pipe run.',
        'Hazard placards on every surface, most of them for compounds nobody labelled clearly.',
      ],
      corridor: [
        'Pipe racks overhead, all of them lagged, some of them weeping.',
        'A walkway between reactor bays, grating stained a colour that was not in the paint scheme.',
        'The air handler still runs on this level, which is either reassuring or not.',
        'Emergency showers every twenty metres, and all of them long since drained.',
      ],
      machinery: [
        'A column four storeys tall, its access ladders intact and its trays worth cutting out.',
        'Pump house: seals gone, casings good, and a rack of spares behind them.',
        'The control valve gallery, actuators seized in whatever position they died in.',
        'Heat exchangers in a row, one of them opened up and never put back together.',
      ],
      storage: [
        'Drum store: rows of sealed containers, stencilled with batch codes and a hazard class.',
        'The consumables cage, filters and cartridges by the box, all in date because nothing used them.',
        'A bunded day tank area, still holding product, still under a lazy positive pressure.',
      ],
      office: [
        'A process control room, screens dark, logbooks stacked and complete to the last shift.',
        'The shift supervisor’s office. Someone left in a hurry and did not take the keys.',
        'A sampling lab with racks of vials and a very careful handwriting on every label.',
      ],
      lockedRoom: [
        'The reagent vault, interlocked doors, and a key system with two keys and no holders.',
        'A sealed bay marked with a class of hazard that requires a signature to enter.',
        'The site strong room, where the assay records and the good instruments went.',
      ],
      hazardZone: [
        'The release point. The plating around it has gone soft and pale.',
        'A flare stack knuckle at ground level, and the line to it is still charged.',
        'The sump gallery: no ventilation, a metre of residue, and one narrow way through.',
      ],
      exit: [
        'Out through the tank farm gate, upwind, and quickly.',
        'A pipe bridge over the perimeter, walked one at a time with everything clipped on.',
        'The decontamination lock again, and nobody suggests using the showers.',
      ],
    },
    nameAdjectives: [
      'Vented', 'Shuttered', 'Corroded', 'Cold', 'Condemned', 'Isolated',
      'Fouled', 'Idle', 'Sealed', 'Derated',
    ],
    nameNouns: [
      'Volatiles', 'Reagent', 'Solvent', 'Cracking', 'Reclamation', 'Feedstock',
      'Distillation', 'Slurry', 'Electrolysis', 'Scrubber',
    ],
  },
  {
    id: 'worker-habitat-block',
    name: '{adj} Habitat Block',
    description:
      'Bunkhousing for a rotation that never came back. Personal lockers were left sealed because shipping them home cost more than they held.',
    locationKinds: ['moon'],
    danger: [22, 48],
    nodeKinds: ['habitation', 'corridor', 'storage', 'medical', 'lockedRoom', 'hazardZone'],
    lootTable: [
      { itemId: 'ration_pack', weight: 13, qty: [1, 3] },
      { itemId: 'preserved_meal', weight: 9, qty: [1, 2] },
      { itemId: 'stim_coffee', weight: 8, qty: [1, 2] },
      { itemId: 'personal_effects', weight: 11, qty: [1, 3] },
      { itemId: 'medkit_basic', weight: 7, qty: [1, 2], condition: [40, 80] },
      { itemId: 'painkillers', weight: 8, qty: [1, 3] },
      { itemId: 'thermal_blanket', weight: 8, qty: [1, 2], condition: [35, 75] },
      { itemId: 'utility_knife', weight: 6, qty: [1, 1], condition: [25, 65] },
      { itemId: 'multitool', weight: 6, qty: [1, 1], condition: [25, 65] },
      { itemId: 'life_support_filter', weight: 5, qty: [1, 1], condition: [25, 60] },
      { itemId: 'pistol_holdout', weight: 3, qty: [1, 1], condition: [25, 60] },
      { itemId: 'heirloom_watch', weight: 2, qty: [1, 1], condition: [40, 85] },
    ],
    creditRange: [10, 200],
    hazards: [
      { label: 'Life support down to a thin, cold trickle', damageType: 'stun', severity: [30, 52], avoidSkill: 'exploration' },
      { label: 'Corridor seal blows as the pressure equalises', damageType: 'blunt', severity: [40, 65], avoidSkill: 'mechanicalEngineering' },
      { label: 'Somebody left a trap on their locker', damageType: 'pierce', severity: [28, 50], avoidSkill: 'stealth' },
      { label: 'Bunkroom heater fire, still smouldering', damageType: 'burn', severity: [28, 50], avoidSkill: 'firstAid' },
    ],
    encounterIds: ['enc_derelict_squatters', 'enc_mutinous_workers', 'enc_desperate_looters', 'enc_hull_vermin'],
    nodeFlavor: {
      entrance: [
        'The muster lock, boot grates full of grey dust, and a shift board with nobody signed in.',
        'A notice on the inner door gives thirty days to clear personal property. It is dated years ago.',
        'The entry hall is cold enough that your breath hangs and stays hanging.',
      ],
      corridor: [
        'Bunk doors down both sides, numbered, most of them ajar.',
        'A strip of worn matting runs the length of the corridor, worn through in the middle.',
        'Someone painted a mural on one wall over a shift break. It is genuinely good.',
        'Notices about water rationing, still pinned, edges soft with damp.',
      ],
      habitation: [
        'Six bunks, three footlockers, and one bed that was never stripped.',
        'A shared room where somebody built shelves out of pallet wood and did it well.',
        'The mess hall: long tables, benches bolted down, and the smell of old grease.',
        'A rec room with a dead screen and a shelf of things people left behind on purpose.',
      ],
      storage: [
        'The block store: bedding, coveralls, and boots in every size but the useful ones.',
        'A dry goods room the rotation never got through, sealed and still cold.',
        'Personal storage cages, wire mesh, and a lot of padlocks nobody came back for.',
      ],
      medical: [
        'The block clinic: two beds, one cabinet, and a logbook full of crush injuries.',
        'A dispensary with the controlled drawer forced and the rest untouched.',
        'A treatment room where somebody kept the sharps count right to the very end.',
      ],
      lockedRoom: [
        'The site office safe room, welded shut from the corridor side.',
        'A bunk with a hasp fitted by its occupant and a lock rated far above the job.',
        'The paymaster’s room, still bolted, still on a mechanical lock.',
      ],
      hazardZone: [
        'A section that lost pressure and got sealed with the doors as they were.',
        'The heater plant room, floor black, the air still carrying it.',
        'Corridor structure has bowed where the block settled. The frames no longer meet.',
      ],
      exit: [
        'Back out through the muster lock, boots stamped clean out of habit.',
        'The service tunnel to the plant, low, straight, and mercifully warm.',
        'A cargo lock on the far side, cycled by hand, twenty turns at a time.',
      ],
    },
    nameAdjectives: [
      'Decommissioned', 'Cold', 'Emptied', 'Rotation', 'Sealed', 'Derated',
      'Quiet', 'Stripped', 'Condemned', 'Vacated',
    ],
  },
  {
    id: 'buried-survey-outpost',
    name: '{adj} Survey Outpost',
    description:
      'A prospecting post that ran out of funding and got left under the dust. Its core samples and survey logs still name seams nobody has filed a claim on.',
    locationKinds: ['moon', 'travelWorld'],
    danger: [28, 56],
    nodeKinds: ['corridor', 'office', 'storage', 'habitation', 'hiddenBranch', 'hazardZone'],
    lootTable: [
      { itemId: 'data_core', weight: 11, qty: [1, 2] },
      { itemId: 'handheld_scanner', weight: 9, qty: [1, 1], condition: [25, 65] },
      { itemId: 'sensor_module', weight: 7, qty: [1, 1], condition: [25, 60] },
      { itemId: 'trade_rare_minerals', weight: 7, qty: [1, 2] },
      { itemId: 'trade_ore_crate', weight: 6, qty: [1, 2] },
      { itemId: 'portable_terminal', weight: 6, qty: [1, 1], condition: [25, 65] },
      { itemId: 'emergency_beacon', weight: 6, qty: [1, 1], condition: [30, 70] },
      { itemId: 'rebreather', weight: 7, qty: [1, 1], condition: [25, 60] },
      { itemId: 'ration_pack', weight: 9, qty: [1, 3] },
      { itemId: 'glow_rods', weight: 9, qty: [1, 3], condition: [35, 75] },
      { itemId: 'antique_navcomp', weight: 3, qty: [1, 1], condition: [25, 65] },
      { itemId: 'rifle_hunting', weight: 3, qty: [1, 1], condition: [25, 60] },
    ],
    creditRange: [20, 260],
    hazards: [
      { label: 'Regolith drift gives way over the buried roof', damageType: 'blunt', severity: [35, 60], avoidSkill: 'exploration' },
      { label: 'Airlock cycles on a failing seal', damageType: 'stun', severity: [40, 65], avoidSkill: 'mechanicalEngineering' },
      { label: 'Sample store still holds a pressurised canister', damageType: 'burn', severity: [35, 58], avoidSkill: 'explosives' },
      { label: 'Ice-slick ramp down to the core bay', damageType: 'blunt', severity: [22, 42], avoidSkill: 'exploration' },
    ],
    encounterIds: ['enc_claim_jumpers', 'enc_hull_vermin', 'enc_lone_gunman', 'enc_rogue_drone'],
    nodeFlavor: {
      entrance: [
        'Only the mast and the top of the airlock show above the drift.',
        'A dug-out ramp leads down to a door somebody else has already opened once.',
        'The outpost marker beacon is still standing, still dark, still pointing the right way.',
      ],
      corridor: [
        'A single spine corridor with rooms budded off it, the whole thing barely two metres wide.',
        'Dust has found its way in through every seam and lies in soft grey drifts.',
        'The floor slopes as the module has settled. Everything loose has gone to one end.',
      ],
      office: [
        'The survey room: charts pinned edge to edge, all of them hand-annotated.',
        'A desk with a terminal, a lamp, and a mug that froze solid and stayed that way.',
        'Assay results filed by grid square, in a hand that got steadily less careful.',
      ],
      storage: [
        'The core library: hundreds of metres of rock in numbered trays.',
        'Field kit racked and ready for a season that was cancelled by message.',
        'A supply bay with a season of rations, and rations keep well out here.',
      ],
      habitation: [
        'Two bunks, a heater, and a shelf of books that were read many times.',
        'The galley: a hob, a tap, and a wall of tally marks beside the door.',
        'Somebody slept here long after they stopped being paid to.',
      ],
      hiddenBranch: [
        'A buried annexe, its connecting tube crushed but crawlable.',
        'A sample cellar cut into the regolith below the floor plate.',
        'Under a tarp outside, a second module nobody logged as part of the site.',
      ],
      hazardZone: [
        'The collapsed end of the module, open to the sky and the cold.',
        'A pressure section that never lost pressure and now holds it against a bad seal.',
        'Trenched ground around the drill pad, drifted level and hiding every edge.',
      ],
      exit: [
        'Up the dug ramp, hauling the core trays two at a time.',
        'Out through the emergency hatch on the high side, which is now the only side.',
        'Along the buried tube to the drill pad, and out into the open from there.',
      ],
    },
    nameAdjectives: [
      'Buried', 'Drifted-Over', 'Forgotten', 'Lost', 'Cold', 'Half-Sunk',
      'Unmarked', 'Unlisted', 'Sealed', 'Old',
    ],
  },
];

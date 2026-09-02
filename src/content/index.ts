/**
 * Content registry. Every authored data set is aggregated here so the engine
 * has exactly one place to look and content files stay pure data.
 */

import type { EventScope, GameEventDef } from '../engine/types';
import type { EncounterTemplate, SiteArchetype } from './contentTypes';

import { HOMEWORLD_EVENTS } from './events/homeworld';
import { MOON_EVENTS } from './events/moon';
import { TRAVEL_EVENTS } from './events/travel';
import { STATION_EVENTS } from './events/station';
import { PLANET_EVENTS } from './events/planet';
import { SOCIAL_EVENTS } from './events/social';
import { TECHNICAL_EVENTS } from './events/technical';
import { MEDICAL_EVENTS } from './events/medical';
import { HOSTILE_EVENTS } from './events/hostile';
import { ENCOUNTER_TEMPLATES } from './encounters';
import { SITE_ARCHETYPES as HOME_SITE_ARCHETYPES } from './siteArchetypes';
import { OUTER_SITE_ARCHETYPES } from './siteArchetypes.outer';

/** Homeworld and moon sites, plus the station / planet / deep-space set. */
const SITE_ARCHETYPES: SiteArchetype[] = [...HOME_SITE_ARCHETYPES, ...OUTER_SITE_ARCHETYPES];

export { ITEM_DEFS } from './items';
export { TRAIT_DEFS } from './traits';
export { NAME_TABLES, LIFE_PATHS } from './lifepaths';
export { ENCOUNTER_TEMPLATES, SITE_ARCHETYPES };

export const ALL_EVENTS: GameEventDef[] = [
  ...HOMEWORLD_EVENTS,
  ...MOON_EVENTS,
  ...TRAVEL_EVENTS,
  ...STATION_EVENTS,
  ...PLANET_EVENTS,
  ...SOCIAL_EVENTS,
  ...TECHNICAL_EVENTS,
  ...MEDICAL_EVENTS,
  ...HOSTILE_EVENTS,
];

/** Events indexed by scope so selection never scans the whole table. */
export const EVENTS_BY_SCOPE: Record<EventScope, GameEventDef[]> = (() => {
  const index = {
    homeworld: [],
    moon: [],
    travel: [],
    station: [],
    planet: [],
    social: [],
    technical: [],
    medical: [],
    hostile: [],
    scavenge: [],
  } as Record<EventScope, GameEventDef[]>;

  for (const event of ALL_EVENTS) {
    for (const scope of event.scope) {
      if (index[scope]) index[scope].push(event);
    }
  }
  return index;
})();

export const EVENT_INDEX: Map<string, GameEventDef> = new Map(
  ALL_EVENTS.map((event) => [event.id, event]),
);

export const ENCOUNTER_INDEX: Map<string, EncounterTemplate> = new Map(
  ENCOUNTER_TEMPLATES.map((template) => [template.id, template]),
);

export const SITE_ARCHETYPE_INDEX: Map<string, SiteArchetype> = new Map(
  SITE_ARCHETYPES.map((archetype) => [archetype.id, archetype]),
);

/** Content counts, surfaced in the debug inspector. */
export function contentSummary(): Record<string, number> {
  return {
    events: ALL_EVENTS.length,
    homeworldEvents: HOMEWORLD_EVENTS.length,
    moonEvents: MOON_EVENTS.length,
    travelEvents: TRAVEL_EVENTS.length,
    stationEvents: STATION_EVENTS.length,
    planetEvents: PLANET_EVENTS.length,
    socialEvents: SOCIAL_EVENTS.length,
    technicalEvents: TECHNICAL_EVENTS.length,
    medicalEvents: MEDICAL_EVENTS.length,
    hostileEvents: HOSTILE_EVENTS.length,
    encounters: ENCOUNTER_TEMPLATES.length,
    siteArchetypes: SITE_ARCHETYPES.length,
  };
}

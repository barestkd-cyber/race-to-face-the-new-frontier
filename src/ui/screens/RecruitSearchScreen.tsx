/**
 * Where to look for crew.
 *
 * The venue decides what kind of person turns up, not whether anyone does. Time
 * is spent either way.
 */

import { RECRUIT } from '../../engine/tuning';
import { RECRUIT_VENUE_LABELS, type RecruitVenue } from '../../engine/types';
import { Btn, Chip, Empty, Panel, Row } from '../components';
import { store, useGame } from '../useStore';

const VENUE_NOTES: Record<RecruitVenue, string> = {
  workerCamp:
    'Labourers and machine hands, already used to long shifts and being told where to stand.',
  bar: 'Anyone at all. Off-shift crew, drifters, and people with a reason to be somewhere else.',
  clinic: 'Medics and orderlies, and some of the people they could not put back together.',
  refugeeArea:
    'People who have already lost the place they came from. Often willing, rarely equipped.',
  securityOffice: 'Guards and former enforcement. Weapons training, and the habits that come with it.',
  freightYard: 'Loaders, dispatchers and short-haul pilots. Ships, cargo, and the paperwork on both.',
  mine: 'Cutters, riggers and survey hands. Strong, and used to working in the dark.',
  university: 'Researchers, technicians and students. Trained, though not always in the field.',
  shelter: 'Whoever has nowhere else to sleep tonight. Mixed, and easy to get talking.',
};

export function RecruitSearchScreen() {
  const state = useGame();

  if (!state) {
    return <Empty>No run is loaded.</Empty>;
  }

  const location = state.currentLocationId ? state.locations[state.currentLocationId] : undefined;

  if (!location) {
    return (
      <Panel title="Asking around">
        <Empty>You are underway. There is nobody to ask out here.</Empty>
      </Panel>
    );
  }

  const venues = location.recruitVenues;
  const waiting = state.recruitment?.candidates.filter((c) => !c.joined && !c.refused) ?? [];
  const [lowHours, highHours] = RECRUIT.searchHours;

  return (
    <div className="stack">
      <Panel title="Look for crew" aside={location.name}>
        <p className="prose">
          Pick somewhere to spend a few hours asking, captain. Where you look decides what kind of
          person you meet.
        </p>
        <p className="prose prose--dim">
          Searching costs {lowHours} to {highHours} hours whether or not you find anybody. Finding
          someone is not the same as them signing on — they still have to want to go, and they will
          want something in return. Who is around changes as time passes, so a place that had nobody
          this morning may have somebody tomorrow.
        </p>
      </Panel>

      {waiting.length > 0 && (
        <Panel title="Already waiting">
          <p className="prose prose--dim">
            {waiting.length === 1
              ? 'One person is still waiting on an answer from you.'
              : `${waiting.length} people are still waiting on an answer from you.`}
          </p>
          <Btn block tone="primary" onClick={() => store.setScreen('recruitCandidate')}>
            Back to them
          </Btn>
        </Panel>
      )}

      <Panel title="Venues" aside={`${venues.length} here`}>
        {venues.length === 0 ? (
          <Empty>
            Nowhere here gathers people in numbers. You will have to hire somewhere with more of a
            population.
          </Empty>
        ) : (
          <div className="rows">
            {venues.map((venue) => (
              <Row
                key={venue}
                onClick={() => store.searchRecruits(venue)}
                title={RECRUIT_VENUE_LABELS[venue]}
                sub={VENUE_NOTES[venue]}
                right={<Chip tone="amber">{`${lowHours}–${highHours}h`}</Chip>}
              />
            ))}
          </div>
        )}
      </Panel>

      <Btn block tone="ghost" onClick={() => store.setScreen(state.currentPlaceId ? 'place' : 'cockpit')}>
        Back
      </Btn>
    </div>
  );
}

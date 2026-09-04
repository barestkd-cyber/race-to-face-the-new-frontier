/**
 * The people you found, and whether any of them will come.
 *
 * The assessment shown here is a read, not a fact. At low Evaluation it stays
 * deliberately vague, and the screen does not dress it up as anything sharper.
 */

import { canMeetTerms, availableBeats } from '../../engine/recruit';
import { safeCrewCapacity } from '../../engine/ship';
import { crewMembers } from '../../engine/sim';
import { RECRUIT } from '../../engine/tuning';
import {
  ASSESSMENT_LABELS,
  CHECK_OUTCOME_LABELS,
  RECRUIT_VENUE_LABELS,
  SKILL_KEYS,
  SKILL_LABELS,
  type CheckOutcome,
  type GameState,
  type RecruitCandidate,
} from '../../engine/types';
import { Btn, Chip, Empty, Fold, KV, Meter, Panel, Row, StatLine } from '../components';
import { Portrait } from '../Portrait';
import { store, useGame } from '../useStore';

const OUTCOME_ORDER: CheckOutcome[] = [
  'exceptional',
  'success',
  'partial',
  'failure',
  'criticalFailure',
];

function termsShortfall(state: GameState, candidate: RecruitCandidate): string | null {
  const terms = candidate.terms;
  if (terms.credits && state.resources.credits < terms.credits) {
    return `They want ${terms.credits} credits and you have ${Math.floor(state.resources.credits)}.`;
  }
  if (terms.food && state.resources.food < terms.food) {
    return `They want ${terms.food} days of food and you have ${Math.floor(state.resources.food)}.`;
  }
  if (terms.medicine && state.resources.medicine < terms.medicine) {
    return `They want ${terms.medicine} medicine and you have ${Math.floor(state.resources.medicine)}.`;
  }
  return null;
}

export function RecruitCandidateScreen() {
  const state = useGame();

  if (!state) {
    return <Empty>No run is loaded.</Empty>;
  }

  const recruitment = state.recruitment;

  if (!recruitment) {
    return (
      <Panel title="Recruiting">
        <Empty>You have not asked around here yet.</Empty>
        <Btn block tone="primary" onClick={() => store.setScreen('recruitSearch')}>
          Go and look
        </Btn>
      </Panel>
    );
  }

  const candidates = recruitment.candidates;
  const crew = crewMembers(state);
  const capacity = state.ship ? safeCrewCapacity(state.ship) : 0;
  const overCapacity = crew.length >= capacity;

  if (candidates.length === 0) {
    return (
      <div className="stack">
        <Panel title="Nobody" aside={RECRUIT_VENUE_LABELS[recruitment.venue]}>
          <p className="prose">
            Nobody there was worth the conversation, captain. That happens. The people who might
            come with you are not always in the room when you walk in.
          </p>
          <p className="prose prose--dim">
            You can try another venue, or come back later once the place has turned over.
          </p>
        </Panel>
        <Btn block tone="primary" onClick={() => store.setScreen('recruitSearch')}>
          Look somewhere else
        </Btn>
        <Btn block tone="ghost" onClick={() => store.closeRecruiting()}>
          Give it up for now
        </Btn>
      </div>
    );
  }

  const index = recruitment.selectedIndex;
  const candidate = index !== null ? candidates[index] : undefined;

  if (!candidate) {
    return (
      <div className="stack">
        <Panel title="Worth talking to" aside={`${candidates.length} found`}>
          <p className="prose prose--dim">
            Pick someone to talk to. Nothing is settled until you make an offer and they take it.
          </p>
          <div className="rows">
            {candidates.map((entry, i) => (
              <Row
                key={entry.character.id}
                onClick={() => store.selectCandidate(i)}
                left={<Portrait seed={entry.character.portraitSeed} />}
                title={`${entry.character.name} ${entry.character.surname}`}
                sub={
                  <span style={{ textTransform: 'capitalize' }}>
                    {entry.character.role} · {entry.character.age}
                  </span>
                }
                right={
                  entry.joined ? (
                    <Chip tone="green">Aboard</Chip>
                  ) : entry.refused ? (
                    <Chip tone="red">Refused</Chip>
                  ) : (
                    <Chip>{ASSESSMENT_LABELS[entry.assessment.quality]}</Chip>
                  )
                }
              />
            ))}
          </div>
        </Panel>
        {overCapacity && (
          <Panel title="Capacity">
            <p className="prose">
              {crew.length} aboard against a safe capacity of {capacity}. Anyone else you sign on
              will be sleeping somewhere they should not, and the whole crew will carry the stress
              of it.
            </p>
          </Panel>
        )}
        <Btn block tone="ghost" onClick={() => store.closeRecruiting()}>
          Stop recruiting
        </Btn>
      </div>
    );
  }

  const person = candidate.character;
  const assessment = candidate.assessment;
  const history = person.lifeHistory;
  const beats = availableBeats(candidate);
  const settled = candidate.joined || candidate.refused;
  const persuadeLeft = Math.max(0, RECRUIT.maxPersuadeAttempts - candidate.persuadeAttempts);
  const negotiateLeft = Math.max(0, RECRUIT.maxNegotiateAttempts - candidate.negotiateAttempts);
  const shortfall = termsShortfall(state, candidate);
  const canPay = canMeetTerms(state, candidate);

  const topSkills = SKILL_KEYS.map((key) => ({ key, value: person.skills[key] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return (
    <div className="stack">
      <Btn block tone="ghost" onClick={() => store.selectCandidate(null)}>
        Back to everyone
      </Btn>

      <Panel title={`${person.name} ${person.surname}`} aside={RECRUIT_VENUE_LABELS[recruitment.venue]}>
        <div className="split" style={{ alignItems: 'flex-start' }}>
          <Portrait seed={person.portraitSeed} size="lg" />
          <div className="row__main">
            <KV
              items={[
                ['Age', person.age],
                ['Role', <span style={{ textTransform: 'capitalize' }}>{person.role}</span>],
                ['Pronouns', person.pronouns],
              ]}
            />
          </div>
        </div>
        {candidate.joined && (
          <p className="prose green">They have signed on. Their berth is yours to fill now.</p>
        )}
        {candidate.refused && (
          <p className="prose red">
            They refused. That is final — they will not hear another word on it from you.
          </p>
        )}
      </Panel>

      <Panel title="Where they come from">
        <KV
          items={[
            ['Origin', history.origin],
            ['Upbringing', history.upbringing],
            ['Work', history.career],
          ]}
        />
        <div className="divider" />
        <p className="prose">{history.formativeEvent}</p>
        {history.notes.map((note, i) => (
          <p key={i} className="prose prose--dim">
            {note}
          </p>
        ))}
      </Panel>

      <Panel title="Your read" aside={ASSESSMENT_LABELS[assessment.quality]}>
        <p className="prose">{assessment.text}</p>
        {(assessment.quality === 'good' || assessment.quality === 'excellent') &&
          assessment.estimateLow !== undefined &&
          assessment.estimateHigh !== undefined && (
            <p className="prose prose--dim">
              Odds they come with you:{' '}
              {assessment.estimateLow === assessment.estimateHigh
                ? `${assessment.estimateLow}%`
                : `${assessment.estimateLow}–${assessment.estimateHigh}%`}
              .
            </p>
          )}
        {assessment.outcomeOdds && (
          <KV
            items={OUTCOME_ORDER.map((outcome) => [
              CHECK_OUTCOME_LABELS[outcome],
              `${Math.round((assessment.outcomeOdds?.[outcome] ?? 0) * 100)}%`,
            ])}
          />
        )}
        {assessment.distortion && (
          <p className="prose amber">Something is bending this read: {assessment.distortion}</p>
        )}
        <p className="tiny faint">
          {assessment.quality === 'veryPoor' || assessment.quality === 'poor'
            ? 'Nobody aboard can read people better than that. Treat it as a feeling, not a number.'
            : assessment.quality === 'moderate'
              ? 'Partial read. Close enough to plan around, not close enough to bet the crew on.'
              : 'A good read, from someone who knows what they are looking at.'}
        </p>
      </Panel>

      <Panel title="Their terms" aside={candidate.terms.met ? 'met' : 'open'}>
        <p className="prose">{candidate.terms.label}</p>
        {candidate.terms.met ? (
          <p className="prose green">You have covered what they asked for.</p>
        ) : shortfall ? (
          <p className="prose red">{shortfall}</p>
        ) : (
          <p className="prose prose--dim">
            You can cover this. Meeting terms before you make the offer moves them a long way.
          </p>
        )}
      </Panel>

      <Panel title="What they can do">
        {topSkills.map((entry) => (
          <StatLine
            key={entry.key}
            name={SKILL_LABELS[entry.key]}
            value={entry.value}
            right={
              <span style={{ width: 56, display: 'inline-block' }}>
                <Meter value={entry.value} max={100} />
              </span>
            }
          />
        ))}
        <p className="tiny faint">
          Their five strongest skills. Everything else they have is weaker than these.
          {candidate.character.specSlots.length > 0 &&
            ` ${candidate.character.specSlots.length} devotion mark${
              candidate.character.specSlots.length === 1 ? '' : 's'
            } still unplaced — room to grow, under your direction.`}
        </p>
      </Panel>

      <Fold title="Talk to them" defaultOpen={!candidate.talkedTo}>
        <p className="tiny">
          Every beat costs about half an hour and can move them either way. Talking is also how you
          notice what kind of person they are.
        </p>
        {beats.length === 0 ? (
          <Empty>You have said everything there is to say.</Empty>
        ) : (
          <div className="btn-col">
            {beats.map((beat) => (
              <Btn
                key={beat}
                block
                disabled={settled}
                onClick={() => store.talkToCandidate(candidate, beat)}
              >
                {beat}
              </Btn>
            ))}
          </div>
        )}
      </Fold>

      <Panel title="Persuade and bargain">
        <div className="btn-col">
          <Btn
            block
            disabled={settled || persuadeLeft <= 0}
            onClick={() => store.persuadeCandidate(candidate)}
            sub={
              persuadeLeft > 0
                ? `${persuadeLeft} of ${RECRUIT.maxPersuadeAttempts} attempts left`
                : 'They have heard enough from you'
            }
          >
            Make the case
          </Btn>
          <Btn
            block
            disabled={settled || negotiateLeft <= 0}
            onClick={() => store.negotiateCandidate(candidate)}
            sub={
              negotiateLeft > 0
                ? `${negotiateLeft} of ${RECRUIT.maxNegotiateAttempts} attempts left`
                : 'They will not move on terms again'
            }
          >
            Talk down their terms
          </Btn>
          <Btn
            block
            tone="primary"
            disabled={settled || candidate.terms.met || !canPay}
            onClick={() => store.payCandidateTerms(candidate)}
            sub={
              candidate.terms.met
                ? 'Already settled'
                : !canPay
                  ? (shortfall ?? 'You cannot cover what they are asking')
                  : candidate.terms.label
            }
          >
            Meet their terms
          </Btn>
          <Btn
            block
            tone="go"
            disabled={settled}
            onClick={() => store.offerCandidateBerth(candidate)}
            sub={
              overCapacity
                ? `Warning: ${crew.length} aboard against capacity ${capacity}`
                : 'They answer once, and a refusal is final'
            }
          >
            Offer them a berth
          </Btn>
        </div>
        <p className="tiny faint" style={{ marginTop: 6 }}>
          A hard refusal cannot be walked back. If you are not confident, spend the time first.
        </p>
      </Panel>

      {overCapacity && (
        <Panel title="Capacity">
          <p className="prose">
            {crew.length} aboard against a safe capacity of {capacity}. You can still take them, but
            everyone will feel the crowding.
          </p>
        </Panel>
      )}

      <Btn block tone="ghost" onClick={() => store.closeRecruiting()}>
        Stop recruiting
      </Btn>
    </div>
  );
}

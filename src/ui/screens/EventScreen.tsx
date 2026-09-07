/**
 * Event decisions. Meaningful events stop the player here; routine ones never
 * reach this screen at all.
 */

import { assessCheck, bestAssessor } from '../../engine/assess';
import { frictionFor, refusalFor } from '../../engine/personality';
import { tagsForChoice } from '../../engine/tags';
import { availableChoices, applyTokens } from '../../engine/eventEngine';
import { CHECK_OUTCOME_LABELS, SKILL_LABELS } from '../../engine/types';
import { activeParty } from '../../engine/sim';
import { selectParticipants } from '../../engine/check';
import { Btn, Chip, Empty, Panel } from '../components';
import { store, useGame } from '../useStore';

export function EventScreen() {
  const state = useGame();
  if (!state) return null;

  const event = state.activeEvent;
  if (!event) {
    return (
      <Panel title="Event">
        <Empty>Nothing is happening.</Empty>
      </Panel>
    );
  }

  const body = applyTokens(event.def.body, event.tokens);
  const party = activeParty(state);
  const assessor = bestAssessor(party);

  // Resolved: show the outcome and let the player move on.
  if (event.resolution) {
    const check = event.resolution.check;
    return (
      <div className="stack">
        <Panel title={event.def.title} aside="Resolved">
          <p className="prose">{event.resolution.text}</p>
        </Panel>

        {check && (
          <Panel title="Check" aside={CHECK_OUTCOME_LABELS[check.outcome]}>
            <div className="split">
              <span className="tiny dim">
                {SKILL_LABELS[check.skill]} · rolled {check.roll} against {check.finalTarget}
              </span>
              <Chip
                tone={
                  check.outcome === 'exceptional' || check.outcome === 'success'
                    ? 'green'
                    : check.outcome === 'partial'
                      ? 'amber'
                      : 'red'
                }
              >
                {CHECK_OUTCOME_LABELS[check.outcome]}
              </Chip>
            </div>
            {check.protectedFromCritical && (
              <p className="tiny faint" style={{ marginTop: 4, marginBottom: 0 }}>
                A novice fumbling an ordinary task fails; it does not explode.
              </p>
            )}
          </Panel>
        )}

        {event.resolution.effectSummary.length > 0 && (
          <Panel title="Consequences">
            <ul className="tiny" style={{ margin: 0, paddingLeft: 16 }}>
              {event.resolution.effectSummary.map((line, index) => (
                <li key={index}>{line}</li>
              ))}
            </ul>
          </Panel>
        )}

        <Btn block tone="primary" onClick={() => store.closeEvent()}>
          Continue
        </Btn>
      </div>
    );
  }

  const choices = availableChoices(state, event.def);
  const captain = state.characters[state.captainId];

  return (
    <div className="stack">
      <Panel title={event.def.title} aside={event.source}>
        <p className="prose">{body}</p>
      </Panel>

      <Panel title="What Do You Do">
        <div className="stack stack--tight">
          {choices.map(({ choice, available, reason }) => {
            // Show the crew's honest read on the odds, which is vague when
            // nobody aboard can judge it properly.
            let assessment = null;
            if (choice.check && available && party.length > 0) {
              const participantIds = selectParticipants(
                party,
                choice.check.skill,
                choice.check.participation,
              );
              if (participantIds.length > 0) {
                assessment = assessCheck(
                  {
                    skill: choice.check.skill,
                    attributes: choice.check.attributes,
                    secondarySkill: choice.check.secondarySkill,
                    modifiers: choice.check.modifiers,
                    criticalRisk: choice.check.criticalRisk,
                    participantIds,
                    leaderId: participantIds.length >= 2 ? state.captainId : undefined,
                    label: choice.label,
                  },
                  { characters: state.characters, morale: state.morale, hours: state.hours },
                  { assessor, relevantSkill: choice.check.skill },
                );
              }
            }

            // What this choice will cost the person making it. Personality
            // never picks for the player — it says what the captain will carry
            // afterwards, and only when that is worth saying.
            const friction = captain
              ? frictionFor(captain, tagsForChoice(choice), { crisis: Boolean(state.combat) })
              : null;
            const refusal = captain
              ? refusalFor(captain, tagsForChoice(choice))
              : { refused: false };

            return (
              <div key={choice.id} className="panel panel--inset" style={{ marginBottom: 0 }}>
                <div className="panel__body panel__body--tight">
                  <Btn
                    block
                    tone={available ? 'default' : 'ghost'}
                    disabled={!available || refusal.refused}
                    onClick={() => store.chooseEventOption(choice.id)}
                    sub={
                      !available
                        ? reason
                        : choice.hint
                          ? applyTokens(choice.hint, event.tokens)
                          : undefined
                    }
                  >
                    {applyTokens(choice.label, event.tokens)}
                  </Btn>

                  {refusal.refused ? (
                    <p className="tiny red" style={{ marginTop: 6, marginBottom: 0 }}>
                      {refusal.reason}
                    </p>
                  ) : friction?.material ? (
                    <p
                      className={friction.aligned ? 'tiny green' : 'tiny amber'}
                      style={{ marginTop: 6, marginBottom: 0 }}
                    >
                      {friction.note}
                    </p>
                  ) : null}

                  <div className="chips" style={{ marginTop: 6 }}>
                    {choice.check && (
                      <Chip tone="cyan">
                        {SKILL_LABELS[choice.check.skill]}
                        {choice.check.participation !== 'individual'
                          ? ` · ${choice.check.participation}`
                          : ''}
                      </Chip>
                    )}
                    {choice.check?.criticalRisk && <Chip tone="red">critical risk</Chip>}
                    {choice.effects?.hours ? <Chip>{choice.effects.hours}h</Chip> : null}
                    {assessment && <Chip tone="amber">{assessment.text}</Chip>}
                  </div>

                  {state.debug.enabled && assessment && (
                    <p className="tiny faint" style={{ marginTop: 4, marginBottom: 0 }}>
                      debug — true success {Math.round(assessment.trueSuccessChance * 100)}%
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

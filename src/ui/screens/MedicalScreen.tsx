/**
 * Medical.
 *
 * Every untreated wound aboard, what it would take to close it, and who would
 * be holding the instruments. The engine decides whether a treatment works;
 * this screen only puts the choice in front of you.
 */

import { Btn, Chip, Duration, Empty, Panel, Row } from '../components';
import { Portrait } from '../Portrait';
import { store, useGame } from '../useStore';
import { medicalFacilityLabel, treatmentOptions } from '../../engine/actions';
import { bestAt } from '../../engine/check';
import { crewMembers } from '../../engine/sim';
import { WOUNDS } from '../../engine/tuning';
import { SEVERITY_LABELS } from '../../engine/wounds';
import {
  BODY_REGION_LABELS,
  SKILL_LABELS,
  type Character,
  type WoundSeverity,
} from '../../engine/types';

const SEVERITY_TONE: Record<WoundSeverity, 'amber' | 'red' | undefined> = {
  minor: undefined,
  serious: 'amber',
  critical: 'red',
  mortal: 'red',
};

export function MedicalScreen() {
  const state = useGame();

  if (!state) {
    return <Empty>No run is loaded, captain. Start or load a game first.</Empty>;
  }

  const crew = crewMembers(state);
  const options = treatmentOptions(state);
  const medicine = Math.round(state.resources.medicine);

  return (
    <div className="stack">
      <Panel title="Sickbay" aside={`${options.length} open`}>
        <div className="split">
          <span className="label">Medicine in stock</span>
          <span className={medicine <= 1 ? 'value readout red' : 'value readout'}>{medicine}</span>
        </div>
        <p className="prose" style={{ marginTop: 8 }}>
          {medicalFacilityLabel(state)}
        </p>
        <p className="prose prose--dim" style={{ marginTop: 8 }}>
          First Aid stabilises a wound and gets the bleeding under control. Surgery is
          for critical and mortal trauma and nothing else will do. A wound left alone
          closes slowly and badly, and it can turn septic while it waits.
        </p>
      </Panel>

      <Panel title="Untreated" aside={`${options.length}`}>
        {options.length === 0 ? (
          <Empty>Nobody aboard has an untreated wound. The crew is holding together.</Empty>
        ) : (
          <div className="stack stack--tight">
            {options.map((option) => {
              const patient: Character | undefined = state.characters[option.characterId];
              const wound = patient?.wounds.find((w) => w.id === option.woundId);
              if (!patient || !wound) return null;

              // The engine will not let someone operate on themselves unless
              // there is nobody else left aboard.
              const performer = bestAt(
                crew.filter((c) => c.id !== patient.id || crew.length === 1),
                option.skill,
              );
              const septic = wound.infection >= WOUNDS.infectionSepticAt;

              return (
                <div key={`${option.characterId}:${option.woundId}`} className="panel panel--inset panel--flush">
                  <div className="panel__body panel__body--tight">
                    <div className="split" style={{ alignItems: 'flex-start' }}>
                      <Portrait seed={patient.portraitSeed} dead={!patient.alive} />
                      <span className="row__main">
                        <span className="row__title">
                          {patient.name} {patient.surname}
                        </span>
                        <span className="row__sub">
                          {BODY_REGION_LABELS[wound.region]} — {wound.label}
                        </span>
                      </span>
                    </div>

                    <div className="chips" style={{ marginTop: 6 }}>
                      <Chip tone={SEVERITY_TONE[wound.severity]}>
                        {SEVERITY_LABELS[wound.severity]}
                      </Chip>
                      <Chip tone={option.needsSurgery ? 'red' : 'cyan'}>
                        {option.needsSurgery ? 'Surgery' : 'First Aid'}
                      </Chip>
                      <Chip>{option.estimatedMedicine} medicine</Chip>
                      {wound.bleeding > 0 && (
                        <Chip tone="red">Bleeding {wound.bleeding.toFixed(2)}/h</Chip>
                      )}
                      {septic && <Chip tone="red">Septic</Chip>}
                    </div>

                    <div className="rows" style={{ marginTop: 6 }}>
                      <Row
                        left={
                          performer ? (
                            <Portrait seed={performer.portraitSeed} size="sm" />
                          ) : undefined
                        }
                        title={
                          performer ? (
                            <span>
                              {performer.name} {performer.surname}
                            </span>
                          ) : (
                            <span className="faint">Nobody available</span>
                          )
                        }
                        sub={
                          performer
                            ? `${SKILL_LABELS[option.skill]} ${performer.skills[option.skill]}`
                            : 'There is no one aboard who can hold the instruments.'
                        }
                      />
                    </div>

                    {wound.severity === 'mortal' && wound.lethalInHours !== undefined && (
                      <p className="prose" style={{ marginTop: 6 }}>
                        <span className="red">Mortal.</span> Without surgery this kills{' '}
                        {patient.name} in <Duration hours={Math.max(0, wound.lethalInHours)} />.
                      </p>
                    )}
                    {septic && (
                      <p className="prose" style={{ marginTop: 6 }}>
                        <span className="red">Septic.</span> Infection is at{' '}
                        {Math.round(wound.infection)} per cent and it will keep taking health
                        until the wound is properly closed.
                      </p>
                    )}
                    {!option.canAttempt && option.reason && (
                      <p className="tiny" style={{ marginTop: 6 }}>
                        <span className="amber">{option.reason}</span>
                      </p>
                    )}

                    <div className="btn-row" style={{ marginTop: 8 }}>
                      <Btn
                        block
                        tone={option.needsSurgery ? 'danger' : 'go'}
                        disabled={!option.canAttempt}
                        title={option.reason}
                        onClick={() => store.treat(option)}
                        sub={
                          option.canAttempt
                            ? `${option.needsSurgery ? 'Surgery' : 'First aid'} · about ${option.estimatedMedicine} medicine`
                            : option.reason
                        }
                      >
                        Treat
                      </Btn>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}

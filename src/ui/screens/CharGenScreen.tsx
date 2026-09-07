/**
 * Meeting your captain, and then finishing them.
 *
 * Two screens, because they answer two different questions and were being
 * asked at once. The first is "who is this person?" — a face, a life, and the
 * temperament they already have. The second is "where do the last few points
 * go?" — the only bookkeeping in the flow, kept to one compact screen.
 *
 * The draft is regenerated wholesale on every reroll, so the allocation the
 * player is making lives in local state until it is written back onto a copy of
 * the character at commit time. Nothing here decides anything the engine owns —
 * it only spends the points the draft already reserved.
 */

import { useEffect, useMemo, useState } from 'react';
import { Btn, Chip, Empty, Fold, Panel, StatLine } from '../components';
import { Portrait } from '../Portrait';
import { store, useDraft } from '../useStore';
import { autoSpendDraft, deriveMaxHealth, sexLabel } from '../../engine/character';
import { skillCap } from '../../engine/check';
import { ATTRIBUTE_INFO, SKILL_INFO } from '../../engine/glossary';
import type { NewRunDraft } from '../../engine/newGame';
import { Rng } from '../../engine/rng';
import { skillCapLabel } from '../../engine/progression';
import { temperamentOf } from '../../engine/personality';
import {
  lifeEventsOf,
  POLARITY_LABELS,
  SEVERITY_LABELS,
} from '../../engine/lifeStory';
import { ATTRIBUTE_GEN } from '../../engine/tuning';
import {
  ATTRIBUTE_KEYS,
  ATTRIBUTE_LABELS,
  FACETS,
  SKILL_GROUPS,
  SKILL_KEYS,
  SKILL_LABELS,
  type AttributeKey,
  type Attributes,
  type Character,
  type FacetKey,
  type SkillGroupKey,
  type SkillKey,
  type SkillMap,
} from '../../engine/types';

const ATTRIBUTE_MAX = ATTRIBUTE_GEN.maxPerAttribute;

/** Good, bad, or both — said as a colour, not as a score. */
const POLARITY_TONE: Record<string, 'green' | 'red' | 'amber'> = {
  positive: 'green',
  negative: 'red',
  mixed: 'amber',
};

export function CharGenScreen() {
  const draft = useDraft();
  // The reroll counter lives out here so remounting the editor cannot reset it
  // and hand the same alternate captain back twice.
  const [rerolls, setRerolls] = useState(0);

  if (!draft) {
    return (
      <Panel title="Character Generation">
        <Empty>No run is being prepared. Start one from the title screen.</Empty>
      </Panel>
    );
  }

  const reroll = () => {
    const attempt = rerolls + 1;
    setRerolls(attempt);
    store.rerollDraft(attempt);
  };

  // Remounting on a reroll keeps the working copy from showing the previous
  // captain's numbers for a frame.
  return <CharGen key={draft.protagonist.character.id} draft={draft} onReroll={reroll} />;
}

function CharGen({ draft, onReroll }: { draft: NewRunDraft; onReroll: () => void }) {
  const { character, attributePoints, skillPoints, baseAttributes, baseSkills } = draft.protagonist;

  const [step, setStep] = useState<'who' | 'points'>('who');
  const [attributes, setAttributes] = useState<Attributes>(() => ({ ...character.attributes }));
  const [skills, setSkills] = useState<SkillMap>(() => ({ ...character.skills }));

  // A new draft identity means a new person; the working copy starts over, and
  // so does the flow — a reroll is a new introduction, not a new stat sheet.
  useEffect(() => {
    setAttributes({ ...character.attributes });
    setSkills({ ...character.skills });
    setStep('who');
  }, [character.id]);

  const attrSpent = useMemo(
    () => ATTRIBUTE_KEYS.reduce((sum, key) => sum + (attributes[key] - baseAttributes[key]), 0),
    [attributes, baseAttributes],
  );
  const skillSpent = useMemo(
    () => SKILL_KEYS.reduce((sum, key) => sum + (skills[key] - baseSkills[key]), 0),
    [skills, baseSkills],
  );

  const attrRemaining = attributePoints - attrSpent;
  const skillRemaining = skillPoints - skillSpent;
  const unspent = attrRemaining > 0 || skillRemaining > 0;

  const bumpAttribute = (key: AttributeKey, delta: number) => {
    setAttributes((previous) => {
      const next = previous[key] + delta;
      if (delta > 0 && (attrRemaining <= 0 || next > ATTRIBUTE_MAX)) return previous;
      if (delta < 0 && next < baseAttributes[key]) return previous;
      const updated: Attributes = { ...previous };
      updated[key] = next;
      return updated;
    });
  };

  const bumpSkill = (key: SkillKey, delta: number) => {
    setSkills((previous) => {
      const next = previous[key] + delta;
      if (delta > 0 && (skillRemaining <= 0 || next > skillCap(character, key))) return previous;
      if (delta < 0 && next < baseSkills[key]) return previous;
      const updated: SkillMap = { ...previous };
      updated[key] = next;
      return updated;
    });
  };

  /**
   * Let the background finish the sheet. Same caps and rules as doing it by
   * hand — this is a real allocation, not a skip button, and every number it
   * writes can still be adjusted below before committing.
   */
  const autoAllocate = () => {
    const working: typeof draft.protagonist = {
      ...draft.protagonist,
      character: {
        ...character,
        attributes: { ...attributes },
        skills: { ...skills },
      },
    };
    autoSpendDraft(working, new Rng(`${draft.seed}:autospend`));
    setAttributes({ ...working.character.attributes });
    setSkills({ ...working.character.skills });
  };

  // One glossary line open at a time — tap a name to see what it means.
  const [infoKey, setInfoKey] = useState<string | null>(null);
  const toggleInfo = (key: string) => setInfoKey((cur) => (cur === key ? null : key));

  const takeCommand = () => {
    const committed: Character = {
      ...character,
      attributes: { ...attributes },
      skills: { ...skills },
    };
    committed.maxHealth = deriveMaxHealth(committed.attributes);
    committed.health = committed.maxHealth;
    store.commitDraft(committed);
  };

  if (step === 'who') {
    return (
      <CaptainIntro
        character={character}
        onContinue={() => setStep('points')}
        onReroll={onReroll}
      />
    );
  }

  return (
    <div className="stack">
      {/*
        One question on this screen: where do the last few points go? Health,
        attribute totals and backpack slots were on it because they existed,
        not because they helped answer that.
      */}
      <Panel title="Remaining Points" tight>
        <div className="grid2">
          <div>
            <span className="label">Attributes</span>
            <div className={attrRemaining > 0 ? 'value readout amber' : 'value readout green'}>
              {attrRemaining}
            </div>
          </div>
          <div>
            <span className="label">Skills</span>
            <div className={skillRemaining > 0 ? 'value readout amber' : 'value readout green'}>
              {skillRemaining}
            </div>
          </div>
        </div>
        <p className="prose prose--dim" style={{ marginTop: 8 }}>
          {unspent
            ? `${attrRemaining} attribute ${attrRemaining === 1 ? 'point' : 'points'} and ${skillRemaining} skill ${skillRemaining === 1 ? 'point' : 'points'} remain. Most of ${character.name} was dealt by the life you just read. These are yours to place.`
            : 'Everything is placed.'}
        </p>
        {unspent && (
          <div style={{ marginTop: 8 }}>
            <Btn
              block
              tone="go"
              onClick={autoAllocate}
              sub="Spends them the way this captain's history and strengths point"
            >
              Auto-Allocate
            </Btn>
            <p className="tiny faint" style={{ marginTop: 6, marginBottom: 0 }}>
              Or open Attributes or Skills below and place them yourself. Points not placed
              are not carried into the run.
            </p>
          </div>
        )}
      </Panel>

      <Fold title={`Attributes — ${attrRemaining} left`}>
        <p className="tiny faint">
          Nothing can be raised past {ATTRIBUTE_MAX}, and nothing can be pulled below what the
          roll gave them. Tap a name to see what it does.
        </p>
        <div className="divider" />
        <div className="stack allocrows">
          {(Object.keys(FACETS) as FacetKey[]).map((facet) => (
            <div key={facet} className="stack stack--tight">
              <span className="label">{FACETS[facet].label}</span>
              {FACETS[facet].attributes.map((key) => (
                <div key={key} className="allocrow">
                  <div
                    style={{ minWidth: 0, cursor: 'pointer' }}
                    onClick={() => toggleInfo(key)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') toggleInfo(key); }}
                  >
                    <StatLine
                      name={ATTRIBUTE_LABELS[key]}
                      value={attributes[key]}
                      max={ATTRIBUTE_MAX}
                    />
                  </div>
                  <div className="btn-row" style={{ flexWrap: 'nowrap' }}>
                    <Btn
                      onClick={() => bumpAttribute(key, -1)}
                      disabled={attributes[key] <= baseAttributes[key]}
                      title={`Lower ${ATTRIBUTE_LABELS[key]}`}
                    >
                      −
                    </Btn>
                    <Btn
                      onClick={() => bumpAttribute(key, 1)}
                      disabled={attrRemaining <= 0 || attributes[key] >= ATTRIBUTE_MAX}
                      title={`Raise ${ATTRIBUTE_LABELS[key]}`}
                    >
                      +
                    </Btn>
                  </div>
                  {infoKey === key && (
                    <span className="tiny cyan allocrow__info">{ATTRIBUTE_INFO[key]}</span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </Fold>

      <Fold title={`Skills — ${skillRemaining} left`}>
        <p className="tiny faint">
          Every skill has a ceiling set by potential, shown beside it as grade and cap.
          Knowledge specialization is deliberately empty: what this captain studies is
          decided in play, once a craft has been practised. Points spent cannot be taken
          back below the value the life history produced.
        </p>
        <div className="divider" />
        <div className="stack allocrows">
          {(Object.keys(SKILL_GROUPS) as SkillGroupKey[]).map((group) => (
            <div key={group} className="stack stack--tight">
              <span className="label">{SKILL_GROUPS[group].label}</span>
              {SKILL_GROUPS[group].skills.map((key) => {
                const cap = skillCap(character, key);
                return (
                  <div key={key} className="allocrow">
                    <div
                      style={{ minWidth: 0, cursor: 'pointer' }}
                      onClick={() => toggleInfo(key)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter') toggleInfo(key); }}
                    >
                      <StatLine name={SKILL_LABELS[key]} value={skills[key]} />
                      <span className="tiny faint">{skillCapLabel(character, key)}</span>
                    </div>
                    <div className="btn-row" style={{ flexWrap: 'nowrap' }}>
                      <Btn
                        onClick={() => bumpSkill(key, -1)}
                        disabled={skills[key] <= baseSkills[key]}
                        title={`Lower ${SKILL_LABELS[key]}`}
                      >
                        −
                      </Btn>
                      <Btn
                        onClick={() => bumpSkill(key, 1)}
                        disabled={skillRemaining <= 0 || skills[key] >= cap}
                        title={`Raise ${SKILL_LABELS[key]}`}
                      >
                        +
                      </Btn>
                    </div>
                    {infoKey === key && (
                      <span className="tiny cyan allocrow__info">{SKILL_INFO[key]}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </Fold>

      <Btn
        tone="primary"
        block
        onClick={takeCommand}
        sub={unspent ? 'You can leave points unplaced if you would rather' : 'Everything is placed'}
      >
        Take Command
      </Btn>

      <Btn tone="ghost" block onClick={() => setStep('who')}>
        Back to {character.name}
      </Btn>
    </div>
  );
}

/**
 * Who this person is, with nothing on the page you would have to be a
 * spreadsheet to read. The numbers exist and are one screen away.
 */
function CaptainIntro({
  character,
  onContinue,
  onReroll,
}: {
  character: Character;
  onContinue: () => void;
  onReroll: () => void;
}) {
  // The captain is you: every trait they rolled is known from the start.
  const temperament = temperamentOf(character, { full: true });
  const events = lifeEventsOf(character);

  return (
    <div className="stack">
      <Panel title="Your Captain">
        <div className="split" style={{ alignItems: 'flex-start' }}>
          <Portrait seed={character.portraitSeed} size="lg" />
          <div style={{ flex: 1, minWidth: 0, marginLeft: 10 }}>
            <div className="value">
              {character.name} {character.surname}
            </div>
            <div className="tiny">
              Age {character.age} · {sexLabel(character)} ·{' '}
              <span style={{ textTransform: 'capitalize' }}>{character.role}</span>
            </div>
            <div className="chips" style={{ marginTop: 6 }}>
              <Chip tone="amber">{character.profession ?? character.lifeHistory.career}</Chip>
            </div>
          </div>
        </div>

        <div className="divider" />

        {/* The life, as story. This is the strongest thing on the screen. */}
        <div className="stack stack--tight">
          {character.lifeHistory.notes.map((note, index) => (
            <p key={index} className="prose">
              {note}
            </p>
          ))}
        </div>

        <div className="divider" />
        <div className="chips">
          <Chip>{character.lifeHistory.origin}</Chip>
          <Chip>{character.lifeHistory.upbringing}</Chip>
          {events.length === 0 && <Chip>{character.lifeHistory.formativeEvent}</Chip>}
        </div>
      </Panel>

      {/*
        The two influential events, kept apart from the life-history beats
        because they are the things that actually turned the life. Influential
        does not mean bad: a third of the library is outright good, and a good
        year is allowed to have changed somebody as much as a bad one.
      */}
      {events.length > 0 && (
        <Panel title="What Turned Their Life" aside={`${events.length}`}>
          <div className="stack stack--tight">
            {events.map((event) => (
              <div key={event.id}>
                <div className="chips" style={{ marginBottom: 3 }}>
                  <Chip tone={POLARITY_TONE[event.polarity]}>
                    {POLARITY_LABELS[event.polarity]}
                  </Chip>
                  <Chip>{SEVERITY_LABELS[event.severity]}</Chip>
                  <Chip>{event.category}</Chip>
                </div>
                <p className="prose" style={{ marginTop: 0 }}>
                  {event.text}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/*
        You know your own temperament. A stranger's still has to be watched for
        — that rule protects recruitment, and the captain was never a stranger.
      */}
      <Panel title="Temperament">
        <div className="chips">
          {temperament.descriptors.map((word: string) => (
            <Chip key={word} tone="cyan">
              {word}
            </Chip>
          ))}
        </div>
        <p className="prose" style={{ marginTop: 8 }}>
          {temperament.summary}
        </p>
        <div className="divider" />
        <div className="stack stack--tight">
          {temperament.tendencies.map((tendency: { label: string; behaviour: string }) => (
            <p key={tendency.label} className="tiny">
              <span className="amber">{tendency.label}.</span>{' '}
              <span className="dim">{tendency.behaviour}</span>
            </p>
          ))}
        </div>
        <p className="tiny faint" style={{ marginTop: 8, marginBottom: 0 }}>
          This is all of it. Everybody else you meet has a personality of exactly this
          kind, and you learn theirs by watching them work.
        </p>
      </Panel>

      <Btn tone="primary" block onClick={onContinue} sub="A few points left to place">
        Continue
      </Btn>

      <Btn
        tone="ghost"
        block
        onClick={onReroll}
        sub="Same seed, same world, a different person in the chair"
      >
        Reroll Captain
      </Btn>

      <Btn tone="ghost" block onClick={() => store.quitToTitle()}>
        Back to Title
      </Btn>
    </div>
  );
}

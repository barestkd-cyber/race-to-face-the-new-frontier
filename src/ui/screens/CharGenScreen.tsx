/**
 * Character generation.
 *
 * The draft is regenerated wholesale on every reroll, so the allocation the
 * player is making lives in local state until it is written back onto a copy of
 * the character at commit time. Nothing here decides anything the engine owns —
 * it only spends the points the draft already reserved.
 */

import { useEffect, useMemo, useState } from 'react';
import { Btn, Chip, Empty, Fold, KV, Panel, StatLine } from '../components';
import { Portrait } from '../Portrait';
import { store, useDraft } from '../useStore';
import { deriveMaxHealth } from '../../engine/character';
import { skillCap } from '../../engine/check';
import type { NewRunDraft } from '../../engine/newGame';
import { skillCapLabel } from '../../engine/progression';
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

  const [attributes, setAttributes] = useState<Attributes>(() => ({ ...character.attributes }));
  const [skills, setSkills] = useState<SkillMap>(() => ({ ...character.skills }));

  // A new draft identity means a new person; the working copy starts over.
  useEffect(() => {
    setAttributes({ ...character.attributes });
    setSkills({ ...character.skills });
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
  const maxHealth = deriveMaxHealth(attributes);
  const attributeTotalNow = useMemo(
    () => ATTRIBUTE_KEYS.reduce((sum, key) => sum + attributes[key], 0),
    [attributes],
  );

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

  const unspent = attrRemaining > 0 || skillRemaining > 0;

  return (
    <div className="stack">
      <Panel title="Your Captain" aside={`Seed ${draft.seed}`}>
        <div className="split" style={{ alignItems: 'flex-start' }}>
          <Portrait seed={character.portraitSeed} size="lg" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="value">
              {character.name} {character.surname}
            </div>
            <div className="tiny">
              {character.age} · {character.pronouns} ·{' '}
              <span style={{ textTransform: 'capitalize' }}>{character.role}</span>
            </div>
            <div className="chips">
              <Chip tone="amber">{character.lifeHistory.career}</Chip>
              <Chip>{character.lifeHistory.origin}</Chip>
            </div>
          </div>
        </div>

        <div className="divider" />

        <div className="stack stack--tight">
          {character.lifeHistory.notes.map((note, index) => (
            <p key={index} className="prose prose--dim">
              {note}
            </p>
          ))}
        </div>
      </Panel>

      <Panel title="Derived" tight>
        <KV
          items={[
            ['Health', <span key="hp" className="value readout">{maxHealth}</span>],
            ['Attribute total', `${attributeTotalNow} / ${ATTRIBUTE_KEYS.length * ATTRIBUTE_MAX}`],
            ['Backpack', `${character.backpackSlots} slots`],
            [
              'Unspent',
              <span key="left" className={unspent ? 'amber' : 'green'}>
                {attrRemaining} attr · {skillRemaining} skill
              </span>,
            ],
          ]}
        />
        <div className="divider" />
        <p className="tiny faint">
          Health follows Endurance and Strength, so it moves as you allocate.
        </p>
      </Panel>

      <Fold title={`Attributes — ${attrRemaining} left`} defaultOpen>
        <p className="tiny faint">
          Ninety percent of this captain was already dealt. These are the points you place
          yourself. Nothing can be raised past {ATTRIBUTE_MAX}, and nothing can be pulled below
          what the roll gave them.
        </p>
        <div className="divider" />
        <div className="stack">
          {(Object.keys(FACETS) as FacetKey[]).map((facet) => (
            <div key={facet} className="stack stack--tight">
              <span className="label">{FACETS[facet].label}</span>
              {FACETS[facet].attributes.map((key) => (
                <div key={key} className="split" style={{ gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
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
                </div>
              ))}
            </div>
          ))}
        </div>
      </Fold>

      <Fold title={`Skills — ${skillRemaining} left`}>
        <p className="tiny faint">
          Every skill has a ceiling set by potential, shown beside it as grade and cap. Points
          spent here cannot be taken back below the value the life history produced.
        </p>
        <div className="divider" />
        <div className="stack">
          {(Object.keys(SKILL_GROUPS) as SkillGroupKey[]).map((group) => (
            <div key={group} className="stack stack--tight">
              <span className="label">{SKILL_GROUPS[group].label}</span>
              {SKILL_GROUPS[group].skills.map((key) => {
                const cap = skillCap(character, key);
                return (
                  <div key={key} className="split" style={{ gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
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
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </Fold>

      <Panel title="Temperament" tight>
        <p className="tiny faint">
          Personality is not on this sheet. Your crew's tendencies reveal themselves through play —
          you learn who someone is by watching what they do under pressure, not by reading it here.
        </p>
      </Panel>

      <Panel title="Commit" tight>
        <div className="btn-col">
          <Btn
            tone="primary"
            block
            onClick={takeCommand}
            sub={
              unspent
                ? `${attrRemaining} attribute and ${skillRemaining} skill points will be lost`
                : 'All points allocated'
            }
          >
            Take Command
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
      </Panel>
    </div>
  );
}

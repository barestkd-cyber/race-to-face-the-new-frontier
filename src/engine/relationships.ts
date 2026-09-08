/**
 * Pairwise relationships.
 *
 * Relationships are between specific people, not between everyone and the
 * captain. Two crew members can end up mattering more to each other than
 * either does to whoever is in the chair, and the simulation has to be able to
 * say so.
 *
 * There is one number per direction and one ladder to read it on. Standing is
 * always derived, never stored, so there is nothing to keep in sync. Roles —
 * family, mentor, student, partner — sit on top of standing rather than
 * replacing it: family can be at any standing including a bad one.
 *
 * Relationships move because something happened. Nothing in here is a bar to
 * grind, and no action exists whose purpose is to raise one.
 */

import { RELATIONSHIPS } from './tuning';
import {
  STANDING_LABELS,
  type Character,
  type CharacterId,
  type Relationship,
  type RelationshipRole,
  type RelationshipStanding,
} from './types';

// ---------------------------------------------------------------------------
// The ladder
// ---------------------------------------------------------------------------

/** Where this number sits on the ladder. Ordinary crew start at Peer. */
export function standingOf(value: number): RelationshipStanding {
  if (value >= RELATIONSHIPS.friendAt) return 'friend';
  if (value <= RELATIONSHIPS.disregardedAt) return 'disregarded';
  if (value <= RELATIONSHIPS.acquaintanceAt) return 'acquaintance';
  return 'peer';
}

export function standingLabel(value: number): string {
  return STANDING_LABELS[standingOf(value)];
}

/** A fresh pairing. Peer, by default, with whatever familiarity fits. */
export function newRelationship(familiarity = 0, roles: RelationshipRole[] = []): Relationship {
  return { value: RELATIONSHIPS.startingValue, familiarity, roles };
}

// ---------------------------------------------------------------------------
// Reading a pair
// ---------------------------------------------------------------------------

export function relationshipBetween(
  a: Character,
  bId: CharacterId,
): Relationship | undefined {
  return a.relationships[bId];
}

/**
 * Both halves of a pairing, created at Peer if they have not met on paper yet.
 * Relationships are directional — one of them can think more of the other —
 * but both sides always exist.
 */
export function ensurePair(
  a: Character,
  b: Character,
  familiarity = 0,
  roles: RelationshipRole[] = [],
): [Relationship, Relationship] {
  a.relationships[b.id] ??= newRelationship(familiarity, [...roles]);
  b.relationships[a.id] ??= newRelationship(familiarity, [...roles]);
  return [a.relationships[b.id]!, b.relationships[a.id]!];
}

export function hasRole(
  a: Character,
  bId: CharacterId,
  role: RelationshipRole,
): boolean {
  return a.relationships[bId]?.roles.includes(role) ?? false;
}

/** Family is a role, never a standing. It says who they are, not how it is. */
export function addRole(a: Character, b: Character, role: RelationshipRole): void {
  const [ab, ba] = ensurePair(a, b);
  const mirror: RelationshipRole =
    role === 'mentor' ? 'student' : role === 'student' ? 'mentor' : role;
  if (!ab.roles.includes(role)) ab.roles.push(role);
  if (!ba.roles.includes(mirror)) ba.roles.push(mirror);
}

// ---------------------------------------------------------------------------
// Moving a pair
// ---------------------------------------------------------------------------

export interface RelationshipShift {
  /** Who now thinks differently of whom. */
  fromId: CharacterId;
  toId: CharacterId;
  before: RelationshipStanding;
  after: RelationshipStanding;
  delta: number;
}

/**
 * Change what one person thinks of another. One direction only, because a
 * rescue means something different to the person carried than to the person
 * carrying. Returns a shift only when the ladder actually moved.
 */
export function adjust(
  from: Character,
  to: Character,
  delta: number,
  familiarity = 0,
): RelationshipShift | null {
  const [rel] = ensurePair(from, to);
  const before = standingOf(rel.value);
  rel.value = Math.max(-100, Math.min(100, rel.value + delta));
  rel.familiarity = Math.max(0, Math.min(100, rel.familiarity + familiarity));
  const after = standingOf(rel.value);
  if (before === after) return null;
  return { fromId: from.id, toId: to.id, before, after, delta };
}

/** The same event landing on both people at once. */
export function adjustBoth(
  a: Character,
  b: Character,
  delta: number,
  familiarity = 0,
): RelationshipShift[] {
  const shifts: RelationshipShift[] = [];
  const first = adjust(a, b, delta, familiarity);
  const second = adjust(b, a, delta, familiarity);
  if (first) shifts.push(first);
  if (second) shifts.push(second);
  return shifts;
}

// ---------------------------------------------------------------------------
// What relationships are for
// ---------------------------------------------------------------------------

/**
 * How much this person wants to stay. Friends aboard hold people; being
 * disregarded by everyone does not. Used when somebody is offered a way out.
 */
export function attachmentScore(person: Character, crew: Character[]): number {
  let score = 0;
  for (const other of crew) {
    if (other.id === person.id) continue;
    const rel = person.relationships[other.id];
    if (!rel) continue;
    const standing = standingOf(rel.value);
    if (standing === 'friend') score += RELATIONSHIPS.friendAttachment;
    else if (standing === 'disregarded') score -= RELATIONSHIPS.disregardAttachment;
    if (rel.roles.includes('family')) score += RELATIONSHIPS.familyAttachment;
    if (rel.roles.includes('romantic')) score += RELATIONSHIPS.romanticAttachment;
    if (rel.roles.includes('student')) score += RELATIONSHIPS.mentorAttachment;
  }
  return score;
}

/** How hard this death lands on this person, 0..1. */
export function griefWeight(mourner: Character, lostId: CharacterId): number {
  const rel = mourner.relationships[lostId];
  if (!rel) return RELATIONSHIPS.grief.stranger;
  if (rel.roles.includes('family') || rel.roles.includes('romantic')) {
    return RELATIONSHIPS.grief.close;
  }
  switch (standingOf(rel.value)) {
    case 'friend':
      return RELATIONSHIPS.grief.friend;
    case 'disregarded':
      return RELATIONSHIPS.grief.disregarded;
    case 'acquaintance':
      return RELATIONSHIPS.grief.acquaintance;
    default:
      return RELATIONSHIPS.grief.peer;
  }
}

/** Every pairing this person has, strongest first. For the character sheet. */
export function standingsFor(
  person: Character,
  characters: Record<CharacterId, Character>,
): { other: Character; relationship: Relationship; standing: RelationshipStanding }[] {
  const rows: { other: Character; relationship: Relationship; standing: RelationshipStanding }[] =
    [];
  for (const [id, relationship] of Object.entries(person.relationships)) {
    const other = characters[id];
    if (!other) continue;
    rows.push({ other, relationship, standing: standingOf(relationship.value) });
  }
  return rows.sort((a, b) => b.relationship.value - a.relationship.value);
}

/**
 * Mentorship forms on its own between someone strong and someone weak at the
 * same craft who have actually spent time together. It is a role, not a
 * scheduled activity — nobody assigns it and nobody maintains it.
 */
export function maybeFormMentorship(
  a: Character,
  b: Character,
  skill: keyof Character['skills'],
): boolean {
  const gap = a.skills[skill] - b.skills[skill];
  if (gap < RELATIONSHIPS.mentorSkillGap) return false;
  if (a.skills[skill] < RELATIONSHIPS.mentorMinSkill) return false;
  const rel = a.relationships[b.id];
  if (!rel || rel.familiarity < RELATIONSHIPS.mentorMinFamiliarity) return false;
  if (rel.roles.includes('mentor')) return false;
  addRole(a, b, 'mentor');
  return true;
}

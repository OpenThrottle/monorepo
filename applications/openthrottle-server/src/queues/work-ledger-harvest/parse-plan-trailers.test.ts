import { describe, expect, it } from 'vitest';

import { parsePlanTrailers, planRefMatches } from './parse-plan-trailers.ts';

const PLAN = '75e8cd5c-58fc-467d-bbd3-33d552bb51f7';
const OTHER_PLAN = '6aa53d8e-43d8-45fd-9557-01d5b9d0cd1d';
const TASK = 'f2f9755e-9b1e-4b8e-961d-500df039de8b';

describe('parsePlanTrailers', () => {
  it('reads a plan and task trailer out of a real commit message', () => {
    const message = [
      'feat(monorepo): do the thing',
      '',
      'Some body text.',
      '',
      `Plan-Id: ${PLAN}`,
      `Task-Id: ${TASK}`,
    ].join('\n');

    expect(parsePlanTrailers(message)).toEqual([
      { planRef: PLAN, taskRef: TASK },
    ]);
  });

  it('returns nothing for a message with no trailer', () => {
    expect(parsePlanTrailers('chore: tidy up\n\nNo trailers here.')).toEqual(
      [],
    );
  });

  it('reads both plans when one commit closes work on two', () => {
    const message = [
      'feat: two plans',
      '',
      `Plan-Id: ${PLAN}`,
      `Plan-Id: ${OTHER_PLAN}`,
    ].join('\n');

    expect(parsePlanTrailers(message)).toEqual([
      { planRef: PLAN, taskRef: null },
      { planRef: OTHER_PLAN, taskRef: null },
    ]);
  });

  it('drops the task pairing rather than guessing when several plans share one task trailer', () => {
    const message = [
      'feat: ambiguous',
      '',
      `Plan-Id: ${PLAN}`,
      `Plan-Id: ${OTHER_PLAN}`,
      `Task-Id: ${TASK}`,
    ].join('\n');

    // Attaching one task to both plans would invent a link nobody claimed.
    expect(
      parsePlanTrailers(message).every((ref) => ref.taskRef === null),
    ).toBe(true);
  });

  it('deduplicates a plan repeated across trailers', () => {
    const message = `x\n\nPlan-Id: ${PLAN}\nPlan-Id: ${PLAN}`;

    expect(parsePlanTrailers(message)).toHaveLength(1);
  });

  it('is case-insensitive about the trailer key', () => {
    expect(parsePlanTrailers(`x\n\nplan-id: ${PLAN}`)).toHaveLength(1);
    expect(parsePlanTrailers(`x\n\nPLAN-ID: ${PLAN}`)).toHaveLength(1);
  });

  it('reads short-id trailers, which history actually contains', () => {
    expect(parsePlanTrailers('x\n\nPlan-Id: 75e8cd5c')).toEqual([
      { planRef: '75e8cd5c', taskRef: null },
    ]);
  });

  it('ignores a trailer-looking string that is not on its own line', () => {
    expect(parsePlanTrailers(`see Plan-Id: ${PLAN} for details`)).toEqual([]);
  });
});

describe('planRefMatches', () => {
  it('matches an exact uuid', () => {
    expect(planRefMatches(PLAN, PLAN)).toBe(true);
  });

  it('matches case-insensitively', () => {
    expect(planRefMatches(PLAN.toUpperCase(), PLAN)).toBe(true);
  });

  it('matches an 8-character short id against its plan', () => {
    // Required, not a convenience: some trailers in history are short ids, and
    // equality alone would drop them as unresolvable.
    expect(planRefMatches('75e8cd5c', PLAN)).toBe(true);
  });

  it('does not match a different plan', () => {
    expect(planRefMatches('75e8cd5c', OTHER_PLAN)).toBe(false);
  });

  it('refuses a prefix shorter than 8 characters', () => {
    // A stray short value must not sweep up an unrelated plan.
    expect(planRefMatches('75e8', PLAN)).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';

import { parseIndexClaims } from '../claims';
import {
  carriesGotcha,
  findDemotionCandidates,
  hasOwedFollowup,
} from '../demotion';
import type { ObservedPlan, ObservedPr } from '../reconcile';

const DONE_PLAN: ObservedPlan = {
  id: 'a634f338-0000-4000-8000-000000000000',
  status: 'COMPLETED',
};

const mergedPr = (number: number): ObservedPr => ({
  isDraft: false,
  merged: true,
  number,
  state: 'MERGED',
});

/** Run the rule over a single index line, the way the CLI does. */
const judge = (
  line: string,
  options: {
    plans?: readonly ObservedPlan[];
    prs?: ReadonlyMap<number, ObservedPr>;
  } = {},
) => {
  const claims = parseIndexClaims(line);
  const hook = line.split('—').slice(1).join('—').trim();
  return findDemotionCandidates({
    entries: [{ hook, line: 1, title: 'Entry' }],
    planClaims: claims.plans,
    plans: options.plans ?? [DONE_PLAN],
    prClaims: claims.prs,
    prs: options.prs ?? new Map([[491, mergedPr(491)]]),
  });
};

describe('hasOwedFollowup', () => {
  it.each([
    'leak-audit #290 + owner revoke owed',
    'visual pass BLOCKED',
    'chalk fix stranded on a backup branch',
    're-land or retire',
    'follow-up owed',
  ])('flags %j', (hook) => {
    expect(hasOwedFollowup(hook)).toBe(true);
  });

  it('does not flag a plain landed entry', () => {
    expect(hasOwedFollowup('a634f338 DONE, PR #491 merged')).toBe(false);
  });
});

describe('carriesGotcha', () => {
  it('detects a trailing clause that is a claim about the world', () => {
    // `Vite emits NO warning` is the memory; the plan is incidental.
    expect(
      carriesGotcha('a69a8b4c DONE, PR #476 merged; Vite emits NO warning'),
    ).toBe(true);
  });

  it('does not treat a trailing reference clause as a gotcha', () => {
    expect(carriesGotcha('a634f338 DONE; PR #491 merged')).toBe(false);
  });

  it('does not treat a single-clause hook as a gotcha', () => {
    expect(carriesGotcha('a634f338 DONE')).toBe(false);
  });
});

describe('findDemotionCandidates', () => {
  it('proposes a landed entry with nothing owed', () => {
    const report = judge('- [E](e.md) — a634f338 DONE, PR #491 merged');

    expect(report.candidates).toHaveLength(1);
    expect(report.held).toEqual([]);
  });

  it('holds an entry whose plan is not COMPLETED', () => {
    const report = judge('- [E](e.md) — a634f338 DONE, PR #491 merged', {
      plans: [
        { id: 'a634f338-0000-4000-8000-000000000000', status: 'PENDING' },
      ],
    });

    expect(report.candidates).toEqual([]);
    expect(report.held[0]?.reason).toContain('not COMPLETED');
  });

  it('holds an entry whose PR is still open', () => {
    const report = judge('- [E](e.md) — a634f338 DONE, PR #491 open', {
      prs: new Map([
        [491, { isDraft: false, merged: false, number: 491, state: 'OPEN' }],
      ]),
    });

    expect(report.candidates).toEqual([]);
    expect(report.held[0]?.reason).toContain('still open');
  });

  it('holds an entry with an owed follow-up however green it looks', () => {
    const report = judge(
      '- [E](e.md) — a634f338 DONE, PR #491 merged; visual pass owed',
    );

    expect(report.candidates).toEqual([]);
    expect(report.held[0]?.reason).toContain('owed follow-up');
  });

  it('holds an entry whose durable value is the gotcha', () => {
    const report = judge(
      '- [E](e.md) — a634f338 DONE; PR #491 merged; Vite emits NO warning here',
    );

    expect(report.candidates).toEqual([]);
    expect(report.held[0]?.reason).toContain('gotcha');
  });

  it('treats an unresolvable reference as unknown, never as a yes', () => {
    // A false positive here archives a memory nobody will be shown again, so an
    // unknown must never resolve in favour of demotion.
    const report = judge('- [E](e.md) — deadbeef DONE, PR #491 merged', {
      plans: [],
    });

    expect(report.candidates).toEqual([]);
    expect(report.held[0]?.reason).toContain('could not be resolved');
  });

  it('ignores an entry that names neither a plan nor a PR', () => {
    const report = judge(
      '- [E](e.md) — a durable preference with no references',
    );

    expect(report.candidates).toEqual([]);
    expect(report.held).toEqual([]);
  });
});

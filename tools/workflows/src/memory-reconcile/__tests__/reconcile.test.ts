import { describe, expect, it } from 'vitest';

import { parseIndexClaims, planStatusClaim, prStateClaim } from '../claims';
import {
  formatReconcileReport,
  observedPrState,
  prClaimConflicts,
  reconcile,
  type ObservedPlan,
  type ObservedPr,
} from '../reconcile';

const pr = (
  number: number,
  overrides: Partial<ObservedPr> = {},
): ObservedPr => ({
  isDraft: false,
  merged: false,
  number,
  state: 'OPEN',
  ...overrides,
});

const prMap = (...items: ObservedPr[]): ReadonlyMap<number, ObservedPr> =>
  new Map(items.map((item) => [item.number, item]));

describe('parseIndexClaims', () => {
  it('reads a PR number with its state word', () => {
    const claims = parseIndexClaims(
      '- [Thing](thing.md) — a1b2c3d4 DONE, PR #491 OPEN',
    );

    expect(claims.prs).toHaveLength(1);
    expect(claims.prs[0]).toMatchObject({
      number: 491,
      state: prStateClaim.open,
    });
  });

  it('binds a state word to its OWN clause, not the whole line', () => {
    // `70377fcc DONE #265; 097c23b7 PENDING` — if the line were one scope, DONE
    // would attach to 097c23b7 too and manufacture a disagreement never claimed.
    const claims = parseIndexClaims(
      '- [Queues](queues.md) — 70377fcc DONE #265; 097c23b7 PENDING',
    );

    const byId = new Map(claims.plans.map((p) => [p.planId, p.status]));
    expect(byId.get('70377fcc')).toBe(planStatusClaim.completed);
    expect(byId.get('097c23b7')).toBe(planStatusClaim.pending);
  });

  it('records a reference with no state word as an unclaimed reference', () => {
    const claims = parseIndexClaims(
      '- [Thing](thing.md) — see #123 for detail',
    );

    expect(claims.prs).toHaveLength(1);
    expect(claims.prs[0]?.state).toBeNull();
  });

  it('ignores prose that is not a claim about the world', () => {
    const claims = parseIndexClaims(
      '- [Boundary](boundary.md) — Vite emits NO warning',
    );

    expect(claims.prs).toEqual([]);
    expect(claims.plans).toEqual([]);
  });

  it('reads both short-form and full-UUID plan ids', () => {
    const claims = parseIndexClaims(
      [
        '- [Short](short.md) — 70377fcc DONE',
        '- [Long](long.md) — 90c09906-a67f-439a-aeaf-3267b547e21e IN_PROGRESS',
      ].join('\n'),
    );

    expect(claims.plans.map((p) => p.planId)).toEqual([
      '70377fcc',
      '90c09906-a67f-439a-aeaf-3267b547e21e',
    ]);
  });
});

describe('observedPrState', () => {
  it.each([
    [pr(1, { merged: true, state: 'MERGED' }), prStateClaim.merged],
    [pr(2, { state: 'CLOSED' }), prStateClaim.closed],
    [pr(3, { isDraft: true }), prStateClaim.draft],
    [pr(4), prStateClaim.open],
  ])('maps %o to the index vocabulary', (input, expected) => {
    expect(observedPrState(input)).toBe(expected);
  });
});

describe('prClaimConflicts', () => {
  it('flags "unmerged" about a merged PR — the 20-entry finding', () => {
    expect(prClaimConflicts(prStateClaim.unmerged, prStateClaim.merged)).toBe(
      true,
    );
  });

  it('accepts "unmerged" about an open or closed PR', () => {
    expect(prClaimConflicts(prStateClaim.unmerged, prStateClaim.open)).toBe(
      false,
    );
    expect(prClaimConflicts(prStateClaim.unmerged, prStateClaim.closed)).toBe(
      false,
    );
  });

  it('treats draft and open as compatible in both directions', () => {
    // A draft IS open. Flagging this pair would produce noise the author must
    // learn to ignore, which is how a guard stops being read.
    expect(prClaimConflicts(prStateClaim.open, prStateClaim.draft)).toBe(false);
    expect(prClaimConflicts(prStateClaim.draft, prStateClaim.open)).toBe(false);
  });

  it('flags a merged claim about a closed PR', () => {
    expect(prClaimConflicts(prStateClaim.merged, prStateClaim.closed)).toBe(
      true,
    );
  });
});

describe('reconcile', () => {
  const plans: readonly ObservedPlan[] = [
    { id: '70377fcc-0000-4000-8000-000000000000', status: 'COMPLETED' },
    { id: '097c23b7-0000-4000-8000-000000000000', status: 'IN_PROGRESS' },
  ];

  it('reports the stale "unmerged" claim', () => {
    const claims = parseIndexClaims(
      '- [Snapshot](snapshot.md) — blocked on snapshot PR #457 unmerged',
    );
    const report = reconcile({
      claims,
      plans: [],
      prs: prMap(pr(457, { merged: true, state: 'MERGED' })),
    });

    expect(report.disagreements).toHaveLength(1);
    expect(report.disagreements[0]).toMatchObject({
      claimed: prStateClaim.unmerged,
      observed: prStateClaim.merged,
      subject: 'PR #457',
    });
  });

  it('reports a plan whose claimed status has moved on', () => {
    const claims = parseIndexClaims('- [Queues](queues.md) — 097c23b7 PENDING');
    const report = reconcile({ claims, plans, prs: prMap() });

    expect(report.disagreements).toHaveLength(1);
    expect(report.disagreements[0]).toMatchObject({
      claimed: planStatusClaim.pending,
      observed: 'IN_PROGRESS',
    });
  });

  it('accepts DONE as the index shorthand for COMPLETED', () => {
    const claims = parseIndexClaims('- [Queues](queues.md) — 70377fcc DONE');
    const report = reconcile({ claims, plans, prs: prMap() });

    expect(report.disagreements).toEqual([]);
  });

  it('says nothing about a reference carrying no claim', () => {
    const claims = parseIndexClaims('- [Thing](thing.md) — see #123');
    const report = reconcile({
      claims,
      plans: [],
      prs: prMap(pr(123, { merged: true, state: 'MERGED' })),
    });

    expect(report.disagreements).toEqual([]);
    expect(report.coverage.prsClaimed).toBe(0);
  });

  it('separates "could not resolve" from "is wrong"', () => {
    // An unresolvable subject is not evidence of drift. Counting it as one would
    // send the author editing an entry that may well be correct.
    const claims = parseIndexClaims('- [Gone](gone.md) — PR #9999 merged');
    const report = reconcile({ claims, plans: [], prs: prMap() });

    expect(report.disagreements).toEqual([]);
    expect(report.unresolved).toHaveLength(1);
    expect(report.unresolved[0]).toContain('#9999');
  });
});

describe('formatReconcileReport', () => {
  it('refuses to imply a clean bill of health', () => {
    const report = reconcile({
      claims: parseIndexClaims('- [Thing](thing.md) — 70377fcc DONE'),
      plans: [
        { id: '70377fcc-0000-4000-8000-000000000000', status: 'COMPLETED' },
      ],
      prs: prMap(),
    });
    const text = formatReconcileReport(report, { planRefs: 1, prRefs: 0 });

    expect(text).toContain('No disagreements found.');
    // The load-bearing sentence: a clean run is not a statement about the index.
    expect(text).toContain('does NOT say the index');
    expect(text).toContain('NOT checked');
  });

  it('names the entry, the claim and the observation', () => {
    const report = reconcile({
      claims: parseIndexClaims('- [Snapshot](snapshot.md) — PR #457 unmerged'),
      plans: [],
      prs: prMap(pr(457, { merged: true, state: 'MERGED' })),
    });
    const text = formatReconcileReport(report, { planRefs: 0, prRefs: 1 });

    expect(text).toContain('Snapshot');
    expect(text).toContain('PR #457');
    expect(text).toContain('index says UNMERGED, actually MERGED');
  });
});

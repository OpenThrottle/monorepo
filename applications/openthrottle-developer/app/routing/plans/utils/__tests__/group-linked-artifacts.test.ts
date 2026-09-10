import { describe, expect, test } from 'vitest';
import { groupLinkedArtifacts } from '../group-linked-artifacts';
import type { LinkedArtifactGroupModel } from '../group-linked-artifacts';

/** Narrow the first group without an index-access cast (noUncheckedIndexedAccess). */
const firstGroup = <T extends { producedAt: number | string; type: string }>(
  groups: LinkedArtifactGroupModel<T>[],
): LinkedArtifactGroupModel<T> => {
  const [group] = groups;

  if (group === undefined) {
    throw new Error('expected at least one group');
  }

  return group;
};

const row = (
  type: string,
  producedAt: number | string,
  id = `${type}-${producedAt}`,
) => ({
  id,
  producedAt,
  type,
});

describe('groupLinkedArtifacts', () => {
  test('orders groups by human value, not by count or arrival', () => {
    const groups = groupLinkedArtifacts([
      row('status_change', 1),
      row('document', 2),
      row('git_commit', 3),
      row('pull_request', 4),
      row('deployment', 5),
      row('plan_promotion', 6),
    ]);

    expect(groups.map((group) => group.type)).toEqual([
      'git_commit',
      'pull_request',
      'deployment',
      'document',
      'plan_promotion',
      'status_change',
    ]);
  });

  test('sorts unrecognized types alphabetically after every known type', () => {
    const groups = groupLinkedArtifacts([
      row('zebra', 1),
      row('sbom', 2),
      row('git_commit', 3),
    ]);

    expect(groups.map((group) => group.type)).toEqual([
      'git_commit',
      'sbom',
      'zebra',
    ]);
  });

  test('counts each group and keeps rows newest-first across mixed date scalars', () => {
    const groups = groupLinkedArtifacts([
      row('git_commit', '2026-01-01T00:00:00.000Z', 'old'),
      row('git_commit', 1_800_000_000_000, 'new'),
    ]);

    expect(firstGroup(groups).count).toBe(2);
    expect(firstGroup(groups).rows.map((r) => r.id)).toEqual(['new', 'old']);
  });

  test('collapses status_change by default even when it is small', () => {
    const groups = groupLinkedArtifacts([row('status_change', 1)]);

    expect(firstGroup(groups).collapsedByDefault).toBe(true);
  });

  test('collapses any group over the threshold, and leaves small ones open', () => {
    const many = Array.from({ length: 6 }, (_, index) =>
      row('git_commit', index, `c${index}`),
    );

    expect(firstGroup(groupLinkedArtifacts(many)).collapsedByDefault).toBe(
      true,
    );
    expect(
      firstGroup(groupLinkedArtifacts(many.slice(0, 3))).collapsedByDefault,
    ).toBe(false);
  });

  test('labels known types and falls back to the raw name otherwise', () => {
    const groups = groupLinkedArtifacts([row('git_commit', 1), row('sbom', 2)]);

    expect(groups.map((group) => group.label)).toEqual(['Commits', 'sbom']);
  });

  test('returns no groups for an empty list', () => {
    expect(groupLinkedArtifacts([])).toEqual([]);
  });
});

import { describe, expect, test } from 'vitest';
import {
  ARTIFACT_FILTER_ALL,
  filterLinkedArtifacts,
  summarizeLinkedArtifacts,
} from '../summarize-linked-artifacts';

const row = (type: string, verification: string) => ({ type, verification });

describe('summarizeLinkedArtifacts', () => {
  test('counts the total and every verification state', () => {
    const summary = summarizeLinkedArtifacts([
      row('git_commit', 'verified'),
      row('git_commit', 'orphaned'),
      row('status_change', 'verified'),
    ]);

    expect(summary.total).toBe(3);
    expect(summary.byVerification).toMatchObject({
      orphaned: 1,
      unverified: 0,
      verified: 2,
    });
  });

  test('reports zeroes for known states rather than omitting them', () => {
    expect(summarizeLinkedArtifacts([]).byVerification).toEqual({
      orphaned: 0,
      unverified: 0,
      verified: 0,
    });
  });

  test('lists only the types actually present, deduplicated', () => {
    const summary = summarizeLinkedArtifacts([
      row('git_commit', 'verified'),
      row('git_commit', 'verified'),
      row('sbom', 'unverified'),
    ]);

    expect(summary.presentTypes).toEqual(['git_commit', 'sbom']);
  });

  test('counts an unknown verification state it has never seen', () => {
    expect(
      summarizeLinkedArtifacts([row('git_commit', 'disputed')]).byVerification
        .disputed,
    ).toBe(1);
  });
});

describe('filterLinkedArtifacts', () => {
  const artifacts = [
    row('git_commit', 'verified'),
    row('git_commit', 'orphaned'),
    row('status_change', 'verified'),
  ];

  test('returns everything when both filters are "all"', () => {
    expect(
      filterLinkedArtifacts(
        artifacts,
        ARTIFACT_FILTER_ALL,
        ARTIFACT_FILTER_ALL,
      ),
    ).toHaveLength(3);
  });

  test('filters by verification', () => {
    expect(
      filterLinkedArtifacts(artifacts, 'orphaned', ARTIFACT_FILTER_ALL),
    ).toEqual([row('git_commit', 'orphaned')]);
  });

  test('filters by type', () => {
    expect(
      filterLinkedArtifacts(artifacts, ARTIFACT_FILTER_ALL, 'status_change'),
    ).toEqual([row('status_change', 'verified')]);
  });

  test('applies both dimensions together', () => {
    expect(filterLinkedArtifacts(artifacts, 'verified', 'git_commit')).toEqual([
      row('git_commit', 'verified'),
    ]);
  });

  test('can legitimately return nothing', () => {
    expect(
      filterLinkedArtifacts(artifacts, 'orphaned', 'status_change'),
    ).toEqual([]);
  });
});

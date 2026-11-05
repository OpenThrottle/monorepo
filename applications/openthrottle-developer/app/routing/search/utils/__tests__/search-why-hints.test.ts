import { describe, expect, test } from 'vitest';

import {
  describeSimilarity,
  describeSource,
  formatDocSourceMeta,
  formatEntityIds,
} from '../search-why-hints';

describe('describeSimilarity', () => {
  test('quotes the rounded percentage when there is a score', () => {
    expect(describeSimilarity(0.876)).toContain('about 88%');
  });

  test('falls back to the generic ranking line without a score', () => {
    expect(describeSimilarity(null)).toBe(
      'Ranked by semantic similarity between your query and indexed chunks.',
    );
  });
});

describe('describeSource', () => {
  test('names documentation, task and plan hits', () => {
    expect(describeSource('documentation')).toBe(
      'This hit came from ingested documentation.',
    );
    expect(describeSource('task')).toBe(
      'This hit matches text from a task linked to a plan.',
    );
    expect(describeSource('plan')).toBe(
      'This hit matches text from a plan chunk.',
    );
  });
});

describe('formatEntityIds', () => {
  test('joins both ids', () => {
    expect(formatEntityIds('p1', 't1')).toBe('Plan id: p1 · Task id: t1');
  });

  test('skips a missing or empty id', () => {
    expect(formatEntityIds('p1', '')).toBe('Plan id: p1');
    expect(formatEntityIds(null, 't1')).toBe('Task id: t1');
  });
});

describe('formatDocSourceMeta', () => {
  test('shortens the SHA to seven characters', () => {
    expect(formatDocSourceMeta('org/repo', 'a.md', '0123456789')).toBe(
      'Repo: org/repo · Path: a.md · SHA: 0123456',
    );
  });

  test('skips what is missing', () => {
    expect(formatDocSourceMeta('org/repo', null, undefined)).toBe(
      'Repo: org/repo',
    );
  });
});

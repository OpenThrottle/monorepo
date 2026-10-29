import { describe, expect, it } from 'vitest';

import {
  coversTarget,
  isTargetDefaultDescribed,
  toTargetDefaultEntries,
} from '../audit-target-descriptions.ts';

const described = { metadata: { description: 'Does a thing.' } };

describe('toTargetDefaultEntries', () => {
  it('reads metadata.description and the legacy top-level description', () => {
    expect(toTargetDefaultEntries(described)[0]?.described).toBe(true);
    expect(
      toTargetDefaultEntries({ description: 'Does a thing.' })[0]?.described,
    ).toBe(true);
    expect(toTargetDefaultEntries({ cache: true })[0]?.described).toBe(false);
  });

  it('treats a blank description as missing', () => {
    expect(
      toTargetDefaultEntries({ metadata: { description: '  ' } })[0]?.described,
    ).toBe(false);
  });

  it('does not narrow an object-form default by its executor', () => {
    const [entry] = toTargetDefaultEntries({
      ...described,
      executor: '@nx/eslint:lint',
    });

    expect(entry?.narrowedToExecutor).toBeUndefined();
  });

  it('narrows array-form entries by executor, projects or filter', () => {
    const entries = toTargetDefaultEntries([
      { ...described, executor: '@nx/vite:build' },
      { ...described, filter: { plugin: '@nx/react/router-plugin' } },
      { ...described, projects: ['openthrottle-server'] },
    ]);

    expect(entries.map((entry) => entry.narrowedToExecutor)).toEqual([
      '@nx/vite:build',
      undefined,
      undefined,
    ]);
    expect(entries.map((entry) => entry.scoped)).toEqual([false, true, true]);
  });

  it('skips array items that are not objects', () => {
    expect(toTargetDefaultEntries([described, 'nope', null])).toHaveLength(1);
  });
});

describe('isTargetDefaultDescribed', () => {
  it('needs every array entry to be described', () => {
    expect(
      isTargetDefaultDescribed(
        toTargetDefaultEntries([described, { executor: '@nx/vite:build' }]),
      ),
    ).toBe(false);
    expect(
      isTargetDefaultDescribed(toTargetDefaultEntries([described, described])),
    ).toBe(true);
  });

  it('is false for a key with no usable entries', () => {
    expect(isTargetDefaultDescribed([])).toBe(false);
  });
});

describe('coversTarget', () => {
  it('covers any target through a described object-form default', () => {
    const entries = toTargetDefaultEntries({
      ...described,
      executor: '@nx/eslint:lint',
    });

    expect(coversTarget(entries, undefined)).toBe(true);
    expect(coversTarget(entries, 'nx:run-commands')).toBe(true);
  });

  it('covers only matching executors through an array entry', () => {
    const entries = toTargetDefaultEntries([
      { ...described, executor: '@nx/vite:build' },
    ]);

    expect(coversTarget(entries, '@nx/vite:build')).toBe(true);
    expect(coversTarget(entries, 'nx:noop')).toBe(false);
    expect(coversTarget(entries, undefined)).toBe(false);
  });

  it('never covers through an entry scoped by projects or filter', () => {
    const entries = toTargetDefaultEntries([
      { ...described, filter: { plugin: '@nx/react/router-plugin' } },
    ]);

    expect(coversTarget(entries, undefined)).toBe(false);
  });

  it('does not cover through an undescribed entry', () => {
    expect(
      coversTarget(toTargetDefaultEntries({ cache: true }), undefined),
    ).toBe(false);
  });
});

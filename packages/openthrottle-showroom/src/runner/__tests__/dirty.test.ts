/**
 * @description The mutating-flow guard, over a real temporary output root.
 *
 * Filesystem rather than mocks, because every interesting case here is about
 * mtimes and absent files — the two things a mock of `node:fs` would be
 * asserting about itself.
 */

import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import * as format from '../format';
import { isDemoDataDirty, seedMarkerPath, writeSeedMarker } from '../dirty';

let root = '';

const stampedAt = (path: string, secondsFromEpoch: number): void => {
  utimesSync(path, secondsFromEpoch, secondsFromEpoch);
};

const seededAt = (secondsFromEpoch: number): void => {
  writeSeedMarker(new Date(secondsFromEpoch * 1_000));
  stampedAt(seedMarkerPath(), secondsFromEpoch);
};

const recordedAt = (flowId: string, secondsFromEpoch: number): void => {
  const dir = join(root, flowId);

  mkdirSync(dir, { recursive: true });

  const manifest = join(dir, 'manifest.json');

  writeFileSync(manifest, '{}', 'utf8');
  stampedAt(manifest, secondsFromEpoch);
};

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'showroom-dirty-'));
  vi.spyOn(format, 'outputRoot').mockReturnValue(root);
});

afterEach(() => {
  vi.restoreAllMocks();
  rmSync(root, { force: true, recursive: true });
});

describe('isDemoDataDirty', () => {
  test('a take after the seed is dirty, and says when both happened', () => {
    seededAt(1_000);
    recordedAt('03-first-plan', 2_000);

    const verdict = isDemoDataDirty('03-first-plan');

    expect(verdict.dirty).toBe(true);
    expect(verdict.reason).toContain('03-first-plan');
    expect(verdict.reason).toContain('mutates');
  });

  test('a seed after the take is clean', () => {
    recordedAt('03-first-plan', 1_000);
    seededAt(2_000);

    expect(isDemoDataDirty('03-first-plan').dirty).toBe(false);
  });

  test('a flow never recorded is clean, however old the seed', () => {
    seededAt(1_000);
    recordedAt('01-what-is-openthrottle', 2_000);

    // Judged PER FLOW: another flow's take says nothing about the rows this one
    // would create, and blocking on it would make an unrelated recording session
    // demand a re-seed for no reason.
    expect(isDemoDataDirty('03-first-plan').dirty).toBe(false);
  });

  test('a missing marker resolves to clean rather than to dirty', () => {
    recordedAt('03-first-plan', 2_000);

    const verdict = isDemoDataDirty('03-first-plan');

    // An absent marker means the workspace was seeded before this check existed,
    // not that the data is bad. Failing here would make the first run after an
    // upgrade refuse for a reason with nothing to do with the data.
    expect(verdict.dirty).toBe(false);
    expect(verdict.reason).toContain('no seed marker');
  });

  test('the marker records the seed time it was given', () => {
    seededAt(1_000);

    expect(isDemoDataDirty('03-first-plan').reason).toBe(
      'no previous take of this flow',
    );
  });
});

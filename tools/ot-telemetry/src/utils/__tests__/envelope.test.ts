import { describe, expect, it } from 'vitest';

import { DETAIL_LEVELS } from '../../config/index.ts';
import {
  buildEnvelope,
  defaultWindow,
  describeDetailLevel,
  isDetailLevel,
  resolveWindow,
} from '../envelope.ts';

describe('defaultWindow', () => {
  it('spans exactly the default trailing window, ending at `now`', () => {
    const now = new Date('2026-04-01T00:00:00.000Z');
    const window = defaultWindow(now);

    expect(window.until).toBe(now.toISOString());
    expect(window.since).toBe('2026-01-01T00:00:00.000Z');
  });
});

describe('resolveWindow', () => {
  const now = new Date('2026-04-01T00:00:00.000Z');

  it('falls back to the default window when no overrides are given', () => {
    expect(resolveWindow({}, now)).toEqual(defaultWindow(now));
  });

  it('applies a `since` override and keeps the default `until`', () => {
    const window = resolveWindow({ since: '2026-03-01' }, now);
    expect(window.since).toBe(new Date('2026-03-01').toISOString());
    expect(window.until).toBe(now.toISOString());
  });

  it('applies both overrides', () => {
    const window = resolveWindow(
      { since: '2026-01-01', until: '2026-02-01' },
      now,
    );
    expect(window).toEqual({
      since: new Date('2026-01-01').toISOString(),
      until: new Date('2026-02-01').toISOString(),
    });
  });

  it('throws on an unparseable `--since`', () => {
    expect(() => resolveWindow({ since: 'not-a-date' }, now)).toThrow(
      /--since/,
    );
  });

  it('throws on an unparseable `--until`', () => {
    expect(() => resolveWindow({ until: 'not-a-date' }, now)).toThrow(
      /--until/,
    );
  });

  it('throws when the resolved window is inverted', () => {
    expect(() =>
      resolveWindow({ since: '2026-03-01', until: '2026-01-01' }, now),
    ).toThrow(/must be before/);
  });

  it('throws when the resolved window is empty (since === until)', () => {
    expect(() =>
      resolveWindow({ since: '2026-01-01', until: '2026-01-01' }, now),
    ).toThrow(/must be before/);
  });
});

describe('isDetailLevel / describeDetailLevel', () => {
  it('accepts every documented level and rejects anything else', () => {
    expect(isDetailLevel('aggregate')).toBe(true);
    expect(isDetailLevel('identifiers')).toBe(true);
    expect(isDetailLevel('full')).toBe(true);
    expect(isDetailLevel('everything')).toBe(false);
  });

  it('never implies more was captured than the aggregate default', () => {
    // No metric family varies by detail level today (see README.md's privacy
    // contract table) — identifiers/full must say so plainly rather than
    // implying they captured something the aggregate run did not.
    expect(describeDetailLevel(DETAIL_LEVELS.IDENTIFIERS)).toMatch(
      /identical to aggregate/,
    );
    expect(describeDetailLevel(DETAIL_LEVELS.FULL)).toMatch(
      /identical to aggregate/,
    );
  });
});

describe('buildEnvelope', () => {
  it('stamps schemaVersion and a fresh generatedAt, defaulting detailLevel to aggregate', () => {
    const window = {
      since: '2026-01-01T00:00:00.000Z',
      until: '2026-04-01T00:00:00.000Z',
    };
    const envelope = buildEnvelope({
      actorKey: null,
      metrics: {},
      migrationHighWaterMark: null,
      repoSlug: null,
      skipped: [],
      window,
    });

    expect(envelope.schemaVersion).toBe(1);
    expect(envelope.detailLevel).toBe(DETAIL_LEVELS.AGGREGATE);
    expect(envelope.window).toEqual(window);
    expect(() => new Date(envelope.generatedAt).toISOString()).not.toThrow();
  });
});

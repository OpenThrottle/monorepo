/**
 * Unit tests for `readBufferStats` and `formatBufferStats`.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { formatBufferStats, readBufferStats } from '../../index.ts';

describe('readBufferStats', () => {
  let dir: string;
  let previous: string | undefined;

  const write = (name: string, content: string): void => {
    fs.writeFileSync(path.join(dir, name), content, 'utf8');
  };
  const find = (label: string) => {
    return readBufferStats().files.find((file) => file.label === label);
  };

  beforeEach(() => {
    previous = process.env.OPENTHROTTLE_TELEMETRY_DIR;
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'buffer-stats-'));
    process.env.OPENTHROTTLE_TELEMETRY_DIR = dir;
  });

  afterEach(() => {
    if (previous === undefined) {
      delete process.env.OPENTHROTTLE_TELEMETRY_DIR;
    } else {
      process.env.OPENTHROTTLE_TELEMETRY_DIR = previous;
    }
    fs.rmSync(dir, { force: true, recursive: true });
  });

  describe('when the directory is missing or empty', () => {
    it('returns zeros and null timestamps', () => {
      fs.rmSync(dir, { force: true, recursive: true });
      const stats = readBufferStats();
      expect(stats.totalLines).toBe(0);
      expect(stats.totalDeadLetterLines).toBe(0);
      expect(stats.oldestAt).toBeNull();
      expect(stats.files.map((file) => file.label)).toEqual([
        'events',
        'outcomes',
        'token-usage',
        'trajectories',
      ]);
    });
  });

  describe('when files are populated', () => {
    it('counts non-empty lines and finds the oldest timestamp', () => {
      write(
        'events.jsonl',
        '{"occurred_at":"2026-11-12T10:00:00.000Z"}\n\n{"occurred_at":"2026-11-13T10:00:00.000Z"}\n',
      );
      write('outcomes.jsonl', '{"started_at":"2026-11-11T08:00:00.000Z"}');
      write('token-usage.jsonl', '{"timestamp":"2026-11-12T09:00:00Z"}\n');
      write('trajectories.jsonl', '{"created_at":"2026-11-13T00:00:00Z"}\n');
      const stats = readBufferStats();
      expect(find('events')?.lines).toBe(2);
      expect(find('events')?.oldestAt).toBe('2026-11-12T10:00:00.000Z');
      expect(find('outcomes')?.lines).toBe(1);
      expect(stats.totalLines).toBe(5);
      expect(stats.oldestAt).toBe('2026-11-11T08:00:00.000Z');
    });
  });

  describe('when the first line is malformed', () => {
    it('counts it, yields a null timestamp and does not throw', () => {
      write(
        'events.jsonl',
        'not json\n{"occurred_at":"2026-11-12T10:00:00Z"}\n',
      );
      write('outcomes.jsonl', '{"nothing":true}\n');
      expect(find('events')?.lines).toBe(2);
      expect(find('events')?.oldestAt).toBeNull();
      expect(find('outcomes')?.oldestAt).toBeNull();
    });
  });

  describe('dead-letter files', () => {
    it('counts them separately from live lines', () => {
      write('events.dead-letter.jsonl', '{"a":1}\n{"a":2}\n');
      write('trajectories.dead-letter.jsonl', '{"a":3}\n');
      const stats = readBufferStats();
      expect(find('events')?.lines).toBe(0);
      expect(find('events')?.deadLetterLines).toBe(2);
      expect(stats.totalDeadLetterLines).toBe(3);
      expect(stats.totalLines).toBe(0);
    });
  });

  describe('a file larger than the chunk size', () => {
    it('counts every line across chunk boundaries', () => {
      const line = `{"occurred_at":"2026-11-10T00:00:00Z","pad":"${'x'.repeat(100)}"}\n`;
      const count = 3000;
      write('events.jsonl', line.repeat(count));
      expect(fs.statSync(path.join(dir, 'events.jsonl')).size).toBeGreaterThan(
        2 * 64 * 1024,
      );
      expect(find('events')?.lines).toBe(count);
      expect(find('events')?.oldestAt).toBe('2026-11-10T00:00:00.000Z');
    });
  });
});

describe('formatBufferStats', () => {
  const nowMs = Date.parse('2026-11-13T12:00:00.000Z');

  it('renders counts, dead-letter total and the age of the oldest record', () => {
    const line = formatBufferStats(
      'buffered before',
      {
        files: [
          { deadLetterLines: 0, label: 'events', lines: 3, oldestAt: null },
          { deadLetterLines: 0, label: 'outcomes', lines: 1, oldestAt: null },
          {
            deadLetterLines: 0,
            label: 'token-usage',
            lines: 0,
            oldestAt: null,
          },
          {
            deadLetterLines: 0,
            label: 'trajectories',
            lines: 0,
            oldestAt: null,
          },
        ],
        oldestAt: '2026-11-12T10:00:00.000Z',
        totalDeadLetterLines: 0,
        totalLines: 4,
      },
      nowMs,
    );
    expect(line).toBe(
      'buffered before: events=3 outcomes=1 token-usage=0 trajectories=0 dead-letter=0 oldest=2026-11-12T10:00:00.000Z (26h ago)',
    );
  });

  it('says none when nothing is buffered', () => {
    const line = formatBufferStats(
      'buffered after',
      { files: [], oldestAt: null, totalDeadLetterLines: 0, totalLines: 0 },
      nowMs,
    );
    expect(line).toContain('oldest=none');
  });
});

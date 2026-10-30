/**
 * Per-session offset checkpoints: round trip, per-file isolation, stale sweep.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  readCheckpoint,
  sweepStaleCheckpoints,
  writeCheckpoint,
} from '../../index.ts';

describe('checkpoints', () => {
  let tmpRoot: string;
  let repoRoot: string;
  let checkpointsDir: string;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'checkpoints-'));
    repoRoot = path.join(tmpRoot, 'repo');
    checkpointsDir = path.join(tmpRoot, 'telemetry', 'checkpoints');
    fs.mkdirSync(repoRoot);
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { force: true, recursive: true });
  });

  describe('readCheckpoint / writeCheckpoint', () => {
    it('is null before anything is written', () => {
      expect(
        readCheckpoint({ checkpointsDir, filePath: '/t/a', sessionId: 's1' }),
      ).toBeNull();
    });

    it('round-trips an offset with identifiers only', () => {
      const now = Date.parse('2026-10-29T10:00:00.000Z');
      expect(
        writeCheckpoint({
          checkpointsDir,
          filePath: '/t/a.jsonl',
          now,
          offset: 123,
          sessionId: 's1',
        }),
      ).toBe(true);

      expect(
        readCheckpoint({
          checkpointsDir,
          filePath: '/t/a.jsonl',
          sessionId: 's1',
        }),
      ).toEqual({
        offset: 123,
        path: '/t/a.jsonl',
        updated_at: '2026-10-29T10:00:00.000Z',
      });
      expect(
        JSON.parse(
          fs.readFileSync(path.join(checkpointsDir, 's1.json'), 'utf8'),
        ),
      ).toEqual({
        files: [
          {
            offset: 123,
            path: '/t/a.jsonl',
            updated_at: '2026-10-29T10:00:00.000Z',
          },
        ],
      });
    });

    it('tracks several files per session and replaces a path in place', () => {
      const write = (filePath: string, offset: number) =>
        writeCheckpoint({ checkpointsDir, filePath, offset, sessionId: 's1' });
      write('/t/main.jsonl', 10);
      write('/t/sub.jsonl', 5);
      write('/t/main.jsonl', 40);

      const read = (filePath: string) =>
        readCheckpoint({ checkpointsDir, filePath, sessionId: 's1' })?.offset;
      expect(read('/t/main.jsonl')).toBe(40);
      expect(read('/t/sub.jsonl')).toBe(5);
    });

    it('keeps sessions apart and sanitizes the id used as a filename', () => {
      writeCheckpoint({
        checkpointsDir,
        filePath: '/t/a',
        offset: 1,
        sessionId: '../evil/id',
      });
      writeCheckpoint({
        checkpointsDir,
        filePath: '/t/a',
        offset: 2,
        sessionId: 's2',
      });

      expect(fs.readdirSync(checkpointsDir).sort()).toEqual([
        '..-evil-id.json',
        's2.json',
      ]);
      expect(
        readCheckpoint({ checkpointsDir, filePath: '/t/a', sessionId: 's2' })
          ?.offset,
      ).toBe(2);
    });

    it('fails open on a missing session id, a bad offset and a corrupt file', () => {
      expect(
        writeCheckpoint({
          checkpointsDir,
          filePath: '/t/a',
          offset: 1,
          sessionId: null,
        }),
      ).toBe(false);
      expect(
        writeCheckpoint({
          checkpointsDir,
          filePath: '/t/a',
          offset: -1,
          sessionId: 's1',
        }),
      ).toBe(false);

      fs.mkdirSync(checkpointsDir, { recursive: true });
      fs.writeFileSync(path.join(checkpointsDir, 's1.json'), '{not json');
      expect(
        readCheckpoint({ checkpointsDir, filePath: '/t/a', sessionId: 's1' }),
      ).toBeNull();
      expect(
        writeCheckpoint({
          checkpointsDir,
          filePath: '/t/a',
          offset: 9,
          sessionId: 's1',
        }),
      ).toBe(true);
    });

    it('writes nothing under the repo root', () => {
      writeCheckpoint({
        checkpointsDir,
        filePath: path.join(repoRoot, 'transcript.jsonl'),
        offset: 1,
        sessionId: 's1',
      });
      expect(fs.readdirSync(repoRoot)).toEqual([]);
    });
  });

  describe('sweepStaleCheckpoints', () => {
    const touch = (name: string, ageMs: number, now: number): void => {
      fs.mkdirSync(checkpointsDir, { recursive: true });
      const file = path.join(checkpointsDir, name);
      fs.writeFileSync(file, '{"files":[]}');
      const at = new Date(now - ageMs);
      fs.utimesSync(file, at, at);
    };

    it('removes old checkpoints, keeping fresh ones and the current session', () => {
      const now = Date.now();
      const hour = 60 * 60 * 1000;
      touch('old.json', 7 * hour, now);
      touch('fresh.json', 1 * hour, now);
      touch('current.json', 9 * hour, now);

      expect(
        sweepStaleCheckpoints({
          checkpointsDir,
          currentSessionId: 'current',
          now,
        }),
      ).toBe(1);
      expect(fs.readdirSync(checkpointsDir).sort()).toEqual([
        'current.json',
        'fresh.json',
      ]);
    });

    it('honors a custom maxAgeMs', () => {
      const now = Date.now();
      touch('a.json', 2000, now);
      expect(
        sweepStaleCheckpoints({ checkpointsDir, maxAgeMs: 1000, now }),
      ).toBe(1);
    });

    it('returns 0 when the directory does not exist', () => {
      expect(sweepStaleCheckpoints({ checkpointsDir })).toBe(0);
    });
  });
});

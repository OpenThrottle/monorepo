/**
 * Per-session upload state: the once-a-day sweep of state files that outlived
 * their TTL.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  DEFAULT_TRAJECTORY_STATE_TTL_DAYS,
  resolveTrajectoryStateTtlDays,
  sweepTrajectoryUploadState,
  writeTrajectoryUploadState,
} from '../trajectory-uploads.ts';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-11-06T12:00:00.000Z');

describe('trajectory upload state sweep', () => {
  let dir: string;
  let prevTtl: string | undefined;

  const touch = (name: string, ageDays: number): string => {
    const filePath = path.join(dir, name);
    fs.writeFileSync(filePath, '{}\n');
    const when = new Date(NOW - ageDays * DAY_MS);
    fs.utimesSync(filePath, when, when);
    return filePath;
  };

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'trajectory-uploads-'));
    prevTtl = process.env.OPENTHROTTLE_SESSION_TRAJECTORY_STATE_TTL_DAYS;
    delete process.env.OPENTHROTTLE_SESSION_TRAJECTORY_STATE_TTL_DAYS;
  });

  afterEach(() => {
    fs.rmSync(dir, { force: true, recursive: true });
    if (prevTtl === undefined) {
      delete process.env.OPENTHROTTLE_SESSION_TRAJECTORY_STATE_TTL_DAYS;
    } else {
      process.env.OPENTHROTTLE_SESSION_TRAJECTORY_STATE_TTL_DAYS = prevTtl;
    }
  });

  describe('resolveTrajectoryStateTtlDays', () => {
    it('defaults to 30 days', () => {
      expect(resolveTrajectoryStateTtlDays()).toBe(
        DEFAULT_TRAJECTORY_STATE_TTL_DAYS,
      );
    });

    it('reads a positive override', () => {
      process.env.OPENTHROTTLE_SESSION_TRAJECTORY_STATE_TTL_DAYS = '7';
      expect(resolveTrajectoryStateTtlDays()).toBe(7);
    });

    it('ignores a non-positive or non-numeric override', () => {
      process.env.OPENTHROTTLE_SESSION_TRAJECTORY_STATE_TTL_DAYS = '0';
      expect(resolveTrajectoryStateTtlDays()).toBe(30);
      process.env.OPENTHROTTLE_SESSION_TRAJECTORY_STATE_TTL_DAYS = 'soon';
      expect(resolveTrajectoryStateTtlDays()).toBe(30);
    });
  });

  describe('sweepTrajectoryUploadState', () => {
    it('deletes state files older than the TTL and keeps newer ones', async () => {
      const old = touch('old.json', 45);
      const fresh = touch('fresh.json', 5);

      const result = await sweepTrajectoryUploadState({ dir, nowMs: NOW });

      expect(result).toEqual({ deleted: 1, skipped: false });
      expect(fs.existsSync(old)).toBe(false);
      expect(fs.existsSync(fresh)).toBe(true);
    });

    it('honours an explicit ttlDays', async () => {
      const middling = touch('middling.json', 10);

      await sweepTrajectoryUploadState({ dir, nowMs: NOW, ttlDays: 7 });

      expect(fs.existsSync(middling)).toBe(false);
    });

    it('leaves files that are not state files alone', async () => {
      const temp = touch('ses.json.tmp.123', 90);
      const other = touch('notes.txt', 90);

      await sweepTrajectoryUploadState({ dir, nowMs: NOW });

      expect(fs.existsSync(temp)).toBe(true);
      expect(fs.existsSync(other)).toBe(true);
    });

    it('runs at most once a day', async () => {
      await sweepTrajectoryUploadState({ dir, nowMs: NOW });
      const old = touch('late.json', 60);

      const same = await sweepTrajectoryUploadState({
        dir,
        nowMs: NOW + 1000,
      });
      expect(same).toEqual({ deleted: 0, skipped: true });
      expect(fs.existsSync(old)).toBe(true);

      const next = await sweepTrajectoryUploadState({
        dir,
        nowMs: NOW + DAY_MS + 1000,
      });
      expect(next).toEqual({ deleted: 1, skipped: false });
    });

    it('fails open when the directory does not exist', async () => {
      await expect(
        sweepTrajectoryUploadState({
          dir: path.join(dir, 'missing'),
          nowMs: NOW,
        }),
      ).resolves.toEqual({ deleted: 0, skipped: false });
    });

    it('never deletes a state file written just now', async () => {
      writeTrajectoryUploadState({
        dir,
        sessionId: 'live',
        state: { planRunId: undefined, scanOffset: 0, uploaded: [] },
      });

      const result = await sweepTrajectoryUploadState({
        dir,
        nowMs: Date.now(),
      });

      expect(result.deleted).toBe(0);
      expect(fs.existsSync(path.join(dir, 'live.json'))).toBe(true);
    });
  });
});

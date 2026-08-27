/**
 * @description Tests for EditorPresenceService: the stale-while-revalidate cache
 * (soft/hard TTL, in-flight coalescing, background refresh) wired over the
 * `detectEditorPresence` core, which is mocked here — no real filesystem probing.
 */

import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { EditorPresenceResult } from '@openthrottle/nestjs-repositories';
import { detectEditorPresence } from '@openthrottle/nestjs-repositories';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EditorPresenceService } from './editor-presence.service';

vi.mock('@openthrottle/nestjs-repositories', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openthrottle/nestjs-repositories')>();
  return { ...actual, detectEditorPresence: vi.fn() };
});

const detectEditorPresenceMock = vi.mocked(detectEditorPresence);

/** The real mixed case on the author's machine: Cursor present, VS Code absent. */
const SNAPSHOT: EditorPresenceResult = {
  editors: [
    { editor: 'cursor', presence: 'installed' },
    { editor: 'vscode', presence: 'not_found' },
  ],
  scannedAt: '2026-08-27T00:00:00.000Z',
  trusted: true,
};

/** A distinct snapshot so a background refresh is observable by identity. */
const REFRESHED: EditorPresenceResult = {
  ...SNAPSHOT,
  scannedAt: '2026-08-27T01:00:00.000Z',
};

/** What a containerized server produces — nothing claimed either way. */
const UNTRUSTED: EditorPresenceResult = {
  editors: [
    { editor: 'cursor', presence: 'unknown' },
    { editor: 'vscode', presence: 'unknown' },
  ],
  scannedAt: '2026-08-27T00:00:00.000Z',
  trusted: false,
};

/** Flush pending microtasks so a background refresh's stamping runs. */
async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

async function buildService(): Promise<EditorPresenceService> {
  const app = await Test.createTestingModule({
    providers: [
      EditorPresenceService,
      { provide: LoggerService, useValue: createMock<LoggerService>() },
    ],
  }).compile();
  return app.get(EditorPresenceService);
}

beforeEach(() => {
  detectEditorPresenceMock.mockReset();
  detectEditorPresenceMock.mockResolvedValue(SNAPSHOT);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  delete process.env.EDITOR_DETECTION_CACHE_TTL_MS;
  delete process.env.EDITOR_DETECTION_HARD_TTL_MS;
});

describe('EditorPresenceService', () => {
  it('runs a probe and returns the snapshot on a cold cache', async () => {
    const service = await buildService();
    const result = await service.detect();

    expect(result).toBe(SNAPSHOT);
    expect(detectEditorPresenceMock).toHaveBeenCalledTimes(1);
    expect(detectEditorPresenceMock.mock.calls[0][0]).toEqual({
      scannedAt: expect.any(String),
    });
  });

  it('serves the cached snapshot within the soft TTL window', async () => {
    const service = await buildService();
    const first = await service.detect();
    const second = await service.detect();

    expect(second).toBe(first);
    expect(detectEditorPresenceMock).toHaveBeenCalledTimes(1);
  });

  it('coalesces concurrent cold-cache callers into exactly one probe', async () => {
    const service = await buildService();

    // Hold the probe open so every concurrent caller arrives while it is still in
    // flight, then release it and assert only one sweep ever ran.
    let releaseProbe: (result: EditorPresenceResult) => void = () => {};
    detectEditorPresenceMock.mockReturnValueOnce(
      new Promise<EditorPresenceResult>((resolve) => {
        releaseProbe = resolve;
      }),
    );

    const inflight = [
      service.detect(),
      service.detect(),
      service.detect(),
      service.detect(),
      service.detect(),
    ];

    expect(detectEditorPresenceMock).toHaveBeenCalledTimes(1);

    releaseProbe(SNAPSHOT);
    const results = await Promise.all(inflight);

    expect(detectEditorPresenceMock).toHaveBeenCalledTimes(1);
    for (const result of results) {
      expect(result).toBe(SNAPSHOT);
    }
  });

  it('serves the stale snapshot and schedules one background refresh past the soft TTL', async () => {
    detectEditorPresenceMock.mockReset();
    detectEditorPresenceMock
      .mockResolvedValueOnce(SNAPSHOT)
      .mockResolvedValue(REFRESHED);

    const service = await buildService();
    vi.useFakeTimers();

    const first = await service.detect();
    expect(first).toBe(SNAPSHOT);
    expect(detectEditorPresenceMock).toHaveBeenCalledTimes(1);

    // Past the soft TTL (60s) but within the hard TTL (600s).
    vi.advanceTimersByTime(120_000);
    const stale = await service.detect();
    expect(stale).toBe(SNAPSHOT); // last-good, served synchronously
    expect(detectEditorPresenceMock).toHaveBeenCalledTimes(2); // one background probe

    await flush();
    const fresh = await service.detect();
    expect(fresh).toBe(REFRESHED);
    expect(detectEditorPresenceMock).toHaveBeenCalledTimes(2); // no extra probe
  });

  it('blocks on a fresh probe once past the hard TTL', async () => {
    detectEditorPresenceMock.mockReset();
    detectEditorPresenceMock
      .mockResolvedValueOnce(SNAPSHOT)
      .mockResolvedValue(REFRESHED);

    const service = await buildService();
    vi.useFakeTimers();

    await service.detect();
    vi.advanceTimersByTime(700_000); // past hard TTL (600s)
    const result = await service.detect();

    expect(result).toBe(REFRESHED); // freshly probed, not the stale snapshot
    expect(detectEditorPresenceMock).toHaveBeenCalledTimes(2);
  });

  it('honors EDITOR_DETECTION_CACHE_TTL_MS to shorten the fresh window', async () => {
    process.env.EDITOR_DETECTION_CACHE_TTL_MS = '1000';
    const service = await buildService();
    vi.useFakeTimers();

    await service.detect();
    expect(detectEditorPresenceMock).toHaveBeenCalledTimes(1);

    // Within the default 60s but past the overridden 1s soft TTL.
    vi.advanceTimersByTime(1_500);
    await service.detect();
    expect(detectEditorPresenceMock).toHaveBeenCalledTimes(2);
  });

  it('clamps a hard TTL below the soft TTL up to it', async () => {
    process.env.EDITOR_DETECTION_CACHE_TTL_MS = '10000';
    process.env.EDITOR_DETECTION_HARD_TTL_MS = '1000';
    detectEditorPresenceMock.mockReset();
    detectEditorPresenceMock
      .mockResolvedValueOnce(SNAPSHOT)
      .mockResolvedValue(REFRESHED);

    const service = await buildService();
    vi.useFakeTimers();

    await service.detect();
    // Inside the 10s soft window: still fresh, because the hard bound was clamped
    // up rather than expiring first and defeating stale-while-revalidate.
    vi.advanceTimersByTime(5_000);

    expect(await service.detect()).toBe(SNAPSHOT);
    expect(detectEditorPresenceMock).toHaveBeenCalledTimes(1);
  });

  it('invalidate() forces the next call to re-probe', async () => {
    detectEditorPresenceMock.mockReset();
    detectEditorPresenceMock
      .mockResolvedValueOnce(SNAPSHOT)
      .mockResolvedValue(REFRESHED);

    const service = await buildService();
    await service.detect();
    service.invalidate();

    expect(await service.detect()).toBe(REFRESHED);
    expect(detectEditorPresenceMock).toHaveBeenCalledTimes(2);
  });

  it('passes an untrusted snapshot through unchanged', async () => {
    // The service must not "helpfully" reinterpret unknown as not-found, and must not
    // fail on a probe that declined to make claims.
    detectEditorPresenceMock.mockReset();
    detectEditorPresenceMock.mockResolvedValue(UNTRUSTED);

    const service = await buildService();

    expect(await service.detect()).toBe(UNTRUSTED);
  });
});

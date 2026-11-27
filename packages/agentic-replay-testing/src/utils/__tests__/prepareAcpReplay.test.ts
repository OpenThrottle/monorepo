import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { CONVERSATION_STREAM_CHUNK_KINDS as KINDS } from '@openthrottle/agentic-conversation-backend';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CURSOR_RECORDING_PROFILE } from '../../config/config.backends.ts';
import { SCENARIOS } from '../../data/scenarios.ts';
import { toLiveUuid } from '../acp-replay-bin.ts';
import { answerPermissions } from '../answerPermissions.ts';
import { prepareAcpReplay, replayAcpFixture } from '../prepareAcpReplay.ts';
import { recordAcpScenario } from '../recordAcp.ts';
import { placeholderUuid } from '../sanitizer.ts';
import { writeFakeAcpAgent } from './fake-acp-agent.ts';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'replay-acp-'));
});

afterEach(() => {
  rmSync(dir, { force: true, recursive: true });
});

/** Record `stem` of a shared scenario against the fake agent; returns its path. */
async function recordFake(
  slug: string,
  stem: string,
  onChunk: Parameters<typeof recordAcpScenario>[0]['onChunk'] = undefined,
): Promise<string> {
  const scenario = SCENARIOS.find((candidate) => candidate.slug === slug);
  if (scenario === undefined) {
    throw new Error(`no scenario ${slug}`);
  }
  const outDir = join(dir, 'cursor', 'acp');
  const result = await recordAcpScenario({
    model: null,
    onChunk,
    outDir,
    profile: CURSOR_RECORDING_PROFILE,
    realBin: writeFakeAcpAgent(dir),
    scenario,
    stems: [stem],
  });
  if (!result.ok) {
    throw new Error(result.error);
  }
  return join(outDir, `${stem}.ndjson`);
}

/** A copy of a transcript with `from` replaced by `to`. */
function tamper(path: string, from: string, to: string): string {
  const text = readFileSync(path, 'utf8');
  if (!text.includes(from)) {
    throw new Error(`${from} is not in ${path}`);
  }
  const copy = join(dir, 'tampered.ndjson');
  writeFileSync(copy, text.replace(from, to), 'utf8');
  return copy;
}

const textOf = (
  chunks: ReadonlyArray<{ readonly delta: string; readonly kind: string }>,
): string => {
  return chunks
    .filter((chunk) => chunk.kind === KINDS.text)
    .map((chunk) => chunk.delta)
    .join('');
};

describe('replayAcpFixture', () => {
  describe('a simple turn', () => {
    it('replays through the production backend and matches every client frame', async () => {
      const path = await recordFake('simple-turn', 'simple-turn');

      const result = await replayAcpFixture({
        fixturePath: path,
        idleTtlMs: undefined,
        onChunk: undefined,
      });

      expect(result.report).toEqual({ ok: true });
      expect(result.exited).toBe(true);
      expect(textOf(result.chunks[0] ?? [])).toBe('pong');
    });
  });

  describe('a warm two-turn resume', () => {
    it('replays both turns on one process with the session id echoed back', async () => {
      const path = await recordFake('resume', 'resume');

      const result = await replayAcpFixture({
        fixturePath: path,
        idleTtlMs: undefined,
        onChunk: undefined,
      });

      expect(result.chunks).toHaveLength(2);
      expect(result.report).toEqual({ ok: true });
      expect(textOf(result.chunks[1] ?? [])).toBe('pong');
    });
  });

  describe('turn N on a fresh process', () => {
    it('resumes with session/load and matches', async () => {
      const path = await recordFake('resume', 'resume.turn-2');
      const prepared = prepareAcpReplay(path);

      const result = await replayAcpFixture({
        fixturePath: path,
        idleTtlMs: undefined,
        onChunk: undefined,
      });

      expect(prepared.turns).toHaveLength(1);
      expect(prepared.turns[0]?.turnIndex).toBe(1);
      expect(prepared.conversation.sessionId).toBe(
        toLiveUuid(placeholderUuid(1)),
      );
      expect(result.report).toEqual({ ok: true });
      prepared.dispose();
    });
  });

  describe('a cancel mid-stream', () => {
    it('asserts session/cancel in order and ends cancelled', async () => {
      const path = await recordFake('interrupt', 'interrupt');

      const result = await replayAcpFixture({
        fixturePath: path,
        idleTtlMs: undefined,
        onChunk: undefined,
      });
      const methods = result.transcript.frames.map((frame) => {
        return String(frame.message.method);
      });

      expect(methods).toContain('session/cancel');
      expect(result.report).toEqual({ ok: true });
    });
  });

  describe('a supervised permission request', () => {
    it('replays when the test answers as the recording did', async () => {
      const path = await recordFake(
        'permission-denied',
        'permission-denied',
        answerPermissions('allow'),
      );

      const result = await replayAcpFixture({
        fixturePath: path,
        idleTtlMs: undefined,
        onChunk: answerPermissions('allow'),
      });
      const kinds = (result.chunks[0] ?? []).map((chunk) => chunk.kind);

      expect(kinds).toContain(KINDS.permissionRequest);
      expect(result.report).toEqual({ ok: true });
    });

    it('fails with an rpc report when the answer differs', async () => {
      const path = await recordFake(
        'permission-denied',
        'permission-denied',
        answerPermissions('allow'),
      );

      const result = await replayAcpFixture({
        fixturePath: path,
        idleTtlMs: undefined,
        onChunk: answerPermissions('reject'),
      });

      expect(result.report).toMatchObject({ kind: 'rpc', ok: false });
    });
  });

  describe('when the client sends different params than recorded', () => {
    it('fails loudly with an rpc report naming both frames', async () => {
      const path = await recordFake('simple-turn', 'simple-turn');
      const drifted = tamper(
        path,
        'Reply with exactly: pong',
        'Reply with exactly: ping',
      );

      const result = await replayAcpFixture({
        fixturePath: drifted,
        idleTtlMs: undefined,
        onChunk: undefined,
      });

      expect(result.exited).toBe(true);
      expect(result.report).toMatchObject({
        expected: { method: 'session/prompt' },
        kind: 'rpc',
        ok: false,
        received: { method: 'session/prompt' },
      });
      expect(JSON.stringify(result.report)).toContain('ping');
    });
  });

  describe('when the spawn args differ', () => {
    it('fails with an argv report', async () => {
      const path = await recordFake('simple-turn', 'simple-turn');
      const drifted = tamper(path, '"argv":["acp"]', '"argv":["acp","--x"]');

      const result = await replayAcpFixture({
        fixturePath: drifted,
        idleTtlMs: undefined,
        onChunk: undefined,
      });

      expect(result.report).toMatchObject({ kind: 'argv', ok: false });
    });
  });
});

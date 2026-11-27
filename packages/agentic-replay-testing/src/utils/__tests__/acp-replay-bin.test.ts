import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { AcpFrame, AcpTranscript } from '../../types/transcript.ts';
import {
  TRANSCRIPT_LINE_TYPES,
  TRANSCRIPT_PROTOCOLS,
  TRANSCRIPT_SCHEMA_VERSION,
  TRANSCRIPT_SURFACES,
} from '../../types/transcript.ts';
import type { AcpReplayBin } from '../installAcpReplayBin.ts';
import { installAcpReplayBin } from '../installAcpReplayBin.ts';
import { REPLAY_MISMATCH_EXIT_CODE } from '../replay-bin.ts';
import { serializeTranscript } from '../transcript.ts';

let dir: string;
let installed: AcpReplayBin[];

const FRAMES: AcpFrame[] = [
  { from: 'client', message: { id: 0, jsonrpc: '2.0', method: 'initialize' } },
  { from: 'agent', message: { id: 0, jsonrpc: '2.0', result: { ok: true } } },
  { from: 'client', message: { id: 1, jsonrpc: '2.0', method: 'ping' } },
  { from: 'agent', message: { id: 1, jsonrpc: '2.0', result: {} } },
];

const TRANSCRIPT: AcpTranscript = {
  argv: ['acp'],
  exit: { code: null, signal: 'SIGTERM' },
  frames: FRAMES,
  header: {
    backend: 'fake',
    cliVersion: '1.0.0',
    model: null,
    protocol: TRANSCRIPT_PROTOCOLS.acp,
    recordedAt: '2026-11-26T00:00:00.000Z',
    scenario: 'simple-turn',
    schemaVersion: TRANSCRIPT_SCHEMA_VERSION,
    surface: TRANSCRIPT_SURFACES.conversation,
    type: TRANSCRIPT_LINE_TYPES.header,
  },
  protocol: TRANSCRIPT_PROTOCOLS.acp,
  stderr: '',
};

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'acp-replay-bin-'));
  installed = [];
});

afterEach(() => {
  installed.forEach((replay) => replay.dispose());
  rmSync(dir, { force: true, recursive: true });
});

interface BinRun {
  readonly code: number | null;
  readonly replay: AcpReplayBin;
  readonly stderr: string;
  readonly stdout: string;
}

/** Run the bin, write `input` lines, optionally end stdin, and collect it. */
async function run(
  input: readonly object[],
  options: { readonly args: readonly string[]; readonly end: boolean },
): Promise<BinRun> {
  const path = join(dir, 'transcript.ndjson');
  writeFileSync(path, serializeTranscript(TRANSCRIPT), 'utf8');
  const replay = installAcpReplayBin(path, []);
  installed.push(replay);

  const child = spawn(replay.bin, [...options.args], { cwd: dir });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (data: Buffer) => {
    stdout += data.toString('utf8');
  });
  child.stderr.on('data', (data: Buffer) => {
    stderr += data.toString('utf8');
  });
  const closed = new Promise<number | null>((resolve) => {
    child.on('close', resolve);
  });

  for (const frame of input) {
    child.stdin.write(`${JSON.stringify(frame)}\n`);
  }
  if (options.end) {
    child.stdin.end();
  } else {
    await replay.waitForExit(10_000);
    child.kill('SIGTERM');
  }
  const code = await closed;
  return { code, replay, stderr, stdout };
}

describe('runAcpReplayBin', () => {
  describe('when the client matches the whole script', () => {
    it('replies with the live id and exits 0 on a recorded SIGTERM end', async () => {
      const result = await run(
        [
          { id: 'live-a', jsonrpc: '2.0', method: 'initialize' },
          { id: 'live-b', jsonrpc: '2.0', method: 'ping' },
        ],
        { args: ['acp'], end: true },
      );

      expect(result.code).toBe(0);
      expect(result.replay.readReport()).toEqual({ ok: true });
      expect(
        result.stdout
          .trim()
          .split('\n')
          .map((line) => JSON.parse(line).id),
      ).toEqual(['live-a', 'live-b']);
    });
  });

  describe('when stdin closes before the script is done', () => {
    it('reports incomplete with the next expected frame and exits 97', async () => {
      const result = await run(
        [{ id: 5, jsonrpc: '2.0', method: 'initialize' }],
        { args: ['acp'], end: true },
      );

      expect(result.code).toBe(REPLAY_MISMATCH_EXIT_CODE);
      expect(result.replay.readReport()).toEqual({
        expected: FRAMES[2]?.message,
        index: 2,
        kind: 'incomplete',
        ok: false,
      });
    });
  });

  describe('when the client sends a frame after the script ended', () => {
    it('reports an rpc mismatch with expected null and streams nothing more', async () => {
      const result = await run(
        [
          { id: 0, jsonrpc: '2.0', method: 'initialize' },
          { id: 1, jsonrpc: '2.0', method: 'ping' },
          { id: 2, jsonrpc: '2.0', method: 'extra' },
        ],
        { args: ['acp'], end: false },
      );

      expect(result.code).toBe(REPLAY_MISMATCH_EXIT_CODE);
      expect(result.replay.readReport()).toMatchObject({
        expected: null,
        index: 4,
        kind: 'rpc',
      });
      expect(result.stdout.trim().split('\n')).toHaveLength(2);
      expect(result.stderr).toContain('outbound rpc mismatch');
    });
  });

  describe('when a frame differs', () => {
    it('streams nothing for the mismatched step', async () => {
      const result = await run([{ id: 0, jsonrpc: '2.0', method: 'wrong' }], {
        args: ['acp'],
        end: false,
      });

      expect(result.code).toBe(REPLAY_MISMATCH_EXIT_CODE);
      expect(result.stdout).toBe('');
      expect(result.replay.readReport()).toMatchObject({
        index: 0,
        kind: 'rpc',
      });
    });
  });
});

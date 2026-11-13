import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { CONVERSATION_STREAM_CHUNK_KINDS } from '@openthrottle/openthrottle-agentic-utils';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CLAUDE_RECORDING_PROFILE } from '../../../config/config.backends.ts';
import {
  type Transcript,
  TRANSCRIPT_LINE_TYPES,
  TRANSCRIPT_SCHEMA_VERSION,
  TRANSCRIPT_SURFACES,
} from '../../../types/transcript.ts';
import { serializeTranscript } from '../../transcript/transcript.ts';
import { installReplayBin, type ReplayBin } from '../installReplayBin.ts';
import { replayFixturePath } from '../prepare-replay.ts';
import {
  compareOutbound,
  REPLAY_MISMATCH_EXIT_CODE,
  wasTerminated,
} from '../replay-bin.ts';
import { replayFixture } from '../replayFixture.ts';

/** ~1 MB of stdout: enough to outlast a 64 KB pipe buffer many times over. */
const LONG_RECORDING_LINES = 30_000;

let dir: string;
let installed: ReplayBin[];

const TRANSCRIPT: Transcript = {
  argv: ['--print', '--add-dir', '<CWD>/docs', '--', 'hi'],
  exit: { code: 0, signal: null },
  header: {
    backend: 'fake',
    cliVersion: '1.0.0',
    model: null,
    recordedAt: '2026-11-07T00:00:00.000Z',
    scenario: 'simple-turn',
    schemaVersion: TRANSCRIPT_SCHEMA_VERSION,
    surface: TRANSCRIPT_SURFACES.conversation,
    type: TRANSCRIPT_LINE_TYPES.header,
  },
  stderr: 'warned\n',
  stdin: '',
  stdout: ['{"type":"a"}', '{"type":"b"}'],
};

const install = (transcript: Transcript): ReplayBin => {
  const path = join(dir, 'transcript.ndjson');
  writeFileSync(path, serializeTranscript(transcript), 'utf8');
  const replay = installReplayBin(path);
  installed.push(replay);
  return replay;
};

interface SpawnResult {
  readonly code: number | null;
  readonly stderr: string;
  readonly stdout: string;
}

const run = (
  bin: string,
  argv: readonly string[],
  options: { readonly onStdout?: (kill: () => void) => void } = {},
): Promise<SpawnResult> => {
  const child = spawn(bin, argv, {
    cwd: dir,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  // One signal, like a backend aborting a turn. Killing on every chunk races
  // the child's exit: a second SIGTERM landing after its handlers are torn
  // down kills it by signal (`code: null`), which CI load made flaky.
  let killed = false;
  const kill = (): void => {
    if (!killed) {
      killed = true;
      child.kill('SIGTERM');
    }
  };
  child.stdout.on('data', (data: Buffer) => {
    stdout += data.toString('utf8');
    options.onStdout?.(kill);
  });
  child.stderr.on('data', (data: Buffer) => {
    stderr += data.toString('utf8');
  });
  return new Promise((resolve) => {
    child.on('close', (code) => resolve({ code, stderr, stdout }));
  });
};

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'replay-bin-'));
  installed = [];
});

afterEach(() => {
  for (const replay of installed) {
    replay.dispose();
  }
  rmSync(dir, { force: true, recursive: true });
});

describe('compareOutbound', () => {
  it('accepts identical traffic', () => {
    expect(
      compareOutbound(TRANSCRIPT, { argv: TRANSCRIPT.argv, stdin: '' }),
    ).toEqual({ ok: true });
  });

  describe('when the argv differs', () => {
    it('reports both sides', () => {
      expect(
        compareOutbound(TRANSCRIPT, { argv: ['--print'], stdin: '' }),
      ).toEqual({
        expected: TRANSCRIPT.argv,
        kind: 'argv',
        ok: false,
        received: ['--print'],
      });
    });
  });

  describe('when the stdin differs', () => {
    it('reports both sides', () => {
      expect(
        compareOutbound(TRANSCRIPT, { argv: TRANSCRIPT.argv, stdin: 'x' }),
      ).toMatchObject({ kind: 'stdin', ok: false });
    });
  });
});

describe('wasTerminated', () => {
  it.each([
    [{ code: 143, signal: null }, true],
    [{ code: 130, signal: null }, true],
    [{ code: null, signal: 'SIGTERM' }, true],
    [{ code: 1, signal: null }, false],
    [{ code: 0, signal: null }, false],
  ])('%j → %s', (exit, expected) => {
    expect(wasTerminated({ ...TRANSCRIPT, exit })).toBe(expected);
  });
});

describe('the replay bin', () => {
  describe('when the argv matches after path normalization', () => {
    it('emits the recorded output and exit', async () => {
      const replay = install({
        ...TRANSCRIPT,
        exit: { code: 3, signal: null },
      });

      const result = await run(replay.bin, [
        '--print',
        '--add-dir',
        join(dir, 'docs'),
        '--',
        'hi',
      ]);

      expect(result).toEqual({
        code: 3,
        stderr: 'warned\n',
        stdout: '{"type":"a"}\n{"type":"b"}\n',
      });
      expect(replay.readReport()).toEqual({ ok: true });
    });
  });

  describe('when the argv does not match', () => {
    it('emits nothing and exits with the mismatch code', async () => {
      const replay = install(TRANSCRIPT);

      const result = await run(replay.bin, ['--print', '--', 'changed']);

      expect(result.code).toBe(REPLAY_MISMATCH_EXIT_CODE);
      expect(result.stdout).toBe('');
      expect(result.stderr).toContain('outbound argv mismatch');
      expect(replay.readReport()).toMatchObject({ kind: 'argv', ok: false });
    });
  });

  describe('when the recorded CLI was terminated', () => {
    it('waits for the signal, then exits with the recorded code', async () => {
      const replay = install({
        ...TRANSCRIPT,
        argv: ['go'],
        exit: { code: 143, signal: null },
      });

      const result = await run(replay.bin, ['go'], {
        onStdout: (kill) => kill(),
      });

      expect(result.code).toBe(143);
    });
  });

  describe('when a CLI that exited normally is signalled mid-replay', () => {
    it('still replays the whole recording and its exit code', async () => {
      // Far past a pipe buffer, so the bin is provably still writing when the
      // signal lands. A two-line recording can finish and start exiting first,
      // and a signal during exit kills any process — that race is not the bin's.
      const stdout = Array.from(
        { length: LONG_RECORDING_LINES },
        (_, index) => {
          return `{"type":"line","index":${index}}`;
        },
      );
      const replay = install({ ...TRANSCRIPT, argv: ['go'], stdout });

      const result = await run(replay.bin, ['go'], {
        onStdout: (kill) => kill(),
      });

      expect(result).toEqual({
        code: 0,
        stderr: 'warned\n',
        stdout: `${stdout.join('\n')}\n`,
      });
    });
  });

  describe('before it ever runs', () => {
    it('has no report', () => {
      expect(install(TRANSCRIPT).readReport()).toBeNull();
    });
  });
});

describe('replayFixture through the production claude backend', () => {
  it('drives the backend through its *_BIN override', async () => {
    const result = await replayFixture({
      fixturePath: replayFixturePath('claude', 'simple-turn'),
      profile: CLAUDE_RECORDING_PROFILE,
    });

    expect(result.report).toEqual({ ok: true });
    const text = result.chunks
      .filter((chunk) => chunk.kind === CONVERSATION_STREAM_CHUNK_KINDS.text)
      .map((chunk) => chunk.delta)
      .join('');
    expect(text).toBe('pong');
    expect(result.chunks.at(-1)).toMatchObject({ done: true, error: null });
  });

  describe('when the argv builder drifts from the recording', () => {
    it('fails loudly instead of streaming the recording', async () => {
      const path = join(dir, 'drifted.ndjson');
      const original = readFileSync(
        replayFixturePath('claude', 'simple-turn'),
        'utf8',
      );
      writeFileSync(
        path,
        original.replace('"--include-partial-messages",', ''),
        'utf8',
      );

      const result = await replayFixture({
        fixturePath: path,
        profile: CLAUDE_RECORDING_PROFILE,
      });

      expect(result.report).toMatchObject({ kind: 'argv', ok: false });
      expect(result.chunks.at(-1)?.error).toEqual(expect.any(String));
    });
  });
});

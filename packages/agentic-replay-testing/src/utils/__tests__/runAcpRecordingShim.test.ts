import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { isRecord } from '@openthrottle/nodejs-utils';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { AcpTranscript } from '../../types/transcript.ts';
import { TRANSCRIPT_PROTOCOLS } from '../../types/transcript.ts';
import { placeholderUuid, REDACTED } from '../sanitizer.ts';
import { writeNodeBin } from '../stub-bin.ts';
import { parseTranscript } from '../transcript.ts';
import { FAKE_SESSION_ID, writeFakeAcpAgent } from './fake-acp-agent.ts';

const SHIM_PATH = fileURLToPath(
  new URL('../runAcpRecordingShim.ts', import.meta.url),
);

const HEADER = JSON.stringify({
  backend: 'fake',
  cliVersion: '1.2.3',
  model: null,
  protocol: TRANSCRIPT_PROTOCOLS.acp,
  recordedAt: '2026-11-26T00:00:00.000Z',
  scenario: 'shim',
  schemaVersion: 1,
  surface: 'conversation',
  type: 'header',
});

/** One scripted client frame, sent once `after` has appeared on stdout. */
interface Step {
  readonly after: string;
  readonly frame: object;
}

let dir: string;
let cwd: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'acp-shim-'));
  cwd = mkdtempSync(join(tmpdir(), 'acp-shim-cwd-'));
});

afterEach(() => {
  rmSync(dir, { force: true, recursive: true });
  rmSync(cwd, { force: true, recursive: true });
});

const installShim = (capturePath: string, name: string): string => {
  return writeNodeBin({
    dir,
    entry: 'runAcpRecordingShim',
    modulePath: SHIM_PATH,
    name,
    options: { capturePath, realBin: writeFakeAcpAgent(dir), redactKeys: [] },
  });
};

/** The client script of a full turn that raises one permission request. */
const turnScript = (): Step[] => {
  return [
    {
      after: '',
      frame: {
        id: 41,
        jsonrpc: '2.0',
        method: 'initialize',
        params: { protocolVersion: 1 },
      },
    },
    {
      after: 'protocolVersion',
      frame: {
        id: 42,
        jsonrpc: '2.0',
        method: 'session/new',
        params: {
          cwd,
          mcpServers: [
            {
              command: 'node',
              env: [{ name: 'TOKEN', value: 'hunter2' }],
              name: 'ot',
            },
          ],
        },
      },
    },
    {
      after: FAKE_SESSION_ID,
      frame: {
        id: 43,
        jsonrpc: '2.0',
        method: 'session/prompt',
        params: {
          prompt: [{ text: 'please ASK me', type: 'text' }],
          sessionId: FAKE_SESSION_ID,
        },
      },
    },
    {
      after: 'session/request_permission',
      frame: {
        id: 900,
        jsonrpc: '2.0',
        result: { outcome: { optionId: 'allow', outcome: 'selected' } },
      },
    },
  ];
};

interface ShimRun {
  readonly code: number | null;
  readonly stdout: string;
}

/**
 * Run the shim in `cwd` against the fake agent: send each step once its
 * `after` text has come back, end stdin once `endAfter` has.
 */
async function runShim(
  capturePath: string,
  steps: readonly Step[],
  endAfter: string,
): Promise<ShimRun> {
  const child = spawn(installShim(capturePath, 'shim'), ['acp', '--banner'], {
    cwd,
    stdio: 'pipe',
  });
  let stdout = '';
  let next = 0;

  const advance = (): void => {
    const step = steps[next];
    if (step === undefined) {
      if (stdout.includes(endAfter)) {
        child.stdin.end();
      }
      return;
    }
    if (stdout.includes(step.after)) {
      next += 1;
      child.stdin.write(`${JSON.stringify(step.frame)}\n`);
      advance();
    }
  };

  child.stdout.on('data', (data: Buffer) => {
    stdout += data.toString('utf8');
    advance();
  });
  advance();

  const code = await new Promise<number | null>((resolve) => {
    child.on('close', resolve);
  });
  return { code, stdout };
}

const readAcpTranscript = (capturePath: string): AcpTranscript => {
  const parsed = parseTranscript(
    `${HEADER}\n${readFileSync(capturePath, 'utf8')}`,
  );
  if (!parsed.ok || parsed.transcript.protocol !== TRANSCRIPT_PROTOCOLS.acp) {
    throw new Error('expected an acp transcript');
  }
  return parsed.transcript;
};

describe('runAcpRecordingShim', () => {
  describe('a full turn with a permission request', () => {
    it('records frames in wire order with per-direction ids, then stderr and exit', async () => {
      const capturePath = join(dir, 'capture.ndjson');

      const run = await runShim(capturePath, turnScript(), '"end_turn"');
      const transcript = readAcpTranscript(capturePath);
      const summary = transcript.frames.map((frame) => {
        const { id, method } = frame.message;
        return `${frame.from} ${String(method ?? 'response')} ${String(id ?? '-')}`;
      });

      expect(run.code).toBe(0);
      expect(transcript.argv).toEqual(['acp', '--banner']);
      expect(transcript.exit).toEqual({ code: 0, signal: null });
      expect(summary).toEqual([
        'client initialize 0',
        'agent response 0',
        'client session/new 1',
        'agent response 1',
        'client session/prompt 2',
        'agent session/update -',
        'agent session/request_permission 0',
        'client response 0',
        'agent session/update -',
        'agent response 2',
      ]);
    });

    it('keeps stderr and a non-JSON stdout line on stderr', async () => {
      const capturePath = join(dir, 'capture.ndjson');

      await runShim(capturePath, turnScript(), '"end_turn"');
      const transcript = readAcpTranscript(capturePath);

      expect(transcript.stderr).toContain('fake-acp ready in <CWD>');
      expect(transcript.stderr).toContain('fake-acp banner (not json)');
    });

    it('strips _meta, redacts mcp env, maps UUIDs and tokenizes the cwd', async () => {
      const capturePath = join(dir, 'capture.ndjson');

      await runShim(capturePath, turnScript(), '"end_turn"');
      const text = readFileSync(capturePath, 'utf8');
      const sessionNew = text.split('\n').find((line) => {
        return line.includes('session/new');
      });

      expect(text).not.toContain('_meta');
      expect(text).not.toContain('hunter2');
      expect(text).not.toContain(FAKE_SESSION_ID);
      expect(text).not.toContain(cwd);
      expect(text).toContain(placeholderUuid(1));
      expect(sessionNew).toContain('"cwd":"<CWD>"');
      expect(sessionNew).toContain(`"value":"${REDACTED}"`);
    });
  });

  it('passes the agent output through to our stdout untouched', async () => {
    const capturePath = join(dir, 'capture.ndjson');
    const steps: Step[] = [
      { after: '', frame: { id: 1, jsonrpc: '2.0', method: 'initialize' } },
    ];

    const run = await runShim(capturePath, steps, 'protocolVersion');

    expect(run.stdout).toContain('fake-acp banner (not json)');
    expect(run.stdout).toContain('"_meta"');
  });

  it('records the signal when the agent is terminated', async () => {
    const capturePath = join(dir, 'capture.ndjson');
    const child = spawn(
      installShim(capturePath, 'shim-term'),
      ['acp', '--banner'],
      {
        cwd,
        stdio: 'pipe',
      },
    );
    await new Promise<void>((resolve) => {
      child.stdout.once('data', () => resolve());
    });

    child.kill('SIGTERM');
    await new Promise<void>((resolve) => {
      child.on('close', () => resolve());
    });
    const last: unknown = JSON.parse(
      readFileSync(capturePath, 'utf8').trim().split('\n').at(-1) ?? '{}',
    );

    expect(isRecord(last) ? last : {}).toMatchObject({
      signal: 'SIGTERM',
      type: 'exit',
    });
  });
});

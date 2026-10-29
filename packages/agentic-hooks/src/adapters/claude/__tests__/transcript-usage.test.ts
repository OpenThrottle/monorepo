/**
 * The Stop-time reader: checkpointed incremental reads of the main and subagent
 * transcripts, against a fake GraphQL server and a temp telemetry directory.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { HookFetch } from '../../../index.ts';
import { defaultTokenUsageJsonlPath, readCheckpoint } from '../../../index.ts';
import {
  captureTranscriptUsage,
  listSubagentTranscripts,
} from '../transcript-usage.ts';

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
);

const SESSION = '00000000-0000-4000-8000-000000000001';
const AGENT_FILE = 'agent-a39ec7aafbeffa589.jsonl';
const URL = 'http://example.test/graphql';

const readFixture = (name: string): string =>
  fs.readFileSync(path.join(fixturesDir, name), 'utf8');

/** The main fixture up to its last COMPLETE line (its tail is a partial write). */
const completeTranscript = (): string => {
  const raw = readFixture('transcript.jsonl');
  return raw.slice(0, raw.lastIndexOf('\n') + 1);
};

const isRecordValue = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

interface FakeServer {
  readonly fetchImpl: HookFetch;
  /** Every request id posted, in order, across all calls. */
  readonly requestIds: string[];
}

const fakeServer = (): FakeServer => {
  const requestIds: string[] = [];
  const fetchImpl: HookFetch = async (_url, init) => {
    const parsed: unknown = JSON.parse(init.body);
    const rows: unknown =
      isRecordValue(parsed) &&
      isRecordValue(parsed.variables) &&
      isRecordValue(parsed.variables.input)
        ? parsed.variables.input.rows
        : [];
    const list = Array.isArray(rows) ? rows : [];
    for (const row of list) {
      if (isRecordValue(row) && typeof row.requestId === 'string') {
        requestIds.push(row.requestId);
      }
    }
    return {
      json: async () => ({
        data: { recordTokenUsage: { inserted: list.length, skipped: 0 } },
      }),
      ok: true,
      status: 200,
    };
  };
  return { fetchImpl, requestIds };
};

describe('captureTranscriptUsage', () => {
  let tmpRoot: string;
  let projectDir: string;
  let transcriptPath: string;
  let subagentPath: string;
  let telemetryDir: string;
  let prevDir: string | undefined;
  let prevOffline: string | undefined;

  const stop = (
    server: FakeServer,
    overrides: { agentTranscriptPath?: string | null } = {},
  ) =>
    captureTranscriptUsage({
      agentTranscriptPath: overrides.agentTranscriptPath ?? null,
      authToken: 'tok',
      fetchImpl: server.fetchImpl,
      graphqlUrl: URL,
      repoRoot: tmpRoot,
      sessionId: SESSION,
      timeoutMs: 200,
      transcriptPath,
    });

  /** The fixture as it is while a line is still being written: no final newline. */
  const writeMidWrite = (name: string, filePath: string): number => {
    const contents = readFixture(name).replace(/\n$/, '');
    fs.writeFileSync(filePath, contents);
    return Buffer.byteLength(contents.slice(0, contents.lastIndexOf('\n') + 1));
  };

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'transcript-usage-'));
    projectDir = path.join(tmpRoot, 'projects', '-repo');
    transcriptPath = path.join(projectDir, `${SESSION}.jsonl`);
    subagentPath = path.join(projectDir, SESSION, 'subagents', AGENT_FILE);
    telemetryDir = path.join(tmpRoot, 'telemetry');
    fs.mkdirSync(path.dirname(subagentPath), { recursive: true });
    prevDir = process.env.OPENTHROTTLE_TELEMETRY_DIR;
    prevOffline = process.env.OPENTHROTTLE_TELEMETRY_OFFLINE;
    process.env.OPENTHROTTLE_TELEMETRY_DIR = telemetryDir;
    delete process.env.OPENTHROTTLE_TELEMETRY_OFFLINE;
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { force: true, recursive: true });
    if (prevDir === undefined) {
      delete process.env.OPENTHROTTLE_TELEMETRY_DIR;
    } else {
      process.env.OPENTHROTTLE_TELEMETRY_DIR = prevDir;
    }
    if (prevOffline === undefined) {
      delete process.env.OPENTHROTTLE_TELEMETRY_OFFLINE;
    } else {
      process.env.OPENTHROTTLE_TELEMETRY_OFFLINE = prevOffline;
    }
  });

  describe('the main transcript', () => {
    it('sends one row per requestId, not per line', async () => {
      fs.writeFileSync(transcriptPath, readFixture('transcript.jsonl'));
      const server = fakeServer();
      const result = await stop(server);
      expect(server.requestIds.sort()).toEqual([
        'req_011CgX32Y1Gy7Y96x6yHPSUS',
        'req_011CgX363EH4ZerFdokkUo5g',
      ]);
      expect(result).toEqual({ advanced: true, filesRead: 1, records: 2 });
    });

    it('does nothing when the transcript is missing', async () => {
      const server = fakeServer();
      await expect(stop(server)).resolves.toEqual({
        advanced: false,
        filesRead: 0,
        records: 0,
      });
      expect(server.requestIds).toEqual([]);
    });

    it('does nothing when the payload carried no transcript path', async () => {
      const server = fakeServer();
      await expect(
        captureTranscriptUsage({
          agentTranscriptPath: null,
          fetchImpl: server.fetchImpl,
          graphqlUrl: URL,
          repoRoot: tmpRoot,
          sessionId: SESSION,
          transcriptPath: null,
        }),
      ).resolves.toMatchObject({ records: 0 });
    });

    it('does not throw when the transcript path is a directory', async () => {
      fs.mkdirSync(transcriptPath);
      await expect(stop(fakeServer())).resolves.toMatchObject({ records: 0 });
    });
  });

  describe('a line still being written', () => {
    it('is not consumed, and the checkpoint stops before it', async () => {
      const consumed = writeMidWrite('transcript.jsonl', transcriptPath);
      const server = fakeServer();
      await stop(server);
      expect(server.requestIds).toHaveLength(2);
      expect(
        readCheckpoint({ filePath: transcriptPath, sessionId: SESSION })
          ?.offset,
      ).toBe(consumed);
    });

    it('is picked up by a later Stop once the line is complete', async () => {
      const late = JSON.stringify({
        message: {
          model: 'claude-opus-5-5',
          usage: { input_tokens: 5, output_tokens: 7 },
        },
        requestId: 'req_late',
        sessionId: SESSION,
        timestamp: '2026-10-29T20:00:00.000Z',
        type: 'assistant',
      });
      const half = Math.floor(late.length / 2);
      writeMidWrite('transcript.jsonl', transcriptPath);
      fs.appendFileSync(transcriptPath, `\n${late.slice(0, half)}`);

      const server = fakeServer();
      await stop(server);
      expect(server.requestIds).not.toContain('req_late');

      fs.appendFileSync(transcriptPath, `${late.slice(half)}\n`);
      await stop(server);
      expect(server.requestIds.filter((id) => id === 'req_late')).toHaveLength(
        1,
      );
    });
  });

  describe('consecutive Stops on the same session', () => {
    it('send each requestId once', async () => {
      fs.writeFileSync(transcriptPath, readFixture('transcript.jsonl'));
      fs.writeFileSync(subagentPath, readFixture('subagent-transcript.jsonl'));
      const server = fakeServer();

      await stop(server);
      const second = await stop(server);

      expect(server.requestIds).toHaveLength(3);
      expect(new Set(server.requestIds).size).toBe(3);
      expect(second).toEqual({ advanced: false, filesRead: 0, records: 0 });
    });

    it('only send what the transcript gained in between', async () => {
      fs.writeFileSync(transcriptPath, completeTranscript());
      const server = fakeServer();
      await stop(server);

      fs.appendFileSync(
        transcriptPath,
        `${JSON.stringify({
          message: {
            model: 'claude-opus-5-5',
            usage: { input_tokens: 1, output_tokens: 1 },
          },
          requestId: 'req_next',
          sessionId: SESSION,
          timestamp: '2026-10-29T21:00:00.000Z',
          type: 'assistant',
        })}\n`,
      );
      await stop(server);

      expect(server.requestIds).toHaveLength(3);
      expect(server.requestIds.at(-1)).toBe('req_next');
    });
  });

  describe('subagent transcripts', () => {
    it('are read from the session directory on a plain Stop', async () => {
      fs.writeFileSync(subagentPath, readFixture('subagent-transcript.jsonl'));
      const server = fakeServer();
      await stop(server);
      expect(server.requestIds).toEqual(['req_011CgX4S15DkvVbhqN7exZmg']);
    });

    it('are read from agent_transcript_path alone, with no directory to list', async () => {
      const elsewhere = path.join(tmpRoot, 'elsewhere.jsonl');
      fs.writeFileSync(elsewhere, readFixture('subagent-transcript.jsonl'));
      const server = fakeServer();
      await stop(server, { agentTranscriptPath: elsewhere });
      expect(server.requestIds).toEqual(['req_011CgX4S15DkvVbhqN7exZmg']);
    });

    it('are not read twice when agent_transcript_path is also in the directory', async () => {
      fs.writeFileSync(subagentPath, readFixture('subagent-transcript.jsonl'));
      const server = fakeServer();
      await stop(server, { agentTranscriptPath: subagentPath });
      expect(server.requestIds).toHaveLength(1);
    });

    it('each keep their own checkpoint', async () => {
      fs.writeFileSync(transcriptPath, readFixture('transcript.jsonl'));
      fs.writeFileSync(subagentPath, readFixture('subagent-transcript.jsonl'));
      await stop(fakeServer());
      expect(
        readCheckpoint({ filePath: transcriptPath, sessionId: SESSION })
          ?.offset,
      ).toBe(Buffer.byteLength(completeTranscript()));
      expect(
        readCheckpoint({ filePath: subagentPath, sessionId: SESSION })?.offset,
      ).toBe(Buffer.byteLength(readFixture('subagent-transcript.jsonl')));
    });

    it('ignore files in the subagents directory that are not agent transcripts', () => {
      fs.writeFileSync(subagentPath, '');
      fs.writeFileSync(path.join(path.dirname(subagentPath), 'notes.txt'), '');
      fs.writeFileSync(path.join(path.dirname(subagentPath), 'x.jsonl'), '');
      expect(listSubagentTranscripts(transcriptPath)).toEqual([subagentPath]);
    });

    it('list nothing when the session has no subagents directory', () => {
      expect(listSubagentTranscripts('/nonexistent/s.jsonl')).toEqual([]);
    });
  });

  describe('when the server cannot be reached', () => {
    it('buffers the rows locally and still moves the checkpoint', async () => {
      process.env.OPENTHROTTLE_TELEMETRY_OFFLINE = '1';
      fs.writeFileSync(transcriptPath, readFixture('transcript.jsonl'));
      const server = fakeServer();

      const first = await stop(server);
      const second = await stop(server);

      expect(server.requestIds).toEqual([]);
      expect(first).toMatchObject({ advanced: true, records: 2 });
      expect(second).toMatchObject({ records: 0 });
      const buffered = fs
        .readFileSync(defaultTokenUsageJsonlPath(), 'utf8')
        .split('\n')
        .filter(Boolean);
      expect(buffered).toHaveLength(2);
    });
  });
});

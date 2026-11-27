import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  CLAUDE_RECORDING_PROFILE,
  CURSOR_RECORDING_PROFILE,
} from '../../config/config.backends.ts';
import { SCENARIOS } from '../../data/scenarios.ts';
import type { Scenario } from '../../types/scenario.ts';
import { TRANSCRIPT_PROTOCOLS } from '../../types/transcript.ts';
import { acpTranscriptStems, recordAcpScenario } from '../recordAcp.ts';
import { placeholderUuid } from '../sanitizer.ts';
import { parseTranscript } from '../transcript.ts';
import { writeFakeAcpAgent } from './fake-acp-agent.ts';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'record-acp-'));
});

afterEach(() => {
  rmSync(dir, { force: true, recursive: true });
});

const scenario = (slug: string): Scenario => {
  const found = SCENARIOS.find((candidate) => candidate.slug === slug);
  if (found === undefined) {
    throw new Error(`no scenario ${slug}`);
  }
  return found;
};

describe('acpTranscriptStems', () => {
  describe('when the scenario has one turn', () => {
    it('is the bare slug', () => {
      expect(acpTranscriptStems(scenario('simple-turn'))).toEqual([
        'simple-turn',
      ]);
    });
  });

  describe('when the scenario has several turns', () => {
    it('adds a turn-N stem for each resumed turn', () => {
      expect(acpTranscriptStems(scenario('resume'))).toEqual([
        'resume',
        'resume.turn-2',
      ]);
    });
  });
});

describe('recordAcpScenario', () => {
  describe('when the backend has no ACP spec', () => {
    it('fails without spawning anything', async () => {
      const result = await recordAcpScenario({
        model: null,
        onChunk: undefined,
        outDir: dir,
        profile: CLAUDE_RECORDING_PROFILE,
        realBin: '/nonexistent',
        scenario: scenario('simple-turn'),
        stems: undefined,
      });

      expect(result).toMatchObject({ ok: false });
      expect(JSON.stringify(result)).toContain('no ACP spec');
    });
  });

  describe('when a stem does not belong to the scenario', () => {
    it('fails', async () => {
      const result = await recordAcpScenario({
        model: null,
        onChunk: undefined,
        outDir: dir,
        profile: CURSOR_RECORDING_PROFILE,
        realBin: writeFakeAcpAgent(dir),
        scenario: scenario('simple-turn'),
        stems: ['simple-turn.turn-2'],
      });

      expect(result).toMatchObject({ ok: false });
    });
  });

  describe('against a fake cursor agent', () => {
    it('records one warm process: sanitized rpc frames, args and exit', async () => {
      const outDir = join(dir, 'out');

      const result = await recordAcpScenario({
        model: null,
        onChunk: undefined,
        outDir,
        profile: CURSOR_RECORDING_PROFILE,
        realBin: writeFakeAcpAgent(dir),
        scenario: scenario('simple-turn'),
        stems: undefined,
      });
      const file = join(outDir, 'simple-turn.ndjson');
      const parsed = parseTranscript(readFileSync(file, 'utf8'));

      expect(result).toEqual({ files: [file], ok: true });
      if (!parsed.ok || parsed.transcript.protocol !== 'acp') {
        throw new Error('expected an acp transcript');
      }
      const { transcript } = parsed;
      const methods = transcript.frames.map((frame) => {
        return `${frame.from}:${String(frame.message.method ?? 'response')}`;
      });

      expect(transcript.header.protocol).toBe(TRANSCRIPT_PROTOCOLS.acp);
      expect(transcript.header.scenario).toBe('simple-turn');
      expect(transcript.header.cliVersion).toBe('1.2.3');
      expect(transcript.argv).toEqual(['acp']);
      expect(transcript.exit.signal).toBe('SIGTERM');
      expect(methods.slice(0, 2)).toEqual([
        'client:initialize',
        'agent:response',
      ]);
      expect(methods).toContain('client:session/new');
      expect(methods).toContain('client:session/prompt');
      expect(methods).toContain('agent:session/update');
      expect(readFileSync(file, 'utf8')).toContain(placeholderUuid(1));
      expect(readFileSync(file, 'utf8')).not.toContain('_meta');
    });

    it('records turn N on a fresh process that resumes with session/load', async () => {
      const outDir = join(dir, 'out');

      const result = await recordAcpScenario({
        model: null,
        onChunk: undefined,
        outDir,
        profile: CURSOR_RECORDING_PROFILE,
        realBin: writeFakeAcpAgent(dir),
        scenario: scenario('resume'),
        stems: ['resume.turn-2'],
      });
      const file = join(outDir, 'resume.turn-2.ndjson');
      const parsed = parseTranscript(readFileSync(file, 'utf8'));

      expect(result).toEqual({ files: [file], ok: true });
      if (!parsed.ok || parsed.transcript.protocol !== 'acp') {
        throw new Error('expected an acp transcript');
      }
      const methods = parsed.transcript.frames
        .filter((frame) => frame.from === 'client')
        .map((frame) => String(frame.message.method));

      expect(parsed.transcript.header.scenario).toBe('resume.turn-2');
      expect(methods).toContain('session/load');
      expect(methods).not.toContain('session/new');
      expect(
        methods.filter((method) => method === 'session/prompt'),
      ).toHaveLength(1);
    });
  });
});

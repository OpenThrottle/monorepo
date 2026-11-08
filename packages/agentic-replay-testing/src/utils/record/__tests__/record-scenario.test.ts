import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  CLAUDE_RECORDING_PROFILE,
  type RecordingProfile,
} from '../../../config/config.backends.ts';
import { SCENARIOS } from '../../../data/data.scenarios.ts';
import type { Scenario } from '../../../types/scenario.ts';
import { placeholderUuid } from '../../sanitizer/sanitizer.ts';
import { transcriptStem } from '../../scenario/scenario-run.ts';
import { parseTranscript } from '../../transcript/transcript.ts';
import { recordScenario } from '../record-scenario.ts';

let dir: string;

/**
 * A stand-in for the real claude CLI: answers --version, otherwise reports its
 * cwd in an init event, emits a hook event the profile must drop, and writes
 * a file named by an env-free marker in its prompt.
 */
function writeFakeClaude(): string {
  const path = join(dir, 'fake-claude.mjs');
  writeFileSync(
    path,
    `#!${process.execPath}
import { writeFileSync } from 'node:fs';
const argv = process.argv.slice(2);
if (argv[0] === '--version') {
  process.stdout.write('9.9.9 (Claude Code)\\n');
  process.exit(0);
}
const prompt = argv.at(-1);
if (prompt.includes('WRITE')) writeFileSync('out.txt', 'x');
const sessionId = argv[argv.indexOf(argv.includes('--resume') ? '--resume' : '--session-id') + 1];
const lines = [
  { type: 'system', subtype: 'hook_started', hook_name: 'private-plugin' },
  { type: 'system', subtype: 'init', cwd: process.cwd(), session_id: sessionId, tools: ['mcp__private__x'] },
  { type: 'stream_event', event: { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'pong' } } },
  { type: 'result', subtype: 'success', is_error: false, result: 'pong', session_id: sessionId },
];
process.stdout.write(lines.map((line) => JSON.stringify(line)).join('\\n') + '\\n');
`,
    'utf8',
  );
  chmodSync(path, 0o755);
  return path;
}

const scenario = (slug: string): Scenario => {
  const found = SCENARIOS.find((candidate) => candidate.slug === slug);
  if (found === undefined) {
    throw new Error(`no scenario ${slug}`);
  }
  return found;
};

const readTranscript = (path: string): ReturnType<typeof parseTranscript> => {
  return parseTranscript(readFileSync(path, 'utf8'));
};

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'record-scenario-'));
});

afterEach(() => {
  rmSync(dir, { force: true, recursive: true });
});

const claude: RecordingProfile | undefined = CLAUDE_RECORDING_PROFILE;

describe('recordScenario', () => {
  it('records the argv the production backend built, sanitized', async () => {
    if (claude === undefined) {
      throw new Error('claude profile missing');
    }

    const result = await recordScenario({
      model: 'sonnet',
      outDir: join(dir, 'out'),
      profile: claude,
      realBin: writeFakeClaude(),
      scenario: scenario('simple-turn'),
    });

    expect(result.ok).toBe(true);
    const parsed = readTranscript(join(dir, 'out', 'simple-turn.ndjson'));
    if (!parsed.ok) {
      throw new Error(parsed.error);
    }
    expect(parsed.transcript.argv).toEqual([
      '--print',
      '--output-format',
      'stream-json',
      '--include-partial-messages',
      '--verbose',
      '--session-id',
      placeholderUuid(1),
      '--model',
      'sonnet',
      '--',
      'Reply with exactly: pong',
    ]);
    expect(parsed.transcript.header).toMatchObject({
      backend: 'claude',
      cliVersion: '9.9.9 (Claude Code)',
      model: 'sonnet',
      scenario: 'simple-turn',
    });
  });

  it('drops host hook events and redacts host config', async () => {
    if (claude === undefined) {
      throw new Error('claude profile missing');
    }

    await recordScenario({
      model: null,
      outDir: dir,
      profile: claude,
      realBin: writeFakeClaude(),
      scenario: scenario('simple-turn'),
    });

    const text = readFileSync(join(dir, 'simple-turn.ndjson'), 'utf8');
    expect(text).not.toContain('private-plugin');
    expect(text).not.toContain('mcp__private');
    expect(text).toContain('<CWD>');
  });

  describe('when a scenario has several turns', () => {
    it('writes one transcript per turn and resumes the same session', async () => {
      if (claude === undefined) {
        throw new Error('claude profile missing');
      }
      const resume = scenario('resume');

      const result = await recordScenario({
        model: null,
        outDir: dir,
        profile: claude,
        realBin: writeFakeClaude(),
        scenario: resume,
      });

      expect(result.ok).toBe(true);
      const second = readTranscript(
        join(dir, `${transcriptStem(resume, 1)}.ndjson`),
      );
      if (!second.ok) {
        throw new Error(second.error);
      }
      expect(second.transcript.argv).toContain('--resume');
      expect(second.transcript.argv).toContain(placeholderUuid(1));
    });
  });

  describe('when a write the scenario expects to be denied happens', () => {
    it('fails the recording', async () => {
      if (claude === undefined) {
        throw new Error('claude profile missing');
      }
      const denied = scenario('permission-denied');

      const result = await recordScenario({
        model: null,
        outDir: dir,
        profile: claude,
        realBin: writeFakeClaude(),
        scenario: {
          ...denied,
          turns: denied.turns.map((turn) => ({ ...turn, prompt: 'WRITE' })),
        },
      });

      expect(result).toEqual({
        error: 'permission-denied: a denied write happened (out.txt)',
        ok: false,
      });
    });
  });
});

describe('transcriptStem', () => {
  describe('when the scenario has one turn', () => {
    it('is the slug', () => {
      expect(transcriptStem(scenario('simple-turn'), 0)).toBe('simple-turn');
    });
  });

  describe('when the scenario has several turns', () => {
    it('numbers each turn from 1', () => {
      expect(transcriptStem(scenario('resume'), 1)).toBe('resume.turn-2');
    });
  });
});

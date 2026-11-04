/**
 * Transcript parsing against Claude Code 2.1.309 fixtures (see
 * `fixtures/README.md` for what each line pins down).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { CLAUDE_SOURCE } from '../payload.ts';
import { CLAUDE_PROVIDER, parseTranscriptLines } from '../transcript.ts';

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
);

const fixtureLines = (name: string): string[] =>
  fs
    .readFileSync(path.join(fixturesDir, name), 'utf8')
    .split('\n')
    .filter((line) => line.trim() !== '');

const SESSION = '00000000-0000-4000-8000-000000000001';
const FANNED_OUT = 'req_011CgX363EH4ZerFdokkUo5g';
const SECOND = 'req_011CgX32Y1Gy7Y96x6yHPSUS';
const SUBAGENT_REQUEST = 'req_011CgX4S15DkvVbhqN7exZmg';

const parse = (lines: readonly string[], seen = new Set<string>()) =>
  parseTranscriptLines({ fallbackSessionId: 'fallback', lines, seen });

describe('parseTranscriptLines', () => {
  describe('the main transcript fixture', () => {
    const records = parse(fixtureLines('transcript.jsonl'));

    it('emits one record per requestId, however many lines carry it', () => {
      expect(records.map((record) => record.request_id)).toEqual([
        FANNED_OUT,
        SECOND,
      ]);
    });

    it('maps the usage counts, once, for the request fanned out over four lines', () => {
      expect(records[0]).toMatchObject({
        cache_read_tokens: 142104,
        cache_write_tokens: 756,
        cost_usd: null,
        input_tokens: 2,
        model: 'claude-opus-5-5',
        output_tokens: 481,
        reasoning_tokens: 0,
        total_tokens: 483,
      });
    });

    it('maps thinking tokens to reasoning', () => {
      expect(records[1]).toMatchObject({
        output_tokens: 643,
        reasoning_tokens: 67,
      });
    });

    it('stamps provider, source, session, cwd, branch and the first line time', () => {
      expect(records[0]).toMatchObject({
        cwd: '/repo',
        git_branch: 'feat/example',
        occurred_at: '2026-10-29T18:55:05.411Z',
        provider: CLAUDE_PROVIDER,
        session_id: SESSION,
        source: CLAUDE_SOURCE,
      });
      expect(CLAUDE_PROVIDER).toBe('claude');
    });

    it('keeps the raw usage object verbatim', () => {
      const raw: unknown = JSON.parse(records[0]?.raw_usage_json ?? 'null');
      expect(raw).toMatchObject({
        cache_creation: {
          ephemeral_1h_input_tokens: 756,
          ephemeral_5m_input_tokens: 0,
        },
        output_tokens_details: { thinking_tokens: 0 },
      });
      expect(raw).not.toHaveProperty('agentId');
    });

    it('produces nothing for the user line, the synthetic line or the truncated line', () => {
      const lines = fixtureLines('transcript.jsonl');
      expect(parse([lines[0] ?? ''])).toEqual([]);
      expect(parse([lines[8] ?? ''])).toEqual([]);
      expect(parse([lines[9] ?? ''])).toEqual([]);
    });
  });

  describe('the subagent transcript fixture', () => {
    const records = parse(fixtureLines('subagent-transcript.jsonl'));

    it('captures the sidechain request once under the parent session', () => {
      expect(records).toHaveLength(1);
      expect(records[0]).toMatchObject({
        model: 'claude-sonnet-5-5',
        reasoning_tokens: 12,
        request_id: SUBAGENT_REQUEST,
        session_id: SESSION,
      });
    });

    it('records the subagent in the raw usage', () => {
      const raw: unknown = JSON.parse(records[0]?.raw_usage_json ?? 'null');
      expect(raw).toMatchObject({
        agentId: 'a39ec7aafbeffa589',
        isSidechain: true,
      });
    });
  });

  describe('request ids already seen', () => {
    it('are not emitted again', () => {
      const seen = new Set<string>();
      expect(parse(fixtureLines('transcript.jsonl'), seen)).toHaveLength(2);
      expect(parse(fixtureLines('transcript.jsonl'), seen)).toEqual([]);
    });
  });

  describe('lines that are not API requests', () => {
    const line = (entry: unknown): string => JSON.stringify(entry);
    const usage = { input_tokens: 1, output_tokens: 2 };

    it('skips malformed JSON, non-objects and blank lines', () => {
      expect(parse(['{"type":"assis', '[]', '3', '', 'null'])).toEqual([]);
    });

    it('skips an assistant line without a requestId', () => {
      expect(
        parse([line({ message: { model: 'm', usage }, type: 'assistant' })]),
      ).toEqual([]);
    });

    it('skips an assistant line without message.usage', () => {
      expect(
        parse([
          line({
            message: { model: 'm' },
            requestId: 'req_1',
            type: 'assistant',
          }),
        ]),
      ).toEqual([]);
    });

    it('skips a usage object with no counts', () => {
      expect(
        parse([
          line({
            message: { model: 'm', usage: {} },
            requestId: 'req_1',
            type: 'assistant',
          }),
        ]),
      ).toEqual([]);
    });

    it('skips a synthetic model even when it has a requestId', () => {
      expect(
        parse([
          line({
            message: { model: '<synthetic>', usage },
            requestId: 'req_1',
            type: 'assistant',
          }),
        ]),
      ).toEqual([]);
    });

    it('falls back to the supplied session id when the line has none', () => {
      expect(
        parse([
          line({
            message: { model: 'm', usage },
            requestId: 'req_1',
            type: 'assistant',
          }),
        ])[0],
      ).toMatchObject({ session_id: 'fallback' });
    });
  });
});

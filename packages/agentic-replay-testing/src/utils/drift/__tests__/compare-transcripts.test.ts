import { describe, expect, it } from 'vitest';

import {
  type Transcript,
  TRANSCRIPT_LINE_TYPES,
  TRANSCRIPT_SCHEMA_VERSION,
  TRANSCRIPT_SURFACES,
} from '../../../types/transcript.ts';
import {
  compareTranscripts,
  DRIFT_KINDS,
  stdoutShape,
} from '../compare-transcripts.ts';

const line = (value: Record<string, unknown>): string => {
  return JSON.stringify(value);
};

const BASE: Transcript = {
  argv: ['--print', '--', 'hi'],
  exit: { code: 0, signal: null },
  header: {
    backend: 'claude',
    cliVersion: '1.0.0',
    model: null,
    recordedAt: '2026-11-07T00:00:00.000Z',
    scenario: 'simple-turn',
    schemaVersion: TRANSCRIPT_SCHEMA_VERSION,
    surface: TRANSCRIPT_SURFACES.conversation,
    type: TRANSCRIPT_LINE_TYPES.header,
  },
  stderr: '',
  stdin: '',
  stdout: [
    line({ subtype: 'init', type: 'system' }),
    line({
      event: { delta: { text: 'po' }, type: 'content_block_delta' },
      type: 'stream_event',
    }),
    line({ result: 'pong', type: 'result' }),
  ],
};

describe('stdoutShape', () => {
  it.each([
    [line({ subtype: 'init', type: 'system' }), 'type=system subtype=init'],
    [
      line({ event: { type: 'message_stop' }, type: 'stream_event' }),
      'type=stream_event event.type=message_stop',
    ],
    [
      line({ item: { type: 'agent_message' }, type: 'item.completed' }),
      'type=item.completed item.type=agent_message',
    ],
    [
      line({ event: 'step_update', step_update: { step_type: 'user_input' } }),
      'event=step_update step_update.step_type=user_input',
    ],
    [line({ text: 'x' }), '<untyped-json>'],
    ['not json', '<non-json>'],
  ])('%s → %s', (input, expected) => {
    expect(stdoutShape(input)).toBe(expected);
  });
});

describe('compareTranscripts', () => {
  describe('when only model text, counts and versions-free details differ', () => {
    it('finds nothing', () => {
      const fresh: Transcript = {
        ...BASE,
        stdout: [
          BASE.stdout[0] ?? '',
          line({
            event: { delta: { text: 'p' }, type: 'content_block_delta' },
            type: 'stream_event',
          }),
          line({
            event: { delta: { text: 'ong' }, type: 'content_block_delta' },
            type: 'stream_event',
          }),
          line({ result: 'PONG', type: 'result' }),
        ],
      };

      expect(compareTranscripts(BASE, fresh)).toEqual({
        cliVersionChanged: false,
        findings: [],
      });
    });
  });

  describe('when the argv changes', () => {
    it('reports it', () => {
      const { findings } = compareTranscripts(BASE, {
        ...BASE,
        argv: ['--print'],
      });

      expect(findings.map((finding) => finding.kind)).toEqual([
        DRIFT_KINDS.argv,
      ]);
    });
  });

  describe('when the stdin changes', () => {
    it('reports it', () => {
      const { findings } = compareTranscripts(BASE, { ...BASE, stdin: 'x' });

      expect(findings.map((finding) => finding.kind)).toEqual([
        DRIFT_KINDS.stdin,
      ]);
    });
  });

  describe('when the CLI starts emitting a new event type', () => {
    it('reports the added shape and the version change', () => {
      const result = compareTranscripts(BASE, {
        ...BASE,
        header: { ...BASE.header, cliVersion: '1.1.0' },
        stdout: [...BASE.stdout, line({ type: 'rate_limit_event' })],
      });

      expect(result.cliVersionChanged).toBe(true);
      expect(result.findings).toEqual([
        { detail: 'type=rate_limit_event', kind: DRIFT_KINDS.shapesAdded },
      ]);
    });
  });

  describe('when an event type disappears', () => {
    it('reports the removed shape', () => {
      const { findings } = compareTranscripts(BASE, {
        ...BASE,
        stdout: BASE.stdout.slice(0, 2),
      });

      expect(findings).toEqual([
        { detail: 'type=result', kind: DRIFT_KINDS.shapesRemoved },
      ]);
    });
  });

  describe('when the exit class changes', () => {
    it('reports it, but not a different failing code', () => {
      const failed = compareTranscripts(BASE, {
        ...BASE,
        exit: { code: 1, signal: null },
      });
      const sameClass = compareTranscripts(
        { ...BASE, exit: { code: 1, signal: null } },
        { ...BASE, exit: { code: 2, signal: null } },
      );

      expect(failed.findings).toEqual([
        { detail: 'success → failure', kind: DRIFT_KINDS.exit },
      ]);
      expect(sameClass.findings).toEqual([]);
    });
  });
});

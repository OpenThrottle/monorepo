import { describe, expect, it } from 'vitest';

import type {
  AcpFrame,
  AcpTranscript,
  Transcript,
} from '../../types/transcript.ts';
import {
  TRANSCRIPT_LINE_TYPES,
  TRANSCRIPT_PROTOCOLS,
  TRANSCRIPT_SCHEMA_VERSION,
  TRANSCRIPT_SURFACES,
} from '../../types/transcript.ts';
import {
  compareTranscripts,
  DRIFT_KINDS,
  stdoutShape,
} from '../compareTranscripts.ts';

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
    protocol: undefined,
    recordedAt: '2026-11-07T00:00:00.000Z',
    scenario: 'simple-turn',
    schemaVersion: TRANSCRIPT_SCHEMA_VERSION,
    surface: TRANSCRIPT_SURFACES.conversation,
    type: TRANSCRIPT_LINE_TYPES.header,
  },
  protocol: TRANSCRIPT_PROTOCOLS.cli,
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

const rpc = (
  from: AcpFrame['from'],
  message: Record<string, unknown>,
): AcpFrame => {
  return { from, message };
};

const ACP_BASE: AcpTranscript = {
  argv: ['acp'],
  exit: { code: null, signal: 'SIGTERM' },
  frames: [
    rpc('client', { id: 0, method: 'initialize' }),
    rpc('agent', { id: 0, result: {} }),
    rpc('client', { id: 1, method: 'session/prompt', params: { text: 'hi' } }),
    rpc('agent', {
      method: 'session/update',
      params: {
        update: { kind: 'read', sessionUpdate: 'tool_call', status: 'pending' },
      },
    }),
    rpc('agent', { id: 1, result: { stopReason: 'end_turn' } }),
  ],
  header: { ...BASE.header, protocol: TRANSCRIPT_PROTOCOLS.acp },
  protocol: TRANSCRIPT_PROTOCOLS.acp,
  stderr: '',
};

describe('compareTranscripts (acp)', () => {
  describe('when only update text and counts differ', () => {
    it('finds nothing', () => {
      const fresh: AcpTranscript = {
        ...ACP_BASE,
        frames: [
          ...ACP_BASE.frames.slice(0, 4),
          rpc('agent', {
            method: 'session/update',
            params: {
              update: {
                kind: 'read',
                sessionUpdate: 'tool_call',
                status: 'pending',
                title: 'x',
              },
            },
          }),
          ...ACP_BASE.frames.slice(4),
        ],
      };

      expect(compareTranscripts(ACP_BASE, fresh).findings).toEqual([]);
    });
  });

  describe('when a client frame changes', () => {
    it('reports rpc-outbound with the frame index', () => {
      const fresh: AcpTranscript = {
        ...ACP_BASE,
        frames: ACP_BASE.frames.map((frame, index) => {
          if (index !== 2) {
            return frame;
          }
          return rpc('client', {
            id: 1,
            method: 'session/prompt',
            params: { text: 'bye' },
          });
        }),
      };

      const { findings } = compareTranscripts(ACP_BASE, fresh);

      expect(findings.map((finding) => finding.kind)).toEqual(['rpc-outbound']);
      expect(findings[0]?.detail).toContain('client frame 1');
    });
  });

  describe('when a client frame is dropped', () => {
    it('reports rpc-outbound', () => {
      const fresh: AcpTranscript = {
        ...ACP_BASE,
        frames: ACP_BASE.frames.slice(0, 2),
      };

      const kinds = compareTranscripts(ACP_BASE, fresh).findings.map(
        (finding) => finding.kind,
      );

      expect(kinds).toContain('rpc-outbound');
    });
  });

  describe('when the spawn args change', () => {
    it('reports argv', () => {
      const fresh: AcpTranscript = { ...ACP_BASE, argv: ['acp', '--x'] };

      expect(
        compareTranscripts(ACP_BASE, fresh).findings.map((f) => f.kind),
      ).toEqual(['argv']);
    });
  });

  describe('shapes', () => {
    it('names an update by sessionUpdate, kind and status, and a response by its request', () => {
      const fresh: AcpTranscript = {
        ...ACP_BASE,
        frames: [
          ...ACP_BASE.frames.slice(0, 3),
          rpc('agent', {
            method: 'session/update',
            params: { update: { sessionUpdate: 'plan' } },
          }),
          rpc('agent', { id: 1, result: { stopReason: 'cancelled' } }),
        ],
      };

      const { findings } = compareTranscripts(ACP_BASE, fresh);
      const added = findings.find((finding) => finding.kind === 'shapes-added');
      const removed = findings.find(
        (finding) => finding.kind === 'shapes-removed',
      );

      expect(added?.detail).toBe(
        'agent result:session/prompt stopReason=cancelled; agent session/update sessionUpdate=plan',
      );
      expect(removed?.detail).toBe(
        'agent result:session/prompt stopReason=end_turn; agent session/update sessionUpdate=tool_call kind=read status=pending',
      );
    });

    it('names an error response by the request method and code', () => {
      const fresh: AcpTranscript = {
        ...ACP_BASE,
        frames: [
          ...ACP_BASE.frames.slice(0, 4),
          rpc('agent', { error: { code: -32000, message: 'x' }, id: 1 }),
        ],
      };

      const added = compareTranscripts(ACP_BASE, fresh).findings.find(
        (f) => f.kind === 'shapes-added',
      );

      expect(added?.detail).toBe('agent error:session/prompt code=-32000');
    });
  });

  describe('when the protocol changes', () => {
    it('reports a protocol finding', () => {
      const kinds = compareTranscripts(BASE, ACP_BASE).findings.map(
        (f) => f.kind,
      );

      expect(kinds).toEqual(['protocol']);
    });
  });
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { AtifTrajectory } from '../../../types/atif.ts';
import { ATIF_SCHEMA_VERSION } from '../chunks-to-atif.ts';
import { isAtifTrajectory, parseAtifTrajectoryJson } from '../parse-atif.ts';
import {
  buildTrajectoryRecord,
  summarizeTrajectory,
  TRAJECTORY_TRANSPORT_BYTES,
} from '../trajectory-record.ts';

const FIXTURES = join(
  import.meta.dirname,
  '..',
  '..',
  'structured-output',
  '__tests__',
  'fixtures',
);

const fixture = (name: string): string => {
  return readFileSync(join(FIXTURES, `${name}.ndjson`), 'utf8');
};

const baseInput = {
  agentVersion: '2.1.317',
  driverId: 'claude',
  durationMs: 7000,
  exitCode: 0,
  model: 'opus',
  openthrottle: { planRunId: 'run-1', taskId: 'task-1' },
  outcome: 'succeeded',
  prompt: 'write hello.txt',
  rawStdout: fixture('claude'),
  reportsToolCalls: true,
};

const minimalTrajectory: AtifTrajectory = {
  agent: { name: 'codex', version: '0.145.0' },
  schema_version: ATIF_SCHEMA_VERSION,
  steps: [{ message: 'go', source: 'user', step_id: 1 }],
};

describe('buildTrajectoryRecord', () => {
  describe('a structured run', () => {
    const record = buildTrajectoryRecord(baseInput);

    it('carries the run facts the document cannot', () => {
      expect(record).toMatchObject({
        durationMs: 7000,
        exitCode: 0,
        outcome: 'succeeded',
        truncated: false,
      });
    });

    it('serializes a document that validates', () => {
      expect(
        parseAtifTrajectoryJson(record?.trajectoryJson ?? ''),
      ).toBeDefined();
    });

    it('records the harness version and the OpenThrottle facts', () => {
      expect(record?.trajectory.agent).toEqual({
        model_name: 'opus',
        name: 'claude',
        version: '2.1.317',
      });
      expect(record?.trajectory.extra?.openthrottle).toMatchObject({
        planRunId: 'run-1',
        taskId: 'task-1',
      });
    });
  });

  describe('a run that printed no structured events', () => {
    it('returns nothing rather than an empty transcript', () => {
      expect(
        buildTrajectoryRecord({ ...baseInput, rawStdout: 'Not logged in\n' }),
      ).toBeUndefined();
    });
  });

  describe('a run too large to send', () => {
    it('is capped to the transport limit and marked truncated', () => {
      const huge = 'x'.repeat(40 * 1024);
      const lines = Array.from({ length: 40 }, (_, index) => {
        return JSON.stringify({
          item: {
            aggregated_output: huge,
            command: `step ${index}`,
            id: `i${index}`,
            item_type: 'command_execution',
          },
          type: 'item.completed',
        });
      });
      const record = buildTrajectoryRecord({
        ...baseInput,
        driverId: 'codex',
        rawStdout: lines.join('\n'),
      });

      expect(record?.truncated).toBe(true);
      expect(
        Buffer.byteLength(record?.trajectoryJson ?? '', 'utf8'),
      ).toBeLessThanOrEqual(TRAJECTORY_TRANSPORT_BYTES);
    });
  });
});

describe('summarizeTrajectory', () => {
  describe('a recorded run', () => {
    it('counts tool calls and reads the token totals', () => {
      const record = buildTrajectoryRecord(baseInput);
      const summary = summarizeTrajectory(
        record?.trajectory ?? minimalTrajectory,
      );

      expect(summary).toMatchObject({
        cachedTokens: 73411,
        incomplete: false,
        inputTokens: 4 + 73411 + 24298,
        toolCallCount: 1,
      });
      expect(summary.costUsd).toBeGreaterThan(0);
    });
  });

  describe('a run that reported no usage', () => {
    it('leaves tokens and cost null, never zero', () => {
      expect(summarizeTrajectory(minimalTrajectory)).toEqual({
        cachedTokens: null,
        costUsd: null,
        incomplete: false,
        inputTokens: null,
        outputTokens: null,
        toolCallCount: 0,
      });
    });
  });

  describe('a driver that cannot report tool calls', () => {
    it('is summarized as incomplete', () => {
      const trajectory = {
        ...minimalTrajectory,
        extra: { openthrottle: { incomplete: true } },
      };

      expect(summarizeTrajectory(trajectory).incomplete).toBe(true);
    });
  });
});

describe('isAtifTrajectory', () => {
  describe('a valid document', () => {
    it('passes, extra fields included', () => {
      expect(
        isAtifTrajectory({ ...minimalTrajectory, notes: 'n', unknown: 1 }),
      ).toBe(true);
    });
  });

  describe('an invalid document', () => {
    it.each([
      ['no schema version', { ...minimalTrajectory, schema_version: 1 }],
      ['no agent version', { ...minimalTrajectory, agent: { name: 'x' } }],
      [
        'an unknown step source',
        {
          ...minimalTrajectory,
          steps: [{ message: 'go', source: 'robot', step_id: 1 }],
        },
      ],
      [
        'non-object tool arguments',
        {
          ...minimalTrajectory,
          steps: [
            {
              message: '',
              source: 'agent',
              step_id: 1,
              tool_calls: [
                { arguments: 'ls', function_name: 'bash', tool_call_id: 'c' },
              ],
            },
          ],
        },
      ],
      [
        'a non-numeric token total',
        { ...minimalTrajectory, final_metrics: { total_prompt_tokens: '9' } },
      ],
    ])('fails with %s', (_label, value) => {
      expect(isAtifTrajectory(value)).toBe(false);
    });
  });
});

describe('parseAtifTrajectoryJson', () => {
  describe('malformed JSON', () => {
    it('returns undefined instead of throwing', () => {
      expect(parseAtifTrajectoryJson('{nope')).toBeUndefined();
    });
  });
});

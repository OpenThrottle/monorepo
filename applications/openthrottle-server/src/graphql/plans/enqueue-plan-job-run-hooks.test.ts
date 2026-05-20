/**
 * @description Tests for job-run lifecycle hook GraphQL parsing and enqueue resolution.
 */

import { describe, expect, it } from 'vitest';
import {
  jobRunHooksForJobPayload,
  jobRunHooksFromPlanStorage,
  parseJobRunHooksJsonInput,
  resolveJobRunHooksForEnqueue,
  serializeJobRunHooksForGraphql,
} from './enqueue-plan-job-run-hooks';

describe('parseJobRunHooksJsonInput', () => {
  it('returns undefined for null/empty', () => {
    expect(parseJobRunHooksJsonInput(null)).toBeUndefined();
    expect(parseJobRunHooksJsonInput('')).toBeUndefined();
  });

  it('parses a named before_run hook', () => {
    const config = parseJobRunHooksJsonInput(
      JSON.stringify({
        hooks: [
          {
            kind: 'prompt_profile',
            phase: 'before_run',
            prompt: '/agents/ralph',
            promptDelivery: 'named',
          },
        ],
      }),
    );
    expect(config?.hooks).toHaveLength(1);
    expect(config?.hooks[0]?.phase).toBe('before_run');
  });

  it('rejects invalid JSON', () => {
    expect(() => parseJobRunHooksJsonInput('not-json')).toThrow(
      /valid JSON/,
    );
  });

  it('rejects JSON exceeding max length', () => {
    const huge = JSON.stringify({
      hooks: [
        {
          kind: 'prompt_profile',
          phase: 'before_run',
          prompt: '/agents/ralph',
          promptDelivery: 'named',
        },
      ],
    });
    const padded = `${huge}${'x'.repeat(600_000)}`;
    expect(() => parseJobRunHooksJsonInput(padded)).toThrow(/at most/);
  });
});

describe('resolveJobRunHooksForEnqueue', () => {
  it('uses plan hooks when enqueue override omitted', () => {
    const resolved = resolveJobRunHooksForEnqueue({
      planHooks: {
        hooks: [
          {
            kind: 'prompt_profile',
            phase: 'after_run',
            prompt: '/agents/ralph',
            promptDelivery: 'named',
          },
        ],
      },
    });
    expect(resolved?.hooks).toHaveLength(1);
    expect(resolved?.hooks[0]?.phase).toBe('after_run');
  });

  it('prefers enqueue override over plan storage', () => {
    const resolved = resolveJobRunHooksForEnqueue({
      enqueueHooksJson: JSON.stringify({
        hooks: [
          {
            kind: 'prompt_profile',
            phase: 'before_run',
            prompt: '/agents/seo',
            promptDelivery: 'named',
          },
        ],
      }),
      planHooks: {
        hooks: [
          {
            kind: 'prompt_profile',
            phase: 'after_run',
            prompt: '/agents/ralph',
            promptDelivery: 'named',
          },
        ],
      },
    });
    expect(resolved?.hooks[0]?.phase).toBe('before_run');
    expect(
      resolved?.hooks[0]?.kind === 'prompt_profile' &&
        resolved.hooks[0].prompt === '/agents/seo',
    ).toBe(true);
  });

  it('returns undefined when no hooks configured', () => {
    expect(
      resolveJobRunHooksForEnqueue({ planHooks: { hooks: [] } }),
    ).toBeUndefined();
  });
});

describe('jobRunHooksForJobPayload', () => {
  it('omits empty hook lists from BullMQ payload', () => {
    expect(jobRunHooksForJobPayload({ hooks: [] })).toBeUndefined();
    expect(
      jobRunHooksForJobPayload(
        jobRunHooksFromPlanStorage({ hooks: [] }),
      ),
    ).toBeUndefined();
  });
});

describe('serializeJobRunHooksForGraphql', () => {
  it('serializes stored hooks', () => {
    const json = serializeJobRunHooksForGraphql({
      hooks: [
        {
          kind: 'skill',
          phase: 'before_run',
          skillPath: '.agents/skills/workflow-ralph/SKILL.md',
        },
      ],
    });
    const parsed = JSON.parse(json) as { hooks: unknown[] };
    expect(parsed.hooks).toHaveLength(1);
  });
});

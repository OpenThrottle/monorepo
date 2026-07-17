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
    expect(config?.hooks[0]?.phase).toBe('beforeAll');
  });

  it('rejects invalid JSON', () => {
    expect(() => parseJobRunHooksJsonInput('not-json')).toThrow(/valid JSON/);
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
    expect(resolved?.hooks[0]?.phase).toBe('afterAll');
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
    expect(resolved?.hooks[0]?.phase).toBe('beforeAll');
    const hook = resolved?.hooks[0];
    expect(
      hook !== undefined &&
        hook.kind === 'prompt_profile' &&
        hook.promptDelivery === 'named' &&
        hook.prompt === '/agents/seo',
    ).toBe(true);
  });

  it('returns undefined when no hooks configured', () => {
    expect(
      resolveJobRunHooksForEnqueue({ planHooks: { hooks: [] } }),
    ).toBeUndefined();
  });

  it('unions materialized hook entries with config hooks', () => {
    const resolved = resolveJobRunHooksForEnqueue({
      materializedHookEntries: [
        {
          kind: 'skill',
          phase: 'afterAll',
          skillPath: '.agents/skills/validate-plan/SKILL.md',
        },
      ],
      planHooks: {
        hooks: [
          {
            kind: 'prompt_profile',
            phase: 'before_run',
            prompt: '/agents/ralph',
            promptDelivery: 'named',
          },
        ],
      },
    });
    expect(resolved?.hooks).toHaveLength(2);
    expect(resolved?.hooks.map((h) => h.phase).sort()).toEqual([
      'afterAll',
      'beforeAll',
    ]);
  });

  it('dedupes a skill hook present in both config and materialized (phase+skillPath)', () => {
    const skillPath = '.agents/skills/validate-plan/SKILL.md';
    const resolved = resolveJobRunHooksForEnqueue({
      materializedHookEntries: [
        { kind: 'skill', phase: 'afterAll', skillPath },
      ],
      planHooks: { hooks: [{ kind: 'skill', phase: 'after_run', skillPath }] },
    });
    expect(resolved?.hooks).toHaveLength(1);
  });

  it('returns materialized-only entries when no config hooks', () => {
    const resolved = resolveJobRunHooksForEnqueue({
      materializedHookEntries: [
        {
          kind: 'skill',
          phase: 'beforeAll',
          skillPath: '.agents/skills/validate-plan/SKILL.md',
        },
      ],
      planHooks: { hooks: [] },
    });
    expect(resolved?.hooks).toHaveLength(1);
    expect(resolved?.hooks[0]?.phase).toBe('beforeAll');
  });
});

describe('jobRunHooksForJobPayload', () => {
  it('omits empty hook lists from BullMQ payload', () => {
    expect(jobRunHooksForJobPayload({ hooks: [] })).toBeUndefined();
    expect(
      jobRunHooksForJobPayload(jobRunHooksFromPlanStorage({ hooks: [] })),
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
    const parsed: { hooks: unknown[] } = JSON.parse(json);
    expect(parsed.hooks).toHaveLength(1);
  });
});

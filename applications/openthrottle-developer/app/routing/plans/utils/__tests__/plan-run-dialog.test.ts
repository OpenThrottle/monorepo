import { beforeAll, describe, expect, test } from 'vitest';

import type { DefaultAgentDraft } from '~/routing/settings/utils/user-preferences';

import { buildPlanRunConfigJson } from '../../testing/buildPlanRunConfigJson';
import { parsePlanDetailTab } from '../parsers';
import type { PlanRunDialogGatingInput } from '../plan-run-dialog';
import {
  buildPlanRunDialogFields,
  createPlanRunDialogDraft,
  getPlanConfigurationTabHref,
  getPlanConfiguredIterations,
  getPlanRunDialogBlockedReason,
  isPlanRunBranchMissing,
  parsePlanRunDialogIterations,
} from '../plan-run-dialog';

const NOW = new Date('2026-11-02T20:00:00.000Z');

const gating = (
  overrides: Partial<PlanRunDialogGatingInput> = {},
): PlanRunDialogGatingInput => {
  return {
    branch: 'feat/x',
    mode: 'run',
    planStatus: 'PENDING',
    workflowRunBlocked: false,
    workflowRunBlockedReason: undefined,
    ...overrides,
  };
};

describe('plan-run-dialog utils', () => {
  beforeAll(() => {
    process.env.TZ = 'America/Los_Angeles';
  });

  describe('isPlanRunBranchMissing', () => {
    test.each([
      [undefined, true],
      ['', true],
      ['   ', true],
      ['main', false],
    ])('%j is missing: %s', (branch, expected) => {
      expect(isPlanRunBranchMissing(branch)).toBe(expected);
    });
  });

  describe('createPlanRunDialogDraft runner', () => {
    const draftFor = (runConfigJson: string) => {
      return createPlanRunDialogDraft({
        mode: 'run',
        now: NOW,
        planId: 'plan-1',
        runConfigJson,
        scheduledRunAt: null,
      });
    };

    test('defaults to Ralph with empty OT Loop fields when the plan names no runner', () => {
      expect(draftFor(buildPlanRunConfigJson())).toMatchObject({
        otLoopMaxRetriesText: '',
        otLoopValidationText: '',
        runner: 'ralph',
      });
    });

    test('hydrates OT Loop, its commands one per line, and its retries', () => {
      const stored = JSON.parse(buildPlanRunConfigJson());
      const draft = draftFor(
        JSON.stringify({
          ...stored,
          otLoop: { maxRetries: 1, validationCommands: ['a', 'b'] },
          runner: 'ot-loop',
        }),
      );

      expect(draft).toMatchObject({
        otLoopMaxRetriesText: '1',
        otLoopValidationText: 'a\nb',
        runner: 'ot-loop',
      });
    });
  });

  describe('createPlanRunDialogDraft', () => {
    test('reads backend, model, effort and iterations from the plan', () => {
      const draft = createPlanRunDialogDraft({
        defaultAgent: null,
        mode: 'schedule',
        now: NOW,
        planId: 'plan-1',
        runConfigJson: buildPlanRunConfigJson({
          effort: 'high',
          executionBackend: 'claude',
          iterations: 7,
          model: 'opus',
        }),
        scheduledRunAt: null,
      });

      expect(draft).toMatchObject({
        backend: 'claude',
        effort: 'high',
        iterationsText: '7',
        mode: 'schedule',
        model: 'opus',
        scheduleTime: '13:00',
      });
    });

    test('drops an effort the backend has no knob for', () => {
      const draft = createPlanRunDialogDraft({
        defaultAgent: null,
        mode: 'run',
        now: NOW,
        planId: 'plan-1',
        runConfigJson: buildPlanRunConfigJson({
          effort: 'high',
          executionBackend: 'cursor',
        }),
        scheduledRunAt: null,
      });

      expect(draft.effort).toBe('');
    });

    test("seeds the schedule tab from the plan's current scheduled time (Reschedule…)", () => {
      // 17:00 UTC is 09:00 in the pinned America/Los_Angeles zone (PST).
      const draft = createPlanRunDialogDraft({
        defaultAgent: null,
        mode: 'schedule',
        now: NOW,
        planId: 'plan-1',
        runConfigJson: null,
        scheduledRunAt: '2026-11-08T17:00:00.000Z',
      });

      expect(draft.scheduleTime).toBe('09:00');
      expect(draft.scheduleDate?.getDate()).toBe(8);
    });

    test('ignores an unreadable scheduled time and keeps the default hour', () => {
      const draft = createPlanRunDialogDraft({
        defaultAgent: null,
        mode: 'schedule',
        now: NOW,
        planId: 'plan-1',
        runConfigJson: null,
        scheduledRunAt: 'not a date',
      });

      expect(draft.scheduleTime).toBe('13:00');
    });

    test('falls back to the defaults when the plan has no run config', () => {
      expect(getPlanConfiguredIterations('plan-1', null)).toBeGreaterThan(0);
    });

    describe('with a default agent', () => {
      const defaultAgent: DefaultAgentDraft = {
        backend: 'claude',
        effort: 'high',
        model: 'opus',
      };

      test('seeds a plan with no run config from the preference', () => {
        const draft = createPlanRunDialogDraft({
          defaultAgent,
          mode: 'run',
          now: NOW,
          planId: 'plan-1',
          runConfigJson: null,
          scheduledRunAt: null,
        });

        expect(draft).toMatchObject(defaultAgent);
      });

      test('seeds a plan still on the system default agent', () => {
        const draft = createPlanRunDialogDraft({
          defaultAgent,
          mode: 'run',
          now: NOW,
          planId: 'plan-1',
          runConfigJson: buildPlanRunConfigJson({ iterations: 4 }),
          scheduledRunAt: null,
        });

        expect(draft).toMatchObject({ ...defaultAgent, iterationsText: '4' });
      });

      test("keeps the plan's own explicit agent", () => {
        const draft = createPlanRunDialogDraft({
          defaultAgent,
          mode: 'run',
          now: NOW,
          planId: 'plan-1',
          runConfigJson: buildPlanRunConfigJson({
            executionBackend: 'cursor',
            model: 'gpt-5.2',
          }),
          scheduledRunAt: null,
        });

        expect(draft).toMatchObject({ backend: 'cursor', model: 'gpt-5.2' });
      });
    });
  });

  describe('parsePlanRunDialogIterations', () => {
    test.each([
      ['', undefined],
      ['  ', undefined],
      ['3', 3],
      ['0', null],
      ['-2', null],
      ['1.5', null],
      ['abc', null],
    ])('%j parses to %j', (text, expected) => {
      expect(parsePlanRunDialogIterations(text)).toBe(expected);
    });
  });

  describe('getPlanRunDialogBlockedReason', () => {
    test('is null when everything is in place', () => {
      expect(getPlanRunDialogBlockedReason(gating())).toBeNull();
    });

    test('names a blank branch', () => {
      expect(getPlanRunDialogBlockedReason(gating({ branch: ' ' }))).toContain(
        'git branch',
      );
    });

    test('does not require a checkout, repository or working directory (monorepo root is allowed)', () => {
      expect(getPlanRunDialogBlockedReason(gating())).toBeNull();
    });

    test('blocks a terminal plan, and a running one on the Run tab', () => {
      expect(
        getPlanRunDialogBlockedReason(gating({ planStatus: 'COMPLETED' })),
      ).toContain('terminal');
      expect(
        getPlanRunDialogBlockedReason(gating({ planStatus: 'IN_PROGRESS' })),
      ).toContain('already active');
    });

    test('blocks Schedule for an active, BLOCKED or terminal plan but not a SCHEDULED one', () => {
      expect(
        getPlanRunDialogBlockedReason(
          gating({ mode: 'schedule', planStatus: 'IN_PROGRESS' }),
        ),
      ).toContain('queued or running');
      expect(
        getPlanRunDialogBlockedReason(
          gating({ mode: 'schedule', planStatus: 'BLOCKED' }),
        ),
      ).toContain('BLOCKED');
      expect(
        getPlanRunDialogBlockedReason(
          gating({ mode: 'schedule', planStatus: 'SCHEDULED' }),
        ),
      ).toBeNull();
    });

    test('does not block Run now for a SCHEDULED plan (the confirm unschedules first)', () => {
      expect(
        getPlanRunDialogBlockedReason(gating({ planStatus: 'SCHEDULED' })),
      ).toBeNull();
    });

    test('forwards the workflow options reason', () => {
      expect(
        getPlanRunDialogBlockedReason(
          gating({
            workflowRunBlocked: true,
            workflowRunBlockedReason: 'Iterations out of range',
          }),
        ),
      ).toBe('Iterations out of range');
    });
  });

  describe('buildPlanRunDialogFields', () => {
    const draft = createPlanRunDialogDraft({
      defaultAgent: null,
      mode: 'run',
      now: NOW,
      planId: 'plan-1',
      runConfigJson: buildPlanRunConfigJson({
        effort: 'high',
        executionBackend: 'claude',
        model: 'opus',
      }),
      scheduledRunAt: null,
    });
    const base = {
      branch: 'feat/x',
      checkoutId: 'checkout-1',
      draft,
      iterations: 4,
      jobRunHooksJson: '',
      ralphTuningJson: '{"iterations":2}',
      repositoryId: '',
      scheduledFor: new Date('2026-11-02T23:00:00.000Z'),
      workingDirectory: '',
    };

    test('carries the run fields and leaves blanks out', () => {
      expect(buildPlanRunDialogFields(base)).toEqual({
        backend: 'claude',
        branch: 'feat/x',
        checkoutId: 'checkout-1',
        effort: 'high',
        intent: 'runPlan',
        iterations: '4',
        model: 'opus',
        ralphTuning: '{"iterations":2}',
        runner: 'ralph',
      });
    });

    test('adds scheduledFor (ISO) and the schedule intent on the Schedule tab only', () => {
      expect(
        buildPlanRunDialogFields({
          ...base,
          draft: { ...draft, mode: 'schedule' },
        }),
      ).toMatchObject({
        intent: 'schedulePlanRun',
        scheduledFor: '2026-11-02T23:00:00.000Z',
      });
    });

    test('OT Loop sends the runner and its fields and drops iterations', () => {
      const fields = buildPlanRunDialogFields({
        ...base,
        draft: {
          ...draft,
          otLoopMaxRetriesText: '3',
          otLoopValidationText: `  pnpm nx run a:test \n\n pnpm nx run a:lint\n`,
          runner: 'ot-loop',
        },
      });

      expect(fields).toMatchObject({
        otLoopMaxRetries: '3',
        otLoopValidationCommands: 'pnpm nx run a:test\npnpm nx run a:lint',
        runner: 'ot-loop',
      });
      expect(fields).not.toHaveProperty('iterations');
    });

    test('OT Loop leaves blank retries and an empty validation list out', () => {
      const fields = buildPlanRunDialogFields({
        ...base,
        draft: { ...draft, runner: 'ot-loop' },
      });

      expect(fields).not.toHaveProperty('otLoopMaxRetries');
      expect(fields).not.toHaveProperty('otLoopValidationCommands');
    });

    test('Ralph never sends the OT Loop fields', () => {
      const fields = buildPlanRunDialogFields({
        ...base,
        draft: { ...draft, otLoopMaxRetriesText: '3', runner: 'ralph' },
      });

      expect(fields).not.toHaveProperty('otLoopMaxRetries');
      expect(fields).toHaveProperty('iterations', '4');
    });

    test('omits iterations when blank and effort when unset', () => {
      const fields = buildPlanRunDialogFields({
        ...base,
        draft: { ...draft, effort: '' },
        iterations: undefined,
      });

      expect(fields).not.toHaveProperty('iterations');
      expect(fields).not.toHaveProperty('effort');
      expect(fields).toHaveProperty('backend', 'claude');
      expect(fields).toHaveProperty('model', 'opus');
    });
  });

  test('the Configuration link round-trips through parsePlanDetailTab', () => {
    const tab = new URLSearchParams(getPlanConfigurationTabHref()).get('tab');

    expect(parsePlanDetailTab(tab)).toBe('configuration');
  });
});

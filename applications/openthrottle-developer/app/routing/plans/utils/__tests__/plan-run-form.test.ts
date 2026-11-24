import {
  getDefaultPlanRunConfigStorage,
  serializePlanRunConfigForGraphql,
} from '@openthrottle/openthrottle-plan-config';
import { describe, expect, test } from 'vitest';

import {
  mergeOtLoopSelectionIntoRunConfig,
  mergePersistedSelectionIntoRunConfig,
  overlayPlanRunTuning,
  parsePlanRunForm,
  parseScheduledFor,
} from '../plan-run-form';

const planId = '80864bba-630a-451d-bfd2-4b25ec202381';

const form = (entries: Record<string, string>): FormData => {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value);
  }
  return formData;
};

describe('overlayPlanRunTuning', () => {
  test('returns undefined when there is nothing to send', () => {
    expect(overlayPlanRunTuning(undefined, undefined)).toBeUndefined();
  });

  test('keeps the submitted tuning when nothing is persisted', () => {
    expect(
      overlayPlanRunTuning({ iterationTimeoutSeconds: 60 }, undefined),
    ).toEqual({ iterationTimeoutSeconds: 60 });
  });

  test('a selection overlays driver, model and effort', () => {
    expect(
      overlayPlanRunTuning(undefined, {
        driver: 'claude',
        effort: 'high',
        model: 'opus',
      }),
    ).toEqual({ driver: 'claude', effort: 'high', model: 'opus' });
  });

  test('a selection that returns to defaults clears the stale tuning keys', () => {
    expect(
      overlayPlanRunTuning(
        {
          driver: 'claude',
          effort: 'high',
          iterationTimeoutSeconds: 60,
          model: 'opus',
        },
        { driver: 'cursor', effort: '', model: 'auto' },
      ),
    ).toEqual({ iterationTimeoutSeconds: 60 });
  });

  test('does not mutate the submitted tuning', () => {
    const tuning = { model: 'opus' };
    overlayPlanRunTuning(tuning, {
      driver: 'cursor',
      effort: '',
      model: 'auto',
    });

    expect(tuning).toEqual({ model: 'opus' });
  });
});

describe('mergePersistedSelectionIntoRunConfig', () => {
  const stored = (): string => {
    return serializePlanRunConfigForGraphql(
      (() => {
        const defaults = getDefaultPlanRunConfigStorage({ planId });
        return {
          ...defaults,
          run: { ...defaults.run, worktreeName: 'my-tree' },
        };
      })(),
      { planId },
    );
  };

  test('writes model, driver and effort and preserves everything else', () => {
    const merged = mergePersistedSelectionIntoRunConfig({
      persisted: { driver: 'claude', effort: 'high', model: 'opus' },
      planId,
      runConfigJson: stored(),
    });

    expect(merged.changed).toBe(true);
    expect(JSON.parse(merged.runConfigJson)).toMatchObject({
      run: {
        driver: 'claude',
        effort: 'high',
        model: 'opus',
        worktreeName: 'my-tree',
      },
    });
  });

  test('reports unchanged when the config already holds the selection', () => {
    const first = mergePersistedSelectionIntoRunConfig({
      persisted: { driver: 'claude', effort: 'high', model: 'opus' },
      planId,
      runConfigJson: stored(),
    });

    expect(
      mergePersistedSelectionIntoRunConfig({
        persisted: { driver: 'claude', effort: 'high', model: 'opus' },
        planId,
        runConfigJson: first.runConfigJson,
      }).changed,
    ).toBe(false);
  });

  test('builds from defaults when the plan has no saved config', () => {
    const merged = mergePersistedSelectionIntoRunConfig({
      persisted: { driver: 'claude', effort: '', model: 'opus' },
      planId,
      runConfigJson: null,
    });

    expect(merged.changed).toBe(true);
    expect(JSON.parse(merged.runConfigJson)).toMatchObject({
      run: { driver: 'claude', model: 'opus' },
    });
  });

  test('throws on a saved config that is not JSON', () => {
    expect(() =>
      mergePersistedSelectionIntoRunConfig({
        persisted: { driver: 'claude', effort: '', model: 'opus' },
        planId,
        runConfigJson: '{bad',
      }),
    ).toThrow();
  });
});

describe('parsePlanRunForm', () => {
  test('reads the enqueue fields with the interactive priority default', () => {
    expect(parsePlanRunForm(form({ branch: 'main' }))).toEqual({
      fields: { branch: 'main', priority: 1 },
      otLoopSelection: undefined,
      persisted: undefined,
      success: true,
    });
  });

  test('overlays the persisted selection on runTuning and carries it', () => {
    expect(
      parsePlanRunForm(
        form({
          branch: 'main',
          driver: 'claude',
          effort: 'max',
          model: 'opus',
          runTuning: JSON.stringify({ iterationTimeoutSeconds: 60 }),
        }),
      ),
    ).toEqual({
      fields: {
        branch: 'main',
        priority: 1,
        tuning: {
          driver: 'claude',
          effort: 'max',
          iterationTimeoutSeconds: 60,
          model: 'opus',
        },
      },
      otLoopSelection: undefined,
      persisted: { driver: 'claude', effort: 'max', model: 'opus' },
      success: true,
    });
  });

  test('treats a blank effort as unset', () => {
    const result = parsePlanRunForm(
      form({ branch: 'main', driver: 'claude', effort: '', model: 'opus' }),
    );

    expect(result).toMatchObject({
      persisted: { effort: '' },
      success: true,
    });
  });

  test.each([
    [{ driver: 'codex', model: 'm' }, 'Unknown driver "codex".'],
    [{ effort: 'high' }, 'only be saved together with a model'],
    [{ model: 'opus' }, 'submitted together'],
    [{ runTuning: 'not-json' }, 'Invalid workflow run options payload.'],
    [{ jobRunHooksJson: '{"hooks":"nope"}' }, 'Invalid job run hooks'],
  ])('rejects %j', (extra, message) => {
    const result = parsePlanRunForm(form({ branch: 'main', ...extra }));

    expect(result).toEqual({
      error: expect.stringContaining(message),
      success: false,
    });
  });

  test('requires a non-blank branch', () => {
    expect(parsePlanRunForm(form({ branch: '   ' }))).toMatchObject({
      error: expect.stringContaining('branch is required'),
      success: false,
    });
  });
});

describe('parseScheduledFor', () => {
  test('normalizes an offset instant to UTC ISO', () => {
    expect(parseScheduledFor('2026-11-05T01:30:00-08:00')).toEqual({
      scheduledFor: '2026-11-05T09:30:00.000Z',
      success: true,
    });
  });

  test.each([[undefined], [null], [''], ['   ']])(
    'asks for a time when %j is blank',
    (raw) => {
      expect(parseScheduledFor(raw)).toEqual({
        error: 'Choose when this run should start.',
        success: false,
      });
    },
  );

  test('rejects text that is not an instant', () => {
    expect(parseScheduledFor('soonish')).toEqual({
      error: 'The scheduled start time is not a valid date and time.',
      success: false,
    });
  });
});

describe('parsePlanRunForm OT Loop settings', () => {
  const base = { branch: 'feat/x' };

  test('persists nothing when the form carries no OT Loop settings', () => {
    const parsed = parsePlanRunForm(form(base));

    expect(parsed).toMatchObject({ otLoopSelection: undefined, success: true });
    expect(parsed.success && parsed.fields).not.toHaveProperty(
      'otLoopSettings',
    );
  });

  test('the OT Loop fields reach the OT Loop selection, trimmed, and never the enqueue fields', () => {
    const parsed = parsePlanRunForm(
      form({
        ...base,
        otLoopMaxRetries: '4',
        otLoopSettings: 'true',
        otLoopValidationCommands: ' pnpm test \n\n  pnpm lint  ',
      }),
    );

    expect(parsed.success && parsed.fields).not.toHaveProperty(
      'otLoopSettings',
    );
    expect(parsed).toMatchObject({
      otLoopSelection: {
        maxRetries: 4,
        validationCommands: ['pnpm test', 'pnpm lint'],
      },
      success: true,
    });
  });

  test.each([
    [
      { otLoopMaxRetries: '6', otLoopSettings: 'true' },
      'Retries must be a whole number from 0 to 5.',
    ],
    [
      { otLoopMaxRetries: '1.5', otLoopSettings: 'true' },
      'Retries must be a whole number from 0 to 5.',
    ],
  ])('rejects %j', (extra, error) => {
    expect(parsePlanRunForm(form({ ...base, ...extra }))).toEqual({
      error,
      success: false,
    });
  });
});

describe('mergeOtLoopSelectionIntoRunConfig', () => {
  const stored = (extra: Record<string, unknown> = {}): string => {
    return serializePlanRunConfigForGraphql(
      { ...getDefaultPlanRunConfigStorage({ planId }), ...extra },
      { planId },
    );
  };

  const storedRun = (run: Record<string, unknown>): string => {
    return stored({
      run: { ...getDefaultPlanRunConfigStorage({ planId }).run, ...run },
    });
  };

  test('merges the edited fields, keeping setup commands', () => {
    const merged = mergeOtLoopSelectionIntoRunConfig({
      planId,
      runConfigJson: storedRun({
        setupCommands: ['pnpm i'],
        validationCommands: ['old'],
      }),
      selection: { maxRetries: 1, validationCommands: ['new'] },
    });

    expect(merged.changed).toBe(true);
    expect(JSON.parse(merged.runConfigJson).run).toMatchObject({
      maxRetries: 1,
      setupCommands: ['pnpm i'],
      validationCommands: ['new'],
    });
  });

  test('an empty list and blank retries clear their keys', () => {
    const merged = mergeOtLoopSelectionIntoRunConfig({
      planId,
      runConfigJson: storedRun({
        maxRetries: 2,
        validationCommands: ['old'],
      }),
      selection: { maxRetries: undefined, validationCommands: [] },
    });

    expect(JSON.parse(merged.runConfigJson).run).not.toHaveProperty(
      'maxRetries',
    );
    expect(JSON.parse(merged.runConfigJson).run).not.toHaveProperty(
      'validationCommands',
    );
  });

  test('keeps the stored setup and final-validation commands in the run block', () => {
    const merged = mergeOtLoopSelectionIntoRunConfig({
      planId,
      runConfigJson: stored({
        run: {
          ...getDefaultPlanRunConfigStorage({ planId }).run,
          setupCommands: ['pnpm i'],
          validationCommands: ['old'],
        },
      }),
      selection: { maxRetries: undefined, validationCommands: ['keep'] },
    });

    expect(merged.changed).toBe(true);
    expect(JSON.parse(merged.runConfigJson)).not.toHaveProperty('otLoop');
    expect(JSON.parse(merged.runConfigJson).run).toMatchObject({
      setupCommands: ['pnpm i'],
      validationCommands: ['keep'],
    });
  });

  test('reports no change when the saved config already holds the settings', () => {
    expect(
      mergeOtLoopSelectionIntoRunConfig({
        planId,
        runConfigJson: stored(),
        selection: { maxRetries: undefined, validationCommands: [] },
      }).changed,
    ).toBe(false);
  });
});

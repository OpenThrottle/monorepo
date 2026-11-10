import {
  getDefaultPlanRunConfigStorage,
  serializePlanRunConfigForGraphql,
} from '@openthrottle/openthrottle-plan-config';
import { describe, expect, test } from 'vitest';

import {
  mergePersistedSelectionIntoRunConfig,
  mergeRunnerSelectionIntoRunConfig,
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
    expect(
      overlayPlanRunTuning(undefined, {
        iterations: undefined,
        persisted: undefined,
      }),
    ).toBeUndefined();
  });

  test('iterations override replaces the submitted value', () => {
    expect(
      overlayPlanRunTuning(
        { iterations: 3, project: 'apps/x' },
        { iterations: 12, persisted: undefined },
      ),
    ).toEqual({ iterations: 12, project: 'apps/x' });
  });

  test('a selection overlays backend, model and effort', () => {
    expect(
      overlayPlanRunTuning(undefined, {
        iterations: undefined,
        persisted: { backend: 'claude', effort: 'high', model: 'opus' },
      }),
    ).toEqual({ backend: 'claude', effort: 'high', model: 'opus' });
  });

  test('a selection that returns to defaults clears the stale tuning keys', () => {
    expect(
      overlayPlanRunTuning(
        { backend: 'claude', effort: 'high', model: 'opus', project: 'p' },
        {
          iterations: undefined,
          persisted: { backend: 'cursor', effort: '', model: 'auto' },
        },
      ),
    ).toEqual({ project: 'p' });
  });

  test('does not mutate the submitted tuning', () => {
    const tuning = { model: 'opus' };
    overlayPlanRunTuning(tuning, {
      iterations: 5,
      persisted: { backend: 'cursor', effort: '', model: 'auto' },
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
          ralph: { ...defaults.ralph, iterations: 40, project: 'apps/x' },
        };
      })(),
      { planId },
    );
  };

  test('writes model, backend and effort and preserves everything else', () => {
    const merged = mergePersistedSelectionIntoRunConfig({
      persisted: { backend: 'claude', effort: 'high', model: 'opus' },
      planId,
      runConfigJson: stored(),
    });

    expect(merged.changed).toBe(true);
    expect(JSON.parse(merged.runConfigJson)).toMatchObject({
      ralph: {
        effort: 'high',
        executionBackend: 'claude',
        iterations: 40,
        model: 'opus',
        project: 'apps/x',
      },
    });
  });

  test('reports unchanged when the config already holds the selection', () => {
    const first = mergePersistedSelectionIntoRunConfig({
      persisted: { backend: 'claude', effort: 'high', model: 'opus' },
      planId,
      runConfigJson: stored(),
    });

    expect(
      mergePersistedSelectionIntoRunConfig({
        persisted: { backend: 'claude', effort: 'high', model: 'opus' },
        planId,
        runConfigJson: first.runConfigJson,
      }).changed,
    ).toBe(false);
  });

  test('builds from defaults when the plan has no saved config', () => {
    const merged = mergePersistedSelectionIntoRunConfig({
      persisted: { backend: 'claude', effort: '', model: 'opus' },
      planId,
      runConfigJson: null,
    });

    expect(merged.changed).toBe(true);
    expect(JSON.parse(merged.runConfigJson)).toMatchObject({
      ralph: { executionBackend: 'claude', iterations: 10, model: 'opus' },
    });
  });

  test('throws on a saved config that is not JSON', () => {
    expect(() =>
      mergePersistedSelectionIntoRunConfig({
        persisted: { backend: 'claude', effort: '', model: 'opus' },
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
      persisted: undefined,
      success: true,
    });
  });

  test('overlays iterations on ralphTuning and carries the persisted selection', () => {
    expect(
      parsePlanRunForm(
        form({
          backend: 'claude',
          branch: 'main',
          effort: 'max',
          iterations: '7',
          model: 'opus',
          ralphTuning: JSON.stringify({ iterations: 2, project: 'p' }),
        }),
      ),
    ).toEqual({
      fields: {
        branch: 'main',
        priority: 1,
        ralph: {
          backend: 'claude',
          effort: 'max',
          iterations: 7,
          model: 'opus',
          project: 'p',
        },
      },
      persisted: { backend: 'claude', effort: 'max', model: 'opus' },
      success: true,
    });
  });

  test('treats a blank effort as unset', () => {
    const result = parsePlanRunForm(
      form({ backend: 'claude', branch: 'main', effort: '', model: 'opus' }),
    );

    expect(result).toMatchObject({
      persisted: { effort: '' },
      success: true,
    });
  });

  test.each([
    [{ iterations: '0' }, 'at least 1'],
    [{ iterations: '1.5' }, 'whole number'],
    [{ backend: 'codex', model: 'm' }, 'Unknown execution backend "codex".'],
    [{ effort: 'high' }, 'only be saved together with a model'],
    [{ model: 'opus' }, 'submitted together'],
    [{ ralphTuning: 'not-json' }, 'Invalid workflow run options payload.'],
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

describe('parsePlanRunForm runner', () => {
  const base = { branch: 'feat/x' };

  test('sends no runner and persists nothing when the form carries none', () => {
    const parsed = parsePlanRunForm(form(base));

    expect(parsed).toMatchObject({ runnerSelection: undefined, success: true });
    expect(parsed.success && parsed.fields).not.toHaveProperty('runner');
  });

  test('OT Loop reaches the enqueue fields and the persisted selection, trimmed', () => {
    const parsed = parsePlanRunForm(
      form({
        ...base,
        otLoopMaxRetries: '4',
        otLoopValidationCommands: ' pnpm test \n\n  pnpm lint  ',
        runner: 'ot-loop',
      }),
    );

    expect(parsed).toMatchObject({
      fields: { runner: 'ot-loop' },
      runnerSelection: {
        otLoop: {
          maxRetries: 4,
          validationCommands: ['pnpm test', 'pnpm lint'],
        },
        runner: 'ot-loop',
      },
      success: true,
    });
  });

  test('Ralph carries no OT Loop edit', () => {
    expect(
      parsePlanRunForm(
        form({ ...base, otLoopMaxRetries: '4', runner: 'ralph' }),
      ),
    ).toMatchObject({
      fields: { runner: 'ralph' },
      runnerSelection: { otLoop: undefined, runner: 'ralph' },
    });
  });

  test.each([
    [{ runner: 'turbo' }, 'Unknown runner "turbo".'],
    [
      { otLoopMaxRetries: '6', runner: 'ot-loop' },
      'Retries must be a whole number from 0 to 5.',
    ],
    [
      { otLoopMaxRetries: '1.5', runner: 'ot-loop' },
      'Retries must be a whole number from 0 to 5.',
    ],
  ])('rejects %j', (extra, error) => {
    expect(parsePlanRunForm(form({ ...base, ...extra }))).toEqual({
      error,
      success: false,
    });
  });
});

describe('mergeRunnerSelectionIntoRunConfig', () => {
  const stored = (extra: Record<string, unknown> = {}): string => {
    return serializePlanRunConfigForGraphql(
      { ...getDefaultPlanRunConfigStorage({ planId }), ...extra },
      { planId },
    );
  };

  test('writes OT Loop and merges the edited fields, keeping setup commands', () => {
    const merged = mergeRunnerSelectionIntoRunConfig({
      planId,
      runConfigJson: stored({
        otLoop: { setupCommands: ['pnpm i'], validationCommands: ['old'] },
        runner: 'ot-loop',
      }),
      selection: {
        otLoop: { maxRetries: 1, validationCommands: ['new'] },
        runner: 'ot-loop',
      },
    });

    expect(merged.changed).toBe(true);
    expect(JSON.parse(merged.runConfigJson)).toMatchObject({
      otLoop: {
        maxRetries: 1,
        setupCommands: ['pnpm i'],
        validationCommands: ['new'],
      },
      runner: 'ot-loop',
    });
  });

  test('an empty list and blank retries clear their keys', () => {
    const merged = mergeRunnerSelectionIntoRunConfig({
      planId,
      runConfigJson: stored({
        otLoop: { maxRetries: 2, validationCommands: ['old'] },
        runner: 'ot-loop',
      }),
      selection: {
        otLoop: { maxRetries: undefined, validationCommands: [] },
        runner: 'ot-loop',
      },
    });

    expect(JSON.parse(merged.runConfigJson)).not.toHaveProperty('otLoop');
  });

  test('Ralph removes the runner key and leaves the stored otLoop alone', () => {
    const merged = mergeRunnerSelectionIntoRunConfig({
      planId,
      runConfigJson: stored({
        otLoop: { validationCommands: ['keep'] },
        runner: 'ot-loop',
      }),
      selection: { otLoop: undefined, runner: 'ralph' },
    });

    expect(merged.changed).toBe(true);
    expect(JSON.parse(merged.runConfigJson)).not.toHaveProperty('runner');
    expect(JSON.parse(merged.runConfigJson)).toMatchObject({
      otLoop: { validationCommands: ['keep'] },
    });
  });

  test('reports no change when the saved config already holds the choice', () => {
    expect(
      mergeRunnerSelectionIntoRunConfig({
        planId,
        runConfigJson: stored(),
        selection: { otLoop: undefined, runner: 'ralph' },
      }).changed,
    ).toBe(false);
  });
});

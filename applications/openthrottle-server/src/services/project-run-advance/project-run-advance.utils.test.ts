import { planRunsFactory } from '@openthrottle/nestjs-repositories-server/testing';
import type { PlanRunConfigStorage } from '@openthrottle/openthrottle-plan-config';
import { getDefaultPlanRunConfigStorage } from '@openthrottle/openthrottle-plan-config';
import { describe, expect, it } from 'vitest';

import { PROJECT_RUN_SETTLE_GRACE_MS } from './project-run-advance.constants.ts';
import {
  actorOf,
  buildProjectRunJobId,
  describeStoppingRun,
  emptyToNull,
  isLockAcquired,
  isWithinSettleGrace,
  toRalphTuningInput,
} from './project-run-advance.utils.ts';

describe('toRalphTuningInput', () => {
  it('returns null for a default configuration', () => {
    expect(toRalphTuningInput(getDefaultPlanRunConfigStorage())).toBeNull();
  });

  it('carries the stored overrides as typed tuning fields', () => {
    const defaults = getDefaultPlanRunConfigStorage();
    const config: PlanRunConfigStorage = {
      ...defaults,
      ralph: {
        ...defaults.ralph,
        debugCli: 'debug',
        executionBackend: 'claude',
        iterations: 3,
        model: 'claude-sonnet-5',
      },
    };

    expect(toRalphTuningInput(config)).toMatchObject({
      backend: 'claude',
      iterations: 3,
      model: 'claude-sonnet-5',
      ralphDebugCli: 'debug',
    });
  });
});

describe('buildProjectRunJobId', () => {
  it('is deterministic per (project run, plan)', () => {
    expect(buildProjectRunJobId('run', 'plan')).toBe('project-run-run-plan');
  });
});

describe('isWithinSettleGrace', () => {
  const now = new Date('2026-11-22T12:00:00Z');

  it('is true just after the settle', () => {
    const run = planRunsFactory.build({
      updatedAt: new Date(now.getTime() - 1_000),
    });
    expect(isWithinSettleGrace(run, now)).toBe(true);
  });

  it('is false past the grace window', () => {
    const run = planRunsFactory.build({
      updatedAt: new Date(now.getTime() - PROJECT_RUN_SETTLE_GRACE_MS - 1),
    });
    expect(isWithinSettleGrace(run, now)).toBe(false);
  });
});

describe('describeStoppingRun', () => {
  it('names the status, and the reason when there is one', () => {
    const run = planRunsFactory.build({ id: 'r', status: 'FAILED' });

    expect(describeStoppingRun({ ...run, settledReason: null })).toBe(
      'Plan run r settled FAILED.',
    );
    expect(describeStoppingRun({ ...run, settledReason: ' no credit ' })).toBe(
      'Plan run r settled FAILED: no credit',
    );
  });
});

describe('actorOf', () => {
  it('attributes to the user, or to no one', () => {
    expect(actorOf('u')).toEqual({ actorKind: 'user', actorSub: 'u' });
    expect(actorOf(null)).toEqual({
      actorKind: undefined,
      actorSub: undefined,
    });
  });
});

describe('emptyToNull', () => {
  it('reads the config’s empty string as unset', () => {
    expect(emptyToNull('  ')).toBeNull();
    expect(emptyToNull('x')).toBe('x');
  });
});

describe('isLockAcquired', () => {
  it('reads the pg_try_advisory_lock row', () => {
    expect(isLockAcquired([{ locked: true }])).toBe(true);
    expect(isLockAcquired([{ locked: false }])).toBe(false);
    expect(isLockAcquired([])).toBe(false);
    expect(isLockAcquired(null)).toBe(false);
  });
});

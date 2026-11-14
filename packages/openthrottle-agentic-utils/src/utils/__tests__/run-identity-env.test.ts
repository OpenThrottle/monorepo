import { describe, expect, it } from 'vitest';

import {
  buildRunIdentityEnv,
  readRunIdentityEnv,
  RUN_IDENTITY_ENV,
} from '../run-identity-env.ts';

describe('buildRunIdentityEnv', () => {
  it('sets all three variables from a full identity', () => {
    expect(
      buildRunIdentityEnv({ planId: 'p', planRunId: 'r', taskId: 't' }),
    ).toEqual({
      OPENTHROTTLE_PLAN_ID: 'p',
      OPENTHROTTLE_PLAN_RUN_ID: 'r',
      OPENTHROTTLE_TASK_ID: 't',
    });
  });

  it('blanks an unknown run or task so an inherited value cannot leak through', () => {
    expect(
      buildRunIdentityEnv({ planId: 'p', planRunId: null, taskId: undefined }),
    ).toEqual({
      OPENTHROTTLE_PLAN_ID: 'p',
      OPENTHROTTLE_PLAN_RUN_ID: '',
      OPENTHROTTLE_TASK_ID: '',
    });
  });
});

describe('readRunIdentityEnv', () => {
  it('round-trips what buildRunIdentityEnv writes', () => {
    const env = buildRunIdentityEnv({
      planId: 'p',
      planRunId: 'r',
      taskId: null,
    });

    expect(readRunIdentityEnv(env)).toEqual({
      planId: 'p',
      planRunId: 'r',
      taskId: null,
    });
  });

  it('is null without a plan id', () => {
    expect(readRunIdentityEnv({})).toBeNull();
    expect(
      readRunIdentityEnv({
        [RUN_IDENTITY_ENV.planId]: '  ',
        [RUN_IDENTITY_ENV.planRunId]: 'r',
      }),
    ).toBeNull();
  });
});

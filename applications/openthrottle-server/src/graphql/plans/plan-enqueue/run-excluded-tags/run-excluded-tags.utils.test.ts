import { GraphQLError } from 'graphql';
import { describe, expect, it } from 'vitest';

import { PLAN_RUN_EXCLUDED_BY_TAG_CODE } from './run-excluded-tags.constants.ts';
import {
  createPlanRunExcludedError,
  findRunExcludingTag,
} from './run-excluded-tags.utils.ts';

describe('findRunExcludingTag', () => {
  it('finds the no-plan-run tag among others', () => {
    expect(findRunExcludingTag(['social', 'no-plan-run'])).toBe('no-plan-run');
  });

  it('ignores case and surrounding space', () => {
    expect(findRunExcludingTag([' No-Plan-Run '])).toBe('no-plan-run');
  });

  it('returns undefined for a plan without an excluded tag', () => {
    expect(findRunExcludingTag([])).toBeUndefined();
    expect(findRunExcludingTag(['social', 'no-plan'])).toBeUndefined();
  });
});

describe('createPlanRunExcludedError', () => {
  it('carries the code, plan and tag in extensions', () => {
    const error = createPlanRunExcludedError({
      planId: 'plan-1',
      tag: 'no-plan-run',
    });

    expect(error).toBeInstanceOf(GraphQLError);
    expect(error.extensions).toEqual({
      code: PLAN_RUN_EXCLUDED_BY_TAG_CODE,
      planId: 'plan-1',
      tag: 'no-plan-run',
    });
    expect(error.extensions['http']).toBeUndefined();
  });
});

import * as React from 'react';
import { act, render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { SKILL_AVAILABILITY_COPY } from '~/routing/skills/data/data.copy';
import type { SkillAvailabilityRuleValue } from '~/routing/skills/utils/skill-availability';
import type {
  SkillAvailabilityRuleFormOptions,
  UseSkillAvailabilityRuleFormResult,
} from '../useSkillAvailabilityRuleForm';
import { useSkillAvailabilityRuleForm } from '../useSkillAvailabilityRuleForm';

const COPY = SKILL_AVAILABILITY_COPY.rules;

const existingRule: SkillAvailabilityRuleValue = {
  environment: 'ci',
  id: 'rule-1',
  slugAllow: ['allowed-skill'],
  slugDeny: [],
  tagAllow: ['tag-a'],
  tagDeny: [],
};

function renderRuleForm(options: SkillAvailabilityRuleFormOptions): {
  component: RenderResult;
  result: () => UseSkillAvailabilityRuleFormResult;
  submit: () => boolean;
} {
  const state: { current: UseSkillAvailabilityRuleFormResult | null } = {
    current: null,
  };
  const submissionState = { hookAllowedSubmit: false };

  function HookProbe(): React.ReactElement {
    const result = useSkillAvailabilityRuleForm(options);
    state.current = result;

    return (
      <form
        data-testid="form"
        onSubmit={(event) => {
          result.handleSubmit(event);
          submissionState.hookAllowedSubmit = !event.defaultPrevented;
          // Always stop the real (unimplemented in jsdom) form submission —
          // the assertion above already captured what the hook decided.
          event.preventDefault();
        }}
      >
        <button type="submit">submit</button>
      </form>
    );
  }

  const Stub = createRoutesStub([
    {
      Component: HookProbe,
      action: () => ({ ok: true }),
      path: '/',
    },
  ]);
  const component = render(<Stub />);

  return {
    component,
    result: () => {
      if (state.current === null) {
        throw new Error('hook has not rendered yet');
      }
      return state.current;
    },
    submit: () => {
      component.getByRole('button', { name: 'submit' }).click();
      return submissionState.hookAllowedSubmit;
    },
  };
}

describe('useSkillAvailabilityRuleForm', () => {
  test('seeds from the blank rule when none is provided', () => {
    const { result } = renderRuleForm({ vocabulary: ['tag-a', 'tag-b'] });

    expect(result().environmentChoice).toBe('all');
    expect(result().slugAllow).toEqual([]);
    expect(result().slugDeny).toEqual([]);
    expect(result().tagAllow).toEqual([]);
    expect(result().tagDeny).toEqual([]);
    expect(result().tagOptions).toEqual([
      { label: 'tag-a', value: 'tag-a' },
      { label: 'tag-b', value: 'tag-b' },
    ]);
  });

  test('seeds from an existing rule', () => {
    const { result } = renderRuleForm({
      rule: existingRule,
      vocabulary: ['tag-a'],
    });

    expect(result().environmentChoice).toBe('ci');
    expect(result().slugAllowRaw).toBe('allowed-skill');
    expect(result().slugAllow).toEqual(['allowed-skill']);
    expect(result().tagAllow).toEqual(['tag-a']);
  });

  test('handleEnvironmentChange updates the environment choice for a valid value', () => {
    const { result } = renderRuleForm({ vocabulary: [] });

    act(() => result().handleEnvironmentChange('ralph'));

    expect(result().environmentChoice).toBe('ralph');
  });

  test('handleEnvironmentChange ignores an invalid value', () => {
    const { result } = renderRuleForm({ vocabulary: [] });

    act(() => result().handleEnvironmentChange('not-a-real-environment'));

    expect(result().environmentChoice).toBe('all');
  });

  test('setSlugAllowRaw re-derives the parsed slugAllow list', () => {
    const { result } = renderRuleForm({ vocabulary: [] });

    act(() => result().setSlugAllowRaw('foo-bar, baz-qux  foo-bar'));

    expect(result().slugAllow).toEqual(['foo-bar', 'baz-qux']);
  });

  test('setTagAllow and setTagDeny update tag selections', () => {
    const { result } = renderRuleForm({ vocabulary: ['tag-a', 'tag-b'] });

    act(() => result().setTagAllow(['tag-a']));
    act(() => result().setTagDeny(['tag-b']));

    expect(result().tagAllow).toEqual(['tag-a']);
    expect(result().tagDeny).toEqual(['tag-b']);
  });

  test('handleSubmit blocks submission and reports an error for an invalid slug', () => {
    const { result, submit } = renderRuleForm({ vocabulary: [] });
    act(() => result().setSlugAllowRaw('Not_Kebab'));

    let allowed = true;
    act(() => {
      allowed = submit();
    });

    expect(allowed).toBe(false);
    expect(result().clientError).toBe(`${COPY.invalidSlugError} Not_Kebab`);
  });

  test('handleSubmit blocks submission and reports an error for an entirely empty rule', () => {
    const { result, submit } = renderRuleForm({ vocabulary: [] });

    let allowed = true;
    act(() => {
      allowed = submit();
    });

    expect(allowed).toBe(false);
    expect(result().clientError).toBe(COPY.emptySlugError);
  });

  test('handleSubmit allows a valid, non-empty rule through and clears any prior error', () => {
    const { result, submit } = renderRuleForm({ vocabulary: [] });
    act(() => result().setSlugAllowRaw('Not_Kebab'));

    act(() => {
      submit();
    });
    expect(result().clientError).toBeDefined();

    act(() => result().setSlugAllowRaw('valid-slug'));

    let allowed = false;
    act(() => {
      allowed = submit();
    });

    expect(allowed).toBe(true);
    expect(result().clientError).toBeUndefined();
  });

  test('isSubmitting reflects the fetcher state', () => {
    const { result } = renderRuleForm({ vocabulary: [] });

    expect(result().isSubmitting).toBe(false);
    expect(result().fetcher.state).toBe('idle');
  });

  test('serverError is undefined without a fetcher error payload', () => {
    const { result } = renderRuleForm({ vocabulary: [] });

    expect(result().serverError).toBeUndefined();
  });
});

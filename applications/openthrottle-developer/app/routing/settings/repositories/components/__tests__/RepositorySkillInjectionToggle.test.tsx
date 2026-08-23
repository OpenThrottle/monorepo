import * as React from 'react';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { REPOSITORIES_TABLE_COPY } from '~/routing/settings/repositories/data/data.copy';
import { RepositorySkillInjectionToggle } from '../RepositorySkillInjectionToggle';
import type { RepositorySkillInjectionToggleProps } from '../RepositorySkillInjectionToggle';

interface ActionOutcome {
  enabled: boolean;
  errorMessage: string | null;
  repositoryId: string;
}

const baseProps: RepositorySkillInjectionToggleProps = {
  enabled: false,
  repositoryId: 'repo-1',
  repositoryName: 'monorepo',
};

const TOGGLE_TEST_ID = 'RepositorySkillInjectionToggle-repo-1';

const renderToggle = (
  props: RepositorySkillInjectionToggleProps = baseProps,
  onSubmit: (formData: FormData) => Promise<ActionOutcome> = async () => ({
    enabled: true,
    errorMessage: null,
    repositoryId: props.repositoryId,
  }),
) => {
  const Component = () => <RepositorySkillInjectionToggle {...props} />;
  const RoutesStub = createRoutesStub([
    { Component, path: '/' },
    {
      action: async ({ request }: { request: Request }) =>
        onSubmit(await request.formData()),
      path: '/resources/repository-skill-injection',
    },
  ]);

  return render(<RoutesStub />);
};

describe('RepositorySkillInjectionToggle Component', () => {
  test('reflects the server truth as the switch checked state', () => {
    const component = renderToggle({ ...baseProps, enabled: true });

    expect(component.getByTestId(TOGGLE_TEST_ID)).toBeChecked();
  });

  test('names the repository in the accessible label', () => {
    const component = renderToggle();

    expect(
      component.getByLabelText(
        `${REPOSITORIES_TABLE_COPY.injectionToggleLabelPrefix} monorepo`,
      ),
    ).toBeInTheDocument();
  });

  test('submits the flipped value to the resource action', async () => {
    const user = userEvent.setup();
    const submitted: FormData[] = [];
    const component = renderToggle(baseProps, async (formData) => {
      submitted.push(formData);
      return { enabled: true, errorMessage: null, repositoryId: 'repo-1' };
    });

    await user.click(component.getByTestId(TOGGLE_TEST_ID));

    expect(submitted).toHaveLength(1);
    expect(submitted[0]?.get('repositoryId')).toBe('repo-1');
    expect(submitted[0]?.get('enabled')).toBe('true');
  });

  test('shows the flipped value optimistically and blocks a second flip in flight', async () => {
    const user = userEvent.setup();
    // Hold the action open so the assertions run against the in-flight state.
    let release = (): void => {};
    const pending = new Promise<void>((resolve) => {
      release = () => resolve();
    });
    const component = renderToggle(baseProps, async () => {
      await pending;
      return { enabled: true, errorMessage: null, repositoryId: 'repo-1' };
    });
    const toggle = component.getByTestId(TOGGLE_TEST_ID);

    await user.click(toggle);

    // Flipping does real filesystem work in the checkout, so the switch reads the
    // submitted value and refuses a second flip until the first one settles.
    await waitFor(() => expect(toggle).toBeDisabled());
    expect(toggle).toBeChecked();

    release();
  });

  test('surfaces the action error message', async () => {
    const user = userEvent.setup();
    const component = renderToggle(baseProps, async () => ({
      enabled: false,
      errorMessage: 'Checkout is missing on disk',
      repositoryId: 'repo-1',
    }));

    await user.click(component.getByTestId(TOGGLE_TEST_ID));

    await waitFor(() =>
      expect(
        component.getByText('Checkout is missing on disk'),
      ).toBeInTheDocument(),
    );
  });
});

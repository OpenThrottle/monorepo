import * as React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { SettingsWorkspaceApplyEditors } from '../SettingsWorkspaceApplyEditors';
import type { SettingsWorkspaceApplyEditorsProps } from '../SettingsWorkspaceApplyEditors';

const renderApplyEditors = (
  props: SettingsWorkspaceApplyEditorsProps,
  action: (args: { request: Request }) => Promise<unknown> = vi.fn(
    async () => null,
  ),
): RenderResult => {
  const Component = () => <SettingsWorkspaceApplyEditors {...props} />;
  const RoutesStub = createRoutesStub([{ Component, action, path: '/' }]);
  return render(<RoutesStub />);
};

describe('SettingsWorkspaceApplyEditors Component', () => {
  let component: RenderResult;
  let props: SettingsWorkspaceApplyEditorsProps;

  beforeEach(() => {
    props = {};
    component = renderApplyEditors(props);
  });

  test('renders the apply editor configuration button', () => {
    expect(
      component.getByTestId('SettingsWorkspaceApplyEditors'),
    ).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: 'Apply to all repositories' }),
    ).toBeInTheDocument();
  });

  test('disables the button when disabled is true and states the reason', () => {
    component.unmount();
    component = renderApplyEditors({ disabled: true });

    const button = component.getByRole('button', {
      name: 'Apply to all repositories',
    });
    const reason = component.getByText(/Enable at least one editor above/i);

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-describedby', reason.id);
  });

  test('renders the action error when provided', () => {
    component.unmount();
    component = renderApplyEditors({ actionError: 'Something went wrong.' });

    expect(component.getByRole('alert')).toHaveTextContent(
      'Something went wrong.',
    );
  });

  test('submits the applyEditorConfig intent without a repositoryId', async () => {
    const user = userEvent.setup();
    let submitted: Record<string, FormDataEntryValue> = {};
    const action = async ({ request }: { request: Request }) => {
      submitted = Object.fromEntries(await request.formData());
      return null;
    };
    component.unmount();
    component = renderApplyEditors({}, action);

    await user.click(
      component.getByRole('button', { name: 'Apply to all repositories' }),
    );

    expect(submitted).toEqual({ intent: 'applyEditorConfig' });
  });
});

import * as React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { SettingsWorkspaceApplyEditors } from './SettingsWorkspaceApplyEditors';
import type { SettingsWorkspaceApplyEditorsProps } from './SettingsWorkspaceApplyEditors';

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
      component.getByRole('button', { name: 'Apply editor configuration' }),
    ).toBeInTheDocument();
  });

  test('disables the button when disabled is true', () => {
    component.unmount();
    component = renderApplyEditors({ disabled: true });

    expect(
      component.getByRole('button', { name: 'Apply editor configuration' }),
    ).toBeDisabled();
  });

  test('renders the action message when provided', () => {
    component.unmount();
    component = renderApplyEditors({ actionMessage: 'Applied to 3 repos.' });

    expect(component.getByRole('status')).toHaveTextContent(
      'Applied to 3 repos.',
    );
  });

  test('renders the action error when provided', () => {
    component.unmount();
    component = renderApplyEditors({ actionError: 'Something went wrong.' });

    expect(component.getByRole('alert')).toHaveTextContent(
      'Something went wrong.',
    );
  });

  test('submits the applyEditorConfig intent when clicked', async () => {
    const user = userEvent.setup();
    let submittedIntent: FormDataEntryValue | null = null;
    const action = async ({ request }: { request: Request }) => {
      const formData = await request.formData();
      submittedIntent = formData.get('intent');
      return null;
    };
    component.unmount();
    component = renderApplyEditors({}, action);

    await user.click(
      component.getByRole('button', { name: 'Apply editor configuration' }),
    );

    expect(submittedIntent).toBe('applyEditorConfig');
  });
});

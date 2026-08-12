import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { WorkspaceEditorId } from '~/__generated__/graphql';
import { WorkspaceEditorMultiSelect } from './WorkspaceEditorMultiSelect';
import type { WorkspaceEditorMultiSelectProps } from './WorkspaceEditorMultiSelect';

describe('WorkspaceEditorMultiSelect Component', () => {
  let component: RenderResult;
  let props: WorkspaceEditorMultiSelectProps;

  beforeEach(() => {
    props = { onChange: vi.fn(), value: [] };

    component = render(<WorkspaceEditorMultiSelect {...props} />);
  });

  test('renders the multi-select control with a placeholder', () => {
    expect(
      component.getByRole('button', { name: 'Editors to configure…' }),
    ).toBeInTheDocument();
  });

  test('renders a hidden input per selected editor, defaulting name to enabledEditors', () => {
    component.unmount();
    component = render(
      <WorkspaceEditorMultiSelect
        {...props}
        value={[WorkspaceEditorId.Cursor, WorkspaceEditorId.Vscode]}
      />,
    );

    const hiddenInputs = component.container.querySelectorAll(
      'input[type="hidden"][name="enabledEditors"]',
    );
    expect(hiddenInputs).toHaveLength(2);
    expect(hiddenInputs[0]).toHaveValue(WorkspaceEditorId.Cursor);
    expect(hiddenInputs[1]).toHaveValue(WorkspaceEditorId.Vscode);
  });

  test('uses a custom hidden-input name when provided', () => {
    component.unmount();
    component = render(
      <WorkspaceEditorMultiSelect
        {...props}
        name="editors"
        value={[WorkspaceEditorId.Cursor]}
      />,
    );

    expect(
      component.container.querySelector('input[type="hidden"][name="editors"]'),
    ).toBeInTheDocument();
  });

  test('selecting an editor option calls onChange with its id', async () => {
    const user = userEvent.setup();

    await user.click(component.getByRole('button', { name: /editors/i }));
    await user.click(component.getByText('Cursor'));

    expect(props.onChange).toHaveBeenCalledWith([WorkspaceEditorId.Cursor]);
  });
});

import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  EditorPresenceState,
  WorkspaceEditorId,
} from '~/__generated__/graphql';
import { buildEditorPresenceIndex } from '~/routing/settings/utils/workspace-editor-presence-status';
import { WorkspaceEditorMultiSelect } from '../WorkspaceEditorMultiSelect';
import type { WorkspaceEditorMultiSelectProps } from '../WorkspaceEditorMultiSelect';

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

const mixedPresence = buildEditorPresenceIndex([
  { editor: WorkspaceEditorId.Claude, presence: EditorPresenceState.Installed },
  { editor: WorkspaceEditorId.Cursor, presence: EditorPresenceState.NotFound },
  { editor: WorkspaceEditorId.Vscode, presence: EditorPresenceState.Unknown },
]);

const renderPicker = (
  props: Partial<WorkspaceEditorMultiSelectProps> = {},
): RenderResult =>
  render(
    <WorkspaceEditorMultiSelect onChange={vi.fn()} value={[]} {...props} />,
  );

describe('WorkspaceEditorMultiSelect availability', () => {
  test('states each editor availability on its own option', async () => {
    const user = userEvent.setup();
    const component = renderPicker({ presence: mixedPresence });

    await user.click(
      component.getByRole('button', { name: 'Editors to configure…' }),
    );

    expect(
      component.getByText('Claude Code was detected on this machine'),
    ).toBeInTheDocument();
    expect(
      component.getByText('Cursor was not detected on this machine'),
    ).toBeInTheDocument();
  });

  test('a NOT_FOUND editor is still selectable and still submits', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const component = renderPicker({ onChange, presence: mixedPresence });

    await user.click(
      component.getByRole('button', { name: 'Editors to configure…' }),
    );
    await user.click(await component.findByRole('option', { name: /Cursor/ }));

    // Presence is advisory: a not-detected editor is as enableable as any other.
    expect(onChange).toHaveBeenCalledWith([WorkspaceEditorId.Cursor]);
  });

  test('renders NO marker for an unknown editor — a plain label, as with no probe', async () => {
    const user = userEvent.setup();
    const component = renderPicker({ presence: mixedPresence });

    await user.click(
      component.getByRole('button', { name: 'Editors to configure…' }),
    );

    const option = await component.findByRole('option', {
      name: /Visual Studio Code/,
    });

    expect(option).toHaveTextContent('Visual Studio Code');
    expect(option.textContent).not.toMatch(/detected|unknown/i);
    expect(
      component.queryByTestId('WorkspaceEditorPresenceMarker-UNKNOWN'),
    ).not.toBeInTheDocument();
  });

  test('behaves identically to today when there is no presence data at all', async () => {
    const user = userEvent.setup();
    const component = renderPicker({ presence: null });

    await user.click(
      component.getByRole('button', { name: 'Editors to configure…' }),
    );

    const options = await component.findAllByRole('option');

    // Every editor is still offered, in the same order, with no status text.
    expect(options).toHaveLength(3);
    expect(options.map((option) => option.textContent)).toEqual([
      'Claude Code',
      'Cursor',
      'Visual Studio Code',
    ]);
    for (const option of options) {
      expect(option).not.toHaveAttribute('aria-disabled', 'true');
    }
  });
});

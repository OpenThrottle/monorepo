import * as React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RenderResult } from '@testing-library/react';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { SKILL_DETAIL_COPY } from '~/routing/skills/data/data.copy';
import { SkillDetailEditControls } from './SkillDetailEditControls';
import type { SkillDetailEditControlsProps } from './SkillDetailEditControls';

describe('SkillDetailEditControls Component', () => {
  let component: RenderResult;
  let props: SkillDetailEditControlsProps;

  const renderControls = (): RenderResult =>
    render(
      <TooltipProvider>
        <SkillDetailEditControls {...props} />
      </TooltipProvider>,
    );

  beforeEach(() => {
    props = {
      editable: true,
      isDirty: false,
      isEditing: false,
      onCancel: vi.fn(),
      onEdit: vi.fn(),
      onSave: vi.fn(),
      saving: false,
    };
    component = renderControls();
  });

  test('renders an Edit button when editable and not editing', () => {
    expect(component.getByTestId('skill-edit-button')).toHaveTextContent(
      SKILL_DETAIL_COPY.editLabel,
    );
  });

  test('invokes onEdit when the Edit button is clicked', async () => {
    await userEvent.click(component.getByTestId('skill-edit-button'));

    expect(props.onEdit).toHaveBeenCalledTimes(1);
  });

  test('renders a disabled Edit button with a tooltip when not editable', () => {
    component.unmount();
    props = { ...props, editable: false };
    component = renderControls();

    expect(component.getByTestId('skill-edit-disabled')).toBeInTheDocument();
    expect(component.getByRole('button')).toBeDisabled();
  });

  test('renders Save (disabled when not dirty) and Cancel while editing', async () => {
    component.unmount();
    props = { ...props, isDirty: false, isEditing: true };
    component = renderControls();

    expect(component.getByTestId('skill-save-button')).toBeDisabled();
    expect(component.getByTestId('skill-cancel-button')).not.toBeDisabled();

    await userEvent.click(component.getByTestId('skill-cancel-button'));
    expect(props.onCancel).toHaveBeenCalledTimes(1);
  });

  test('enables Save when dirty and invokes onSave when clicked', async () => {
    component.unmount();
    props = { ...props, isDirty: true, isEditing: true };
    component = renderControls();

    expect(component.getByTestId('skill-save-button')).not.toBeDisabled();

    await userEvent.click(component.getByTestId('skill-save-button'));
    expect(props.onSave).toHaveBeenCalledTimes(1);
  });

  test('renders the inline save error while editing', () => {
    component.unmount();
    props = {
      ...props,
      isEditing: true,
      saveError: 'Save failed: permission denied',
    };
    component = renderControls();

    expect(component.getByTestId('skill-save-error')).toHaveTextContent(
      'Save failed: permission denied',
    );
  });

  test('disables Save and Cancel while saving', () => {
    component.unmount();
    props = { ...props, isDirty: true, isEditing: true, saving: true };
    component = renderControls();

    expect(component.getByTestId('skill-save-button')).toBeDisabled();
    expect(component.getByTestId('skill-cancel-button')).toBeDisabled();
  });
});

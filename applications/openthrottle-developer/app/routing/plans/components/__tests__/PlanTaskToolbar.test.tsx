import * as React from 'react';
import type { RenderResult } from '@testing-library/react';
import { within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { Mock } from 'vitest';
import { PlanTaskToolbar } from '../PlanTaskToolbar';
import type { PlanTaskToolbarProps } from '../PlanTaskToolbar';
import { renderRoutesStub } from '~/testing/route-fixtures';

const renderToolbar = (props: PlanTaskToolbarProps): RenderResult =>
  renderRoutesStub(
    <TooltipProvider>
      <PlanTaskToolbar {...props} />
    </TooltipProvider>,
  );

describe('PlanTaskToolbar Component', () => {
  let component: RenderResult;
  let props: PlanTaskToolbarProps;
  let onAddTag: Mock<(tag: string) => void>;
  let onRemoveTag: Mock<(tag: string) => void>;

  beforeEach(() => {
    onAddTag = vi.fn<(tag: string) => void>();
    onRemoveTag = vi.fn<(tag: string) => void>();
    props = {
      isPromoted: false,
      onAddTag,
      onRemoveTag,
      planId: 'plan-1',
      tagVocabulary: [
        { dimension: 'domain', tag: 'backend' },
        { dimension: 'domain', tag: 'frontend' },
      ],
      tags: [
        {
          confidence: null,
          dimension: 'domain',
          source: 'human',
          tag: 'backend',
        },
      ],
      taskId: 'task-1',
      taskStatus: 'PENDING',
    };

    component = renderToolbar(props);
  });

  test('renders the status group, Promote, actions, and tags section', () => {
    expect(component.getByTestId('PlanTaskToolbar')).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: /mark complete/i }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: /promote to plan/i }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: /^actions$/i }),
    ).toBeInTheDocument();
    expect(component.getByText('Tags')).toBeInTheDocument();
    expect(component.getByText('backend')).toBeInTheDocument();
  });

  test('wires the add-tag control to onAddTag', async () => {
    const user = userEvent.setup();
    await user.selectOptions(
      component.getByRole('combobox', { name: 'Add a tag' }),
      'frontend',
    );
    await user.click(component.getByRole('button', { name: 'Add' }));

    expect(onAddTag).toHaveBeenCalledWith('frontend');
  });

  test('wires the remove-tag control to onRemoveTag', async () => {
    const user = userEvent.setup();
    await user.click(
      component.getByRole('button', { name: 'Remove tag backend' }),
    );

    expect(onRemoveTag).toHaveBeenCalledWith('backend');
  });

  test('disables Mark Complete when the task is already completed', () => {
    const completed = renderToolbar({ ...props, taskStatus: 'COMPLETED' });
    expect(
      within(completed.container).getByRole('button', {
        name: /mark complete/i,
      }),
    ).toBeDisabled();
  });

  test('disables Promote to Plan when the task is already promoted', () => {
    const promoted = renderToolbar({ ...props, isPromoted: true });
    expect(
      within(promoted.container).getByRole('button', {
        name: /promote to plan/i,
      }),
    ).toBeDisabled();
  });
});

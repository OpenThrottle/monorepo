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
      planIsRunning: false,
      planIsTerminal: false,
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
      taskStatus: 'PENDING',
    };

    component = renderToolbar(props);
  });

  test('renders the status group, Promote, and tag chips', () => {
    expect(component.getByTestId('PlanTaskToolbar')).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: /mark complete/i }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: /promote to plan/i }),
    ).toBeInTheDocument();
    // No actions menu: tasks are edited through the OpenThrottle MCP.
    expect(
      component.queryByRole('button', { name: /^actions$/i }),
    ).not.toBeInTheDocument();
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

  test('disables Mark Complete and Promote while the plan run is active', () => {
    const running = within(
      renderToolbar({ ...props, planIsRunning: true }).container,
    );
    expect(
      running.getByRole('button', { name: /mark complete/i }),
    ).toBeDisabled();
    expect(
      running.getByRole('button', { name: /promote to plan/i }),
    ).toBeDisabled();
  });

  test('leaves Mark Complete and Promote enabled when the plan run is not active', () => {
    const idle = within(
      renderToolbar({ ...props, planIsRunning: false }).container,
    );
    expect(
      idle.getByRole('button', { name: /mark complete/i }),
    ).not.toBeDisabled();
    expect(
      idle.getByRole('button', { name: /promote to plan/i }),
    ).not.toBeDisabled();
  });

  test('disables Mark Complete and Promote while the plan is terminal', () => {
    const terminal = within(
      renderToolbar({ ...props, planIsTerminal: true }).container,
    );
    expect(
      terminal.getByRole('button', { name: /mark complete/i }),
    ).toBeDisabled();
    expect(
      terminal.getByRole('button', { name: /promote to plan/i }),
    ).toBeDisabled();
  });
});

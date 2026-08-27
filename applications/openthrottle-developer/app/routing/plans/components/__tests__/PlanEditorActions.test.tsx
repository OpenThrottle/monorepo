import * as React from 'react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { describe, expect, test } from 'vitest';
import { PlanEditorActions } from '../PlanEditorActions';
import type { PlanEditorActionsProps } from '../PlanEditorActions';
import { renderRoutesStub } from '~/testing/route-fixtures';
import { WorkspaceEditorId } from '~/__generated__/graphql';
import { PLAN_EDITOR_ACTIONS_COPY } from '~/routing/plans/data/data.copy';

const PLAN_ID = 'ec3dcee9-36e6-4ecb-876a-f689723f6db4';
const WORKING_DIRECTORY = '/Users/matt/Development/openthrottle';

const renderActions = (props: PlanEditorActionsProps): RenderResult =>
  renderRoutesStub(
    <TooltipProvider>
      <PlanEditorActions {...props} />
    </TooltipProvider>,
  );

describe('PlanEditorActions Component', () => {
  test('renders one link per enabled editor with the expected href', () => {
    const component = renderActions({
      editors: [
        WorkspaceEditorId.Claude,
        WorkspaceEditorId.Cursor,
        WorkspaceEditorId.Vscode,
      ],
      planId: PLAN_ID,
      workingDirectory: WORKING_DIRECTORY,
    });

    expect(component.getByTestId('PlanEditorActions')).toBeInTheDocument();

    expect(
      component.getByRole('link', { name: 'Claude Code' }),
    ).toHaveAttribute(
      'href',
      `claude://code/new?folder=%2FUsers%2Fmatt%2FDevelopment%2Fopenthrottle&q=%2Fot-claude-loop%20${PLAN_ID}`,
    );
    expect(component.getByRole('link', { name: 'Cursor' })).toHaveAttribute(
      'href',
      `cursor://anysphere.cursor-deeplink/prompt?text=Run%20OpenThrottle%20plan%20${PLAN_ID}%20following%20.agents%2Fskills%2Fot-claude-loop%2FSKILL.md`,
    );
    expect(component.getByRole('link', { name: 'VS Code' })).toHaveAttribute(
      'href',
      'vscode://file/Users/matt/Development/openthrottle',
    );
  });

  test('renders nothing when no editor is enabled', () => {
    const component = renderActions({
      editors: [],
      planId: PLAN_ID,
      workingDirectory: WORKING_DIRECTORY,
    });

    expect(component.queryByTestId('PlanEditorActions')).toBeNull();
  });

  test('disables folder-based editors instead of hiding them when none resolved', () => {
    // Absence alone is indistinguishable from a broken feature, so the button
    // stays visible and inert with a tooltip naming the fix.
    const component = renderActions({
      editors: [WorkspaceEditorId.Claude, WorkspaceEditorId.Vscode],
      planId: PLAN_ID,
      workingDirectory: '',
    });

    expect(component.getByTestId('PlanEditorActions')).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: 'Claude Code' }),
    ).toBeDisabled();
    expect(component.getByRole('button', { name: 'VS Code' })).toBeDisabled();
    // Disabled means no link, so nothing is clickable through to the OS.
    expect(component.queryByRole('link')).toBeNull();
  });

  test('explains why a disabled editor is inert', async () => {
    const user = userEvent.setup();
    const component = renderActions({
      editors: [WorkspaceEditorId.Claude],
      planId: PLAN_ID,
      workingDirectory: '',
    });

    // Hover the wrapper, not the button: a disabled button swallows pointer
    // events, which is the whole reason the span exists.
    await user.hover(
      component.getByTestId('PlanEditorActions-disabled-Claude Code'),
    );

    expect(
      await component.findByText(
        PLAN_EDITOR_ACTIONS_COPY.needsCheckoutTooltip('Claude Code'),
        undefined,
        { timeout: 3_000 },
      ),
    ).toBeInTheDocument();
  });

  test('still links the folder-less Cursor editor without a working directory', () => {
    const component = renderActions({
      editors: [WorkspaceEditorId.Claude, WorkspaceEditorId.Cursor],
      planId: PLAN_ID,
      workingDirectory: '',
    });

    expect(component.getByRole('link', { name: 'Cursor' })).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: 'Claude Code' }),
    ).toBeDisabled();
  });
});

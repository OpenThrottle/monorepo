import * as React from 'react';
import type { RenderResult } from '@testing-library/react';
import { waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import { PlanEditorActions } from '../PlanEditorActions';
import type { PlanEditorActionsProps } from '../PlanEditorActions';
import { renderRoutesStub } from '~/testing/route-fixtures';
import { WorkspaceEditorId } from '~/__generated__/graphql';
import {
  PLAN_DEFERRED_SECTION_COPY,
  PLAN_EDITOR_ACTIONS_COPY,
} from '~/routing/plans/data/data.copy';

const PLAN_ID = 'ec3dcee9-36e6-4ecb-876a-f689723f6db4';
const WORKING_DIRECTORY = '/Users/matt/Development/openthrottle';

const renderActions = (props: PlanEditorActionsProps): RenderResult =>
  renderRoutesStub(<PlanEditorActions {...props} />);

const resolvedEditors = (
  editors: readonly WorkspaceEditorId[],
): Promise<readonly WorkspaceEditorId[]> => Promise.resolve(editors);

describe('PlanEditorActions Component', () => {
  test('renders one link per enabled editor with the expected href', async () => {
    const component = renderActions({
      editors: resolvedEditors([
        WorkspaceEditorId.Claude,
        WorkspaceEditorId.Cursor,
        WorkspaceEditorId.Vscode,
      ]),
      planId: PLAN_ID,
      workingDirectory: WORKING_DIRECTORY,
    });

    expect(
      await component.findByTestId('PlanEditorActions'),
    ).toBeInTheDocument();

    expect(
      component.getByRole('link', { name: 'Claude Code' }),
    ).toHaveAttribute(
      'href',
      `claude://code/new?folder=%2FUsers%2Fmatt%2FDevelopment%2Fopenthrottle%2F&q=%2Fot-claude-loop%20${PLAN_ID}`,
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

  test('renders nothing when no editor is enabled', async () => {
    const component = renderActions({
      editors: resolvedEditors([]),
      planId: PLAN_ID,
      workingDirectory: WORKING_DIRECTORY,
    });

    await waitFor(() =>
      expect(component.queryByTestId('PlanToolbarTagsSkeleton')).toBeNull(),
    );
    expect(component.queryByTestId('PlanEditorActions')).toBeNull();
  });

  test('renders nothing when no editors promise is supplied', () => {
    const component = renderActions({
      planId: PLAN_ID,
      workingDirectory: WORKING_DIRECTORY,
    });

    expect(component.queryByTestId('PlanEditorActions')).toBeNull();
    expect(component.queryByTestId('PlanToolbarTagsSkeleton')).toBeNull();
  });

  test('renders the skeleton while the editors promise is pending', () => {
    const component = renderActions({
      editors: new Promise(() => {}),
      planId: PLAN_ID,
      workingDirectory: WORKING_DIRECTORY,
    });

    expect(
      component.getByTestId('PlanToolbarTagsSkeleton'),
    ).toBeInTheDocument();
    expect(component.queryByTestId('PlanEditorActions')).toBeNull();
  });

  test('degrades to its own error text when the promise rejects', async () => {
    const component = renderActions({
      editors: Promise.reject(new Error('settings unavailable')),
      planId: PLAN_ID,
      workingDirectory: WORKING_DIRECTORY,
    });

    expect(
      await component.findByText(PLAN_DEFERRED_SECTION_COPY.editorsError),
    ).toBeInTheDocument();
  });

  test('disables folder-based editors instead of hiding them when none resolved', async () => {
    // Absence alone is indistinguishable from a broken feature, so the button
    // stays visible and inert with a tooltip naming the fix.
    const component = renderActions({
      editors: resolvedEditors([
        WorkspaceEditorId.Claude,
        WorkspaceEditorId.Vscode,
      ]),
      planId: PLAN_ID,
      workingDirectory: '',
    });

    expect(
      await component.findByTestId('PlanEditorActions'),
    ).toBeInTheDocument();
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
      editors: resolvedEditors([WorkspaceEditorId.Claude]),
      planId: PLAN_ID,
      workingDirectory: '',
    });

    // Hover the wrapper, not the button: a disabled button swallows pointer
    // events, which is the whole reason the span exists.
    await user.hover(
      await component.findByTestId('PlanEditorActions-disabled-Claude Code'),
    );

    expect(
      await component.findByText(
        PLAN_EDITOR_ACTIONS_COPY.needsCheckoutTooltip('Claude Code'),
        undefined,
        { timeout: 3_000 },
      ),
    ).toBeInTheDocument();
  });

  test('still links the folder-less Cursor editor without a working directory', async () => {
    const component = renderActions({
      editors: resolvedEditors([
        WorkspaceEditorId.Claude,
        WorkspaceEditorId.Cursor,
      ]),
      planId: PLAN_ID,
      workingDirectory: '',
    });

    expect(
      await component.findByRole('link', { name: 'Cursor' }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: 'Claude Code' }),
    ).toBeDisabled();
  });
});

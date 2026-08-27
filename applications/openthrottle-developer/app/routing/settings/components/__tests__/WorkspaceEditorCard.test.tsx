import * as React from 'react';
import userEvent from '@testing-library/user-event';
import type { RenderResult } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { WorkspaceEditorCard } from '../WorkspaceEditorCard';
import type { WorkspaceEditorCardProps } from '../WorkspaceEditorCard';
import {
  EditorPresenceState,
  WorkspaceEditorId,
} from '~/__generated__/graphql';
import { renderRoutesStub } from '~/testing/route-fixtures';

const renderCard = (
  overrides?: Partial<WorkspaceEditorCardProps>,
): RenderResult =>
  renderRoutesStub(
    <WorkspaceEditorCard
      editor={WorkspaceEditorId.Cursor}
      enabled={false}
      onToggle={() => undefined}
      {...overrides}
    />,
  );

describe('WorkspaceEditorCard Component', () => {
  let component: RenderResult;

  beforeEach(() => {
    component = renderCard();
  });

  test('renders the editor label, what OpenThrottle writes, and the switch', () => {
    expect(component.getByTestId('WorkspaceEditorCard')).toBeInTheDocument();
    expect(component.getByText('Cursor')).toBeInTheDocument();
    expect(
      component.getByText(/Writes \.cursor\/mcp\.json/),
    ).toBeInTheDocument();
    expect(
      component.getByRole('switch', { name: 'Enable Cursor' }),
    ).toBeInTheDocument();
  });

  test('INSTALLED renders the detected badge', () => {
    component.unmount();
    component = renderCard({ presence: EditorPresenceState.Installed });

    expect(component.getByText('Detected')).toBeInTheDocument();
    expect(component.queryByText('Not detected')).not.toBeInTheDocument();
  });

  test('NOT_FOUND renders the not-detected badge', () => {
    component.unmount();
    component = renderCard({ presence: EditorPresenceState.NotFound });

    expect(component.getByText('Not detected')).toBeInTheDocument();
  });

  test('UNKNOWN renders no badge — silence is the correct output', () => {
    component.unmount();
    component = renderCard({ presence: EditorPresenceState.Unknown });

    expect(component.queryByText('Detected')).not.toBeInTheDocument();
    expect(component.queryByText('Not detected')).not.toBeInTheDocument();
  });

  test('a failed probe renders no badge', () => {
    component.unmount();
    component = renderCard({ presence: null });

    expect(component.queryByText('Detected')).not.toBeInTheDocument();
    expect(component.queryByText('Not detected')).not.toBeInTheDocument();
  });

  test('a NOT_FOUND card still toggles — detection never gates', async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();

    component.unmount();
    component = renderCard({
      onToggle,
      presence: EditorPresenceState.NotFound,
    });

    const control = component.getByTestId(
      `WorkspaceEditorCard-switch-${WorkspaceEditorId.Cursor}`,
    );

    expect(control).toBeEnabled();

    await user.click(control);

    expect(onToggle).toHaveBeenCalledWith(WorkspaceEditorId.Cursor, true);
  });

  test('renders no affiliate link when the editor has no program', () => {
    expect(
      component.queryByTestId('WorkspaceEditorCard-affiliate'),
    ).not.toBeInTheDocument();
  });

  test('discloses the affiliate link when one is configured', () => {
    component.unmount();
    component = renderCard({ affiliateUrl: 'https://cursor.com/referral' });

    const link = component.getByTestId('WorkspaceEditorCard-affiliate');

    expect(link).toHaveAttribute('rel', expect.stringContaining('sponsored'));
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAccessibleName(
      'Get Cursor (affiliate link, opens in a new tab)',
    );
  });

  test('following the affiliate link does not toggle the editor', async () => {
    // The nested-interactive trap: the anchor must sit outside the label that
    // wraps the switch, or acquiring an editor would silently enable it.
    const onToggle = vi.fn();
    const user = userEvent.setup();

    component.unmount();
    component = renderCard({
      affiliateUrl: 'https://cursor.com/referral',
      onToggle,
    });

    await user.click(component.getByTestId('WorkspaceEditorCard-affiliate'));

    expect(onToggle).not.toHaveBeenCalled();
  });

  test('clicking the card body toggles the editor', async () => {
    // The affordance a wrapping label could not provide: Chrome does not
    // forward label clicks to a button-based switch.
    const onToggle = vi.fn();
    const user = userEvent.setup();

    component.unmount();
    component = renderCard({ onToggle });

    await user.click(component.getByText('Cursor'));

    expect(onToggle).toHaveBeenCalledWith(WorkspaceEditorId.Cursor, true);
  });

  test('an enabled card reads as selected and reports its state to tests', () => {
    component.unmount();
    component = renderCard({
      enabled: true,
      presence: EditorPresenceState.Installed,
    });

    const card = component.getByTestId('WorkspaceEditorCard');

    expect(card.dataset.editor).toBe(WorkspaceEditorId.Cursor);
    expect(card.dataset.presence).toBe(EditorPresenceState.Installed);
    expect(
      component.getByRole('switch', { name: 'Enable Cursor' }),
    ).toBeChecked();
  });
});

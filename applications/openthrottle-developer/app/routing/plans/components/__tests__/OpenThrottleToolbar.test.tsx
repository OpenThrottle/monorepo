import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { OpenThrottleToolbar } from '../OpenThrottleToolbar';
import type { OpenThrottleToolbarProps } from '../OpenThrottleToolbar';

const renderToolbar = (props: OpenThrottleToolbarProps): RenderResult =>
  render(<OpenThrottleToolbar {...props} />);

describe('OpenThrottleToolbar Component', () => {
  test('renders each provided slot', () => {
    const component = renderToolbar({
      actionsMenu: <button type="button">Actions</button>,
      primaryActions: <span>Primary</span>,
      statusAction: <button type="button">Mark Complete</button>,
      tags: <div data-testid="tags-slot">Tags</div>,
      utilityContent: <a href="#preview">CLI preview</a>,
    });

    expect(component.getByText('Mark Complete')).toBeInTheDocument();
    expect(component.getByText('Primary')).toBeInTheDocument();
    expect(component.getByText('Actions')).toBeInTheDocument();
    expect(component.getByTestId('tags-slot')).toBeInTheDocument();
    expect(
      component.getByRole('link', { name: 'CLI preview' }),
    ).toBeInTheDocument();
  });

  test('uses the default test id when none is supplied', () => {
    const component = renderToolbar({});
    expect(component.getByTestId('OpenThrottleToolbar')).toBeInTheDocument();
  });

  test('honors a custom test id for composing toolbars', () => {
    const component = renderToolbar({ dataTestId: 'PlanToolbar' });
    expect(component.getByTestId('PlanToolbar')).toBeInTheDocument();
  });

  test('omits optional slots without error', () => {
    const component = renderToolbar({
      statusAction: <button type="button">Mark Complete</button>,
    });
    expect(component.getByText('Mark Complete')).toBeInTheDocument();
    expect(component.queryByRole('link')).not.toBeInTheDocument();
  });
});

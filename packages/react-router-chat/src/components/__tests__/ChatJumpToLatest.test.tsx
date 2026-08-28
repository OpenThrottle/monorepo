import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { ChatJumpToLatest } from '../ChatJumpToLatest';
import type { ChatJumpToLatestProps } from '../ChatJumpToLatest';

const renderControl = (props: ChatJumpToLatestProps): RenderResult =>
  render(<ChatJumpToLatest {...props} />);

describe('ChatJumpToLatest Component', () => {
  test('renders nothing while the view is following the bottom', () => {
    const component = renderControl({ isPinned: true, onJump: vi.fn() });

    expect(component.queryByTestId('ChatJumpToLatest')).not.toBeInTheDocument();
  });

  test('appears once the reader has scrolled away', () => {
    const component = renderControl({ isPinned: false, onJump: vi.fn() });

    expect(component.getByTestId('ChatJumpToLatest')).toBeInTheDocument();
  });

  test('calls onJump when clicked', async () => {
    const user = userEvent.setup();
    const onJump = vi.fn();
    const component = renderControl({ isPinned: false, onJump });

    await user.click(component.getByRole('button', { name: 'Jump to latest' }));

    expect(onJump).toHaveBeenCalledTimes(1);
  });

  test('is reachable and operable from the keyboard', async () => {
    const user = userEvent.setup();
    const onJump = vi.fn();
    const component = renderControl({ isPinned: false, onJump });

    await user.tab();
    expect(component.getByTestId('ChatJumpToLatest')).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(onJump).toHaveBeenCalledTimes(1);
  });

  test('carries an accessible name for screen readers', () => {
    const component = renderControl({ isPinned: false, onJump: vi.fn() });

    expect(component.getByTestId('ChatJumpToLatest')).toHaveAttribute(
      'aria-label',
      'Jump to latest',
    );
  });
});

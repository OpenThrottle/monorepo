import * as React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { DocHeadingAnchor } from '../DocHeadingAnchor';

describe('DocHeadingAnchor', () => {
  test('renders a labeled copy button', () => {
    const component = render(<DocHeadingAnchor slug="setup" />);

    expect(
      component.getByRole('button', { name: 'Copy link to “setup” section' }),
    ).toBeInTheDocument();
  });

  test('copies the #slug fragment and flips to the check icon', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    const component = render(<DocHeadingAnchor slug="getting-started" />);
    const button = component.getByRole('button', {
      name: 'Copy link to “getting-started” section',
    });

    expect(button.querySelector('svg.lucide-link')).not.toBeNull();

    await user.click(button);

    expect(writeText).toHaveBeenCalledWith('#getting-started');
    expect(button.querySelector('svg.lucide-check')).not.toBeNull();
  });

  test('does not throw when the Clipboard API is unavailable', async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });

    const component = render(<DocHeadingAnchor slug="no-clipboard" />);
    const button = component.getByRole('button', {
      name: 'Copy link to “no-clipboard” section',
    });

    // The optional-chained clipboard call short-circuits silently (no throw)
    // rather than rejecting, so the click resolves cleanly either way.
    await expect(user.click(button)).resolves.toBeUndefined();
  });

  test('applies the given className alongside the base classes', () => {
    const component = render(
      <DocHeadingAnchor className="custom-class" slug="styled" />,
    );

    expect(
      component.getByRole('button', { name: 'Copy link to “styled” section' }),
    ).toHaveClass('custom-class');
  });
});

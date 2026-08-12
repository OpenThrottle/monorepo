import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { ChatComposerFooter } from '../ChatComposerFooter';
import type { ChatComposerFooterProps } from '../ChatComposerFooter';

const renderFooter = (
  overrides: Partial<ChatComposerFooterProps> = {},
): RenderResult =>
  render(
    <ChatComposerFooter
      disabled={false}
      draft=""
      isStreaming={false}
      stopLabel="Stop"
      submitLabel="Send"
      {...overrides}
    />,
  );

describe('ChatComposerFooter Component', () => {
  test('renders a disabled Send button when the draft is empty', () => {
    const component = renderFooter();

    expect(component.getByRole('button', { name: 'Send' })).toBeDisabled();
    expect(
      component.queryByRole('button', { name: 'Stop' }),
    ).not.toBeInTheDocument();
  });

  test('enables Send once the draft has non-whitespace content', () => {
    const component = renderFooter({ draft: 'hello' });

    expect(component.getByRole('button', { name: 'Send' })).toBeEnabled();
  });

  test('keeps Send disabled for whitespace-only drafts', () => {
    const component = renderFooter({ draft: '   ' });

    expect(component.getByRole('button', { name: 'Send' })).toBeDisabled();
  });

  test('keeps Send disabled when the composer itself is disabled', () => {
    const component = renderFooter({ disabled: true, draft: 'hello' });

    expect(component.getByRole('button', { name: 'Send' })).toBeDisabled();
  });

  test('shows Stop while streaming and fires onStop on click', async () => {
    const onStop = vi.fn();
    const component = renderFooter({ isStreaming: true, onStop });

    const stop = component.getByRole('button', { name: 'Stop' });
    expect(stop).toBeInTheDocument();
    expect(
      component.queryByRole('button', { name: 'Send' }),
    ).not.toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(stop);

    expect(onStop).toHaveBeenCalledTimes(1);
  });

  test('renders the docked toolbar on the left when supplied', () => {
    const component = renderFooter({
      toolbar: <div data-testid="my-toolbar">Toolbar</div>,
    });

    expect(component.getByTestId('my-toolbar')).toBeInTheDocument();
  });

  test('hides the usage counter when sessionUsage is omitted', () => {
    const component = renderFooter();

    expect(component.queryByTestId('ChatUsageCounter')).not.toBeInTheDocument();
  });

  test('renders the usage counter when sessionUsage is supplied', () => {
    const component = renderFooter({
      sessionUsage: { totalTokens: 1200 },
    });

    expect(component.getByTestId('ChatUsageCounter')).toHaveTextContent(
      '1.2k tokens',
    );
  });
});

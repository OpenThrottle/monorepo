import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { describe, expect, test, vi } from 'vitest';
import { ChatComposerPersistControl } from '../ChatComposerPersistControl';
import type { ChatComposerPersistControlProps } from '../ChatComposerPersistControl';

const renderControl = (
  props: ChatComposerPersistControlProps = {},
): RenderResult =>
  render(
    <TooltipProvider>
      <ChatComposerPersistControl {...props} />
    </TooltipProvider>,
  );

describe('ChatComposerPersistControl Component', () => {
  test('renders nothing when no onPersistChange callback is supplied', () => {
    const component = renderControl();

    expect(
      component.queryByTestId('ChatComposerToolbar-persist'),
    ).not.toBeInTheDocument();
  });

  test('defaults to the Saved affordance when persist is omitted', () => {
    const component = renderControl({ onPersistChange: vi.fn() });

    expect(
      component.getByTestId('ChatComposerToolbar-persist'),
    ).toHaveTextContent('Saved');
  });

  test('renders the Saved affordance and toggles off on click', async () => {
    const onPersistChange = vi.fn();
    const component = renderControl({ onPersistChange, persist: true });

    expect(
      component.getByTestId('ChatComposerToolbar-persist'),
    ).toHaveTextContent('Saved');

    const user = userEvent.setup();
    await user.click(
      component.getByTestId('ChatComposerToolbar-persist-switch'),
    );

    expect(onPersistChange).toHaveBeenCalledWith(false);
  });

  test('renders the Private affordance and toggles back on when off', async () => {
    const onPersistChange = vi.fn();
    const component = renderControl({ onPersistChange, persist: false });

    expect(
      component.getByTestId('ChatComposerToolbar-persist'),
    ).toHaveTextContent('Private');

    const user = userEvent.setup();
    await user.click(
      component.getByTestId('ChatComposerToolbar-persist-switch'),
    );

    expect(onPersistChange).toHaveBeenCalledWith(true);
  });
});

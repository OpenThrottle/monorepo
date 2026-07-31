import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { describe, expect, test, vi } from 'vitest';
import { ChatRetryNotice } from '../ChatRetryNotice';
import type { ChatRetryNoticeProps } from '../ChatRetryNotice';

const renderNotice = (props: ChatRetryNoticeProps): RenderResult => {
  const Comp = (): React.ReactElement => <ChatRetryNotice {...props} />;
  const RoutesStub = createRoutesStub([{ Component: Comp, path: '/' }]);
  return render(<RoutesStub />);
};

describe('ChatRetryNotice Component', () => {
  test('renders the timeout notice and a Retry button', () => {
    const component = renderNotice({ onRetry: vi.fn() });

    expect(component.getByTestId('ChatRetryNotice')).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: 'Retry' }),
    ).toBeInTheDocument();
  });

  test('invokes onRetry when the button is clicked', async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    const component = renderNotice({ onRetry });

    await user.click(component.getByRole('button', { name: 'Retry' }));

    expect(onRetry).toHaveBeenCalledOnce();
  });

  test('disables Retry while a replay is in flight', () => {
    const component = renderNotice({ isRetrying: true, onRetry: vi.fn() });

    expect(component.getByRole('button', { name: 'Retry' })).toBeDisabled();
  });
});

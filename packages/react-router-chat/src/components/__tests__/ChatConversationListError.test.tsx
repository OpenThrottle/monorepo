import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, test, vi } from 'vitest';

import { ChatConversationListError } from '../ChatConversationListError';

describe('ChatConversationListError', () => {
  test('shows the failure reason as an alert', () => {
    const component = render(
      <ChatConversationListError
        errorMessage="Missing permission: settings:read"
        onRetry={undefined}
      />,
    );

    expect(component.getByRole('alert')).toHaveTextContent(
      'Missing permission: settings:read',
    );
    expect(component.queryByRole('button')).not.toBeInTheDocument();
  });

  test('calls onRetry from the Retry action', async () => {
    const onRetry = vi.fn();
    const component = render(
      <ChatConversationListError errorMessage="boom" onRetry={onRetry} />,
    );

    await userEvent.setup().click(component.getByRole('button'));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

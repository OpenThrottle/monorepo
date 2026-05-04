import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GlobalRootLoaderFailureBanner } from '../GlobalRootLoaderFailureBanner';

describe('GlobalRootLoaderFailureBanner', () => {
  it('renders step line and expandable full message when truncated', async () => {
    const user = userEvent.setup();
    const longMessage = `GraphQL errors: ${'x'.repeat(400)}`;

    render(
      <GlobalRootLoaderFailureBanner
        failure={{
          kind: 'graphql',
          message: longMessage,
          step: 'user',
        }}
        onRetry={vi.fn()}
        userLoadOk={false}
      />,
    );

    expect(
      screen.getByText(/Failed while loading: Current user session/i),
    ).toBeInTheDocument();

    const details = screen
      .getByText('Full error message')
      .closest('details') as HTMLDetailsElement;
    expect(details.open).toBe(false);

    await user.click(screen.getByText('Full error message'));
    expect(details.open).toBe(true);
    expect(screen.getByText(longMessage)).toBeInTheDocument();
  });

  it('disables retry while revalidating', () => {
    render(
      <GlobalRootLoaderFailureBanner
        failure={{
          kind: 'transport',
          message: 'fetch failed',
          step: 'health',
        }}
        isRevalidating={true}
        onRetry={vi.fn()}
        userLoadOk={true}
      />,
    );

    expect(screen.getByRole('button', { name: /Retrying/i })).toBeDisabled();
  });
});

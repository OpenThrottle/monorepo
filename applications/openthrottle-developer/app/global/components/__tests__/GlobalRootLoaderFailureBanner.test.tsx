import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { GlobalRootLoaderFailureBanner } from '../GlobalRootLoaderFailureBanner';

describe('GlobalRootLoaderFailureBanner', () => {
  it('renders step line and expandable full message when truncated', async () => {
    const user = userEvent.setup();
    const longMessage = `GraphQL errors: ${'x'.repeat(400)}`;

    const component = render(
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
      component.getByText(/Failed while loading: Current user session/i),
    ).toBeInTheDocument();

    const details = component
      .getByText('Full error message')
      .closest('details');
    if (details === null) {
      throw new Error('Expected a <details> ancestor');
    }
    expect(details.open).toBe(false);

    await user.click(component.getByText('Full error message'));
    expect(details.open).toBe(true);
    expect(component.getByText(longMessage)).toBeInTheDocument();
  });

  it('disables retry while revalidating', () => {
    const component = render(
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

    expect(component.getByRole('button', { name: /Retrying/i })).toBeDisabled();
  });

  it('shows HTTP status badge and GraphQL base when provided', () => {
    const component = render(
      <GlobalRootLoaderFailureBanner
        diagnostics={{
          graphQlRequestBaseUrl: 'http://localhost:6021',
        }}
        failure={{
          httpStatus: 503,
          kind: 'transport',
          message: 'openthrottle-server GraphQL error 503: …',
          step: 'health',
        }}
        onRetry={vi.fn()}
        userLoadOk={true}
      />,
    );

    expect(component.getByText('HTTP 503')).toBeInTheDocument();
    expect(component.getByText('http://localhost:6021')).toBeInTheDocument();
  });
});

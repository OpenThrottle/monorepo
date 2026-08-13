import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { DashboardDeferredCard } from '../DashboardDeferredCard';
import type { DashboardDeferredCardProps } from '../DashboardDeferredCard';

describe('DashboardDeferredCard Component', () => {
  let component: RenderResult;
  let props: DashboardDeferredCardProps<Promise<string>>;

  beforeEach(() => {
    props = {
      children: (data) => <p>Resolved: {data}</p>,
      errorText: 'Failed to load card.',
      fallback: <p>Loading…</p>,
      resolve: Promise.resolve('hello'),
    };

    component = render(<DashboardDeferredCard {...props} />);
  });

  test('shows the fallback while the promise is pending', async () => {
    expect(component.getByText('Loading…')).toBeInTheDocument();

    // Let the already-resolved promise settle inside this test so React
    // doesn't warn about a suspended resource finishing after the test ends.
    await component.findByText('Resolved: hello');
  });

  test('renders the resolved children once the promise settles', async () => {
    expect(await component.findByText('Resolved: hello')).toBeInTheDocument();
  });

  test('renders the errorText when the promise rejects', async () => {
    component.unmount();
    component = render(
      <DashboardDeferredCard
        {...props}
        resolve={Promise.reject(new Error('boom'))}
      />,
    );

    expect(
      await component.findByText('Failed to load card.'),
    ).toBeInTheDocument();
  });
});

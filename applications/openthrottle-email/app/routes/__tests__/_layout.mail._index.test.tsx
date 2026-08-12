import * as React from 'react';
import { render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import Route, { meta } from '../_layout.mail._index';
import { SITE_TITLE } from '~/global/config/settings';

const messages = [
  {
    date: '2025-01-01 12:00',
    from: 'sender@example.com',
    id: '1',
    read: false,
    subject: 'Unread subject',
  },
  {
    date: '2025-01-02 08:30',
    from: 'other@example.com',
    id: '2',
    read: true,
    subject: 'Read subject',
  },
];

describe('routes/_layout.mail._index.tsx', () => {
  const renderRoute = () => {
    const RoutesStub = createRoutesStub([
      {
        Component: Route,
        loader: () => ({ messages }),
        path: '/',
      },
    ]);
    return render(<RoutesStub />);
  };

  test('returns site title and description from meta', () => {
    // @ts-expect-error - we're testing the function
    expect(meta({})).toEqual([
      { title: SITE_TITLE },
      { content: expect.any(String), name: 'description' },
    ]);
  });

  test('renders the inbox with all messages by default', async () => {
    const component = renderRoute();

    expect(await component.findByText('Unread subject')).toBeInTheDocument();
    expect(component.getByText('Read subject')).toBeInTheDocument();
  });

  test('the Unread filter hides read messages', async () => {
    const user = userEvent.setup();
    const component = renderRoute();

    await component.findByText('Unread subject');
    await user.click(component.getByRole('button', { name: 'Unread' }));

    expect(component.getByText('Unread subject')).toBeInTheDocument();
    expect(component.queryByText('Read subject')).not.toBeInTheDocument();
  });

  test('the All filter restores read messages', async () => {
    const user = userEvent.setup();
    const component = renderRoute();

    await component.findByText('Unread subject');
    await user.click(component.getByRole('button', { name: 'Unread' }));
    await user.click(component.getByRole('button', { name: 'All' }));

    expect(component.getByText('Unread subject')).toBeInTheDocument();
    expect(component.getByText('Read subject')).toBeInTheDocument();
  });
});

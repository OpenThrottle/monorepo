import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, test, vi } from 'vitest';

import { renderWithProviders } from '~/testing/route-fixtures';

import type { BlogPostPublishPopoverProps } from '../BlogPostPublishPopover';
import { BlogPostPublishPopover } from '../BlogPostPublishPopover';

const props = (
  overrides: Partial<BlogPostPublishPopoverProps> = {},
): BlogPostPublishPopoverProps => ({
  action: 'publish',
  disabled: false,
  onPublish: vi.fn(),
  publishedAt: null,
  ...overrides,
});

describe('BlogPostPublishPopover Component', () => {
  test('Publish now publishes immediately, with no date', async () => {
    const onPublish = vi.fn();
    const component = renderWithProviders(
      <BlogPostPublishPopover {...props({ onPublish })} />,
    );
    const user = userEvent.setup();

    await user.click(component.getByRole('button', { name: 'Publish' }));
    await user.click(component.getByRole('button', { name: 'Publish now' }));

    expect(onPublish).toHaveBeenCalledExactlyOnceWith(null);
  });

  test('Schedule sends the local time as a UTC ISO timestamp', async () => {
    const onPublish = vi.fn();
    const component = renderWithProviders(
      <BlogPostPublishPopover {...props({ onPublish })} />,
    );
    const user = userEvent.setup();

    await user.click(component.getByRole('button', { name: 'Publish' }));
    await user.type(
      component.getByLabelText('Go-live date and time'),
      '2099-06-15T10:30',
    );
    await user.click(component.getByRole('button', { name: 'Schedule' }));

    expect(onPublish).toHaveBeenCalledExactlyOnceWith(
      new Date(2099, 5, 15, 10, 30).toISOString(),
    );
    expect(onPublish.mock.calls[0]?.[0]).toMatch(/Z$/);
  });

  test('a past time is rejected inline and nothing is sent', async () => {
    const onPublish = vi.fn();
    const component = renderWithProviders(
      <BlogPostPublishPopover {...props({ onPublish })} />,
    );
    const user = userEvent.setup();

    await user.click(component.getByRole('button', { name: 'Publish' }));
    await user.type(
      component.getByLabelText('Go-live date and time'),
      '2000-01-01T09:00',
    );
    await user.click(component.getByRole('button', { name: 'Schedule' }));

    expect(component.getByRole('alert')).toHaveTextContent(
      'Pick a time in the future.',
    );
    expect(onPublish).not.toHaveBeenCalled();
  });

  test('an empty time asks for one, and typing clears the error', async () => {
    const component = renderWithProviders(
      <BlogPostPublishPopover {...props()} />,
    );
    const user = userEvent.setup();

    await user.click(component.getByRole('button', { name: 'Publish' }));
    await user.click(component.getByRole('button', { name: 'Schedule' }));
    expect(component.getByRole('alert')).toHaveTextContent(
      'Choose a date and time.',
    );

    await user.type(
      component.getByLabelText('Go-live date and time'),
      '2099-06-15T10:30',
    );
    expect(component.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('Reschedule prefills the current go-live time', async () => {
    const component = renderWithProviders(
      <BlogPostPublishPopover
        {...props({
          action: 'reschedule',
          publishedAt: new Date(2099, 5, 15, 10, 30).toISOString(),
        })}
      />,
    );

    await userEvent
      .setup()
      .click(component.getByRole('button', { name: 'Reschedule' }));

    expect(component.getByLabelText('Go-live date and time')).toHaveValue(
      '2099-06-15T10:30',
    );
  });

  test('is disabled while a lifecycle action cannot run', () => {
    const component = renderWithProviders(
      <BlogPostPublishPopover {...props({ disabled: true })} />,
    );

    expect(component.getByRole('button', { name: 'Publish' })).toBeDisabled();
  });
});

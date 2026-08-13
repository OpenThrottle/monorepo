import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { SettingsGraphQLHealthCard } from '../SettingsGraphQLHealthCard';
import type { SettingsGraphQLHealthCardProps } from '../SettingsGraphQLHealthCard';

describe('SettingsGraphQLHealthCard Component', () => {
  let component: RenderResult;
  let props: SettingsGraphQLHealthCardProps;

  beforeEach(() => {
    props = {
      graphQL: {
        latencyMs: 42,
        serverHealth: {
          api: 'ok',
          database: 'ok',
          redis: 'ok',
          websocket: 'ok',
        },
        status: 'ok',
      },
      onRecheck: vi.fn(),
      revalidateState: 'idle',
    };

    component = render(<SettingsGraphQLHealthCard {...props} />);
  });

  test('renders success details with latency and per-service health', () => {
    expect(component.getByText(/succeeded in/)).toBeInTheDocument();
    expect(component.getByText('42 ms')).toBeInTheDocument();
    expect(component.getByText('api: ok')).toBeInTheDocument();
    expect(component.getByText('database: ok')).toBeInTheDocument();
    expect(component.getByText('redis: ok')).toBeInTheDocument();
    expect(component.getByText('websocket: ok')).toBeInTheDocument();
  });

  test('calls onRecheck when the badge button is clicked', async () => {
    const user = userEvent.setup();

    await user.click(component.getByText('Re-check'));

    expect(props.onRecheck).toHaveBeenCalledTimes(1);
  });

  test('shows "Checking…" and disables the button while revalidating', () => {
    component.unmount();
    component = render(
      <SettingsGraphQLHealthCard {...props} revalidateState="loading" />,
    );

    expect(component.getByText('Checking…')).toBeInTheDocument();
    expect(component.getByRole('button')).toBeDisabled();
  });

  test('renders the error state with the error message', () => {
    component.unmount();
    component = render(
      <SettingsGraphQLHealthCard
        {...props}
        graphQL={{
          error: 'connection refused',
          latencyMs: 10,
          status: 'error',
        }}
      />,
    );

    expect(component.getByText('Request failed')).toBeInTheDocument();
    expect(component.getByText('connection refused')).toBeInTheDocument();
  });
});

// @vitest-environment jsdom
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { ShellBridge } from '../../../bridge/types/shell-bridge.ts';
import { CONNECTION_COPY } from '../../data/data.copy.ts';
import { ConnectionScreen } from '../ConnectionScreen.tsx';

const HEALTH = { api: 'ok', database: 'ok', redis: 'ok', websocket: 'ok' };

const buildBridge = (overrides: Partial<ShellBridge> = {}): ShellBridge => {
  return {
    getSettings: () =>
      Promise.resolve({
        notice: undefined,
        serverUrl: 'http://localhost:6021',
      }),
    saveServer: (url) => Promise.resolve({ ok: true, url }),
    testServer: (url) => Promise.resolve({ health: HEALTH, ok: true, url }),
    ...overrides,
  };
};

const renderScreen = async (bridge: ShellBridge) => {
  const component = render(<ConnectionScreen bridge={bridge} />);

  await waitFor(() => {
    expect(component.getByRole('textbox')).toHaveProperty(
      'value',
      expect.stringContaining('http'),
    );
  });

  return component;
};

describe('ConnectionScreen', () => {
  it('renders the heading and prefills the URL from the bridge', async () => {
    const component = await renderScreen(buildBridge());

    expect(
      component.getByRole('heading', { name: CONNECTION_COPY.title }),
    ).toBeTruthy();
    expect(component.getByRole('textbox')).toHaveProperty(
      'value',
      'http://localhost:6021',
    );
  });

  it('shows the startup notice as an error', async () => {
    const bridge = buildBridge({
      getSettings: () =>
        Promise.resolve({
          notice: 'Could not reach the server.',
          serverUrl: 'http://x.test',
        }),
    });
    const component = render(<ConnectionScreen bridge={bridge} />);

    expect(
      await component.findByText('Could not reach the server.'),
    ).toBeTruthy();
    expect(component.getByRole('alert')).toBeTruthy();
  });

  it('shows the failure when testing a connection fails', async () => {
    const testServer = vi.fn(() =>
      Promise.resolve({ ok: false as const, reason: 'Refused.' }),
    );
    const component = await renderScreen(buildBridge({ testServer }));

    await userEvent.click(
      component.getByRole('button', { name: CONNECTION_COPY.test }),
    );

    expect(await component.findByText('Refused.')).toBeTruthy();
    expect(testServer).toHaveBeenCalledWith('http://localhost:6021');
  });

  it('shows success when testing a connection works', async () => {
    const component = await renderScreen(buildBridge());

    await userEvent.click(
      component.getByRole('button', { name: CONNECTION_COPY.test }),
    );

    expect(
      await component.findByText(CONNECTION_COPY.successTitle),
    ).toBeTruthy();
  });

  it('saves the edited URL through the bridge on Connect', async () => {
    const saveServer = vi.fn((url: string) =>
      Promise.resolve({ ok: true as const, url }),
    );
    const component = await renderScreen(buildBridge({ saveServer }));
    const input = component.getByRole('textbox');

    await userEvent.clear(input);
    await userEvent.type(input, 'https://ot.example.com');
    await userEvent.click(
      component.getByRole('button', { name: CONNECTION_COPY.connect }),
    );

    await waitFor(() => {
      expect(saveServer).toHaveBeenCalledWith('https://ot.example.com');
    });
  });

  it('shows the reason when Connect fails and re-enables the button', async () => {
    const saveServer = vi.fn(() =>
      Promise.resolve({ ok: false as const, reason: 'Nope.' }),
    );
    const component = await renderScreen(buildBridge({ saveServer }));

    await userEvent.click(
      component.getByRole('button', { name: CONNECTION_COPY.connect }),
    );

    expect(await component.findByText('Nope.')).toBeTruthy();
    await waitFor(() => {
      expect(
        component.getByRole('button', { name: CONNECTION_COPY.connect }),
      ).toHaveProperty('disabled', false);
    });
  });
});

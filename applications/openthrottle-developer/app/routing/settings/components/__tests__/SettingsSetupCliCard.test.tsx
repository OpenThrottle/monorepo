import * as React from 'react';
import { render, within } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { SettingsSetupCliCard } from '../SettingsSetupCliCard';
import type { AgentCliStatus } from '~/routing/settings/data/agent-clis.data';

const installed: AgentCliStatus = {
  backend: 'claude',
  installUrl: 'https://claude.ai/install.sh',
  installed: true,
  label: 'Claude Code',
  models: ['opus', 'sonnet'],
  version: '2.1.0',
};

const absent: AgentCliStatus = {
  backend: 'grok',
  installUrl: 'https://x.ai/cli/install.sh',
  installed: false,
  label: 'Grok',
  models: [],
  version: null,
};

const renderCard = (
  props: React.ComponentProps<typeof SettingsSetupCliCard>,
) => {
  const Component = () => <SettingsSetupCliCard {...props} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
};

describe('SettingsSetupCliCard', () => {
  test('renders installed CLI with version + models', () => {
    const component = renderCard({ status: installed });
    const card = component.getByTestId('SettingsSetupCliCard');
    expect(within(card).getByText('Claude Code')).toBeInTheDocument();
    expect(within(card).getByText('Installed')).toBeInTheDocument();
    expect(within(card).getByText('2.1.0')).toBeInTheDocument();
    expect(within(card).getByText('opus')).toBeInTheDocument();
    expect(within(card).getByText('sonnet')).toBeInTheDocument();
  });

  test('renders not-installed CLI without version', () => {
    const component = renderCard({ status: absent });
    const card = component.getByTestId('SettingsSetupCliCard');
    expect(within(card).getByText('Not installed')).toBeInTheDocument();
    expect(
      within(card).getByText('Not detected on the server host.'),
    ).toBeInTheDocument();
  });

  test('renders the actions seam in the footer when provided', () => {
    const component = renderCard({
      actions: <button type="button">Install</button>,
      status: absent,
    });
    const card = component.getByTestId('SettingsSetupCliCard');
    expect(
      within(card).getByRole('button', { name: 'Install' }),
    ).toBeInTheDocument();
  });
});

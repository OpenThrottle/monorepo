import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  SETTINGS_PORTS_TROUBLESHOOTING_FRAGMENT_ID,
  SettingsPortsTroubleshootingCard,
} from '../SettingsPortsTroubleshootingCard';

describe('SettingsPortsTroubleshootingCard', () => {
  it('renders stable fragment id for deep links', () => {
    const { container } = render(<SettingsPortsTroubleshootingCard />);
    const section = container.querySelector(
      `#${SETTINGS_PORTS_TROUBLESHOOTING_FRAGMENT_ID}`,
    );
    expect(section).toBeTruthy();
    expect(
      screen.getByText(/local dev: ports, hosts & api urls/i),
    ).toBeInTheDocument();
  });

  it('links to monorepo ports documentation', () => {
    render(<SettingsPortsTroubleshootingCard />);
    const tableLink = screen.getByRole('link', {
      name: /local services & ports \(table\)/i,
    });
    expect(tableLink.getAttribute('href')).toContain(
      'local-services-and-ports.md#services-to-expose',
    );
  });

  it('summarizes template env defaults from .env.default', () => {
    render(<SettingsPortsTroubleshootingCard />);
    expect(
      screen.getByText(/applications\/openthrottle-developer\/\.env\.default/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/PORT="6020"/i)).toBeInTheDocument();
  });
});

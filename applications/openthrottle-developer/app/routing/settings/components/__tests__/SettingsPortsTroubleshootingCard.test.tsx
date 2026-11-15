import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, it } from 'vitest';

import {
  SETTINGS_PORTS_TROUBLESHOOTING_FRAGMENT_ID,
  SettingsPortsTroubleshootingCard,
} from '../SettingsPortsTroubleshootingCard';

describe('SettingsPortsTroubleshootingCard', () => {
  it('renders stable fragment id for deep links', () => {
    const component = render(<SettingsPortsTroubleshootingCard />);
    const section = component.container.querySelector(
      `#${SETTINGS_PORTS_TROUBLESHOOTING_FRAGMENT_ID}`,
    );
    expect(section).toBeTruthy();
    expect(
      component.getByText(/local dev: ports, hosts & api urls/i),
    ).toBeInTheDocument();
  });

  it('links to monorepo ports documentation', () => {
    const component = render(<SettingsPortsTroubleshootingCard />);
    const tableLink = component.getByRole('link', {
      name: /local services & ports \(table\)/i,
    });
    expect(tableLink.getAttribute('href')).toContain(
      'local-services-and-ports.md#services-to-expose',
    );
  });

  it('summarizes template env defaults from .env.default', () => {
    const component = render(<SettingsPortsTroubleshootingCard />);
    expect(
      component.getByText(
        /applications\/openthrottle-developer\/\.env\.default/i,
      ),
    ).toBeInTheDocument();
    expect(component.getByText(/PORT="6020"/i)).toBeInTheDocument();
  });
});

import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { SettingsMcpConnectorIcon } from '../SettingsMcpConnectorIcon';

describe('SettingsMcpConnectorIcon Component', () => {
  test('renders a decorative icon for a known hint', () => {
    const component = render(<SettingsMcpConnectorIcon iconHint="github" />);
    const icon = component.getByTestId('SettingsMcpConnectorIcon');

    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(icon.querySelector('svg')).not.toBeNull();
  });

  test('falls back to a generic icon for an unknown hint', () => {
    const component = render(<SettingsMcpConnectorIcon iconHint="mystery" />);

    expect(
      component.getByTestId('SettingsMcpConnectorIcon').querySelector('svg'),
    ).not.toBeNull();
  });
});

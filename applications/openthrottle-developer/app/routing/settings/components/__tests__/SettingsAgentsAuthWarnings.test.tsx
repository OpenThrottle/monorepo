import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { SettingsAgentsAuthWarnings } from '../SettingsAgentsAuthWarnings';

describe('SettingsAgentsAuthWarnings', () => {
  describe('with warnings', () => {
    test('renders one alert per agent with the warning text', () => {
      const component = render(
        <SettingsAgentsAuthWarnings
          warnings={[
            {
              backend: 'claude',
              label: 'Claude Code',
              warning: `ANTHROPIC_API_KEY is set, so Claude runs bill the API key.`,
            },
          ]}
        />,
      );

      const alert = component.getByTestId('SettingsAgentsAuthWarning-claude');
      expect(alert).toHaveAttribute('role', 'alert');
      expect(alert).toHaveTextContent('ANTHROPIC_API_KEY is set');
    });
  });

  describe('without warnings', () => {
    test('renders nothing', () => {
      const component = render(<SettingsAgentsAuthWarnings warnings={[]} />);

      expect(
        component.queryByTestId('SettingsAgentsAuthWarnings'),
      ).not.toBeInTheDocument();
    });
  });
});

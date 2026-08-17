import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { SettingsKeysIntroduction } from '../SettingsKeysIntroduction';
import type { SettingsKeysIntroductionProps } from '../SettingsKeysIntroduction';
import { SETTINGS_KEYS_COPY } from '~/routing/settings/data/data.copy';

function renderIntroduction(
  props: SettingsKeysIntroductionProps = {},
  initialEntries: readonly string[] = ['/'],
): RenderResult {
  const Component = () => <SettingsKeysIntroduction {...props} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub initialEntries={[...initialEntries]} />);
}

describe('SettingsKeysIntroduction Component', () => {
  describe('header', () => {
    test('renders keys heading and the remaining intro copy', () => {
      const component = renderIntroduction();

      expect(component.getByTestId('GlobalHeading')).toHaveTextContent(
        SETTINGS_KEYS_COPY.title,
      );
      expect(
        component.getByText(SETTINGS_KEYS_COPY.introPrefix, { exact: false }),
      ).toBeInTheDocument();
    });

    test('renders the help trigger', () => {
      const component = renderIntroduction();

      expect(
        component.getByRole('button', {
          name: SETTINGS_KEYS_COPY.triggerLabel,
        }),
      ).toBeInTheDocument();
    });
  });

  describe('when the help modal is closed', () => {
    test('does not render the moved help copy on the page', () => {
      const component = renderIntroduction();

      expect(
        component.queryByText(SETTINGS_KEYS_COPY.oneTimeSecretTitle),
      ).not.toBeInTheDocument();
      expect(
        component.queryByText(SETTINGS_KEYS_COPY.rotationTitle),
      ).not.toBeInTheDocument();
      expect(
        component.queryByText(SETTINGS_KEYS_COPY.jwtPrefix, { exact: false }),
      ).not.toBeInTheDocument();
    });
  });

  describe('when the trigger is clicked', () => {
    test('opens the help modal with the moved copy and docs link', async () => {
      const user = userEvent.setup();
      const component = renderIntroduction();

      await user.click(
        component.getByRole('button', {
          name: SETTINGS_KEYS_COPY.triggerLabel,
        }),
      );

      expect(
        component.getByText(SETTINGS_KEYS_COPY.oneTimeSecretTitle),
      ).toBeInTheDocument();
      expect(
        component.getByText(SETTINGS_KEYS_COPY.rotationBody),
      ).toBeInTheDocument();
      expect(
        component.getByText(SETTINGS_KEYS_COPY.jwtPrefix, { exact: false }),
      ).toBeInTheDocument();
      expect(
        component.getByTestId('SettingsKeysHelpModal-docs-link'),
      ).toBeInTheDocument();
    });
  });

  describe('when the modal search param is set', () => {
    test('opens the help modal without a click', () => {
      const component = renderIntroduction({}, ['/?modal=keys-help']);

      expect(
        component.getByTestId('SettingsKeysHelpModal'),
      ).toBeInTheDocument();
    });
  });
});

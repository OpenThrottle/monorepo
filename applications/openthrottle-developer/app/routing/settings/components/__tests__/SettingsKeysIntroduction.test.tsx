import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import {
  GLOBAL_FEATURE_ONBOARDING_MODAL,
  GLOBAL_FEATURE_ONBOARDING_TRIGGER_LABEL,
  GlobalFeatureOnboardingModal,
} from '@openthrottle/react-router-ui-global';
import { SettingsKeysIntroduction } from '../SettingsKeysIntroduction';
import type { SettingsKeysIntroductionProps } from '../SettingsKeysIntroduction';
import {
  SETTINGS_KEYS_COPY,
  SETTINGS_KEYS_ONBOARDING,
} from '~/routing/settings/data/data.copy';

function renderIntroduction(
  props: SettingsKeysIntroductionProps = {},
  initialEntries: readonly string[] = ['/'],
): RenderResult {
  const Component = () => (
    <>
      <SettingsKeysIntroduction {...props} />
      <GlobalFeatureOnboardingModal content={SETTINGS_KEYS_ONBOARDING} />
    </>
  );
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

    test('renders the shared onboarding trigger', () => {
      const component = renderIntroduction();

      expect(
        component.getByRole('button', {
          name: GLOBAL_FEATURE_ONBOARDING_TRIGGER_LABEL,
        }),
      ).toBeInTheDocument();
    });
  });

  describe('when the onboarding modal is closed', () => {
    test('does not render the onboarding copy on the page', () => {
      const component = renderIntroduction();

      expect(
        component.queryByText(SETTINGS_KEYS_ONBOARDING.tagline),
      ).not.toBeInTheDocument();
      expect(
        component.queryByText(SETTINGS_KEYS_ONBOARDING.whatItIs),
      ).not.toBeInTheDocument();
    });
  });

  describe('when the trigger is clicked', () => {
    test('opens the onboarding modal with the keys copy', async () => {
      const user = userEvent.setup();
      const component = renderIntroduction();

      await user.click(
        component.getByRole('button', {
          name: GLOBAL_FEATURE_ONBOARDING_TRIGGER_LABEL,
        }),
      );

      expect(
        component.getByText(SETTINGS_KEYS_ONBOARDING.tagline),
      ).toBeInTheDocument();
      expect(
        component.getByText(SETTINGS_KEYS_ONBOARDING.whatItIs),
      ).toBeInTheDocument();
    });
  });

  describe('when the onboarding search param is already set', () => {
    test('renders the onboarding modal on first paint', () => {
      const component = renderIntroduction({}, [
        `/?${GLOBAL_FEATURE_ONBOARDING_MODAL.param}=${GLOBAL_FEATURE_ONBOARDING_MODAL.value}`,
      ]);

      expect(
        component.getByText(SETTINGS_KEYS_ONBOARDING.tagline),
      ).toBeInTheDocument();
    });
  });
});

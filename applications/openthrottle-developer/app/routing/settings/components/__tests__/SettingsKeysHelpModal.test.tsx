import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SettingsKeysHelpModal } from '../SettingsKeysHelpModal';
import { SETTINGS_KEYS_COPY } from '~/routing/settings/data/data.copy';
import { MCP_DEVELOPER_AUTH_DOC_HREF } from '~/routing/settings/utils/settings-docs-links';

function renderModal(initialEntries: readonly string[]): RenderResult {
  const Component = () => <SettingsKeysHelpModal />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub initialEntries={[...initialEntries]} />);
}

describe('SettingsKeysHelpModal Component', () => {
  describe('when the modal search param matches', () => {
    let component: RenderResult;

    beforeEach(() => {
      component = renderModal(['/?modal=keys-help']);
    });

    test('renders the modal title', () => {
      expect(
        component.getByRole('heading', {
          level: 2,
          name: SETTINGS_KEYS_COPY.modalTitle,
        }),
      ).toBeInTheDocument();
    });

    test('renders the one-time secret help', () => {
      expect(
        component.getByText(SETTINGS_KEYS_COPY.oneTimeSecretTitle),
      ).toBeInTheDocument();
      expect(
        component.getByText(SETTINGS_KEYS_COPY.oneTimeSecretEnvCode),
      ).toBeInTheDocument();
    });

    test('renders the rotation help', () => {
      expect(
        component.getByText(SETTINGS_KEYS_COPY.rotationTitle),
      ).toBeInTheDocument();
      expect(
        component.getByText(SETTINGS_KEYS_COPY.rotationBody),
      ).toBeInTheDocument();
    });

    test('renders the human JWT sessions help', () => {
      expect(
        component.getByText(SETTINGS_KEYS_COPY.jwtPrefix, { exact: false }),
      ).toBeInTheDocument();
    });

    test('renders the AUTH.md docs link', () => {
      const link = component.getByTestId('SettingsKeysHelpModal-docs-link');

      expect(link).toHaveTextContent(SETTINGS_KEYS_COPY.docsLinkLabel);
      expect(link).toHaveAttribute('href', MCP_DEVELOPER_AUTH_DOC_HREF);
    });
  });

  describe('when the modal search param does not match', () => {
    let component: RenderResult;

    beforeEach(() => {
      component = renderModal(['/']);
    });

    test('does not render the modal body', () => {
      expect(
        component.queryByTestId('SettingsKeysHelpModal'),
      ).not.toBeInTheDocument();
    });

    test('does not render the moved help copy', () => {
      expect(
        component.queryByText(SETTINGS_KEYS_COPY.oneTimeSecretTitle),
      ).not.toBeInTheDocument();
      expect(
        component.queryByText(SETTINGS_KEYS_COPY.rotationBody),
      ).not.toBeInTheDocument();
      expect(
        component.queryByTestId('SettingsKeysHelpModal-docs-link'),
      ).not.toBeInTheDocument();
    });
  });
});

import * as React from 'react';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { SettingsKeysIntroduction } from '../SettingsKeysIntroduction';
import type { SettingsKeysIntroductionProps } from '../SettingsKeysIntroduction';
import { MCP_DEVELOPER_AUTH_DOC_HREF } from '~/routing/settings/utils/settings-docs-links';

describe('SettingsKeysIntroduction Component', () => {
  const renderIntroduction = (
    props: SettingsKeysIntroductionProps = {},
  ): RenderResult => {
    const Component = () => <SettingsKeysIntroduction {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    return render(<RoutesStub />);
  };

  test('should render', () => {
    const component = renderIntroduction();
    expect(component.baseElement).toMatchSnapshot();
  });

  describe('intro content', () => {
    test('explains service account tokens and links to auth docs', () => {
      renderIntroduction();
      expect(
        screen.getByTestId('SettingsKeysIntroduction'),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Service account credentials/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/One-time secret/i)).toBeInTheDocument();
      expect(screen.getByText(/Rotation/i)).toBeInTheDocument();

      const docsLink = screen.getByTestId('SettingsKeysIntroduction-docs-link');
      expect(docsLink).toHaveAttribute('href', MCP_DEVELOPER_AUTH_DOC_HREF);
      expect(docsLink).toHaveTextContent(/authentication/i);
    });
  });
});

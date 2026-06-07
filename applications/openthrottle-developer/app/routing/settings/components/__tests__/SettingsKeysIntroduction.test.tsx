import * as React from 'react';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { SettingsKeysIntroduction } from '../SettingsKeysIntroduction';
import type { SettingsKeysIntroductionProps } from '../SettingsKeysIntroduction';

describe('SettingsKeysIntroduction Component', () => {
  const renderIntroduction = (
    props: SettingsKeysIntroductionProps = {},
  ): RenderResult => {
    const Component = () => <SettingsKeysIntroduction {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    return render(<RoutesStub />);
  };

  test('renders keys heading and intro copy', () => {
    renderIntroduction();

    expect(screen.getByTestId('GlobalHeading')).toHaveTextContent('Keys');
    expect(
      screen.getByText(/Long-lived bearer tokens for automation/i),
    ).toBeInTheDocument();
  });
});

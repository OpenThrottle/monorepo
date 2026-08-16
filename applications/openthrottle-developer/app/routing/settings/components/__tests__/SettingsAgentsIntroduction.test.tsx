import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SettingsAgentsIntroduction } from '../SettingsAgentsIntroduction';
import type { SettingsAgentsIntroductionProps } from '../SettingsAgentsIntroduction';

describe('SettingsAgentsIntroduction Component', () => {
  let component: RenderResult;
  let props: SettingsAgentsIntroductionProps;

  beforeEach(() => {
    props = {};

    const Component = () => <SettingsAgentsIntroduction {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render the component name', () => {
    expect(
      component.getByTestId('SettingsAgentsIntroduction'),
    ).toBeInTheDocument();
  });
});

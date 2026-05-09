import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SettingsEnvironment } from '../SettingsEnvironment';
import type { SettingsEnvironmentProps } from '../SettingsEnvironment';

describe('SettingsEnvironment Component', () => {
  let component: RenderResult;
  let props: SettingsEnvironmentProps;

  beforeEach(() => {
    props = {};

    const Component = () => <SettingsEnvironment {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

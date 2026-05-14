import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SettingsSupportBundle } from '../SettingsSupportBundle';
import type { SettingsSupportBundleProps } from '../SettingsSupportBundle';

describe('SettingsSupportBundle Component', () => {
  let component: RenderResult;
  let props: SettingsSupportBundleProps;

  beforeEach(() => {
    props = {};

    const Component = () => <SettingsSupportBundle {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

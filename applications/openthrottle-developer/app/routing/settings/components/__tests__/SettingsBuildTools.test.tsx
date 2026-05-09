import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SettingsBuildTools } from '../SettingsBuildTools';
import type { SettingsBuildToolsProps } from '../SettingsBuildTools';

describe('SettingsBuildTools Component', () => {
  let component: RenderResult;
  let props: SettingsBuildToolsProps;

  beforeEach(() => {
    props = {};

    const Component = () => <SettingsBuildTools {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

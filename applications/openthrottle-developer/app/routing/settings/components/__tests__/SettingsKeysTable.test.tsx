import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SettingsKeysTable } from '../SettingsKeysTable';
import type { SettingsKeysTableProps } from '../SettingsKeysTable';

describe('SettingsKeysTable Component', () => {
  let component: RenderResult;
  let props: SettingsKeysTableProps;

  beforeEach(() => {
    props = {};

    const Component = () => <SettingsKeysTable {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

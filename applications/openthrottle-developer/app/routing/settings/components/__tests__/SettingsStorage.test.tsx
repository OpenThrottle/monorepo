import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SettingsStorage } from '../SettingsStorage';
import type { SettingsStorageProps } from '../SettingsStorage';

describe('SettingsStorage Component', () => {
  let component: RenderResult;
  let props: SettingsStorageProps;

  beforeEach(() => {
    props = {};

    const Component = () => <SettingsStorage {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

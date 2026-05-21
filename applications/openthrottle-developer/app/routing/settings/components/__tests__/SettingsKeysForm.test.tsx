import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SettingsKeysForm } from '../SettingsKeysForm';
import type { SettingsKeysFormProps } from '../SettingsKeysForm';

describe('SettingsKeysForm Component', () => {
  let component: RenderResult;
  let props: SettingsKeysFormProps;

  beforeEach(() => {
    props = {};

    const Component = () => <SettingsKeysForm {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

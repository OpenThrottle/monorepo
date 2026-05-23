import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SettingsKeysServiceAccountCredentials } from '../SettingsKeysServiceAccountCredentials';
import type { SettingsKeysServiceAccountCredentialsProps } from '../SettingsKeysServiceAccountCredentials';

describe('SettingsKeysServiceAccountCredentials Component', () => {
  let component: RenderResult;
  let props: SettingsKeysServiceAccountCredentialsProps;

  beforeEach(() => {
    props = {};

    const Component = () => (
      <SettingsKeysServiceAccountCredentials {...props} />
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SettingsLogsClient } from '../SettingsLogsClient';
import type { SettingsLogsClientProps } from '../SettingsLogsClient';

describe('SettingsLogsClient Component', () => {
  let component: RenderResult;
  let props: SettingsLogsClientProps;

  beforeEach(() => {
    props = {};

    const Component = () => <SettingsLogsClient {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

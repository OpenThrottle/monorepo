import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { NotificationPermissionUnsupported } from '../NotificationPermissionUnsupported';
import type { NotificationPermissionUnsupportedProps } from '../NotificationPermissionUnsupported';

describe('NotificationPermissionUnsupported Component', () => {
  let component: RenderResult;
  let props: NotificationPermissionUnsupportedProps;

  beforeEach(() => {
    props = {};

    const Component = () => <NotificationPermissionUnsupported {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

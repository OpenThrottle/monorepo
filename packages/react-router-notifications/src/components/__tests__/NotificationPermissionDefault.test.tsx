import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { NotificationPermissionDefault } from '../NotificationPermissionDefault';
import type { NotificationPermissionDefaultProps } from '../NotificationPermissionDefault';

describe('NotificationPermissionDefault Component', () => {
  let component: RenderResult;
  let props: NotificationPermissionDefaultProps;

  beforeEach(() => {
    props = {};

    const Component = () => <NotificationPermissionDefault {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

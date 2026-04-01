import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { NotificationPermissionDenied } from '../NotificationPermissionDenied';
import type { NotificationPermissionDeniedProps } from '../NotificationPermissionDenied';

describe('NotificationPermissionDenied Component', () => {
  let component: RenderResult;
  let props: NotificationPermissionDeniedProps;

  beforeEach(() => {
    props = {};

    const Component = () => <NotificationPermissionDenied {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

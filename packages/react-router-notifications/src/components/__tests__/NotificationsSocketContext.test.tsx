import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { NotificationsSocketContext } from '../NotificationsSocketContext';
import type { NotificationsSocketContextProps } from '../NotificationsSocketContext';

describe('NotificationsSocketContext Component', () => {
  let component: RenderResult;
  let props: NotificationsSocketContextProps;

  beforeEach(() => {
    props = {};

    const Component = () => <NotificationsSocketContext {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

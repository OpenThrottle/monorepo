import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SidebarMenuAction } from '../SidebarMenuAction';
import type { SidebarMenuActionProps } from '../SidebarMenuAction';

describe('SidebarMenuAction Component', () => {
  let component: RenderResult;
  let props: SidebarMenuActionProps;

  beforeEach(() => {
    props = {};

    const Component = () => <SidebarMenuAction {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

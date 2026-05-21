import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SidebarMenuItem } from '../SidebarMenuItem';
import type { SidebarMenuItemProps } from '../SidebarMenuItem';

describe('SidebarMenuItem Component', () => {
  let component: RenderResult;
  let props: SidebarMenuItemProps;

  beforeEach(() => {
    props = {};

    const Component = () => <SidebarMenuItem {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

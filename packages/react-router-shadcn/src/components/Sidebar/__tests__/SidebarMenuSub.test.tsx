import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SidebarMenuSub } from '../SidebarMenuSub';
import type { SidebarMenuSubProps } from '../SidebarMenuSub';

describe('SidebarMenuSub Component', () => {
  let component: RenderResult;
  let props: SidebarMenuSubProps;

  beforeEach(() => {
    props = {};

    const Component = () => <SidebarMenuSub {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

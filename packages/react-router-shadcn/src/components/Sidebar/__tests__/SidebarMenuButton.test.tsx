import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SidebarProvider } from '../SidebarProvider';
import { SidebarMenuButton } from '../SidebarMenuButton';
import type { SidebarMenuButtonProps } from '../SidebarMenuButton';

describe('SidebarMenuButton Component', () => {
  let component: RenderResult;
  let props: SidebarMenuButtonProps;

  beforeEach(() => {
    props = {};

    const Component = () => (
      <SidebarProvider>
        <SidebarMenuButton {...props} />
      </SidebarProvider>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

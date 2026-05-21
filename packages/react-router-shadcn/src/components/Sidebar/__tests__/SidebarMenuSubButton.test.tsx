import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SidebarMenuSubButton } from '../SidebarMenuSubButton';
import type { SidebarMenuSubButtonProps } from '../SidebarMenuSubButton';

describe('SidebarMenuSubButton Component', () => {
  let component: RenderResult;
  let props: SidebarMenuSubButtonProps;

  beforeEach(() => {
    props = {};

    const Component = () => <SidebarMenuSubButton {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

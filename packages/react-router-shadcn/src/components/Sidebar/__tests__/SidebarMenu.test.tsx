import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SidebarMenu } from '../SidebarMenu';
import type { SidebarMenuProps } from '../SidebarMenu';

describe('SidebarMenu Component', () => {
  let component: RenderResult;
  let props: SidebarMenuProps;

  beforeEach(() => {
    props = {};

    const Component = () => <SidebarMenu {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

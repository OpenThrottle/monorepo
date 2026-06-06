import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SidebarMenuSubItem } from '../SidebarMenuSubItem';
import type { SidebarMenuSubItemProps } from '../SidebarMenuSubItem';

describe('SidebarMenuSubItem Component', () => {
  let component: RenderResult;
  let props: SidebarMenuSubItemProps;

  beforeEach(() => {
    props = {};

    const Component = () => <SidebarMenuSubItem {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SidebarGroup } from '../SidebarGroup';
import type { SidebarGroupProps } from '../SidebarGroup';

describe('SidebarGroup Component', () => {
  let component: RenderResult;
  let props: SidebarGroupProps;

  beforeEach(() => {
    props = {};

    const Component = () => <SidebarGroup {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

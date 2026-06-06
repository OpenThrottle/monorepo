import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SidebarFooter } from '../SidebarFooter';
import type { SidebarFooterProps } from '../SidebarFooter';

describe('SidebarFooter Component', () => {
  let component: RenderResult;
  let props: SidebarFooterProps;

  beforeEach(() => {
    props = {};

    const Component = () => <SidebarFooter {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

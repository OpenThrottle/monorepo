import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SidebarContent } from '../SidebarContent';
import type { SidebarContentProps } from '../SidebarContent';

describe('SidebarContent Component', () => {
  let component: RenderResult;
  let props: SidebarContentProps;

  beforeEach(() => {
    props = {};

    const Component = () => <SidebarContent {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

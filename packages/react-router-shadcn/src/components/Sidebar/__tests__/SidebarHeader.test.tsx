import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SidebarHeader } from '../SidebarHeader';
import type { SidebarHeaderProps } from '../SidebarHeader';

describe('SidebarHeader Component', () => {
  let component: RenderResult;
  let props: SidebarHeaderProps;

  beforeEach(() => {
    props = {};

    const Component = () => <SidebarHeader {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

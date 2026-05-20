import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SidebarGroupLabel } from '../SidebarGroupLabel';
import type { SidebarGroupLabelProps } from '../SidebarGroupLabel';

describe('SidebarGroupLabel Component', () => {
  let component: RenderResult;
  let props: SidebarGroupLabelProps;

  beforeEach(() => {
    props = {};

    const Component = () => <SidebarGroupLabel {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

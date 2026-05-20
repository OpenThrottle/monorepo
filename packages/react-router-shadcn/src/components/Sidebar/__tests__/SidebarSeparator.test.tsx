import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SidebarSeparator } from '../SidebarSeparator';
import type { SidebarSeparatorProps } from '../SidebarSeparator';

describe('SidebarSeparator Component', () => {
  let component: RenderResult;
  let props: SidebarSeparatorProps;

  beforeEach(() => {
    props = {};

    const Component = () => <SidebarSeparator {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

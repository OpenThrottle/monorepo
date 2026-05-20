import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { useSidebar } from '../useSidebar';
import type { useSidebarProps } from '../useSidebar';

describe('useSidebar Component', () => {
  let component: RenderResult;
  let props: useSidebarProps;

  beforeEach(() => {
    props = {};

    const UseSidebarScaffold = useSidebar;
    const Component = () => <UseSidebarScaffold {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

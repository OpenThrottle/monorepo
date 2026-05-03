import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { GlobalSidebar } from '../GlobalSidebar';
import type { GlobalSidebarProps } from '../GlobalSidebar';

describe('GlobalSidebar Component', () => {
  let component: RenderResult;
  let props: GlobalSidebarProps;

  beforeEach(() => {
    props = {};

    const Component = () => <GlobalSidebar {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

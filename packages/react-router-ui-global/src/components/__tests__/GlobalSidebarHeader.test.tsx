import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { GlobalSidebarHeader } from '../GlobalSidebarHeader';
import type { GlobalSidebarHeaderProps } from '../GlobalSidebarHeader';

describe('GlobalSidebarHeader Component', () => {
  let component: RenderResult;
  let props: GlobalSidebarHeaderProps;

  beforeEach(() => {
    props = {};

    const Component = () => <GlobalSidebarHeader {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

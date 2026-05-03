import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { GlobalSidebarContent } from '../GlobalSidebarContent';
import type { GlobalSidebarContentProps } from '../GlobalSidebarContent';

describe('GlobalSidebarContent Component', () => {
  let component: RenderResult;
  let props: GlobalSidebarContentProps;

  beforeEach(() => {
    props = {};

    const Component = () => <GlobalSidebarContent {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SidebarGroupContent } from '../SidebarGroupContent';
import type { SidebarGroupContentProps } from '../SidebarGroupContent';

describe('SidebarGroupContent Component', () => {
  let component: RenderResult;
  let props: SidebarGroupContentProps;

  beforeEach(() => {
    props = {};

    const Component = () => <SidebarGroupContent {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

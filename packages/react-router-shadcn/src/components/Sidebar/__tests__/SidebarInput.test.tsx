import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SidebarInput } from '../SidebarInput';
import type { SidebarInputProps } from '../SidebarInput';

describe('SidebarInput Component', () => {
  let component: RenderResult;
  let props: SidebarInputProps;

  beforeEach(() => {
    props = {};

    const Component = () => <SidebarInput {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

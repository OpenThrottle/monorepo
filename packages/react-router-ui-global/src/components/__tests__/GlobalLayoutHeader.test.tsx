import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { GlobalLayoutHeader } from '../GlobalLayoutHeader';
import type { GlobalLayoutHeaderProps } from '../GlobalLayoutHeader';

describe('GlobalLayoutHeader Component', () => {
  let component: RenderResult;
  let props: GlobalLayoutHeaderProps;

  beforeEach(() => {
    props = {};

    const Component = () => <GlobalLayoutHeader {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

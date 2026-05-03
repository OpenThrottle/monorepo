import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { GlobalLayout } from '../GlobalLayout';
import type { GlobalLayoutProps } from '../GlobalLayout';

describe('GlobalLayout Component', () => {
  let component: RenderResult;
  let props: GlobalLayoutProps;

  beforeEach(() => {
    props = {};

    const Component = () => <GlobalLayout {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

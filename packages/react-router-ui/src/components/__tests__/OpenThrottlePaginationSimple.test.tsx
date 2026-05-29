import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { OpenThrottlePaginationSimple } from '../OpenThrottlePaginationSimple';
import type { OpenThrottlePaginationSimpleProps } from '../OpenThrottlePaginationSimple';

describe('OpenThrottlePaginationSimple Component', () => {
  let component: RenderResult;
  let props: OpenThrottlePaginationSimpleProps;

  beforeEach(() => {
    props = {};

    const Component = () => <OpenThrottlePaginationSimple {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

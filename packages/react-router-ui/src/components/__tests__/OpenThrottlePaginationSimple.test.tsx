import * as React from 'react';
import { beforeEach, describe, expect, test } from 'vitest';
import { createRoutesStub } from 'react-router';
import { OpenThrottlePaginationSimple } from '../OpenThrottlePaginationSimple';
import { render } from '@testing-library/react';
import type { OpenThrottlePaginationSimpleProps } from '../OpenThrottlePaginationSimple';
import type { RenderResult } from '@testing-library/react';

describe('OpenThrottlePaginationSimple Component', () => {
  let component: RenderResult;
  let props: OpenThrottlePaginationSimpleProps;

  beforeEach(() => {
    props = {
      limit: 10,
      page: 1,
      total: 100,
    };

    const Component = () => <OpenThrottlePaginationSimple {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SearchToolbar } from '../SearchToolbar';
import type { SearchToolbarProps } from '../SearchToolbar';

describe('SearchToolbar Component', () => {
  let component: RenderResult;
  let props: SearchToolbarProps;

  beforeEach(() => {
    props = {};

    const Component = () => <SearchToolbar {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

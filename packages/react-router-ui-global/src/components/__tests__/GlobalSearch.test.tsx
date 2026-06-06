import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { GlobalSearch } from '../GlobalSearch';
import type { GlobalSearchProps } from '../GlobalSearch';

describe('GlobalSearch Component', () => {
  let component: RenderResult;
  let props: GlobalSearchProps;

  beforeEach(() => {
    props = {};

    const Component = () => <GlobalSearch {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

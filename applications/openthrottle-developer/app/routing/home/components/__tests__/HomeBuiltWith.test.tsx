import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { HomeBuiltWith } from '../HomeBuiltWith';
import type { HomeBuiltWithProps } from '../HomeBuiltWith';

describe('HomeBuiltWith Component', () => {
  let component: RenderResult;
  let props: HomeBuiltWithProps;

  beforeEach(() => {
    props = {};

    const Component = () => <HomeBuiltWith {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

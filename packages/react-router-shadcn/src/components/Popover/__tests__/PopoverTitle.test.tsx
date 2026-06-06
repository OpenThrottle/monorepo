import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PopoverTitle } from '../PopoverTitle';
import type { PopoverTitleProps } from '../PopoverTitle';

describe('PopoverTitle Component', () => {
  let component: RenderResult;
  let props: PopoverTitleProps;

  beforeEach(() => {
    props = {};

    const Component = () => <PopoverTitle {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PopoverHeader } from '../PopoverHeader';
import type { PopoverHeaderProps } from '../PopoverHeader';

describe('PopoverHeader Component', () => {
  let component: RenderResult;
  let props: PopoverHeaderProps;

  beforeEach(() => {
    props = {};

    const Component = () => <PopoverHeader {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

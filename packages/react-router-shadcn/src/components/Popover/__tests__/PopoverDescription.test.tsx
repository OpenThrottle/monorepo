import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PopoverDescription } from '../PopoverDescription';
import type { PopoverDescriptionProps } from '../PopoverDescription';

describe('PopoverDescription Component', () => {
  let component: RenderResult;
  let props: PopoverDescriptionProps;

  beforeEach(() => {
    props = {};

    const Component = () => <PopoverDescription {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PopoverTrigger } from '../PopoverTrigger';
import type { PopoverTriggerProps } from '../PopoverTrigger';

describe('PopoverTrigger Component', () => {
  let component: RenderResult;
  let props: PopoverTriggerProps;

  beforeEach(() => {
    props = {};

    const Component = () => <PopoverTrigger {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

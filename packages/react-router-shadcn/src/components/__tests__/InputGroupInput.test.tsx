import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { InputGroupInput } from '../InputGroupInput';
import type { InputGroupInputProps } from '../InputGroupInput';

describe('InputGroupInput Component', () => {
  let component: RenderResult;
  let props: InputGroupInputProps;

  beforeEach(() => {
    props = {};

    const Component = () => <InputGroupInput {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders an input control', () => {
    expect(
      component.container.querySelector('[data-slot="input-group-control"]'),
    ).toBeInTheDocument();
  });
});

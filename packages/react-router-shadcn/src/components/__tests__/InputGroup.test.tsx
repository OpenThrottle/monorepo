import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { InputGroup } from '../InputGroup';
import type { InputGroupProps } from '../InputGroup';

describe('InputGroup Component', () => {
  let component: RenderResult;
  let props: InputGroupProps;

  beforeEach(() => {
    props = {};

    const Component = () => <InputGroup {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

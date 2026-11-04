import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import type { InputGroupProps } from '../InputGroup';
import { InputGroup } from '../InputGroup';

describe('InputGroup Component', () => {
  let component: RenderResult;
  let props: InputGroupProps;

  beforeEach(() => {
    props = {};

    const Component = () => <InputGroup {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders input-group slot', () => {
    expect(
      component.container.querySelector('[data-slot="input-group"]'),
    ).toBeInTheDocument();
  });
});

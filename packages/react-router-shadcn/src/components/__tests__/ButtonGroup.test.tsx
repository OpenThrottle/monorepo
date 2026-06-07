import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { ButtonGroup } from '../ButtonGroup';
import type { ButtonGroupProps } from '../ButtonGroup';

describe('ButtonGroup Component', () => {
  let component: RenderResult;
  let props: ButtonGroupProps;

  beforeEach(() => {
    props = {};

    const Component = () => <ButtonGroup {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders button-group slot', () => {
    expect(
      component.container.querySelector('[data-slot="button-group"]'),
    ).toBeInTheDocument();
  });
});

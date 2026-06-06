import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { InputGroupButton } from '../InputGroupButton';
import type { InputGroupButtonProps } from '../InputGroupButton';

describe('InputGroupButton Component', () => {
  let component: RenderResult;
  let props: InputGroupButtonProps;

  beforeEach(() => {
    props = { children: 'Action' };

    const Component = () => <InputGroupButton {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders an input group button', () => {
    expect(
      component.getByRole('button', { name: 'Action' }),
    ).toBeInTheDocument();
  });
});

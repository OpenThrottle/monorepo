import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { InputGroupAddon } from '../InputGroupAddon';
import type { InputGroupAddonProps } from '../InputGroupAddon';

describe('InputGroupAddon Component', () => {
  let component: RenderResult;
  let props: InputGroupAddonProps;

  beforeEach(() => {
    props = {};

    const Component = () => <InputGroupAddon {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

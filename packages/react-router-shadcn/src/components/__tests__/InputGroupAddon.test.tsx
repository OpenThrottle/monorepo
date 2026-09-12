import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import type { InputGroupAddonProps } from '../InputGroupAddon';
import { InputGroupAddon } from '../InputGroupAddon';

describe('InputGroupAddon Component', () => {
  let component: RenderResult;
  let props: InputGroupAddonProps;

  beforeEach(() => {
    props = { children: 'Addon' };

    const Component = () => <InputGroupAddon {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders input group addon', () => {
    expect(component.getByText('Addon')).toBeInTheDocument();
  });
});

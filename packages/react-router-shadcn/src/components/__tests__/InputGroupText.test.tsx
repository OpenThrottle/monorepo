import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import type { InputGroupTextProps } from '../InputGroupText';
import { InputGroupText } from '../InputGroupText';

describe('InputGroupText Component', () => {
  let component: RenderResult;
  let props: InputGroupTextProps;

  beforeEach(() => {
    props = { children: 'Prefix' };

    const Component = () => <InputGroupText {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders input group text', () => {
    expect(component.getByText('Prefix')).toBeInTheDocument();
  });
});

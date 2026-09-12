import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import type { InputGroupTextareaProps } from '../InputGroupTextarea';
import { InputGroupTextarea } from '../InputGroupTextarea';

describe('InputGroupTextarea Component', () => {
  let component: RenderResult;
  let props: InputGroupTextareaProps;

  beforeEach(() => {
    props = {};

    const Component = () => <InputGroupTextarea {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders a textarea control', () => {
    expect(component.getByRole('textbox')).toBeInTheDocument();
  });
});

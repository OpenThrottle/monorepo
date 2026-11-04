import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import type { TextAreaProps } from '../TextArea';
import { TextArea } from '../TextArea';

describe('TextArea Component', () => {
  let component: RenderResult;
  let props: TextAreaProps;

  beforeEach(() => {
    props = {};

    const Component = () => <TextArea {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render a textarea', () => {
    expect(component.getByRole('textbox')).toBeInTheDocument();
  });
});

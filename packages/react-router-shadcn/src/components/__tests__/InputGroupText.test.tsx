import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { InputGroupText } from '../InputGroupText';
import type { InputGroupTextProps } from '../InputGroupText';

describe('InputGroupText Component', () => {
  let component: RenderResult;
  let props: InputGroupTextProps;

  beforeEach(() => {
    props = {};

    const Component = () => <InputGroupText {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

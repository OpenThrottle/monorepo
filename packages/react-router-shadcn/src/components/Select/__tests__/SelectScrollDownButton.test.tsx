import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SelectScrollDownButton } from '../SelectScrollDownButton';
import type { SelectScrollDownButtonProps } from '../SelectScrollDownButton';

describe('SelectScrollDownButton Component', () => {
  let component: RenderResult;
  let props: SelectScrollDownButtonProps;

  beforeEach(() => {
    props = {};

    const Component = () => <SelectScrollDownButton {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { CommandInput } from '../CommandInput';
import type { CommandInputProps } from '../CommandInput';

describe('CommandInput Component', () => {
  let component: RenderResult;
  let props: CommandInputProps;

  beforeEach(() => {
    props = {};

    const Component = () => <CommandInput {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

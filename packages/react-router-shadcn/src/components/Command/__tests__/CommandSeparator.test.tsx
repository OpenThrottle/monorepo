import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { CommandSeparator } from '../CommandSeparator';
import type { CommandSeparatorProps } from '../CommandSeparator';

describe('CommandSeparator Component', () => {
  let component: RenderResult;
  let props: CommandSeparatorProps;

  beforeEach(() => {
    props = {};

    const Component = () => <CommandSeparator {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

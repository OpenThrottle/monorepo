import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { CommandEmpty } from '../CommandEmpty';
import type { CommandEmptyProps } from '../CommandEmpty';

describe('CommandEmpty Component', () => {
  let component: RenderResult;
  let props: CommandEmptyProps;

  beforeEach(() => {
    props = {};

    const Component = () => <CommandEmpty {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

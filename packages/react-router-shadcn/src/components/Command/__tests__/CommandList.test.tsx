import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { CommandList } from '../CommandList';
import type { CommandListProps } from '../CommandList';

describe('CommandList Component', () => {
  let component: RenderResult;
  let props: CommandListProps;

  beforeEach(() => {
    props = {};

    const Component = () => <CommandList {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

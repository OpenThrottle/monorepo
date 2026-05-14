import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { CommandItem } from '../CommandItem';
import type { CommandItemProps } from '../CommandItem';

describe('CommandItem Component', () => {
  let component: RenderResult;
  let props: CommandItemProps;

  beforeEach(() => {
    props = {};

    const Component = () => <CommandItem {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

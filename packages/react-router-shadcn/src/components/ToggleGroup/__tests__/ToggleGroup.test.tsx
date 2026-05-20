import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { ToggleGroup } from '../ToggleGroup';
import type { ToggleGroupProps } from '../ToggleGroup';
import { ToggleGroupItem } from '../ToggleGroupItem';

describe('ToggleGroup Component', () => {
  let component: RenderResult;
  let props: ToggleGroupProps;

  beforeEach(() => {
    props = {
      'aria-label': 'Test',
      type: 'single',
    };

    const Component = () => (
      <ToggleGroup {...props}>
        <ToggleGroupItem value="a">A</ToggleGroupItem>
      </ToggleGroup>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

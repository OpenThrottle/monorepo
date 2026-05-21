import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { ToggleGroup } from '../ToggleGroup';
import { ToggleGroupItem } from '../ToggleGroupItem';
import type { ToggleGroupItemProps } from '../ToggleGroupItem';

describe('ToggleGroupItem Component', () => {
  let component: RenderResult;
  let props: ToggleGroupItemProps;

  beforeEach(() => {
    props = {
      value: 'a',
    };

    const Component = () => (
      <ToggleGroup aria-label="Test" type="single">
        <ToggleGroupItem {...props}>A</ToggleGroupItem>
      </ToggleGroup>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

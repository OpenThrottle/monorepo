import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { ToggleGroupItem } from '../ToggleGroupItem';
import type { ToggleGroupItemProps } from '../ToggleGroupItem';

describe('ToggleGroupItem Component', () => {
  let component: RenderResult;
  let props: ToggleGroupItemProps;

  beforeEach(() => {
    props = {};

    const Component = () => <ToggleGroupItem {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

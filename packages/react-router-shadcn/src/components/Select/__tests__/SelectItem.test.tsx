import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SelectItem } from '../SelectItem';
import type { SelectItemProps } from '../SelectItem';

describe('SelectItem Component', () => {
  let component: RenderResult;
  let props: SelectItemProps;

  beforeEach(() => {
    props = { value: 'item' };

    const Component = () => <SelectItem {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

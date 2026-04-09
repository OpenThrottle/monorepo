import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SelectSeparator } from '../SelectSeparator';
import type { SelectSeparatorProps } from '../SelectSeparator';

describe('SelectSeparator Component', () => {
  let component: RenderResult;
  let props: SelectSeparatorProps;

  beforeEach(() => {
    props = {};

    const Component = () => <SelectSeparator {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

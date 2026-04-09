import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SelectTrigger } from '../SelectTrigger';
import type { SelectTriggerProps } from '../SelectTrigger';

describe('SelectTrigger Component', () => {
  let component: RenderResult;
  let props: SelectTriggerProps;

  beforeEach(() => {
    props = {};

    const Component = () => <SelectTrigger {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

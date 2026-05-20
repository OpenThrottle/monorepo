import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PopoverContent } from '../PopoverContent';
import type { PopoverContentProps } from '../PopoverContent';

describe('PopoverContent Component', () => {
  let component: RenderResult;
  let props: PopoverContentProps;

  beforeEach(() => {
    props = {};

    const Component = () => <PopoverContent {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

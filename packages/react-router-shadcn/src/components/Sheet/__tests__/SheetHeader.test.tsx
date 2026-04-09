import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SheetHeader } from '../SheetHeader';
import type { SheetHeaderProps } from '../SheetHeader';

describe('SheetHeader Component', () => {
  let component: RenderResult;
  let props: SheetHeaderProps;

  beforeEach(() => {
    props = {};

    const Component = () => <SheetHeader {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

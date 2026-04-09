import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SheetFooter } from '../SheetFooter';
import type { SheetFooterProps } from '../SheetFooter';

describe('SheetFooter Component', () => {
  let component: RenderResult;
  let props: SheetFooterProps;

  beforeEach(() => {
    props = {};

    const Component = () => <SheetFooter {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { Sheet, SheetContent, SheetFooter } from '../index';
import type { SheetFooterProps } from '../SheetFooter';

describe('SheetFooter Component', () => {
  let component: RenderResult;
  let props: SheetFooterProps;

  beforeEach(() => {
    props = { children: 'Sheet footer' };

    const Component = () => (
      <Sheet open={true}>
        <SheetContent>
          <SheetFooter {...props} />
        </SheetContent>
      </Sheet>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders sheet footer content', () => {
    expect(component.getByText('Sheet footer')).toBeInTheDocument();
  });
});

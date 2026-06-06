import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { Sheet, SheetContent, SheetHeader } from '../index';
import type { SheetHeaderProps } from '../SheetHeader';

describe('SheetHeader Component', () => {
  let component: RenderResult;
  let props: SheetHeaderProps;

  beforeEach(() => {
    props = { children: 'Sheet header' };

    const Component = () => (
      <Sheet open={true}>
        <SheetContent>
          <SheetHeader {...props} />
        </SheetContent>
      </Sheet>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders sheet header content', () => {
    expect(component.getByText('Sheet header')).toBeInTheDocument();
  });
});

import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { Sheet, SheetContent, SheetTitle } from '../index';
import type { SheetTitleProps } from '../SheetTitle';

describe('SheetTitle Component', () => {
  let component: RenderResult;
  let props: SheetTitleProps;

  beforeEach(() => {
    props = {};

    const Component = () => (
      <Sheet open={true}>
        <SheetContent>
          <SheetTitle {...props}>Sheet title</SheetTitle>
        </SheetContent>
      </Sheet>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders the sheet title', () => {
    expect(
      component.getByRole('heading', { name: 'Sheet title' }),
    ).toBeInTheDocument();
  });
});

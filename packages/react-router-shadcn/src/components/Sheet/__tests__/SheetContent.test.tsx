import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { Sheet, SheetContent } from '../index';
import type { SheetContentProps } from '../SheetContent';

describe('SheetContent Component', () => {
  let component: RenderResult;
  let props: SheetContentProps;

  beforeEach(() => {
    props = {};

    const Component = () => (
      <Sheet open={true}>
        <SheetContent {...props}>Sheet body</SheetContent>
      </Sheet>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders sheet content when open', () => {
    expect(component.getByText('Sheet body')).toBeInTheDocument();
  });
});

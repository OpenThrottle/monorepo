import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { Sheet, SheetContent } from '../index';
import type { SheetOverlayProps } from '../SheetOverlay';

describe('SheetOverlay Component', () => {
  let component: RenderResult;
  let props: SheetOverlayProps;

  beforeEach(() => {
    props = {};

    const Component = () => (
      <Sheet open={true}>
        <SheetContent {...props}>
          <span>Body</span>
        </SheetContent>
      </Sheet>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders sheet overlay when open', () => {
    expect(component.getByText('Body')).toBeInTheDocument();
  });
});

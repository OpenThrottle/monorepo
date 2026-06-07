import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { Sheet, SheetContent, SheetDescription } from '../index';
import type { SheetDescriptionProps } from '../SheetDescription';

describe('SheetDescription Component', () => {
  let component: RenderResult;
  let props: SheetDescriptionProps;

  beforeEach(() => {
    props = {};

    const Component = () => (
      <Sheet open={true}>
        <SheetContent>
          <SheetDescription {...props}>Sheet description</SheetDescription>
        </SheetContent>
      </Sheet>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders the sheet description', () => {
    expect(component.getByText('Sheet description')).toBeInTheDocument();
  });
});

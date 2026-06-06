import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SheetContent } from '../SheetContent';
import type { SheetContentProps } from '../SheetContent';

describe('SheetContent Component', () => {
  let component: RenderResult;
  let props: SheetContentProps;

  beforeEach(() => {
    props = {};

    const Component = () => <SheetContent {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

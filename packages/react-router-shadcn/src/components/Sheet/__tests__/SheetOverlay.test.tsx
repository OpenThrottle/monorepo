import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SheetOverlay } from '../SheetOverlay';
import type { SheetOverlayProps } from '../SheetOverlay';

describe('SheetOverlay Component', () => {
  let component: RenderResult;
  let props: SheetOverlayProps;

  beforeEach(() => {
    props = {};

    const Component = () => <SheetOverlay {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

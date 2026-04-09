import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { AlertDialogOverlay } from '../AlertDialogOverlay';
import type { AlertDialogOverlayProps } from '../AlertDialogOverlay';

describe('AlertDialogOverlay Component', () => {
  let component: RenderResult;
  let props: AlertDialogOverlayProps;

  beforeEach(() => {
    props = {};

    const Component = () => <AlertDialogOverlay {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

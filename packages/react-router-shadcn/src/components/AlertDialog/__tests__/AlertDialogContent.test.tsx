import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { AlertDialogContent } from '../AlertDialogContent';
import type { AlertDialogContentProps } from '../AlertDialogContent';

describe('AlertDialogContent Component', () => {
  let component: RenderResult;
  let props: AlertDialogContentProps;

  beforeEach(() => {
    props = {};

    const Component = () => <AlertDialogContent {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

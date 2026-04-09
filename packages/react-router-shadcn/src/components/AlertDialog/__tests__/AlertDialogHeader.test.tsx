import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { AlertDialogHeader } from '../AlertDialogHeader';
import type { AlertDialogHeaderProps } from '../AlertDialogHeader';

describe('AlertDialogHeader Component', () => {
  let component: RenderResult;
  let props: AlertDialogHeaderProps;

  beforeEach(() => {
    props = {};

    const Component = () => <AlertDialogHeader {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

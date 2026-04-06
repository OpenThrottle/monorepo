import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { AlertDialogAction } from '../AlertDialogAction';
import type { AlertDialogActionProps } from '../AlertDialogAction';

describe('AlertDialogAction Component', () => {
  let component: RenderResult;
  let props: AlertDialogActionProps;

  beforeEach(() => {
    props = {};

    const Component = () => <AlertDialogAction {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

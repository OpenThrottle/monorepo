import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { AlertDialog } from '../AlertDialog';
import type { AlertDialogProps } from '../AlertDialog';

describe('AlertDialog Component', () => {
  let component: RenderResult;
  let props: AlertDialogProps;

  beforeEach(() => {
    props = {};

    const Component = () => <AlertDialog {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

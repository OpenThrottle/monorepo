import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { AlertDialogTitle } from '../AlertDialogTitle';
import type { AlertDialogTitleProps } from '../AlertDialogTitle';

describe('AlertDialogTitle Component', () => {
  let component: RenderResult;
  let props: AlertDialogTitleProps;

  beforeEach(() => {
    props = {};

    const Component = () => <AlertDialogTitle {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

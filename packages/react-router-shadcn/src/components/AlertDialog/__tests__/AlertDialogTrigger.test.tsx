import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { AlertDialogTrigger } from '../AlertDialogTrigger';
import type { AlertDialogTriggerProps } from '../AlertDialogTrigger';

describe('AlertDialogTrigger Component', () => {
  let component: RenderResult;
  let props: AlertDialogTriggerProps;

  beforeEach(() => {
    props = {};

    const Component = () => <AlertDialogTrigger {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

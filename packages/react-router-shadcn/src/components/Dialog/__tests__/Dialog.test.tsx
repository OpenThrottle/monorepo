import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { Dialog } from '../Dialog';
import type { DialogProps } from '../Dialog';

describe('Dialog Component', () => {
  let component: RenderResult;
  let props: DialogProps;

  beforeEach(() => {
    props = {};

    const Component = () => (
      <Dialog {...props}>
        <span data-testid="dialog-child">Child</span>
      </Dialog>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders dialog children', () => {
    expect(component.getByTestId('dialog-child')).toHaveTextContent('Child');
  });
});

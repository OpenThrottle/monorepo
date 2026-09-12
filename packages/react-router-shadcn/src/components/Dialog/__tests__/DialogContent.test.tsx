import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import { Dialog } from '../Dialog';
import type { DialogContentProps } from '../DialogContent';
import { DialogContent } from '../DialogContent';

describe('DialogContent Component', () => {
  let component: RenderResult;
  let props: DialogContentProps;

  beforeEach(() => {
    props = {};

    const Component = () => (
      <Dialog open={true}>
        <DialogContent {...props}>Dialog body</DialogContent>
      </Dialog>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders dialog content when open', () => {
    expect(component.getByText('Dialog body')).toBeInTheDocument();
  });
});

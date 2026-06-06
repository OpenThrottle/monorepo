import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { Dialog } from '../Dialog';
import { DialogTitle } from '../DialogTitle';
import type { DialogTitleProps } from '../DialogTitle';

describe('DialogTitle Component', () => {
  let component: RenderResult;
  let props: DialogTitleProps;

  beforeEach(() => {
    props = {};

    const Component = () => (
      <Dialog>
        <DialogTitle {...props}>Title</DialogTitle>
      </Dialog>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders the dialog title', () => {
    expect(
      component.getByRole('heading', { name: 'Title' }),
    ).toBeInTheDocument();
  });
});

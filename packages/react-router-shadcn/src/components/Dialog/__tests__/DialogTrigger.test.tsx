import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import { Dialog } from '../Dialog';
import type { DialogTriggerProps } from '../DialogTrigger';
import { DialogTrigger } from '../DialogTrigger';

describe('DialogTrigger Component', () => {
  let component: RenderResult;
  let props: DialogTriggerProps;

  beforeEach(() => {
    props = {};

    const Component = () => (
      <Dialog>
        <DialogTrigger {...props}>Open dialog</DialogTrigger>
      </Dialog>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders a dialog trigger button', () => {
    expect(
      component.getByRole('button', { name: 'Open dialog' }),
    ).toBeInTheDocument();
  });
});

import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import { Popover } from '../Popover';
import type { PopoverTriggerProps } from '../PopoverTrigger';
import { PopoverTrigger } from '../PopoverTrigger';

describe('PopoverTrigger Component', () => {
  let component: RenderResult;
  let props: PopoverTriggerProps;

  beforeEach(() => {
    props = { children: 'Open popover' };

    const Component = () => (
      <Popover>
        <PopoverTrigger {...props} />
      </Popover>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders a popover trigger', () => {
    expect(
      component.getByRole('button', { name: 'Open popover' }),
    ).toBeInTheDocument();
  });
});

import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PopoverTrigger } from '../PopoverTrigger';
import type { PopoverTriggerProps } from '../PopoverTrigger';
import { Popover } from '../Popover';

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

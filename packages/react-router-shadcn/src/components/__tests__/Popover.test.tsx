import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { Popover, PopoverContent, PopoverTrigger } from '../Popover';

describe('Popover Component', () => {
  let component: RenderResult;
  let props: React.ComponentPropsWithoutRef<typeof Popover>;

  beforeEach(() => {
    props = {};

    const Component = () => (
      <Popover {...props}>
        <PopoverTrigger>Open menu</PopoverTrigger>
        <PopoverContent>Panel content</PopoverContent>
      </Popover>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render trigger button for popover', () => {
    expect(
      component.getByRole('button', { name: 'Open menu' }),
    ).toBeInTheDocument();
  });
});

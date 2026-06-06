import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PopoverContent } from '../PopoverContent';
import type { PopoverContentProps } from '../PopoverContent';
import { Popover } from '../Popover';

describe('PopoverContent Component', () => {
  let component: RenderResult;
  let props: PopoverContentProps;

  beforeEach(() => {
    props = { children: 'Popover content' };

    const Component = () => (
      <Popover open={true}>
        <PopoverContent {...props} />
      </Popover>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders popover content when open', () => {
    expect(component.getByText('Popover content')).toBeInTheDocument();
  });
});

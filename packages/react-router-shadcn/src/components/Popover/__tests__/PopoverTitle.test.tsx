import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PopoverTitle } from '../PopoverTitle';
import type { PopoverTitleProps } from '../PopoverTitle';
import { Popover } from '../Popover';
import { PopoverContent } from '../PopoverContent';

describe('PopoverTitle Component', () => {
  let component: RenderResult;
  let props: PopoverTitleProps;

  beforeEach(() => {
    props = { children: 'Popover title' };

    const Component = () => (
      <Popover open={true}>
        <PopoverContent>
          <PopoverTitle {...props} />
        </PopoverContent>
      </Popover>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders popover title when open', () => {
    expect(component.getByText('Popover title')).toBeInTheDocument();
  });
});

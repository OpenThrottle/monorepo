import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PopoverHeader } from '../PopoverHeader';
import type { PopoverHeaderProps } from '../PopoverHeader';
import { Popover } from '../Popover';
import { PopoverContent } from '../PopoverContent';

describe('PopoverHeader Component', () => {
  let component: RenderResult;
  let props: PopoverHeaderProps;

  beforeEach(() => {
    props = { children: 'Popover header' };

    const Component = () => (
      <Popover open={true}>
        <PopoverContent>
          <PopoverHeader {...props} />
        </PopoverContent>
      </Popover>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders popover header when open', () => {
    expect(component.getByText('Popover header')).toBeInTheDocument();
  });
});

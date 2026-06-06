import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PopoverDescription } from '../PopoverDescription';
import type { PopoverDescriptionProps } from '../PopoverDescription';
import { Popover } from '../Popover';
import { PopoverContent } from '../PopoverContent';

describe('PopoverDescription Component', () => {
  let component: RenderResult;
  let props: PopoverDescriptionProps;

  beforeEach(() => {
    props = { children: 'Popover description' };

    const Component = () => (
      <Popover open={true}>
        <PopoverContent>
          <PopoverDescription {...props} />
        </PopoverContent>
      </Popover>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders popover description when open', () => {
    expect(component.getByText('Popover description')).toBeInTheDocument();
  });
});

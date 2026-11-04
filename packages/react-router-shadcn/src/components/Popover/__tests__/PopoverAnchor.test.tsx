import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import { Popover } from '../Popover';
import type { PopoverAnchorProps } from '../PopoverAnchor';
import { PopoverAnchor } from '../PopoverAnchor';

describe('PopoverAnchor Component', () => {
  let component: RenderResult;
  let props: PopoverAnchorProps;

  beforeEach(() => {
    props = { children: 'Anchor' };

    const Component = () => (
      <Popover>
        <PopoverAnchor {...props} />
      </Popover>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders popover anchor content', () => {
    expect(component.getByText('Anchor')).toBeInTheDocument();
  });
});

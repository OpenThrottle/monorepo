import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import type { DialogFooterProps } from '../DialogFooter';
import { DialogFooter } from '../DialogFooter';

describe('DialogFooter Component', () => {
  let component: RenderResult;
  let props: DialogFooterProps;

  beforeEach(() => {
    props = { children: 'Footer content' };

    const Component = () => <DialogFooter {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders dialog footer content', () => {
    expect(component.getByText('Footer content')).toBeInTheDocument();
  });
});

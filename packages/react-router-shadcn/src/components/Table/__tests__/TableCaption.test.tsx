import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import type { TableCaptionProps } from '../TableCaption';
import { TableCaption } from '../TableCaption';

describe('TableCaption Component', () => {
  let component: RenderResult;
  let props: TableCaptionProps;

  beforeEach(() => {
    props = {};

    const Component = () => <TableCaption {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders a table caption', () => {
    expect(component.container.querySelector('caption')).toBeInTheDocument();
  });
});

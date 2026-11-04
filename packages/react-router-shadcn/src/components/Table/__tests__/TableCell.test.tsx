import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import type { TableCellProps } from '../TableCell';
import { TableCell } from '../TableCell';

describe('TableCell Component', () => {
  let component: RenderResult;
  let props: TableCellProps;

  beforeEach(() => {
    props = {};

    const Component = () => <TableCell {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders a table cell', () => {
    expect(component.container.querySelector('td')).toBeInTheDocument();
  });
});

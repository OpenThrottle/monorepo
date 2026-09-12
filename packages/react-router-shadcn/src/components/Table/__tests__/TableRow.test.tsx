import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import type { TableRowProps } from '../TableRow';
import { TableRow } from '../TableRow';

describe('TableRow Component', () => {
  let component: RenderResult;
  let props: TableRowProps;

  beforeEach(() => {
    props = {};

    const Component = () => <TableRow {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders a table row', () => {
    expect(component.container.querySelector('tr')).toBeInTheDocument();
  });
});

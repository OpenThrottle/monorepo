import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { TableFooter } from '../TableFooter';
import type { TableFooterProps } from '../TableFooter';

describe('TableFooter Component', () => {
  let component: RenderResult;
  let props: TableFooterProps;

  beforeEach(() => {
    props = {};

    const Component = () => <TableFooter {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders a table footer section', () => {
    expect(component.container.querySelector('tfoot')).toBeInTheDocument();
  });
});

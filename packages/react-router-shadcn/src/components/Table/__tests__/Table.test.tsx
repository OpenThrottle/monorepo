import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { Table } from '../Table';
import type { TableProps } from '../Table';

describe('Table Component', () => {
  let component: RenderResult;
  let props: TableProps;

  beforeEach(() => {
    props = {};

    const Component = () => <Table {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders a table element', () => {
    expect(component.getByRole('table')).toBeInTheDocument();
  });
});

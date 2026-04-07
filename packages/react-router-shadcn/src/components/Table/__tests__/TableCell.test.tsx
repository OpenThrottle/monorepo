import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { TableCell } from '../TableCell';
import type { TableCellProps } from '../TableCell';

describe('TableCell Component', () => {
  let component: RenderResult;
  let props: TableCellProps;

  beforeEach(() => {
    props = {};

    const Component = () => <TableCell {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { TableRow } from '../TableRow';
import type { TableRowProps } from '../TableRow';

describe('TableRow Component', () => {
  let component: RenderResult;
  let props: TableRowProps;

  beforeEach(() => {
    props = {};

    const Component = () => <TableRow {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});

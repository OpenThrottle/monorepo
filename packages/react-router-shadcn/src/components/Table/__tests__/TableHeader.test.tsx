import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { TableHeader } from '../TableHeader';
import type { TableHeaderProps } from '../TableHeader';

describe('TableHeader Component', () => {
  let component: RenderResult;
  let props: TableHeaderProps;

  beforeEach(() => {
    props = {};

    const Component = () => <TableHeader {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders a table header section', () => {
    expect(component.container.querySelector('thead')).toBeInTheDocument();
  });
});

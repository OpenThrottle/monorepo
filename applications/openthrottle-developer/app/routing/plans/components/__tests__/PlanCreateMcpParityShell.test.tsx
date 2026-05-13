import * as React from 'react';
import { render, within } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PlanCreateMcpParityShell } from '../PlanCreateMcpParityShell';
import type { PlanCreateMcpParityShellProps } from '../PlanCreateMcpParityShell';

describe('PlanCreateMcpParityShell Component', () => {
  let component: RenderResult;
  let props: PlanCreateMcpParityShellProps;

  beforeEach(() => {
    props = {};

    const Component = () => <PlanCreateMcpParityShell {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render shell without default inner copy when children omitted', () => {
    const shell = component.getByTestId('PlanCreateMcpParityShell');
    expect(within(shell).queryByText(/MCP parity/i)).not.toBeInTheDocument();
  });

  test('should render children when provided', () => {
    props = { children: <p data-testid="child">Child content</p> };
    const Component = () => <PlanCreateMcpParityShell {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { getByTestId } = render(<RoutesStub />);
    expect(getByTestId('child')).toHaveTextContent('Child content');
  });
});

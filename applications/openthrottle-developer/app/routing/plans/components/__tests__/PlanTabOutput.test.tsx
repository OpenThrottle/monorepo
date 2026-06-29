import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { Tabs } from '@openthrottle/react-router-shadcn';
import { describe, expect, test } from 'vitest';
import { PlanTabOutput } from '../PlanTabOutput';
import type { PlanTabOutputProps } from '../PlanTabOutput';

const renderOutput = (props: PlanTabOutputProps): ReturnType<typeof render> => {
  const Component = () => (
    <Tabs defaultValue="output">
      <PlanTabOutput {...props} />
    </Tabs>
  );
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
};

describe('PlanTabOutput Component', () => {
  test('shows empty state when no chunks', () => {
    renderOutput({ chunks: [] });

    expect(screen.getByTestId('PlanLoggerOutput')).toBeInTheDocument();
    expect(screen.getByText(/No plan output chunks yet/i)).toBeInTheDocument();
  });

  test('renders output panel when chunks exist', () => {
    renderOutput({
      chunks: [
        {
          __typename: 'PlanOutputStreamChunkObject',
          content: 'Done.',
          createdAt: '2026-01-01T00:00:00.000Z',
          id: 'chunk-1',
          iteration: 1,
          planId: 'plan-1',
        },
      ],
    });

    expect(screen.getByTestId('PlanLoggerOutput')).toBeInTheDocument();
    expect(
      screen.queryByText(/No plan output chunks yet/i),
    ).not.toBeInTheDocument();
  });
});

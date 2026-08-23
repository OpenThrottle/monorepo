import * as React from 'react';
import { Tabs } from '@openthrottle/react-router-shadcn';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { PlanTabOutput } from '../PlanTabOutput';
import type { PlanTabOutputProps } from '../PlanTabOutput';

const chunk: PlanTabOutputProps['chunks'][number] = {
  __typename: 'PlanOutputStreamChunkObject',
  content: 'Done.',
  createdAt: '2026-01-01T00:00:00.000Z',
  id: 'chunk-1',
  iteration: 1,
  planId: 'plan-1',
};

// The rule-change-log and linked-artifacts sections are commented out in the
// component, so this covers only the agent-output stream that still renders.
const renderOutput = (props: PlanTabOutputProps): ReturnType<typeof render> =>
  render(
    <Tabs value="output">
      <PlanTabOutput {...props} />
    </Tabs>,
  );

describe('PlanTabOutput Component', () => {
  test('renders the empty hint when no chunks exist', () => {
    const { getByTestId, getByText } = renderOutput({ chunks: [] });

    expect(getByTestId('PlanLoggerOutput')).toBeInTheDocument();
    expect(getByText(/No plan output chunks yet/i)).toBeInTheDocument();
  });

  test('renders the agent output markdown when chunks exist', async () => {
    const { findByText, queryByText } = renderOutput({ chunks: [chunk] });

    // MarkdownRenderer compiles asynchronously, so await the rendered content.
    expect(await findByText('Done.')).toBeInTheDocument();
    expect(queryByText(/No plan output chunks yet/i)).not.toBeInTheDocument();
  });
});

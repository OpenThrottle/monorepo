import * as React from 'react';
import { Tabs } from '@openthrottle/react-router-shadcn';
import type { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import {
  buildPlanDetailLoaderData,
  renderWithPlanDetailRouteData,
} from '~/routing/plans/testing/plan-detail-route-data';
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
//
// The tab reads the deferred `outputChunks` promise from the route to gate its
// boundary, so it must render inside the real plan-detail route context. The
// `chunks` prop is still the live-merged stream that gets displayed.
const renderOutput = (
  props: PlanTabOutputProps,
  outputChunks: Promise<unknown[]> = Promise.resolve([]),
): ReturnType<typeof render> =>
  renderWithPlanDetailRouteData(
    <Tabs value="output">
      <PlanTabOutput {...props} />
    </Tabs>,
    buildPlanDetailLoaderData({ outputChunks }),
  );

describe('PlanTabOutput Component', () => {
  test('renders the empty hint once the snapshot resolves as empty', async () => {
    const { findByText, getByTestId } = renderOutput({ chunks: [] });

    // The tab shell is there immediately; the empty hint only after the
    // deferred snapshot has actually resolved.
    expect(getByTestId('PlanLoggerOutput')).toBeInTheDocument();
    expect(await findByText(/No plan output chunks yet/i)).toBeInTheDocument();
  });

  // 🚨 The empty state is a claim about the data, so it must never stand in for
  // "still loading" — that was the regression risk in deferring this key.
  test('renders the skeleton, not the empty hint, while the snapshot is pending', () => {
    const { getByTestId, queryByText } = renderOutput(
      { chunks: [] },
      new Promise<unknown[]>(() => {}),
    );

    expect(getByTestId('PlanOutputStreamSkeleton')).toBeInTheDocument();
    expect(queryByText(/No plan output chunks yet/i)).not.toBeInTheDocument();
  });

  test('renders the agent output markdown when chunks exist', async () => {
    const { findByText, queryByText } = renderOutput({ chunks: [chunk] });

    // MarkdownRenderer compiles asynchronously, so await the rendered content.
    expect(await findByText('Done.')).toBeInTheDocument();
    expect(queryByText(/No plan output chunks yet/i)).not.toBeInTheDocument();
  });
});

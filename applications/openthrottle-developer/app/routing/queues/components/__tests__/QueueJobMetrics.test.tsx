import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import type { QueueJobDetailJob } from '../QueueJobDetail';
import { QueueJobMetrics } from '../QueueJobMetrics';

const baseJob = (): QueueJobDetailJob => ({
  data: null,
  executionBackend: null,
  failedReason: null,
  finishedOn: null,
  id: 'bull-job-1',
  name: null,
  processedOn: null,
  progress: null,
  returnvalue: null,
  state: 'completed',
  taskRunMetrics: null,
  timestamp: 1_700_000_000_000,
});

const renderMetrics = (job: QueueJobDetailJob): ReturnType<typeof render> => {
  const Component = () => <QueueJobMetrics job={job} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
};

describe('QueueJobMetrics Component', () => {
  test('shows empty metrics message when task metrics are missing', () => {
    renderMetrics(baseJob());

    expect(screen.getByText(/No metrics recorded/i)).toBeInTheDocument();
  });

  test('renders RSS summary lines when metrics exist', () => {
    renderMetrics({
      ...baseJob(),
      taskRunMetrics: {
        __typename: 'TaskRunMetrics',
        atEnd: {
          __typename: 'ProcessMetricsSnapshot',
          heapUsedMb: 40,
          rssMb: 120,
        },
        atStart: {
          __typename: 'ProcessMetricsSnapshot',
          heapUsedMb: 30,
          rssMb: 100,
        },
      },
    });

    expect(screen.getByText(/Start RSS: 100\.0 MB/)).toBeInTheDocument();
    expect(screen.getByText(/End RSS: 120\.0 MB/)).toBeInTheDocument();
  });
});

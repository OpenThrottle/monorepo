import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import type { QueueJobDetailJob } from '../QueueJobDetail';
import { QueueJobResults } from '../QueueJobResults';

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

const renderResults = (job: QueueJobDetailJob): ReturnType<typeof render> => {
  const Component = () => <QueueJobResults job={job} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
};

describe('QueueJobResults Component', () => {
  test('renders nothing when job has no failure reason', () => {
    const { container } = renderResults(baseJob());

    expect(container).toBeEmptyDOMElement();
  });

  test('renders failure reason when job failed', () => {
    renderResults({
      ...baseJob(),
      failedReason: 'Worker crashed',
      state: 'failed',
    });

    expect(screen.getByText('Failure reason')).toBeInTheDocument();
    expect(screen.getByText('Worker crashed')).toBeInTheDocument();
  });
});

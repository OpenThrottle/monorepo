import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import type { QueueJobDetailJob } from '../QueueJobDetail';
import { QueueJobPayload } from '../QueueJobPayload';

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

const renderPayload = (job: QueueJobDetailJob): ReturnType<typeof render> => {
  const Component = () => <QueueJobPayload job={job} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
};

describe('QueueJobPayload Component', () => {
  test('shows empty payload message when job has no data', () => {
    renderPayload(baseJob());

    expect(screen.getByText(/No payload on this job/i)).toBeInTheDocument();
  });

  test('renders copy control when payload JSON exists', () => {
    renderPayload({
      ...baseJob(),
      data: JSON.stringify({ planId: 'plan-uuid' }),
    });

    expect(
      screen.getByRole('button', { name: /copy json/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/plan-uuid/)).toBeInTheDocument();
  });
});

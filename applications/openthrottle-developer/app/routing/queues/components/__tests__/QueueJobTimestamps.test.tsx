import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import type { JobDetailsCardFragment } from '~/__generated__/graphql';
import { QueueJobTimestamps } from '../QueueJobTimestamps';

const baseJob = (): JobDetailsCardFragment => ({
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

const renderTimestamps = (
  job: JobDetailsCardFragment,
): ReturnType<typeof render> => {
  const Component = () => <QueueJobTimestamps job={job} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
};

describe('QueueJobTimestamps Component', () => {
  test('renders timestamp labels and formatted created time', () => {
    const job = baseJob();
    renderTimestamps(job);

    expect(screen.getByText('Timestamps')).toBeInTheDocument();
    expect(screen.getByText('Created')).toBeInTheDocument();
    expect(screen.getByText('Started')).toBeInTheDocument();
    expect(screen.getByText('Finished')).toBeInTheDocument();
    expect(
      screen.getByText(new Date(job.timestamp!).toISOString()),
    ).toBeInTheDocument();
  });
});

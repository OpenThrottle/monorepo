import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import type { JobDetailsCardFragment } from '~/__generated__/graphql';

import { QueueJobTimestamps } from '../QueueJobTimestamps';

const baseJob = (): JobDetailsCardFragment => {
  return {
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
  };
};

const renderTimestamps = (
  job: JobDetailsCardFragment,
): ReturnType<typeof render> => {
  const Component = () => {
    return <QueueJobTimestamps job={job} />;
  };
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
};

describe('QueueJobTimestamps Component', () => {
  test('renders timestamp labels and formatted created time', () => {
    const job = baseJob();
    const component = renderTimestamps(job);

    expect(component.getByText('Timestamps')).toBeInTheDocument();
    expect(component.getByText('Created')).toBeInTheDocument();
    expect(component.getByText('Started')).toBeInTheDocument();
    expect(component.getByText('Finished')).toBeInTheDocument();
    expect(
      component.getByText(new Date(job.timestamp!).toISOString()),
    ).toBeInTheDocument();
  });
});

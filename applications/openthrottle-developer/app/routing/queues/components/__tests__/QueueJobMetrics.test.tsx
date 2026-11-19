import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import type { JobDetailsCardFragment } from '~/__generated__/graphql';

import { QueueJobMetrics } from '../QueueJobMetrics';

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

const renderMetrics = (
  job: JobDetailsCardFragment,
): ReturnType<typeof render> => {
  const Component = () => {
    return <QueueJobMetrics job={job} />;
  };
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
};

describe('QueueJobMetrics Component', () => {
  test('shows empty metrics message when task metrics are missing', () => {
    const component = renderMetrics(baseJob());

    expect(component.getByText(/No metrics recorded/i)).toBeInTheDocument();
  });

  test('renders RSS summary lines when metrics exist', () => {
    const component = renderMetrics({
      ...baseJob(),
      taskRunMetrics: {
        atEnd: {
          heapUsedMb: 40,
          rssMb: 120,
        },
        atStart: {
          heapUsedMb: 30,
          rssMb: 100,
        },
      },
    });

    expect(component.getByText(/Start RSS: 100\.0 MB/)).toBeInTheDocument();
    expect(component.getByText(/End RSS: 120\.0 MB/)).toBeInTheDocument();
  });
});

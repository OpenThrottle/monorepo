import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import type { JobDetailsCardFragment } from '~/__generated__/graphql';
import { QueueCorrelationAndSupport } from '../QueueCorrelationAndSupport';

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

const renderCorrelation = (
  job: JobDetailsCardFragment,
  queueName = 'Plans',
): ReturnType<typeof render> => {
  const Component = () => (
    <QueueCorrelationAndSupport job={job} queueName={queueName} />
  );
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
};

describe('QueueCorrelationAndSupport Component', () => {
  test('renders queue name and job correlation id', () => {
    renderCorrelation(baseJob(), 'workflow-jobs');

    expect(screen.getByText('workflow-jobs')).toBeInTheDocument();
    expect(screen.getByTestId('queue-job-correlation-id')).toHaveTextContent(
      'bull-job-1',
    );
  });

  test('links to plan when payload includes planId', () => {
    const planId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    renderCorrelation({
      ...baseJob(),
      data: JSON.stringify({ planId }),
    });

    expect(screen.getByRole('link', { name: planId })).toHaveAttribute(
      'href',
      `/plans/${planId}`,
    );
  });
});

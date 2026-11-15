import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import type { JobDetailsCardFragment } from '~/__generated__/graphql';

import { QueueCorrelationAndSupport } from '../QueueCorrelationAndSupport';

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

const renderCorrelation = (
  job: JobDetailsCardFragment,
  queueName = 'Plans',
): ReturnType<typeof render> => {
  const Component = () => {
    return <QueueCorrelationAndSupport job={job} queueName={queueName} />;
  };
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
};

describe('QueueCorrelationAndSupport Component', () => {
  test('renders queue name and job correlation id', () => {
    const component = renderCorrelation(baseJob(), 'workflow-jobs');

    expect(component.getByText('workflow-jobs')).toBeInTheDocument();
    expect(component.getByTestId('queue-job-correlation-id')).toHaveTextContent(
      'bull-job-1',
    );
  });

  test('links to plan when payload includes planId', () => {
    const planId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const component = renderCorrelation({
      ...baseJob(),
      data: JSON.stringify({ planId }),
    });

    expect(component.getByRole('link', { name: planId })).toHaveAttribute(
      'href',
      `/plans/${planId}`,
    );
  });
});

import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { QueueJobCard } from '../QueueJobCard';
import type { QueueJobCardProps } from '../QueueJobCard';

const minimalJob: QueueJobCardProps['job'] = {
  data: null,
  failedReason: null,
  id: 'job-1',
  name: null,
  state: 'completed',
};

function renderCard(props: QueueJobCardProps): RenderResult {
  const Component = () => <QueueJobCard {...props} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
}

describe('QueueJobCard Component', () => {
  let component: RenderResult;
  let props: QueueJobCardProps;

  beforeEach(() => {
    props = { job: minimalJob };
    component = renderCard(props);
  });

  test('should expose job-state-*, job-id-*, and QueueJobCard data-testids', () => {
    expect(component.getByTestId('QueueJobCard')).toBeInTheDocument();
    expect(component.getByTestId('job-state-job-1')).toHaveTextContent(
      'completed',
    );
    expect(component.getByTestId('job-id-job-1')).toHaveTextContent('job-1');
  });

  test('should link to job detail when queueName is set', () => {
    const { getByTestId } = renderCard({
      job: minimalJob,
      queueName: 'Plans',
    });
    const link = getByTestId('job-detail-link-job-1');
    expect(link).toHaveAttribute('href', '/queues/Plans/job-1');
  });

  test('should render job-failedReason-* when failedReason is set', () => {
    const jobWithFailure: QueueJobCardProps['job'] = {
      ...minimalJob,
      failedReason: 'Connection timeout',
      id: 'job-failed-1',
      state: 'failed',
    };
    const { getByTestId } = renderCard({ job: jobWithFailure });
    expect(getByTestId('job-state-job-failed-1')).toHaveTextContent('failed');
    expect(getByTestId('job-id-job-failed-1')).toHaveTextContent(
      'job-failed-1',
    );
    expect(getByTestId('job-failedReason-job-failed-1')).toHaveTextContent(
      'Connection timeout',
    );
  });
});

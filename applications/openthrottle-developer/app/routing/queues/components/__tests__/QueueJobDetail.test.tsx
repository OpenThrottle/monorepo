import * as React from 'react';
import { render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { QueueJobDetailJob } from '../QueueJobDetail';
import { QueueJobDetail } from '../QueueJobDetail';

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// The live console has its own suite (ws client + resource route); stub it here
// so QueueJobDetail tests stay focused on the detail chrome and actions.
vi.mock('~/routing/queues/components/QueueJobLogConsole', () => ({
  QueueJobLogConsole: () => null,
}));

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

function renderDetail(
  job: QueueJobDetailJob,
  queueName = 'Plans',
): ReturnType<typeof render> {
  const Component = () => <QueueJobDetail job={job} queueName={queueName} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
}

describe('QueueJobDetail Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders queue, job id, and state', () => {
    const job = baseJob();
    const view = renderDetail(job, 'workflow-jobs');

    expect(view.getByTestId('QueueJobDetail')).toBeInTheDocument();
    expect(view.getByText('Completed')).toBeInTheDocument();
    expect(view.getByTestId('queue-job-correlation-id')).toHaveTextContent(
      'bull-job-1',
    );
    expect(view.getByText('workflow-jobs')).toBeInTheDocument();
  });

  describe('when job failed', () => {
    test('shows retry action', () => {
      const job: QueueJobDetailJob = {
        ...baseJob(),
        state: 'failed',
      };
      const view = renderDetail(job);

      expect(
        view.getByRole('button', { name: /retry \(failed\)/i }),
      ).toBeInTheDocument();
    });
  });

  describe('when job is waiting with plan id in payload', () => {
    test('shows cancel plan run action', () => {
      const planId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
      const job: QueueJobDetailJob = {
        ...baseJob(),
        data: JSON.stringify({ planId }),
        id: 'waiting-plan',
        state: 'waiting',
      };
      const view = renderDetail(job);

      expect(
        view.getByRole('button', { name: /cancel plan run/i }),
      ).toBeInTheDocument();
    });
  });

  describe('when task run metrics exist', () => {
    test('renders RSS summary lines', () => {
      const job: QueueJobDetailJob = {
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
      };
      const view = renderDetail(job);

      expect(view.getByText(/Start RSS: 100\.0 MB/)).toBeInTheDocument();
      expect(view.getByText(/End RSS: 120\.0 MB/)).toBeInTheDocument();
    });
  });

  describe('when returnvalue is JSON', () => {
    test('renders formatted return value block', () => {
      const job: QueueJobDetailJob = {
        ...baseJob(),
        failedReason: 'boom',
        returnvalue: JSON.stringify({ ok: true }),
        state: 'failed',
      };
      const view = renderDetail(job);

      expect(view.getByText('Return value')).toBeInTheDocument();
      expect(view.getByText(/"ok": true/)).toBeInTheDocument();
    });
  });
});

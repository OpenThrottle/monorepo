import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TaskRunMetricsCard } from '../TaskRunMetricsCard';

const mockTaskRunMetrics = {
  atEnd: {
    cpuSystemMs: 80,
    cpuUserMs: 450,
    externalMb: 3,
    heapTotalMb: 36,
    heapUsedMb: 28.3,
    rssMb: 52.1,
  },
  atStart: {
    cpuSystemMs: 10,
    cpuUserMs: 120,
    externalMb: 2.5,
    heapTotalMb: 32,
    heapUsedMb: 22.1,
    rssMb: 45.2,
  },
};

vi.mock('../../hooks/useJobTaskRunMetrics', () => ({
  useJobTaskRunMetrics: vi.fn(),
}));

const { useJobTaskRunMetrics } =
  await import('../../hooks/useJobTaskRunMetrics');

describe('TaskRunMetricsCard', () => {
  beforeEach(() => {
    vi.mocked(useJobTaskRunMetrics).mockReturnValue({
      error: null,
      job: null,
      loading: true,
    });
  });

  it('renders card with title', () => {
    const { getByTestId } = render(<TaskRunMetricsCard jobId="job-1" />);
    expect(getByTestId('TaskRunMetricsCard')).toBeInTheDocument();
    expect(getByTestId('TaskRunMetricsCard')).toHaveTextContent(
      'Task-run metrics',
    );
  });

  it('shows empty state when jobId is null', () => {
    const { getByTestId } = render(<TaskRunMetricsCard jobId={null} />);
    expect(getByTestId('TaskRunMetricsCard-empty')).toBeInTheDocument();
    expect(getByTestId('TaskRunMetricsCard-empty')).toHaveTextContent(
      'Provide a job ID to load task-run metrics',
    );
  });

  it('shows empty state when jobId is empty string', () => {
    const { getByTestId } = render(<TaskRunMetricsCard jobId="" />);
    expect(getByTestId('TaskRunMetricsCard-empty')).toBeInTheDocument();
  });

  it('shows loading skeletons when loading and no data', () => {
    const { getByTestId } = render(<TaskRunMetricsCard jobId="job-1" />);
    expect(getByTestId('TaskRunMetricsCard-loading')).toBeInTheDocument();
  });

  it('shows error message when error is set', () => {
    vi.mocked(useJobTaskRunMetrics).mockReturnValue({
      error: new Error('GraphQL error 404'),
      job: null,
      loading: false,
    });
    const { getByTestId } = render(<TaskRunMetricsCard jobId="job-1" />);
    expect(getByTestId('TaskRunMetricsCard-error')).toHaveTextContent(
      'GraphQL error 404',
    );
  });

  it('shows no-metrics message when job has no taskRunMetrics', () => {
    vi.mocked(useJobTaskRunMetrics).mockReturnValue({
      error: null,
      job: { id: 'job-1', taskRunMetrics: null },
      loading: false,
    });
    const { getByTestId } = render(<TaskRunMetricsCard jobId="job-1" />);
    expect(getByTestId('TaskRunMetricsCard-no-metrics')).toBeInTheDocument();
    expect(getByTestId('TaskRunMetricsCard-no-metrics')).toHaveTextContent(
      'No metrics for this run',
    );
  });

  it('shows metrics table and interpretation when taskRunMetrics is set', () => {
    vi.mocked(useJobTaskRunMetrics).mockReturnValue({
      error: null,
      job: {
        id: 'job-1',
        taskRunMetrics: mockTaskRunMetrics,
      },
      loading: false,
    });
    const { getByTestId } = render(<TaskRunMetricsCard jobId="job-1" />);
    const table = getByTestId('TaskRunMetricsCard-table');
    expect(table).toBeInTheDocument();
    expect(table).toHaveTextContent('45.20');
    expect(table).toHaveTextContent('52.10');
    expect(table).toHaveTextContent('6.90'); // RSS delta
    expect(table).toHaveTextContent('22.10');
    expect(table).toHaveTextContent('28.30');
    expect(table).toHaveTextContent('6.20'); // heap used delta
    expect(table).toHaveTextContent('120');
    expect(table).toHaveTextContent('450');
    expect(table).toHaveTextContent('330'); // CPU user delta
    expect(table).toHaveTextContent('10');
    expect(table).toHaveTextContent('80');
    expect(table).toHaveTextContent('70'); // CPU system delta

    const interpretation = getByTestId('TaskRunMetricsCard-interpretation');
    expect(interpretation).toBeInTheDocument();
    expect(interpretation).toHaveTextContent('How to interpret');
    expect(interpretation).toHaveTextContent('RSS (start → end)');
    expect(interpretation).toHaveTextContent('CPU user/system delta');
  });

  it('passes apiBaseUrl to useJobTaskRunMetrics', () => {
    render(
      <TaskRunMetricsCard apiBaseUrl="https://api.example.com" jobId="job-1" />,
    );
    expect(useJobTaskRunMetrics).toHaveBeenCalledWith('job-1', {
      apiBaseUrl: 'https://api.example.com',
    });
  });
});

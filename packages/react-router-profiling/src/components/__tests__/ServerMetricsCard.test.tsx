import * as React from 'react';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ServerMetricsCard } from '../ServerMetricsCard';

const mockRefetch = vi.fn().mockResolvedValue(undefined);

vi.mock('../../hooks/use-server-metrics', () => ({
  useServerMetrics: vi.fn(),
}));

const { useServerMetrics } = await import('../../hooks/use-server-metrics');

describe('ServerMetricsCard', () => {
  beforeEach(() => {
    vi.mocked(useServerMetrics).mockReturnValue({
      error: null,
      loading: true,
      refetch: mockRefetch,
      serverMetrics: null,
    });
  });

  it('renders card with title and refresh button', () => {
    const { getByTestId } = render(<ServerMetricsCard />);
    expect(getByTestId('ServerMetricsCard')).toBeInTheDocument();
    expect(getByTestId('ServerMetricsCard')).toHaveTextContent(
      'Server metrics',
    );
    expect(getByTestId('ServerMetricsCard-refresh')).toBeInTheDocument();
  });

  it('shows loading skeletons when loading and no data', () => {
    const { getByTestId } = render(<ServerMetricsCard />);
    expect(getByTestId('ServerMetricsCard-loading')).toBeInTheDocument();
  });

  it('shows error message when error is set', () => {
    vi.mocked(useServerMetrics).mockReturnValue({
      error: new Error('Metrics fetch failed 500'),
      loading: false,
      refetch: mockRefetch,
      serverMetrics: null,
    });
    const { getByTestId } = render(<ServerMetricsCard />);
    expect(getByTestId('ServerMetricsCard-error')).toHaveTextContent(
      'Metrics fetch failed 500',
    );
  });

  it('shows metrics table when serverMetrics is set', () => {
    const metrics = {
      cpuSystemMs: 100,
      cpuUserMs: 500,
      externalMb: 2.5,
      heapTotalMb: 32,
      heapUsedMb: 18.2,
      rssMb: 65.1,
    };
    vi.mocked(useServerMetrics).mockReturnValue({
      error: null,
      loading: false,
      refetch: mockRefetch,
      serverMetrics: metrics,
    });
    const { getByTestId } = render(<ServerMetricsCard />);
    const table = getByTestId('ServerMetricsCard-table');
    expect(table).toBeInTheDocument();
    expect(table).toHaveTextContent('65.10');
    expect(table).toHaveTextContent('18.20');
    expect(table).toHaveTextContent('32.00');
    expect(table).toHaveTextContent('2.50');
    expect(table).toHaveTextContent('500');
    expect(table).toHaveTextContent('100');
  });

  it('calls refetch when Refresh button is clicked', async () => {
    vi.mocked(useServerMetrics).mockReturnValue({
      error: null,
      loading: false,
      refetch: mockRefetch,
      serverMetrics: {
        cpuSystemMs: 0,
        cpuUserMs: 0,
        externalMb: 0,
        heapTotalMb: 0,
        heapUsedMb: 0,
        rssMb: 0,
      },
    });
    const user = userEvent.setup();
    const { getByTestId } = render(<ServerMetricsCard />);
    await user.click(getByTestId('ServerMetricsCard-refresh'));
    await waitFor(() => {
      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
  });

  it('passes apiBaseUrl and intervalMs to useServerMetrics', () => {
    render(
      <ServerMetricsCard
        apiBaseUrl="https://api.example.com"
        intervalMs={30_000}
      />,
    );
    expect(useServerMetrics).toHaveBeenCalledWith({
      apiBaseUrl: 'https://api.example.com',
      intervalMs: 30_000,
    });
  });
});

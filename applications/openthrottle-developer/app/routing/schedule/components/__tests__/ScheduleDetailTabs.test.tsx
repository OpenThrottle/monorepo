import * as React from 'react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router';
import { describe, expect, test } from 'vitest';
import { ScheduleDetailTabs } from '../ScheduleDetailTabs';
import type { ScheduleDetailTabsProps } from '../ScheduleDetailTabs';
import type { ScheduledJobRunRowFragment } from '~/__generated__/graphql';
import {
  renderRoutesStub,
  renderWithMemoryRouter,
} from '~/testing/route-fixtures';

const run = (
  overrides: Partial<ScheduledJobRunRowFragment> = {},
): ScheduledJobRunRowFragment => ({
  __typename: 'ScheduledAgentJobRunObject',
  bullmqJobId: 'run-1',
  cacheReadTokens: null,
  cacheWriteTokens: null,
  costUsd: null,
  createdAt: '2026-07-31T09:00:00.000Z',
  driverId: 'claude',
  errorMessage: null,
  exitCode: 0,
  finishedAt: '2026-07-31T09:01:23.000Z',
  id: 'run-1',
  inputTokens: null,
  model: 'opus',
  outputTokens: null,
  reasoningTokens: null,
  startedAt: '2026-07-31T09:00:00.000Z',
  status: 'succeeded',
  totalTokens: null,
  trigger: 'manual',
  ...overrides,
});

const renderTabs = (
  props: Partial<ScheduleDetailTabsProps> = {},
): RenderResult =>
  renderRoutesStub(
    <ScheduleDetailTabs
      jobId="job-1"
      prompt="Ship the nightly digest."
      runs={[run()]}
      {...props}
    />,
  );

/**
 * Mount the tabs at a real URL so the `tab` search param drives the shell, and
 * expose the live search string so tests can assert what the tabs write back.
 */
const renderTabsAt = (search: string): RenderResult =>
  renderWithMemoryRouter(
    [
      {
        Component: (): React.ReactElement => {
          const location = useLocation();

          return (
            <React.Fragment>
              <span data-testid="search">{location.search}</span>
              <ScheduleDetailTabs
                jobId="job-1"
                prompt="Ship the nightly digest."
                runs={[run()]}
              />
            </React.Fragment>
          );
        },
        path: '/schedule/job-1',
      },
    ],
    { initialEntries: [`/schedule/job-1${search}`] },
  );

describe('ScheduleDetailTabs', () => {
  test('opens on the Prompt tab and shows the prompt', () => {
    const component = renderTabs();

    expect(component.getByText('Ship the nightly digest.')).toBeInTheDocument();
    expect(
      component.queryByTestId('ScheduleRunsTable'),
    ).not.toBeInTheDocument();
  });

  test('reveals the run history table when History is clicked', async () => {
    const user = userEvent.setup();
    const component = renderTabs();

    await user.click(component.getByRole('tab', { name: /history/i }));

    expect(component.getByTestId('ScheduleRunsTable')).toBeInTheDocument();
    expect(
      component.getByText(
        'Logs stream to the queue console keyed by each run.',
      ),
    ).toBeInTheDocument();
  });

  test('renders the empty state instead of the table when there are no runs', async () => {
    const user = userEvent.setup();
    const component = renderTabs({ runs: [] });

    await user.click(component.getByRole('tab', { name: /history/i }));

    expect(
      component.getByText(/No runs yet\. Use “Run now” to trigger one\./),
    ).toBeInTheDocument();
    expect(
      component.queryByTestId('ScheduleRunsTable'),
    ).not.toBeInTheDocument();
  });

  test('deep-links straight to History via ?tab=history', () => {
    const component = renderTabsAt('?tab=history');

    expect(component.getByTestId('ScheduleRunsTable')).toBeInTheDocument();
  });

  test('writes ?tab=history on select and drops the param back on Prompt', async () => {
    const user = userEvent.setup();
    const component = renderTabsAt('');

    // The default tab is canonicalized out of the URL, so it starts empty.
    expect(component.getByTestId('search')).toHaveTextContent('');

    await user.click(component.getByRole('tab', { name: /history/i }));
    expect(component.getByTestId('search')).toHaveTextContent('?tab=history');

    await user.click(component.getByRole('tab', { name: /prompt/i }));
    expect(component.getByTestId('search')).not.toHaveTextContent('tab=');
  });

  test('falls back to Prompt for an unknown tab value', () => {
    const component = renderTabsAt('?tab=bogus');

    expect(component.getByText('Ship the nightly digest.')).toBeInTheDocument();
    expect(
      component.queryByTestId('ScheduleRunsTable'),
    ).not.toBeInTheDocument();
  });
});

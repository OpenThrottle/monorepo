import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { SCHEDULE_WEBHOOK_COPY } from '~/routing/schedule/data/data.copy';
import { renderRoutesStub } from '~/testing/route-fixtures';
import { scheduleWebhookDeliveryFixture } from '~/testing/schedule-fixtures';

import Component from '../schedule.$jobId.deliveries';

function stubMatches(): React.ComponentProps<typeof Component>['matches'];
function stubMatches(): unknown {
  return [];
}

describe('routes/schedule.$jobId.deliveries.tsx', () => {
  test('renders the heading, the job and the delivery log', () => {
    const view = renderRoutesStub(
      <Component
        actionData={undefined}
        loaderData={{
          deliveries: [scheduleWebhookDeliveryFixture()],
          job: {
            __typename: 'ScheduledAgentJobObject',
            id: 'job-1',
            name: 'Nightly audit',
          },
        }}
        matches={stubMatches()}
        params={{ jobId: 'job-1' }}
      />,
    );

    expect(
      view.getByRole('heading', {
        level: 1,
        name: SCHEDULE_WEBHOOK_COPY.deliveriesHeading,
      }),
    ).toBeInTheDocument();
    expect(view.getByText('Nightly audit')).toBeInTheDocument();
    expect(view.getByTestId('ScheduleWebhookDeliveries')).toBeInTheDocument();
    expect(
      view.getByRole('link', { name: SCHEDULE_WEBHOOK_COPY.deliveriesBack }),
    ).toHaveAttribute('href', '/schedule/job-1?tab=webhook');
  });
});

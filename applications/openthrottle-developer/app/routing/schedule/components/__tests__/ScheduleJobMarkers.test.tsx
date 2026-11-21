import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { SCHEDULE_APPROVAL_COPY } from '~/routing/schedule/data/data.copy';
import { renderRoutesStub } from '~/testing/route-fixtures';

import { ScheduleJobMarkers } from '../ScheduleJobMarkers';

describe('ScheduleJobMarkers Component', () => {
  test('renders nothing for a job made in the UI that needs no approval', () => {
    const view = renderRoutesStub(
      <ScheduleJobMarkers
        job={{ approvalState: 'not_required', createdVia: 'ui' }}
      />,
    );

    expect(view.queryByTestId('ScheduleJobMarkers')).not.toBeInTheDocument();
  });

  test('marks an agent-created job that is already approved', () => {
    const view = renderRoutesStub(
      <ScheduleJobMarkers
        job={{ approvalState: 'approved', createdVia: 'mcp' }}
      />,
    );

    expect(
      view.getByText(SCHEDULE_APPROVAL_COPY.agentCreatedBadge),
    ).toBeInTheDocument();
    expect(
      view.queryByText(SCHEDULE_APPROVAL_COPY.awaitingBadge),
    ).not.toBeInTheDocument();
  });

  test('says a pending job is awaiting approval', () => {
    const view = renderRoutesStub(
      <ScheduleJobMarkers
        job={{ approvalState: 'pending', createdVia: 'mcp' }}
      />,
    );

    expect(
      view.getByText(SCHEDULE_APPROVAL_COPY.agentCreatedBadge),
    ).toBeInTheDocument();
    expect(
      view.getByText(SCHEDULE_APPROVAL_COPY.awaitingBadge),
    ).toBeInTheDocument();
  });
});

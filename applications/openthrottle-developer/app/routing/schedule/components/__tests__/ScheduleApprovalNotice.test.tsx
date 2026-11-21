import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { SCHEDULE_APPROVAL_COPY } from '~/routing/schedule/data/data.copy';
import { renderRoutesStub } from '~/testing/route-fixtures';

import { ScheduleApprovalNotice } from '../ScheduleApprovalNotice';

describe('ScheduleApprovalNotice Component', () => {
  describe('when the job is pending', () => {
    test('explains the gate and offers Approve', () => {
      const view = renderRoutesStub(
        <ScheduleApprovalNotice
          job={{ approvalState: 'pending', id: 'job-1' }}
        />,
      );

      expect(view.getByRole('status')).toHaveTextContent(
        SCHEDULE_APPROVAL_COPY.awaitingDescription,
      );
      expect(
        view.getByRole('button', {
          name: SCHEDULE_APPROVAL_COPY.approveAction,
        }),
      ).toBeInTheDocument();
    });
  });

  describe('when the job is not pending', () => {
    test.each(['approved', 'not_required'])(
      'renders nothing for %s',
      (state) => {
        const view = renderRoutesStub(
          <ScheduleApprovalNotice
            job={{ approvalState: state, id: 'job-1' }}
          />,
        );

        expect(view.queryByRole('status')).not.toBeInTheDocument();
      },
    );
  });
});

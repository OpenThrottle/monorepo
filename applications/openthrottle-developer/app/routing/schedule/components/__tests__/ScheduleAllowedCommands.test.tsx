import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { SCHEDULE_APPROVAL_COPY } from '~/routing/schedule/data/data.copy';
import { renderRoutesStub } from '~/testing/route-fixtures';

import { ScheduleAllowedCommands } from '../ScheduleAllowedCommands';

describe('ScheduleAllowedCommands Component', () => {
  describe('when the job has allowed commands', () => {
    test('lists each command', () => {
      const view = renderRoutesStub(
        <ScheduleAllowedCommands
          job={{
            allowedCommands: [
              'pnpm run social:x-post *',
              'pnpm run social:x-metrics *',
            ],
          }}
        />,
      );

      const list = view.getByRole('list', {
        name: SCHEDULE_APPROVAL_COPY.allowedCommandsLabel,
      });
      expect(list.querySelectorAll('li')).toHaveLength(2);
      expect(list).toHaveTextContent('pnpm run social:x-post *');
    });
  });

  describe('when the list is empty', () => {
    test('renders nothing', () => {
      const view = renderRoutesStub(
        <ScheduleAllowedCommands job={{ allowedCommands: [] }} />,
      );

      expect(
        view.queryByTestId('ScheduleAllowedCommands'),
      ).not.toBeInTheDocument();
    });
  });
});

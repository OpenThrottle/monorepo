import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { ScheduleForm } from './ScheduleForm';
import type { ScheduleFormProps } from './ScheduleForm';

const ScheduleListStub = (): React.ReactElement => <p>Schedule list</p>;

const renderForm = (formProps: ScheduleFormProps): RenderResult => {
  // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
  const Component = () => <ScheduleForm {...formProps} />;
  const RoutesStub = createRoutesStub([
    { Component, path: '/' },
    { Component: ScheduleListStub, path: '/schedule' },
  ]);

  return render(<RoutesStub />);
};

describe('ScheduleForm Component', () => {
  let component: RenderResult;

  describe('create mode', () => {
    beforeEach(() => {
      component = renderForm({ action: 'create' });
    });

    test('renders the form with blank fields and a Create button', () => {
      expect(component.getByTestId('ScheduleForm')).toBeInTheDocument();
      expect(component.getByLabelText('Name')).toHaveValue('');
      expect(component.getByLabelText('Prompt')).toHaveValue('');
      expect(
        component.getByRole('button', { name: 'Create schedule' }),
      ).toBeInTheDocument();
    });

    test('renders a Cancel link back to /schedule', () => {
      expect(component.getByRole('link', { name: 'Cancel' })).toHaveAttribute(
        'href',
        '/schedule',
      );
    });

    test('defaults Enabled to checked', () => {
      expect(component.getByLabelText('Enabled')).toBeChecked();
    });

    test('renders no error alert when no error is passed', () => {
      expect(component.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('update mode', () => {
    const job: NonNullable<ScheduleFormProps['job']> = {
      __typename: 'ScheduledAgentJobObject',
      createdAt: '2026-08-01T00:00:00.000Z',
      cronPattern: '0 9 * * *',
      cwd: '/repo',
      driverId: 'claude',
      enabled: false,
      id: 'job-1',
      lastRunAt: null,
      model: 'opus',
      name: 'Nightly audit',
      nextRunAt: null,
      prompt: 'Audit dependencies.',
      settingsJson: '{}',
      timeoutMs: 900000,
      timezone: 'America/Los_Angeles',
      updatedAt: '2026-08-01T00:00:00.000Z',
    };

    beforeEach(() => {
      component = renderForm({ action: 'update', job });
    });

    test('pre-fills fields from the job and shows Save changes', () => {
      expect(component.getByLabelText('Name')).toHaveValue('Nightly audit');
      expect(component.getByLabelText('Prompt')).toHaveValue(
        'Audit dependencies.',
      );
      expect(component.getByLabelText('Model (optional)')).toHaveValue('opus');
      expect(component.getByLabelText('Schedule (cron)')).toHaveValue(
        '0 9 * * *',
      );
      expect(component.getByLabelText('Timezone (optional)')).toHaveValue(
        'America/Los_Angeles',
      );
      expect(
        component.getByLabelText('Working directory (optional)'),
      ).toHaveValue('/repo');
      expect(
        component.getByRole('button', { name: 'Save changes' }),
      ).toBeInTheDocument();
    });

    test('reflects the job disabled state', () => {
      expect(component.getByLabelText('Enabled')).not.toBeChecked();
    });

    test('blanks the settings JSON field when it is the empty-object default', () => {
      expect(component.getByLabelText('Settings JSON (optional)')).toHaveValue(
        '',
      );
    });
  });

  test('surfaces an action-level error', () => {
    component = renderForm({ action: 'create', error: 'Invalid cron.' });

    expect(component.getByRole('alert')).toHaveTextContent('Invalid cron.');
  });
});

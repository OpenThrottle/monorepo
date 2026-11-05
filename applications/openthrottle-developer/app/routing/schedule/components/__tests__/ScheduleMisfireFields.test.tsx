import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { SCHEDULE_COPY } from '~/routing/schedule/data/data.copy';
import { SCHEDULE_MISFIRE_POLICY_OPTIONS } from '~/routing/schedule/data/data.misfire';

import { ScheduleMisfireFields } from '../ScheduleMisfireFields';

const optionLabel = (value: string): string | undefined => {
  return SCHEDULE_MISFIRE_POLICY_OPTIONS.find(
    (option) => option.value === value,
  )?.label;
};

describe('ScheduleMisfireFields Component', () => {
  let component: RenderResult;

  describe('when the schedule has no policy yet', () => {
    test('defaults to skipping late runs with a ten-minute grace period', () => {
      component = render(
        <ScheduleMisfireFields
          misfirePolicy={undefined}
          misfireThresholdMs={undefined}
        />,
      );

      expect(
        component.getByRole('combobox', {
          name: SCHEDULE_COPY.misfirePolicyLabel,
        }),
      ).toHaveTextContent(optionLabel('skip') ?? '');
      expect(
        component.getByLabelText(SCHEDULE_COPY.misfireThresholdLabel),
      ).toHaveValue(10);
    });
  });

  describe('when the schedule has a policy', () => {
    test('shows it, with the grace period in minutes', () => {
      component = render(
        <ScheduleMisfireFields
          misfirePolicy="catch_up_once"
          misfireThresholdMs={30 * 60_000}
        />,
      );

      expect(
        component.getByRole('combobox', {
          name: SCHEDULE_COPY.misfirePolicyLabel,
        }),
      ).toHaveTextContent(optionLabel('catch_up_once') ?? '');
      expect(
        component.getByLabelText(SCHEDULE_COPY.misfireThresholdLabel),
      ).toHaveAttribute('name', 'misfireThresholdMinutes');
      expect(
        component.getByLabelText(SCHEDULE_COPY.misfireThresholdLabel),
      ).toHaveValue(30);
    });
  });
});

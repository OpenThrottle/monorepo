import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { SCHEDULE_WEBHOOK_SIGNING_COPY } from '~/routing/schedule/data/copy';

import { ScheduleWebhookSigningGuide } from '../ScheduleWebhookSigningGuide';

describe('ScheduleWebhookSigningGuide Component', () => {
  test.each(['custom', 'generic', 'github'] as const)(
    'shows the %s signing steps',
    (preset) => {
      const component = render(<ScheduleWebhookSigningGuide preset={preset} />);
      const guide = SCHEDULE_WEBHOOK_SIGNING_COPY[preset];

      expect(
        component.getByRole('heading', { name: guide.heading }),
      ).toBeInTheDocument();
      expect(component.getAllByRole('listitem')).toHaveLength(
        guide.steps.length,
      );
    },
  );

  test('falls back to the generic steps for an unknown preset', () => {
    const component = render(<ScheduleWebhookSigningGuide preset="other" />);

    expect(
      component.getByRole('heading', {
        name: SCHEDULE_WEBHOOK_SIGNING_COPY.generic.heading,
      }),
    ).toBeInTheDocument();
  });
});

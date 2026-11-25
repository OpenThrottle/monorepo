import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { SCHEDULE_WEBHOOK_COPY } from '~/routing/schedule/data/copy';

import { ScheduleWebhookRenderedPrompt } from '../ScheduleWebhookRenderedPrompt';

describe('ScheduleWebhookRenderedPrompt Component', () => {
  describe('when no prompt was rendered', () => {
    test('says so and offers no toggle', () => {
      const component = render(<ScheduleWebhookRenderedPrompt prompt={null} />);

      expect(
        component.getByText(SCHEDULE_WEBHOOK_COPY.deliveriesNoPrompt),
      ).toBeInTheDocument();
      expect(component.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('when there is a prompt', () => {
    test('is collapsed until toggled, then shows the prompt verbatim', async () => {
      const user = userEvent.setup();
      const prompt = 'Review PR 12\n  indented line';
      const component = render(
        <ScheduleWebhookRenderedPrompt prompt={prompt} />,
      );
      const toggle = component.getByRole('button', {
        name: SCHEDULE_WEBHOOK_COPY.deliveriesPromptShow,
      });

      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      expect(
        component.queryByTestId('ScheduleWebhookRenderedPromptText'),
      ).not.toBeInTheDocument();

      await user.click(toggle);

      const text = component.getByTestId('ScheduleWebhookRenderedPromptText');
      expect(text.textContent).toBe(prompt);
      expect(text.className).toContain('whitespace-pre-wrap');
      expect(
        component.getByRole('button', {
          name: SCHEDULE_WEBHOOK_COPY.deliveriesPromptHide,
        }),
      ).toHaveAttribute('aria-expanded', 'true');
    });
  });
});

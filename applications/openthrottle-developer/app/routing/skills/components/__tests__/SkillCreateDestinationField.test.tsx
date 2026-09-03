import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import type { SkillCreateDestination } from '~/routing/skills/config/skill-create';
import { SKILL_CREATE_DESTINATIONS } from '~/routing/skills/config/skill-create';
import { SKILL_CREATE_COPY } from '~/routing/skills/data/data.copy';
import { SkillCreateDestinationField } from '../SkillCreateDestinationField';

const renderField = (
  destination: SkillCreateDestination = SKILL_CREATE_DESTINATIONS.personal,
  betaPreviewEnabled = true,
): { component: RenderResult; onChange: ReturnType<typeof vi.fn> } => {
  const onChange = vi.fn();
  const component = render(
    <SkillCreateDestinationField
      betaPreviewEnabled={betaPreviewEnabled}
      onChange={onChange}
      value={destination}
    />,
  );

  return { component, onChange };
};

describe('SkillCreateDestinationField Component', () => {
  test('states the consequence of the selected destination, not just its name', () => {
    const { component } = renderField();

    expect(
      component.getByText(SKILL_CREATE_COPY.destinationPersonalDescription),
    ).toBeInTheDocument();
  });

  test('swaps the consequence copy with the selection', () => {
    const { component } = renderField(SKILL_CREATE_DESTINATIONS.openthrottle);

    expect(
      component.getByText(SKILL_CREATE_COPY.destinationOpenThrottleDescription),
    ).toBeInTheDocument();
  });

  test('reports the chosen destination', async () => {
    const user = userEvent.setup();
    const { component, onChange } = renderField();

    await user.click(
      component.getByRole('radio', {
        name: SKILL_CREATE_COPY.destinationOpenThrottleLabel,
      }),
    );

    expect(onChange).toHaveBeenCalledWith(
      SKILL_CREATE_DESTINATIONS.openthrottle,
    );
  });

  // The OpenThrottle catalog is only meaningful when working ON OpenThrottle,
  // so it is gated. Personal and this-repository are always offered; Personal
  // stays the default either way, so the initial render is unchanged.
  describe('the FEATURE_BETA_PREVIEW gate', () => {
    test('offers all three destinations when the flag is on', () => {
      const { component } = renderField();

      expect(
        component.getByRole('radio', {
          name: SKILL_CREATE_COPY.destinationPersonalLabel,
        }),
      ).toBeInTheDocument();
      expect(
        component.getByRole('radio', {
          name: SKILL_CREATE_COPY.destinationCustomLabel,
        }),
      ).toBeInTheDocument();
      expect(
        component.getByRole('radio', {
          name: SKILL_CREATE_COPY.destinationOpenThrottleLabel,
        }),
      ).toBeInTheDocument();
    });

    test('hides the OpenThrottle catalog when the flag is off', () => {
      const { component } = renderField(
        SKILL_CREATE_DESTINATIONS.personal,
        false,
      );

      expect(
        component.queryByRole('radio', {
          name: SKILL_CREATE_COPY.destinationOpenThrottleLabel,
        }),
      ).not.toBeInTheDocument();
      // The other two are untouched.
      expect(
        component.getByRole('radio', {
          name: SKILL_CREATE_COPY.destinationPersonalLabel,
        }),
      ).toBeInTheDocument();
      expect(
        component.getByRole('radio', {
          name: SKILL_CREATE_COPY.destinationCustomLabel,
        }),
      ).toBeInTheDocument();
    });
  });

  // Radix emits '' when the active item is clicked again; clearing the
  // destination entirely would leave the form with nowhere to write.
  test('keeps the current selection when the active item is re-clicked', async () => {
    const user = userEvent.setup();
    const { component, onChange } = renderField();

    await user.click(
      component.getByRole('radio', {
        name: SKILL_CREATE_COPY.destinationPersonalLabel,
      }),
    );

    expect(onChange).not.toHaveBeenCalled();
  });
});

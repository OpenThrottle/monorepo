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
): { component: RenderResult; onChange: ReturnType<typeof vi.fn> } => {
  const onChange = vi.fn();
  const component = render(
    <SkillCreateDestinationField onChange={onChange} value={destination} />,
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
    const { component } = renderField(SKILL_CREATE_DESTINATIONS.repo);

    expect(
      component.getByText(SKILL_CREATE_COPY.destinationRepoDescription),
    ).toBeInTheDocument();
  });

  test('reports the chosen destination', async () => {
    const user = userEvent.setup();
    const { component, onChange } = renderField();

    await user.click(
      component.getByRole('radio', {
        name: SKILL_CREATE_COPY.destinationRepoLabel,
      }),
    );

    expect(onChange).toHaveBeenCalledWith(SKILL_CREATE_DESTINATIONS.repo);
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

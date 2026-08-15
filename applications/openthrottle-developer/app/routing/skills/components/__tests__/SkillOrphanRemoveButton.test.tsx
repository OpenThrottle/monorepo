import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { SKILL_RECORD_TAGS_COPY } from '~/routing/skills/data/data.copy';
import { SkillOrphanRemoveButton } from '../SkillOrphanRemoveButton';
import type { SkillOrphanRemoveButtonProps } from '../SkillOrphanRemoveButton';

describe('SkillOrphanRemoveButton Component', () => {
  let component: RenderResult;
  let props: SkillOrphanRemoveButtonProps;

  beforeEach(() => {
    props = { onRemove: vi.fn() };
    component = render(<SkillOrphanRemoveButton {...props} />);
  });

  test('renders the suggest-remove label from copy', () => {
    expect(
      component.getByTestId('SkillOrphanRemoveButton'),
    ).toBeInTheDocument();
    expect(
      component.getByRole('button', {
        name: SKILL_RECORD_TAGS_COPY.orphanRemoveLabel,
      }),
    ).toBeInTheDocument();
  });

  test('invokes onRemove when clicked', async () => {
    const user = userEvent.setup();

    await user.click(
      component.getByRole('button', {
        name: SKILL_RECORD_TAGS_COPY.orphanRemoveLabel,
      }),
    );

    expect(props.onRemove).toHaveBeenCalledTimes(1);
  });
});

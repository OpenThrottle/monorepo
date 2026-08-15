import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { SKILL_RECORD_TAGS_COPY } from '~/routing/skills/data/data.copy';
import { SkillTagChips } from '../SkillTagChips';
import type { SkillTagChipsProps } from '../SkillTagChips';

describe('SkillTagChips Component', () => {
  let component: RenderResult;
  let props: SkillTagChipsProps;

  beforeEach(() => {
    props = {
      onAddTag: vi.fn(),
      onRemoveTag: vi.fn(),
      tags: ['github'],
      vocabulary: [
        { dimension: 'domain', tag: 'github' },
        { dimension: 'domain', tag: 'terraform' },
        { dimension: 'phase', tag: 'breakdown' },
      ],
    };

    component = render(<SkillTagChips {...props} />);
  });

  test('renders applied domain tags and hides already-applied options', () => {
    expect(component.getByTestId('SkillTagChips')).toBeInTheDocument();
    expect(component.getByText('github')).toBeInTheDocument();
    expect(
      component.queryByRole('option', { name: 'github' }),
    ).not.toBeInTheDocument();
    expect(
      component.queryByRole('option', { name: 'breakdown' }),
    ).not.toBeInTheDocument();
  });

  test('adds a remaining domain vocabulary tag', async () => {
    const user = userEvent.setup();
    const select = component.getByLabelText(SKILL_RECORD_TAGS_COPY.addTagLabel);

    await user.selectOptions(select, 'terraform');
    await user.click(
      component.getByRole('button', { name: SKILL_RECORD_TAGS_COPY.addLabel }),
    );

    expect(props.onAddTag).toHaveBeenCalledWith('terraform');
  });

  test('removes an applied tag', async () => {
    const user = userEvent.setup();

    await user.click(component.getByLabelText('Remove tag github'));

    expect(props.onRemoveTag).toHaveBeenCalledWith('github');
  });

  test('shows empty copy when no tags are applied', () => {
    component.unmount();
    component = render(<SkillTagChips {...props} tags={[]} />);

    expect(
      component.getByText(SKILL_RECORD_TAGS_COPY.emptyTags),
    ).toBeInTheDocument();
  });
});

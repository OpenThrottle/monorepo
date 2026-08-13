import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { RuleFormActionSection } from '../RuleFormActionSection';
import type { RuleFormActionSectionProps } from '../RuleFormActionSection';
import { RULES_COPY } from '~/routing/rules/data/data.copy';

const buildProps = (
  overrides: Partial<RuleFormActionSectionProps> = {},
): RuleFormActionSectionProps => ({
  actionType: 'inject-task',
  onActionTypeChange: vi.fn(),
  onPlacementChange: vi.fn(),
  onSkillSlugChange: vi.fn(),
  onSlugAllowChange: vi.fn(),
  onSlugDenyChange: vi.fn(),
  onTagAllowChange: vi.fn(),
  onTagDenyChange: vi.fn(),
  onTitleTemplateChange: vi.fn(),
  placement: 'first',
  skillSlug: 'my-skill',
  skillSlugs: ['my-skill', 'other-skill'],
  slugAllow: '',
  slugDeny: '',
  tagAllow: '',
  tagDeny: '',
  titleTemplate: '',
  ...overrides,
});

describe('RuleFormActionSection Component', () => {
  let component: RenderResult;
  let props: RuleFormActionSectionProps;

  beforeEach(() => {
    props = buildProps();
    component = render(<RuleFormActionSection {...props} />);
  });

  test('renders the action legend and description', () => {
    expect(component.getByText(RULES_COPY.actionLegend)).toBeInTheDocument();
    expect(
      component.getByText(RULES_COPY.actionDescription),
    ).toBeInTheDocument();
  });

  test('shows the inject-task fields when actionType is inject-task', () => {
    expect(component.getByLabelText(RULES_COPY.skillLabel)).toBeInTheDocument();
    expect(
      component.getByLabelText(RULES_COPY.placementLabel),
    ).toBeInTheDocument();
    expect(component.getByLabelText('Title template')).toBeInTheDocument();
  });

  test('shows the availability-exception fields when actionType changes', () => {
    props = buildProps({ actionType: 'availability-exception' });
    component = render(<RuleFormActionSection {...props} />);

    expect(component.getByLabelText('Tag allow list')).toBeInTheDocument();
    expect(component.getByLabelText('Tag deny list')).toBeInTheDocument();
    expect(component.getByLabelText('Slug allow list')).toBeInTheDocument();
    expect(component.getByLabelText('Slug deny list')).toBeInTheDocument();
  });

  test('calls onTitleTemplateChange when the title template input changes', async () => {
    const onTitleTemplateChange = vi.fn();
    const user = userEvent.setup();
    component.unmount();
    component = render(
      <RuleFormActionSection {...buildProps({ onTitleTemplateChange })} />,
    );

    await user.type(component.getByLabelText('Title template'), 'x');

    expect(onTitleTemplateChange).toHaveBeenCalled();
  });

  test('calls onTagAllowChange when the tag allow input changes', async () => {
    const onTagAllowChange = vi.fn();
    const user = userEvent.setup();
    component = render(
      <RuleFormActionSection
        {...buildProps({
          actionType: 'availability-exception',
          onTagAllowChange,
        })}
      />,
    );

    await user.type(component.getByLabelText('Tag allow list'), 'x');

    expect(onTagAllowChange).toHaveBeenCalled();
  });
});

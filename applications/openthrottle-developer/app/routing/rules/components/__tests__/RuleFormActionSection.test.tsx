import type { RenderResult } from '@testing-library/react';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { RULES_COPY } from '~/routing/rules/data/data.copy';

import type { RuleFormActionSectionProps } from '../RuleFormActionSection';
import { RuleFormActionSection } from '../RuleFormActionSection';

const buildProps = (
  overrides: Partial<RuleFormActionSectionProps> = {},
): RuleFormActionSectionProps => {
  return {
    actionType: 'inject-task',
    attachPrompt: {
      filePath: '',
      onPlacementChange: vi.fn(),
      onPromptChange: vi.fn(),
      placement: 'end',
      promptId: '',
    },
    onActionTypeChange: vi.fn(),
    onPlacementChange: vi.fn(),
    onSkillSlugChange: vi.fn(),
    onSlugAllowChange: vi.fn(),
    onSlugDenyChange: vi.fn(),
    onTagAllowChange: vi.fn(),
    onTagDenyChange: vi.fn(),
    onTitleTemplateChange: vi.fn(),
    placement: 'first',
    promptOptions: [],
    skillSlug: 'my-skill',
    skillSlugs: ['my-skill', 'other-skill'],
    slugAllow: '',
    slugDeny: '',
    tagAllow: '',
    tagDeny: '',
    titleTemplate: '',
    ...overrides,
  };
};

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

  describe('attach-prompt', () => {
    const promptOptions = [
      {
        id: 'prompt-1',
        owner: 'yours',
        promptType: 'prompts',
        title: 'Release checklist',
      },
      {
        id: 'prompt-2',
        owner: 'system',
        promptType: 'personas',
        title: 'Reviewer',
      },
    ] as const;

    const renderAttach = (
      overrides: Partial<RuleFormActionSectionProps> = {},
    ): RenderResult => {
      const attachProps = buildProps({
        actionType: 'attach-prompt',
        promptOptions,
        ...overrides,
      });
      const Component = () => {
        return <RuleFormActionSection {...attachProps} />;
      };
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

      return render(<RoutesStub />);
    };

    test('shows the prompt picker and placement, not the other payload fields', async () => {
      component.unmount();
      component = renderAttach();

      expect(
        await component.findByRole('combobox', {
          name: RULES_COPY.promptLabel,
        }),
      ).toBeInTheDocument();
      expect(
        component.getByLabelText(RULES_COPY.attachPromptPlacementLabel),
      ).toBeInTheDocument();
      expect(component.queryByLabelText(RULES_COPY.skillLabel)).toBeNull();
      expect(component.queryByLabelText('Tag allow list')).toBeNull();
    });

    test('lists each prompt with its owner and reports the chosen id and type', async () => {
      const onPromptChange = vi.fn();
      const user = userEvent.setup();
      component.unmount();
      component = renderAttach({
        attachPrompt: {
          filePath: '',
          onPlacementChange: vi.fn(),
          onPromptChange,
          placement: 'end',
          promptId: '',
        },
      });

      await user.click(
        await component.findByRole('combobox', {
          name: RULES_COPY.promptLabel,
        }),
      );
      const yours = await component.findByRole('option', {
        name: new RegExp(
          `Release checklist \\(${RULES_COPY.promptOwnerYours}\\)`,
        ),
      });
      expect(
        component.getByRole('option', {
          name: new RegExp(`Reviewer \\(${RULES_COPY.promptOwnerSystem}\\)`),
        }),
      ).toBeInTheDocument();

      await user.click(yours);

      await waitFor(() => {
        expect(onPromptChange).toHaveBeenCalledWith('prompt-1', 'prompts');
      });
    });

    test('filters the picker by the search text', async () => {
      const user = userEvent.setup();
      component.unmount();
      component = renderAttach();

      await user.click(
        await component.findByRole('combobox', {
          name: RULES_COPY.promptLabel,
        }),
      );
      await user.type(
        await component.findByPlaceholderText(
          RULES_COPY.promptSearchPlaceholder,
        ),
        'Reviewer',
      );

      await waitFor(() => {
        expect(component.queryByRole('option', { name: /Release/ })).toBeNull();
      });
      expect(
        component.getByRole('option', { name: /Reviewer/ }),
      ).toBeInTheDocument();
    });

    test('links to /prompts/create instead of a dead select when there are no prompts', async () => {
      component.unmount();
      component = renderAttach({ promptOptions: [] });

      const link = await component.findByRole('link', {
        name: RULES_COPY.promptEmptyAction,
      });

      expect(link).toHaveAttribute('href', '/prompts/create');
      expect(
        component.queryByRole('combobox', { name: RULES_COPY.promptLabel }),
      ).toBeNull();
    });

    test('shows a not-available notice for a prompt id that is no longer visible', async () => {
      component.unmount();
      component = renderAttach({
        attachPrompt: {
          filePath: '',
          onPlacementChange: vi.fn(),
          onPromptChange: vi.fn(),
          placement: 'end',
          promptId: 'gone',
        },
      });

      expect(
        await component.findByText(RULES_COPY.promptNotAvailableTitle),
      ).toBeInTheDocument();
    });

    test('shows a not-available notice naming a legacy file path reference', async () => {
      component.unmount();
      component = renderAttach({
        attachPrompt: {
          filePath: '.agents/prompts/x.md',
          onPlacementChange: vi.fn(),
          onPromptChange: vi.fn(),
          placement: 'end',
          promptId: '',
        },
      });

      expect(
        await component.findByText('.agents/prompts/x.md'),
      ).toBeInTheDocument();
      expect(
        component.getByText(RULES_COPY.promptNotAvailableTitle),
      ).toBeInTheDocument();
    });

    test('shows no notice when the saved prompt is visible', async () => {
      component.unmount();
      component = renderAttach({
        attachPrompt: {
          filePath: '',
          onPlacementChange: vi.fn(),
          onPromptChange: vi.fn(),
          placement: 'start',
          promptId: 'prompt-1',
        },
      });

      expect(
        await component.findByRole('combobox', {
          name: RULES_COPY.promptLabel,
        }),
      ).toHaveTextContent('Release checklist');
      expect(
        component.queryByText(RULES_COPY.promptNotAvailableTitle),
      ).toBeNull();
    });
  });
});

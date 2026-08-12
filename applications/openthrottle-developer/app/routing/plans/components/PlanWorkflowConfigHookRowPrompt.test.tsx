import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { PlanWorkflowConfigHookRowPrompt } from './PlanWorkflowConfigHookRowPrompt';
import type { PlanWorkflowConfigHookRowPromptProps } from './PlanWorkflowConfigHookRowPrompt';
import type { JobRunHookDraftRow } from '~/routing/plans/utils/job-run-hooks-ui';

const namedRow: JobRunHookDraftRow = {
  draftId: 'row-named',
  kind: 'prompt_profile',
  phase: 'before_run',
  prompt: 'Ship the feature',
  promptDelivery: 'named',
};

const fileRow: JobRunHookDraftRow = {
  draftId: 'row-file',
  kind: 'prompt_profile',
  phase: 'before_run',
  promptDelivery: 'file',
  promptFile: 'prompts/preflight.md',
};

const skillRow: JobRunHookDraftRow = {
  draftId: 'row-skill',
  kind: 'skill',
  phase: 'after_run',
  skillPath: '.agents/skills/validate-plan/SKILL.md',
};

describe('PlanWorkflowConfigHookRowPrompt Component', () => {
  let component: RenderResult;
  let props: PlanWorkflowConfigHookRowPromptProps;

  beforeEach(() => {
    props = {
      onPromptChange: vi.fn(),
      onPromptFileChange: vi.fn(),
      onSkillPathChange: vi.fn(),
      onUseFileDelivery: vi.fn(),
      onUseNamedProfile: vi.fn(),
      row: namedRow,
    };
  });

  test('renders the named-prompt input and switches to file delivery', async () => {
    component = render(<PlanWorkflowConfigHookRowPrompt {...props} />);

    const input = component.getByLabelText('Named prompt (--prompt)');

    expect(input).toHaveValue(namedRow.prompt);

    await userEvent.click(component.getByRole('button', { name: 'Use file' }));

    expect(props.onUseFileDelivery).toHaveBeenCalledTimes(1);
  });

  test('renders the prompt-file input with a use-named-profile action', async () => {
    component = render(
      <PlanWorkflowConfigHookRowPrompt {...props} row={fileRow} />,
    );

    expect(component.getByLabelText('Prompt file')).toHaveValue(
      fileRow.promptFile,
    );

    await userEvent.click(
      component.getByRole('button', { name: 'Use named profile' }),
    );

    expect(props.onUseNamedProfile).toHaveBeenCalledTimes(1);
  });

  test('renders the skill-path input for skill rows without a delivery toggle', () => {
    component = render(
      <PlanWorkflowConfigHookRowPrompt {...props} row={skillRow} />,
    );

    expect(component.getByLabelText('Skill path')).toHaveValue(
      skillRow.skillPath,
    );
    expect(
      component.queryByRole('button', { name: 'Use named profile' }),
    ).toBeNull();
  });
});

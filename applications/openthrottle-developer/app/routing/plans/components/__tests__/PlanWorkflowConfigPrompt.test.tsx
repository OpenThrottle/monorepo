import * as React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { PlanWorkflowConfigPrompt } from '../PlanWorkflowConfigPrompt';
import type { PlanWorkflowConfigPromptProps } from '../PlanWorkflowConfigPrompt';
import { DEFAULT_RALPH_PROMPT } from '~/routing/plans/utils/build-workflow-ralph-argv';

describe('PlanWorkflowConfigPrompt Component', () => {
  let props: PlanWorkflowConfigPromptProps;

  beforeEach(() => {
    props = {
      onPromptChange: vi.fn(),
      prompt: '',
    };
  });

  test('should render Layer 1 prompt profile fieldset', () => {
    const Component = () => <PlanWorkflowConfigPrompt {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    expect(
      component.getByTestId('PlanWorkflowConfigPrompt'),
    ).toBeInTheDocument();
    expect(
      component.getByRole('group', { name: 'Layer 1 — Prompt profile' }),
    ).toBeInTheDocument();
    expect(
      component.getByLabelText('Prompt profile for --prompt'),
    ).toBeInTheDocument();
    expect(component.getByText('Layer 1 — Prompt profile')).toBeInTheDocument();
    expect(
      component.getByText(
        'Omitted from the command when equal to the default.',
      ),
    ).toBeInTheDocument();
  });

  test('should call onPromptChange when prompt input changes', async () => {
    const user = userEvent.setup();
    const onPromptChange = vi.fn();
    props = { onPromptChange, prompt: '' };

    const Component = () => <PlanWorkflowConfigPrompt {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { getByLabelText } = render(<RoutesStub />);

    await user.type(
      getByLabelText('Prompt profile for --prompt'),
      'agents/ralph',
    );

    expect(onPromptChange).toHaveBeenCalled();
    expect(onPromptChange.mock.calls.map((c) => c[0]).join('')).toBe(
      'agents/ralph',
    );
  });

  test('should show placeholder from DEFAULT_RALPH_PROMPT when prompt is empty', () => {
    props = { onPromptChange: vi.fn(), prompt: '' };

    const Component = () => <PlanWorkflowConfigPrompt {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { getByLabelText } = render(<RoutesStub />);

    expect(getByLabelText('Prompt profile for --prompt')).toHaveAttribute(
      'placeholder',
      DEFAULT_RALPH_PROMPT,
    );
  });
});

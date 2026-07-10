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
      heading: '04. Prompt',
      onPromptChange: vi.fn(),
      onPromptFileChange: vi.fn(),
      onPromptLayerChange: vi.fn(),
      prompt: '',
      promptFile: '',
      promptLayer: 'named',
    };
  });

  test('should render prompt profile fieldset', () => {
    const Component = () => <PlanWorkflowConfigPrompt {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    expect(
      component.getByTestId('PlanWorkflowConfigPrompt'),
    ).toBeInTheDocument();
    expect(
      component.getByLabelText('Prompt profile for --prompt'),
    ).toBeInTheDocument();
    expect(
      component.getByText(
        'Omitted from the command when equal to the default.',
      ),
    ).toBeInTheDocument();
  });

  test('should call onPromptChange when prompt input changes', async () => {
    const user = userEvent.setup();
    const onPromptChange = vi.fn();
    props = {
      heading: '04. Prompt',
      onPromptChange,
      onPromptFileChange: vi.fn(),
      onPromptLayerChange: vi.fn(),
      prompt: '',
      promptFile: '',
      promptLayer: 'named',
    };

    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
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
    props = {
      heading: '04. Prompt',
      onPromptChange: vi.fn(),
      onPromptFileChange: vi.fn(),
      onPromptLayerChange: vi.fn(),
      prompt: '',
      promptFile: '',
      promptLayer: 'named',
    };

    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => <PlanWorkflowConfigPrompt {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { getByLabelText } = render(<RoutesStub />);

    expect(getByLabelText('Prompt profile for --prompt')).toHaveAttribute(
      'placeholder',
      DEFAULT_RALPH_PROMPT,
    );
  });

  test('should show --prompt-file input when promptLayer is file', () => {
    props = {
      heading: '04. Prompt',
      onPromptChange: vi.fn(),
      onPromptFileChange: vi.fn(),
      onPromptLayerChange: vi.fn(),
      prompt: DEFAULT_RALPH_PROMPT,
      promptFile: '',
      promptLayer: 'file',
    };

    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => <PlanWorkflowConfigPrompt {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { getByLabelText, queryByLabelText } = render(<RoutesStub />);

    expect(queryByLabelText('Prompt profile for --prompt')).toBeNull();
    expect(getByLabelText('Path for --prompt-file')).toBeInTheDocument();
  });
});

import { describe, expect, test } from 'vitest';

import {
  DEFAULT_RALPH_PROMPT,
  getDefaultWorkflowRalphRunOptionsInput,
} from '~/routing/plans/utils/build-workflow-ralph-argv';

import { applyPromptLayerChange } from '../plan-workflow-config-prompt';

describe('applyPromptLayerChange', () => {
  test('switching to named clears the prompt file', () => {
    const prev = {
      ...getDefaultWorkflowRalphRunOptionsInput(),
      promptFile: 'prompts/ralph.md',
      promptLayer: 'file' as const,
    };

    expect(applyPromptLayerChange(prev, 'named')).toMatchObject({
      promptFile: '',
      promptLayer: 'named',
    });
  });

  test('switching to file restores the default prompt profile', () => {
    const prev = {
      ...getDefaultWorkflowRalphRunOptionsInput(),
      prompt: '/custom',
    };

    expect(applyPromptLayerChange(prev, 'file')).toMatchObject({
      prompt: DEFAULT_RALPH_PROMPT,
      promptLayer: 'file',
    });
  });
});

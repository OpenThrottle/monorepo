import type {
  WorkflowRalphPromptLayer,
  WorkflowRalphRunOptionsInput,
} from '~/routing/plans/utils/build-workflow-ralph-argv';
import { DEFAULT_RALPH_PROMPT } from '~/routing/plans/utils/build-workflow-ralph-argv';

/**
 * @description Applies a prompt-delivery switch to the run options: `named` clears the
 * prompt file, `file` restores the default prompt profile so `--prompt` and
 * `--prompt-file` stay mutually exclusive.
 */
export const applyPromptLayerChange = (
  prev: WorkflowRalphRunOptionsInput,
  next: WorkflowRalphPromptLayer,
): WorkflowRalphRunOptionsInput => {
  if (next === 'named') {
    return { ...prev, promptFile: '', promptLayer: 'named' };
  }

  return { ...prev, prompt: DEFAULT_RALPH_PROMPT, promptLayer: 'file' };
};

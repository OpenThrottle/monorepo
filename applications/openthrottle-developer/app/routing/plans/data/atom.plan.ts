import { atom } from 'jotai';
import {
  buildWorkflowRalphOptionArgs,
  formatWorkflowRalphCommandLine,
  getDefaultWorkflowRalphRunOptionsInput,
  parseWorkflowRunIterationTimeoutSeconds,
  type WorkflowRalphRunOptionsInput,
} from '~/routing/plans/utils/build-workflow-ralph-argv';

/**
 * @description Default workflow run form state: {@link WorkflowRalphRunOptionsInput}
 * plus the raw `--iteration-timeout` text field (parsed for argv / GraphQL).
 */
interface WorkflowRunAtomDefaultState {
  readonly iterationTimeoutText: string;
  readonly runOptions: WorkflowRalphRunOptionsInput;
}

/**
 * @description Builds default atom state; aligns with uncontrolled workflow
 * config initialization and reset-to-defaults.
 */
const getWorkflowRunAtomDefaultState = (options?: {
  readonly planId?: string;
  readonly taskId?: string;
}): WorkflowRunAtomDefaultState => ({
  iterationTimeoutText: '',
  runOptions: getDefaultWorkflowRalphRunOptionsInput(options),
});

/**
 * @description Primary workflow CLI / enqueue form state (global module scope; shell may sync seeds).
 */
export const workflowRalphRunOptionsAtom = atom<WorkflowRalphRunOptionsInput>(
  getDefaultWorkflowRalphRunOptionsInput(),
);

/**
 * @description Raw per-iteration timeout text; {@link parseWorkflowRunIterationTimeoutSeconds} merges into argv.
 */
export const workflowRunIterationTimeoutTextAtom = atom<string>('');

/**
 * @description Merges stored run options with parsed iteration timeout for argv and tuning payloads.
 */
const workflowRalphMergedRunOptionsForArgvAtom = atom(
  (get): WorkflowRalphRunOptionsInput => {
    const runOptions = get(workflowRalphRunOptionsAtom);
    const iterationTimeoutText = get(workflowRunIterationTimeoutTextAtom);

    return {
      ...runOptions,
      iterationTimeoutSeconds:
        parseWorkflowRunIterationTimeoutSeconds(iterationTimeoutText),
    };
  },
);

/**
 * @description `workflow-ralph` argv segments after the binary (same as {@link buildWorkflowRalphOptionArgs} on merged state).
 */
const workflowRalphOptionArgsAtom = atom((get) =>
  buildWorkflowRalphOptionArgs(get(workflowRalphMergedRunOptionsForArgvAtom)),
);

/**
 * @description Single-line preview / clipboard string for the canonical CLI invocation.
 */
export const workflowRalphCanonicalCommandLineAtom = atom((get) =>
  formatWorkflowRalphCommandLine(get(workflowRalphOptionArgsAtom)),
);

/**
 * @description Resets both primitives to {@link getWorkflowRunAtomDefaultState} (optional plan/task seed).
 */
export const resetWorkflowRunToDefaultsAtom = atom(
  null,
  (
    _get,
    set,
    seed: { readonly planId?: string; readonly taskId?: string } | undefined,
  ) => {
    const defaults = getWorkflowRunAtomDefaultState(seed);

    set(workflowRalphRunOptionsAtom, defaults.runOptions);
    set(workflowRunIterationTimeoutTextAtom, defaults.iterationTimeoutText);
  },
);

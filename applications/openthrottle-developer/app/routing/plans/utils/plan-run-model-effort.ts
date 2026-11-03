/**
 * @description Pure helpers behind the shared plan-run model picker and effort
 * control (`PlanRunModelPicker`, `PlanRunEffortControl`). The picker speaks the
 * chat composer's option ids (`cursor|gpt-5.2`); a plan stores `model` and
 * `executionBackend` separately (`runConfigJson.ralph`), so these map between
 * the two without either side learning the other's shape.
 */

import type { ChatModelOption } from '@openthrottle/react-router-chat';
import { ChatReasoningLevel } from '@openthrottle/react-router-chat';
import {
  capabilitiesForChatOption,
  decodeChatOption,
  encodeCliOptionId,
} from '@openthrottle/react-router-chat-state';

import { isExecutionBackend } from '~/routing/plans/utils/plan-workflow-config-execution';
import type { WorkflowRalphExecutionBackendUi } from '~/routing/plans/utils/workflow-ralph-config';
import { DEFAULT_RALPH_MODEL } from '~/routing/plans/utils/workflow-ralph-config';

/**
 * @description What picking a model writes to the plan: the model id and the
 * backend it belongs to. They always travel together so a plan can never hold a
 * `claude` model on the `cursor` runner.
 */
export interface PlanRunModelSelection {
  readonly backend: WorkflowRalphExecutionBackendUi;
  readonly model: string;
}

/**
 * @description Keeps only the options a plan run can execute: an agent CLI the
 * plan's runner selector offers (claude, cursor), at its own default or a named
 * model. Local OpenAI endpoints and driver×endpoint joins carry a `baseUrl` the
 * plan run-config has no field for, so offering them would save a config the
 * server rejects.
 */
export const filterPlanRunnableModels = (
  models: readonly ChatModelOption[],
): ChatModelOption[] =>
  models.filter((option) => {
    const decoded = decodeChatOption(option.id);

    return (
      decoded !== null &&
      decoded.baseUrl === undefined &&
      isExecutionBackend(decoded.backend)
    );
  });

/**
 * @description The option id to highlight for a plan's stored `backend` + `model`,
 * or `undefined` when no option matches (the picker then shows its placeholder).
 * The default model (`auto`, or empty) also matches a driver's bare-backend
 * option, which discovery emits when the driver lists no models.
 */
export const toPlanRunModelOptionId = (
  backend: WorkflowRalphExecutionBackendUi,
  model: string,
  models: readonly ChatModelOption[],
): string | undefined => {
  const trimmed = model.trim();
  const ids = new Set(models.map((option) => option.id));
  const named = encodeCliOptionId(
    backend,
    trimmed === '' ? undefined : trimmed,
  );

  if (ids.has(named)) {
    return named;
  }

  const isDefaultModel = trimmed === '' || trimmed === DEFAULT_RALPH_MODEL;

  return isDefaultModel && ids.has(backend) ? backend : undefined;
};

/**
 * @description Splits a picked option id into the plan's `backend` + `model`.
 * A bare-backend option (no model override) resolves to the default model.
 * `null` for an id the plan cannot run (malformed, other backend, endpoint).
 */
export const parsePlanRunModelOptionId = (
  optionId: string,
): PlanRunModelSelection | null => {
  const decoded = decodeChatOption(optionId);

  if (
    decoded === null ||
    decoded.baseUrl !== undefined ||
    !isExecutionBackend(decoded.backend)
  ) {
    return null;
  }

  return {
    backend: decoded.backend,
    model: decoded.model ?? DEFAULT_RALPH_MODEL,
  };
};

/**
 * @description Narrows the stored effort string to the chat reasoning vocabulary;
 * `undefined` for unset or an unrecognized value (the control then shows no level).
 */
export const parsePlanRunEffort = (
  effort: string,
): ChatReasoningLevel | undefined =>
  Object.values(ChatReasoningLevel).find((level) => level === effort);

/**
 * @description The effort to keep after the runner changes: the current one when
 * the new backend's `reasoningLevels` still include it, otherwise `''` (unset).
 * Stops a plan from carrying an effort its backend would ignore or clamp.
 */
export const reconcilePlanRunEffort = (
  backend: WorkflowRalphExecutionBackendUi,
  effort: string,
): string => {
  const level = parsePlanRunEffort(effort);

  return level !== undefined &&
    capabilitiesForChatOption({ backend }).reasoningLevels.includes(level)
    ? level
    : '';
};

/**
 * @description Pure helpers behind the shared plan-run model picker and effort
 * control (`PlanRunModelPicker`, `PlanRunEffortControl`). The picker speaks the
 * chat composer's option ids (`cursor|gpt-5.2`); a plan stores `model` and
 * `driver` separately in its run config, so these map between
 * the two without either side learning the other's shape.
 */

import type { ChatModelOption } from '@openthrottle/react-router-chat';
import { ChatReasoningLevel } from '@openthrottle/react-router-chat';
import {
  capabilitiesForChatOption,
  decodeChatOption,
  encodeCliOptionId,
} from '@openthrottle/react-router-chat-state';

import type { PlanRunDriverUi } from '~/routing/plans/utils/plan-run-options';
import { DEFAULT_RUN_MODEL } from '~/routing/plans/utils/plan-run-options';
import { isSelectablePlanRunDriver } from '~/routing/plans/utils/plan-workflow-config-execution';

/**
 * @description What picking a model writes to the plan: the model id and the
 * driver it belongs to. They always travel together so a plan can never hold a
 * `claude` model on the `cursor` runner.
 */
export interface PlanRunModelSelection {
  readonly driver: PlanRunDriverUi;
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
): ChatModelOption[] => {
  return models.filter((option) => {
    const decoded = decodeChatOption(option.id);

    return (
      decoded !== null &&
      decoded.baseUrl === undefined &&
      isSelectablePlanRunDriver(decoded.backend)
    );
  });
};

/**
 * @description The option id to highlight for a plan's stored `driver` + `model`,
 * or `undefined` when no option matches (the picker then shows its placeholder).
 * The default model (`auto`, or empty) also matches a driver's bare-driver
 * option, which discovery emits when the driver lists no models.
 */
export const toPlanRunModelOptionId = (
  driver: PlanRunDriverUi,
  model: string,
  models: readonly ChatModelOption[],
): string | undefined => {
  const trimmed = model.trim();
  const ids = new Set(models.map((option) => option.id));
  const named = encodeCliOptionId(driver, trimmed === '' ? undefined : trimmed);

  if (ids.has(named)) {
    return named;
  }

  const isDefaultModel = trimmed === '' || trimmed === DEFAULT_RUN_MODEL;

  return isDefaultModel && ids.has(driver) ? driver : undefined;
};

/**
 * @description Splits a picked option id into the plan's `driver` + `model`.
 * A bare-driver option (no model override) resolves to the default model.
 * `null` for an id the plan cannot run (malformed, other driver, endpoint).
 */
export const parsePlanRunModelOptionId = (
  optionId: string,
): PlanRunModelSelection | null => {
  const decoded = decodeChatOption(optionId);

  if (
    decoded === null ||
    decoded.baseUrl !== undefined ||
    !isSelectablePlanRunDriver(decoded.backend)
  ) {
    return null;
  }

  return {
    driver: decoded.backend,
    model: decoded.model ?? DEFAULT_RUN_MODEL,
  };
};

/**
 * @description Narrows the stored effort string to the chat reasoning vocabulary;
 * `undefined` for unset or an unrecognized value (the control then shows no level).
 */
export const parsePlanRunEffort = (
  effort: string,
): ChatReasoningLevel | undefined => {
  return Object.values(ChatReasoningLevel).find((level) => level === effort);
};

/**
 * @description The effort to keep after the runner changes: the current one when
 * the new driver's `reasoningLevels` still include it, otherwise `''` (unset).
 * Stops a plan from carrying an effort its driver would ignore or clamp.
 */
export const reconcilePlanRunEffort = (
  driver: PlanRunDriverUi,
  effort: string,
): string => {
  const level = parsePlanRunEffort(effort);

  if (level === undefined) {
    return '';
  }

  const { reasoningLevels } = capabilitiesForChatOption({ backend: driver });
  return reasoningLevels.includes(level) ? level : '';
};

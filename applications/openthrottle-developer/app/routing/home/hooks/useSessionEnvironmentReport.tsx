import type {
  ChatCheckoutOption,
  ChatModelGroup,
  ChatModelOption,
  ChatPermissionModeValue,
  ChatReasoningLevelValue,
  ChatSessionEnvironment,
} from '@openthrottle/react-router-chat';
import * as React from 'react';

export interface UseSessionEnvironmentReportOptions {
  readonly checkouts: readonly ChatCheckoutOption[];
  readonly modelGroups: readonly ChatModelGroup[];
  readonly modelId: string | undefined;
  readonly models: readonly ChatModelOption[];
  /** Receives a fresh snapshot whenever one of the values below changes. */
  readonly onEnvironmentChange:
    ((environment: ChatSessionEnvironment) => void) | undefined;
  readonly permissionMode: ChatPermissionModeValue | undefined;
  readonly reasoning: ChatReasoningLevelValue | undefined;
  /** Selected checkout ids; the first is the primary one. */
  readonly repositoryIds: readonly string[];
}

/**
 * @description Reports the composer's current model, agent, checkout,
 * permission mode and reasoning to `onEnvironmentChange` (the session drawer's
 * Environment section) after each change. Does nothing without a listener.
 */
export const useSessionEnvironmentReport = (
  options: UseSessionEnvironmentReportOptions,
): void => {
  const {
    checkouts,
    modelGroups,
    modelId,
    models,
    onEnvironmentChange,
    permissionMode,
    reasoning,
    repositoryIds,
  } = options;

  // Hooks

  // Setup
  const model = models.find((candidate) => candidate.id === modelId);
  const group = modelGroups.find(
    (candidate) => candidate.id === model?.groupId,
  );
  const checkoutId = repositoryIds[0];
  const checkout = checkouts.find((candidate) => candidate.id === checkoutId);

  // Handlers

  // Markup

  // Life Cycle
  React.useEffect(() => {
    onEnvironmentChange?.({
      agentLabel: group?.label,
      checkout,
      modelLabel: model?.label,
      permissionMode,
      reasoning,
    });
  }, [checkout, group?.label, model?.label, permissionMode, reasoning]);

  // 🔌 Short Circuit
};

import * as React from 'react';
import { ChatCheckoutSelector } from './ChatCheckoutSelector';
import type { ChatBackendCapabilities, ChatCheckoutOption } from '../types';

export interface ChatComposerCheckoutControlProps {
  /** Gates visibility and the multi-select cap; omitted hides the control. */
  readonly capabilities?: ChatBackendCapabilities;
  /** Selectable checkouts; the control renders nothing when omitted. */
  readonly checkouts?: readonly ChatCheckoutOption[];
  readonly onCheckoutChange?: (checkoutId: string) => void;
  /** Primary-first multi-select callback; omit to force single-select. */
  readonly onCheckoutsChange?: (checkoutIds: readonly string[]) => void;
  readonly selectedCheckoutId?: string;
  /** Primary-first selection (index 0 is the spawn cwd). */
  readonly selectedCheckoutIds?: readonly string[];
}

/**
 * @description Checkout control for {@link ChatComposerToolbar}. Renders only
 * for a backend that runs against a repository and only when a checkout list
 * is supplied. Upgrades to multi-select when the backend's `maxRepositories`
 * capability exceeds one AND the consumer wired an array handler — either
 * alone stays single-select, so a CLI that cannot honor additional granted
 * directories can never be offered them.
 *
 * @public
 */
export const ChatComposerCheckoutControl = (
  props: ChatComposerCheckoutControlProps,
): React.ReactElement | null => {
  const {
    capabilities,
    checkouts,
    onCheckoutChange,
    onCheckoutsChange,
    selectedCheckoutId,
    selectedCheckoutIds,
  } = props;

  // Hooks

  // Setup
  const maxCheckouts = capabilities?.maxRepositories ?? 1;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (capabilities?.requiresRepository !== true || checkouts == null) {
    return null;
  }

  return (
    <ChatCheckoutSelector
      checkouts={checkouts}
      maxCheckouts={maxCheckouts}
      multiple={maxCheckouts > 1 && onCheckoutsChange !== undefined}
      onCheckoutChange={onCheckoutChange ?? (() => undefined)}
      onCheckoutsChange={onCheckoutsChange}
      selectedCheckoutId={selectedCheckoutId}
      selectedCheckoutIds={selectedCheckoutIds}
    />
  );
};

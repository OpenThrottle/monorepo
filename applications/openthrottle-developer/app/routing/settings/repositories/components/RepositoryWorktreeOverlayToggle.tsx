import { Label, Switch } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { WORKSPACE_REPOSITORY_DETAIL_COPY } from '~/routing/settings/data/data.copy';
import type { RepositoryCheckout } from '~/routing/settings/repositories/types';

export interface RepositoryWorktreeOverlayToggleProps {
  /** The user's checkouts of the repository; the switch renders only when one is foreign. */
  checkouts: readonly RepositoryCheckout[];
}

/**
 * @description Edit-form switch for the per-checkout ot-worktree skill overlay.
 * Submits `worktreeSkillOverlayEnabled` as a hidden "true"/"false" field next to
 * the foreign-skill-injection switch. Render it only for foreign checkouts.
 */
export const RepositoryWorktreeOverlayToggle = (
  props: RepositoryWorktreeOverlayToggleProps,
): React.ReactElement | null => {
  const { checkouts } = props;

  // Hooks
  const [enabled, setEnabled] = React.useState(
    // Default-on (opt-out); the user's checkouts are flipped together.
    checkouts.every((checkout) => checkout.worktreeSkillOverlayEnabled),
  );

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  // The OpenThrottle repo itself has no overlay; only foreign checkouts get the switch.
  if (!checkouts.some((checkout) => checkout.isForeign)) {
    return null;
  }

  return (
    <div className="flex items-start justify-between gap-4 rounded-md border p-3">
      <div className="space-y-1">
        <Label htmlFor="repository-worktree-skill-overlay">
          {WORKSPACE_REPOSITORY_DETAIL_COPY.overlayLabel}
        </Label>
        <p className="text-muted-foreground text-xs">
          {WORKSPACE_REPOSITORY_DETAIL_COPY.overlayHelp}
        </p>
      </div>
      <input
        name="worktreeSkillOverlayEnabled"
        type="hidden"
        value={String(enabled)}
      />
      <Switch
        checked={enabled}
        className="mt-0.5 shrink-0"
        data-testid="RepositoryEditForm-overlay"
        id="repository-worktree-skill-overlay"
        onCheckedChange={setEnabled}
      />
    </div>
  );
};

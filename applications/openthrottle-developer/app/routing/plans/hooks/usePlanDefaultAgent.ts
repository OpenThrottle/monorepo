import * as React from 'react';

import { PlanDefaultAgentContext } from '~/routing/plans/config/plan-default-agent-context';
import type { DefaultAgentDraft } from '~/routing/settings/utils/user-preferences';

/**
 * @description The user's default agent for this plan, resolved from the route's
 * deferred {@link PlanDefaultAgentContext}. `null` until it resolves, when there
 * is no preference, or outside the provider — every case reads as "no
 * preference", so the Run dialog keeps the plan's own agent.
 */
export const usePlanDefaultAgent = (): DefaultAgentDraft | null => {
  // Hooks
  const deferred = React.useContext(PlanDefaultAgentContext);
  const [defaultAgent, setDefaultAgent] =
    React.useState<DefaultAgentDraft | null>(null);

  // Setup

  // Handlers

  // Markup

  // Life Cycle
  React.useEffect(() => {
    if (deferred == null) {
      setDefaultAgent(null);
      return undefined;
    }

    let isCurrent = true;

    // The loader's promise never rejects in practice; a rejection still reads
    // as "no preference" rather than surfacing an error in the dialog.
    const resolve = async (): Promise<void> => {
      let resolved: DefaultAgentDraft | null;
      try {
        resolved = (await deferred) ?? null;
      } catch {
        resolved = null;
      }
      if (isCurrent) {
        setDefaultAgent(resolved);
      }
    };

    void resolve();

    return () => {
      isCurrent = false;
    };
  }, [deferred]);

  // 🔌 Short Circuit

  return defaultAgent;
};

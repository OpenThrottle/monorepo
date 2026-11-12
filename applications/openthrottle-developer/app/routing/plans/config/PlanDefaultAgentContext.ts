import * as React from 'react';

import type { DefaultAgentDraft } from '~/routing/settings/utils/user-preferences';

/**
 * @description The plan detail loader's deferred default agent: the user's saved
 * preference, already narrowed to one this plan can run (`null` when unset or no
 * longer valid). Provided by the plan route so the Run dialog can seed from it
 * without threading a prop through the toolbar. Outside the provider (isolated
 * component tests) it is `null`, which reads as "no preference".
 */
export const PlanDefaultAgentContext =
  React.createContext<Promise<DefaultAgentDraft | null> | null>(null);

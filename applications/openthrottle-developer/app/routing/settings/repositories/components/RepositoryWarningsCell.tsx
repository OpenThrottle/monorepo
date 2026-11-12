import * as React from 'react';

import type { RepositoryCheckoutRow } from '~/routing/settings/repositories/types';
import type { CheckoutDrift } from '~/routing/settings/utils/driftLabels';
import { driftLabels } from '~/routing/settings/utils/driftLabels';

export interface RepositoryWarningsCellProps {
  driftByCheckoutId: Record<string, CheckoutDrift> | undefined;
  row: RepositoryCheckoutRow;
}

/**
 * @description The warnings column: the drift labels found by the last refresh of
 * this row's checkout, or nothing. Split out of RepositoriesTable for its line cap.
 */
export const RepositoryWarningsCell = (
  props: RepositoryWarningsCellProps,
): React.ReactElement | null => {
  const { driftByCheckoutId, row } = props;

  // Hooks

  // Setup
  const checkoutId = row.checkout?.id ?? '';
  const drift = driftByCheckoutId?.[checkoutId];
  const warnings = drift ? driftLabels(drift) : [];

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (warnings.length === 0) {
    return null;
  }

  return (
    <ul className="space-y-1" role="alert">
      {warnings.map((warning) => (
        <li className="text-destructive text-xs" key={warning}>
          {warning}
        </li>
      ))}
    </ul>
  );
};

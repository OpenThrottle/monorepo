import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { useAtomValue } from 'jotai';
import { beforeEach, describe, expect, test } from 'vitest';
import { PlanRunConfigStoreProvider } from './PlanRunConfigStoreProvider';
import type { PlanRunConfigStoreProviderProps } from './PlanRunConfigStoreProvider';
import {
  jobRunHookDraftRowsAtom,
  workflowCheckoutIdAtom,
} from '~/routing/plans/data/atom.plan';

const AtomProbe = (): React.ReactElement => {
  const checkoutId = useAtomValue(workflowCheckoutIdAtom);
  const hookRows = useAtomValue(jobRunHookDraftRowsAtom);

  return (
    <div data-testid="AtomProbe">
      <span data-testid="checkout-id">{checkoutId}</span>
      <span data-testid="hook-row-count">{hookRows.length}</span>
    </div>
  );
};

describe('PlanRunConfigStoreProvider Component', () => {
  let component: RenderResult;
  let props: PlanRunConfigStoreProviderProps;

  beforeEach(() => {
    props = {
      children: <AtomProbe />,
      plan: {
        id: 'plan-1',
        jobRunHooksJson: null,
        runConfigJson: null,
      },
    };
    component = render(<PlanRunConfigStoreProvider {...props} />);
  });

  test('renders children inside the seeded store', () => {
    expect(component.getByTestId('AtomProbe')).toBeTruthy();
    expect(component.getByTestId('checkout-id')).toHaveTextContent('');
    expect(component.getByTestId('hook-row-count')).toHaveTextContent('0');
  });
});

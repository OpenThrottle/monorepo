import * as React from 'react';
import { render } from '@testing-library/react';
import { getDefaultStore } from 'jotai/vanilla';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { Tabs } from '@openthrottle/react-router-shadcn';
import { PlanTabConfiguration } from '../PlanTabConfiguration';
import type { PlanTabConfigurationProps } from '../PlanTabConfiguration';
import { resetWorkflowRunToDefaultsAtom } from '~/routing/plans/data/atom.plan';

const renderTab = (props: PlanTabConfigurationProps) => {
  const Component = () => (
    <Tabs value="configuration">
      <PlanTabConfiguration {...props} />
    </Tabs>
  );
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

describe('PlanTabConfiguration Component', () => {
  beforeEach(() => {
    getDefaultStore().set(resetWorkflowRunToDefaultsAtom, undefined);
  });

  test('renders workflow command preview from the run-config atoms', async () => {
    const props: PlanTabConfigurationProps = {
      onSaveJobRunHooks: () => undefined,
      repositories: Promise.resolve([]),
    };
    const { findByTestId, getByTestId } = renderTab(props);

    // The whole tab body sits behind the deferred repositories boundary.
    expect(await findByTestId('PlanWorkflowCommand')).toBeInTheDocument();
    expect(getByTestId('workflow-run-cli-preview')).toHaveTextContent(
      'pnpm exec workflow-ralph',
    );
  });

  test('renders the skeleton while workspace repositories are pending', () => {
    const props: PlanTabConfigurationProps = {
      onSaveJobRunHooks: () => undefined,
      repositories: new Promise(() => {}),
    };
    const { getByTestId, queryByTestId } = renderTab(props);

    expect(getByTestId('PlanConfigurationTabSkeleton')).toBeInTheDocument();
    expect(queryByTestId('PlanWorkflowCommand')).not.toBeInTheDocument();
  });
});

import * as React from 'react';
import { render } from '@testing-library/react';
import { getDefaultStore } from 'jotai/vanilla';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { Tabs } from '@openthrottle/react-router-shadcn';
import { PlanTabConfiguration } from '../PlanTabConfiguration';
import type { PlanTabConfigurationProps } from '../PlanTabConfiguration';
import { resetWorkflowRunToDefaultsAtom } from '~/routing/plans/data/atom.plan';

describe('PlanTabConfiguration Component', () => {
  beforeEach(() => {
    getDefaultStore().set(resetWorkflowRunToDefaultsAtom, undefined);
  });

  test('renders workflow command preview from the run-config atoms', () => {
    const props: PlanTabConfigurationProps = {
      onSaveJobRunHooks: () => undefined,
    };
    const Component = () => (
      <Tabs value="configuration">
        <PlanTabConfiguration {...props} />
      </Tabs>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { getByTestId } = render(<RoutesStub />);

    expect(getByTestId('PlanWorkflowCommand')).toBeInTheDocument();
    expect(getByTestId('workflow-run-cli-preview')).toHaveTextContent(
      'pnpm exec workflow-ralph',
    );
  });
});

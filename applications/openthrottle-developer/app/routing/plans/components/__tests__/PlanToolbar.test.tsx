import * as React from 'react';
import type { RenderResult } from '@testing-library/react';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { beforeEach, describe, expect, test } from 'vitest';
import { PlanToolbar } from '../PlanToolbar';
import type { PlanToolbarProps } from '../PlanToolbar';
import { renderRoutesStub } from '~/testing/route-fixtures';

const renderToolbar = (toolbarProps: PlanToolbarProps): RenderResult =>
  renderRoutesStub(
    <TooltipProvider>
      <PlanToolbar {...toolbarProps} />
    </TooltipProvider>,
  );

describe('PlanToolbar Component', () => {
  let component: RenderResult;
  let props: PlanToolbarProps;

  beforeEach(() => {
    props = { planId: 'test-plan-id' };

    component = renderToolbar(props);
  });

  test('should render actions and links scoped to planId', () => {
    expect(component.getByTestId('PlanToolbar')).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: /mark complete/i }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: /^actions$/i }),
    ).toBeInTheDocument();
  });

  test('submits empty ralphTuning when ralphTuningJson is omitted', () => {
    const el = component.container.querySelector('input[name="ralphTuning"]');
    if (!(el instanceof HTMLInputElement)) {
      throw new Error('expected ralphTuning input');
    }
    expect(el.value).toBe('');
  });

  test('passes ralphTuningJson to hidden ralphTuning field for enqueue', () => {
    const payload = JSON.stringify({
      iterations: 3,
      project: 'applications/openthrottle-server',
    });
    const withTuning = renderToolbar({
      planId: 'test-plan-id',
      ralphTuningJson: payload,
    });
    const el = withTuning.container.querySelector('input[name="ralphTuning"]');
    if (!(el instanceof HTMLInputElement)) {
      throw new Error('expected ralphTuning input');
    }
    expect(el.value).toBe(payload);
  });

  test('shows In progress and Kill run while a plan run is active', () => {
    const r = renderToolbar({
      planId: 'p1',
      planStatus: 'IN_PROGRESS',
      planTitle: 'My Plan',
    });
    expect(
      r.getByRole('button', { name: /^In progress$/i }),
    ).toBeInTheDocument();
    expect(
      r.getByRole('button', { name: /Kill plan run for My Plan/i }),
    ).toBeInTheDocument();
  });

  test('shows Add to Queue and hides Kill run when plan is idle (e.g. after cancel)', () => {
    const r = renderToolbar({
      planId: 'p1',
      planStatus: 'PENDING',
      planTitle: 'My Plan',
    });
    expect(
      r.getByRole('button', { name: /^Add to Queue$/i }),
    ).toBeInTheDocument();
    expect(
      r.queryByRole('button', { name: /Kill plan run/i }),
    ).not.toBeInTheDocument();
  });

  test('disables enqueue when workflowRunBlocked is true', () => {
    const r = renderToolbar({
      planId: 'p1',
      planStatus: 'PENDING',
      planTitle: 'My Plan',
      workflowRunBlocked: true,
      workflowRunBlockedReason: 'Fix CLI options',
    });
    expect(r.getByRole('button', { name: /^Add to Queue$/i })).toBeDisabled();
  });
});

import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PlanToolbar } from '../PlanToolbar';
import type { PlanToolbarProps } from '../PlanToolbar';

const renderToolbar = (toolbarProps: PlanToolbarProps): RenderResult => {
  const Component = () => <PlanToolbar {...toolbarProps} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
};

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

  test('should link to workflow run options anchor on the plan page', () => {
    const link = component.getByRole('link', { name: 'Workflow run options' });
    expect(link).toHaveAttribute('href', '#workflow-run-options');
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
});

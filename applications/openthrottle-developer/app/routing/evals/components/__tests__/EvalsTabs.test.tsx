import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { renderEvals } from '~/routing/evals/testing/renderEvals';

import { EvalsTabs } from '../EvalsTabs';

describe('EvalsTabs Component', () => {
  test('links each tab to its own URL', () => {
    const component = renderEvals(<EvalsTabs active="runs" />);
    const tabs = component.getAllByRole('tab');

    expect(tabs.map((tab) => tab.getAttribute('href'))).toEqual([
      '/evals',
      '/evals/trajectories',
    ]);
  });

  test('marks the active tab selected', () => {
    const component = renderEvals(<EvalsTabs active="trajectories" />);
    const tabs = component.getAllByRole('tab');

    expect(tabs[0]).toHaveAttribute('aria-selected', 'false');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
  });
});

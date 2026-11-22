import { describe, expect, test } from 'vitest';

import { DEMO_PLANS } from '../../../fixtures/demo-content.ts';
import { FIRST_PLAN, FIRST_PLAN_SURFACES } from '../surface.ts';

describe('03-first-plan surface', () => {
  const plan = DEMO_PLANS.find(
    (candidate) => candidate.id === FIRST_PLAN.planId,
  );
  const agent = FIRST_PLAN_SURFACES['agent'] ?? '';

  test('anchors to a fixture plan with three tasks', () => {
    expect(plan?.tasks).toHaveLength(3);
  });

  test('the typeset create_plan call carries the plan title verbatim', () => {
    expect(agent).toContain(FIRST_PLAN.title);
    expect(agent).toContain('create_plan');
  });

  test('the typeset create_tasks call carries every task title and the plan id', () => {
    expect(agent).toContain('create_tasks');
    expect(agent).toContain(FIRST_PLAN.planId);

    for (const title of FIRST_PLAN.taskTitles) {
      expect(agent).toContain(title);
    }
  });

  test('the tool results are hidden until their beat reveals them', () => {
    expect(agent).toMatch(/id="plan-result" data-demo-hidden/);
    expect(agent).toMatch(/id="tasks-result" data-demo-hidden/);
  });
});

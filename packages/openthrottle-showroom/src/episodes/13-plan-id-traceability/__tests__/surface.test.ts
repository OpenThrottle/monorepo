import { describe, expect, test } from 'vitest';

import { DEMO_PLANS } from '../../../fixtures/demo-content.ts';
import {
  PLAN_ID_TRACEABILITY,
  PLAN_ID_TRACEABILITY_SURFACES,
} from '../surface.ts';

describe('13-plan-id-traceability surface', () => {
  const plan = DEMO_PLANS.find(
    (candidate) => candidate.id === PLAN_ID_TRACEABILITY.planId,
  );
  const task = plan?.tasks.find(
    (candidate) => candidate.id === PLAN_ID_TRACEABILITY.taskId,
  );
  const terminal = PLAN_ID_TRACEABILITY_SURFACES['terminal'] ?? '';

  test('anchors to a fixture task that belongs to a fixture plan', () => {
    expect(plan).toBeDefined();
    expect(task).toBeDefined();
  });

  test('the footer names the fixture plan and task ids verbatim', () => {
    expect(terminal).toContain(`Plan-Id: ${PLAN_ID_TRACEABILITY.planId}`);
    expect(terminal).toContain(`Task-Id: ${PLAN_ID_TRACEABILITY.taskId}`);
  });

  test('the commit carries no real identity', () => {
    expect(terminal).toContain('ada@atlasworks.example');
    expect(terminal).not.toMatch(/\/Users\/|\/home\//);
  });

  test('the log output is hidden until the typed command runs', () => {
    expect(terminal).toMatch(/id="log-output" data-demo-hidden/);
    expect(terminal).toContain('id="log-footer"');
  });
});

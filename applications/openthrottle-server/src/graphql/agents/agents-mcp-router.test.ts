import { describe, expect, it } from 'vitest';
import { AgentsMcpRouter } from './agents-mcp-router';

const PLAN_ID = '18e1ca8f-8ba5-483c-bb59-4e89f95ccfe0';
const TASK_ID = 'f337a3a2-43d6-4d31-beea-89f05489f482';
const CHUNK_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

describe('AgentsMcpRouter', () => {
  const router = new AgentsMcpRouter();

  it('routes health and ping', () => {
    expect(router.route({ message: 'health' }).tool).toBe('health');
    expect(router.route({ message: 'ping' }).tool).toBe('health');
    expect(router.route({ message: 'mcp health' }).tool).toBe('health');
  });

  it('routes list_sources', () => {
    const r = router.route({ message: 'list sources in openthrottle' });
    expect(r.tool).toBe('list_sources');
    expect(r.args).toEqual({});
    expect(r.confidence).toBeGreaterThan(0.9);
  });

  it('routes list_notes', () => {
    const r = router.route({ message: 'show notes' });
    expect(r.tool).toBe('list_notes');
  });

  it('routes list_plans_by_status when status and list intent are present', () => {
    const r = router.route({ message: 'list pending plans in OT' });
    expect(r.tool).toBe('list_plans_by_status');
    expect(r.args).toEqual({ statuses: ['PENDING'] });
  });

  it('routes get_remaining_tasks_for_plan', () => {
    const r = router.route({
      message: `What tasks remain for plan ${PLAN_ID}?`,
    });
    expect(r.tool).toBe('get_remaining_tasks_for_plan');
    expect(r.args).toEqual({ planId: PLAN_ID });
  });

  it('routes get_tasks_by_plan_id', () => {
    const r = router.route({
      message: `List all tasks for ${PLAN_ID}`,
    });
    expect(r.tool).toBe('get_tasks_by_plan_id');
    expect(r.args).toEqual({ planId: PLAN_ID });
  });

  it('routes get_plan_output', () => {
    const r = router.route({
      message: `Show plan output stream for ${PLAN_ID}`,
    });
    expect(r.tool).toBe('get_plan_output');
    expect(r.args).toEqual({ planId: PLAN_ID });
  });

  it('routes get_last_activity', () => {
    const r = router.route({
      message: `Last activity for ${PLAN_ID}`,
    });
    expect(r.tool).toBe('get_last_activity');
    expect(r.args).toEqual({ planId: PLAN_ID });
  });

  it('routes get_last_activity with optional task id', () => {
    const r = router.route({
      message: `Last activity for plan ${PLAN_ID} task ${TASK_ID}`,
    });
    expect(r.tool).toBe('get_last_activity');
    expect(r.args).toEqual({ planId: PLAN_ID, taskId: TASK_ID });
  });

  it('routes get_document', () => {
    const r = router.route({
      message: `Fetch chunk content get document ${CHUNK_ID}`,
    });
    expect(r.tool).toBe('get_document');
    expect(r.args).toEqual({ id: CHUNK_ID });
  });

  it('routes get_plan for explicit wording', () => {
    const r = router.route({ message: `get plan ${PLAN_ID}` });
    expect(r.tool).toBe('get_plan');
    expect(r.args).toEqual({ id: PLAN_ID });
  });

  it('routes bare UUID to get_plan', () => {
    const r = router.route({ message: PLAN_ID });
    expect(r.tool).toBe('get_plan');
    expect(r.args).toEqual({ id: PLAN_ID });
  });

  it('routes get_activity_by_date with daysBack', () => {
    const r = router.route({
      message: 'Show openthrottle activity for the last 7 days',
    });
    expect(r.tool).toBe('get_activity_by_date');
    expect(r.args).toEqual({ daysBack: 7 });
  });

  it('routes get_activity_by_date with ISO date when activity intent is present', () => {
    const r = router.route({
      message: 'List commits and activity on 2026-05-01',
    });
    expect(r.tool).toBe('get_activity_by_date');
    expect(r.args).toEqual({ date: '2026-05-01' });
  });

  it('routes list_tasks_by_category', () => {
    const r = router.route({
      message: 'List tasks by category infra',
    });
    expect(r.tool).toBe('list_tasks_by_category');
    expect(r.args).toEqual({ category: 'infra' });
  });

  it('defaults to semantic_search for open-ended questions', () => {
    const r = router.route({
      message: 'How should we prioritize the roadmap for Q3?',
    });
    expect(r.tool).toBe('semantic_search');
    expect(r.args).toEqual({
      query: 'How should we prioritize the roadmap for Q3?',
    });
    expect(r.confidence).toBeLessThan(0.5);
  });

  describe('list_plans_by_status guardrails', () => {
    it('does not route pending status without plan-like context', () => {
      const r = router.route({
        message: 'I still have pending work before the release',
      });
      expect(r.tool).toBe('semantic_search');
    });

    it('routes /ot/pending phrasing with plan wording', () => {
      const r = router.route({
        message: 'Show /ot/pending plans in openthrottle',
      });
      expect(r.tool).toBe('list_plans_by_status');
      expect(r.args).toEqual({ statuses: ['PENDING'] });
    });
  });

  describe('get_activity_by_date guardrails', () => {
    it('does not route bare time range without activity intent', () => {
      const r = router.route({
        message: 'What happened last week?',
      });
      expect(r.tool).toBe('semantic_search');
    });

    it('routes last week when shipped intent is present', () => {
      const r = router.route({
        message: 'What shipped last week?',
      });
      expect(r.tool).toBe('get_activity_by_date');
      expect(r.args).toEqual({ daysBack: 7 });
    });
  });

  describe('UUID normalization and precedence', () => {
    it('normalizes uppercase UUID in args', () => {
      const upper = PLAN_ID.toUpperCase();
      const r = router.route({ message: `get plan ${upper}` });
      expect(r.args).toEqual({ id: PLAN_ID });
    });

    it('prefers get_remaining_tasks_for_plan when both list-all and remaining appear', () => {
      const r = router.route({
        message: `List remaining open tasks for plan ${PLAN_ID}`,
      });
      expect(r.tool).toBe('get_remaining_tasks_for_plan');
    });

    it('does not route get_tasks_by_plan_id when message contains remaining', () => {
      const r = router.route({
        message: `List all tasks including remaining for ${PLAN_ID}`,
      });
      expect(r.tool).not.toBe('get_tasks_by_plan_id');
    });

    it('defaults long UUID-only-adjacent prose to semantic_search instead of bare get_plan', () => {
      const r = router.route({
        message: `Please review context around ${PLAN_ID} before we change the schema migration strategy`,
      });
      expect(r.tool).toBe('semantic_search');
    });
  });

  describe('get_task short message path', () => {
    it('routes task keyword with UUID and no plan word in a short message', () => {
      const r = router.route({
        message: `Task ${TASK_ID}`,
      });
      expect(r.tool).toBe('get_task');
      expect(r.args).toEqual({ id: TASK_ID });
    });
  });
});

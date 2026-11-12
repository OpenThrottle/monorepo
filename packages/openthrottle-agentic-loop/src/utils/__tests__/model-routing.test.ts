import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import type { ModelRoutingPolicy } from '../../contract/index.ts';
import { MODEL_ROUTING_REVIEW_TIER } from '../../data/data.model-routing.ts';
import { createModelRouter } from '../create-model-router.ts';
import { parseModelRoutingPolicy } from '../parse-model-routing-policy.ts';
import { readModelRoutingPolicy } from '../read-model-routing-policy.ts';
import { routeTaskModel } from '../route-task-model.ts';
import { runOtLoop } from '../run-ot-loop.ts';
import { makeTask, makeWorld } from './loop-fakes.ts';

const POLICY_PATH = fileURLToPath(
  new URL(
    '../../../../../skills/ot-loop/references/model-routing.json',
    import.meta.url,
  ),
);

const loadPolicy = async (): Promise<ModelRoutingPolicy> => {
  const result = await readModelRoutingPolicy(POLICY_PATH);

  if (result.kind !== 'ok') {
    throw new Error(result.reason);
  }

  return result.policy;
};

const CLAUDE_MODELS = ['opus', 'sonnet', 'haiku', 'fable'];

describe('parseModelRoutingPolicy', () => {
  it('accepts the real policy file', async () => {
    const result = await readModelRoutingPolicy(POLICY_PATH);

    expect(result.kind).toBe('ok');
  });

  it('reports an unreadable file as invalid instead of throwing', async () => {
    const result = await readModelRoutingPolicy('/nonexistent/routing.json');

    expect(result.kind).toBe('invalid');
  });

  it('rejects a category mapped to the review tier', () => {
    const raw = JSON.parse(readFileSync(POLICY_PATH, 'utf8'));

    raw.categories.spike = MODEL_ROUTING_REVIEW_TIER;

    expect(parseModelRoutingPolicy(raw).kind).toBe('invalid');
  });

  it('rejects non-objects and missing sections', () => {
    expect(parseModelRoutingPolicy(null).kind).toBe('invalid');
    expect(parseModelRoutingPolicy({ version: 1 }).kind).toBe('invalid');
  });
});

describe('routeTaskModel', () => {
  it('routes every category in the real JSON away from the review tier', async () => {
    const policy = await loadPolicy();

    expect(policy.categories.size).toBeGreaterThan(0);

    for (const category of policy.categories.keys()) {
      const result = routeTaskModel({
        category,
        driverModels: CLAUDE_MODELS,
        policy,
        runModel: undefined,
      });

      expect(result.tier).not.toBe(MODEL_ROUTING_REVIEW_TIER);
      expect(result.model).not.toBe('fable');
      expect(result.model).not.toBe('claude-fable-5');
    }
  });

  it('lower-cases the category and sends a miss or blank to default', async () => {
    const policy = await loadPolicy();
    const route = (category: string | null) => {
      return routeTaskModel({
        category,
        driverModels: CLAUDE_MODELS,
        policy,
        runModel: 'run-model',
      });
    };

    expect(route('SPIKE')).toEqual({
      kind: 'routed',
      model: 'opus',
      tier: 'escalate',
    });
    expect(route('no-such-category').tier).toBe('default');
    expect(route(null).tier).toBe('default');
    expect(route('   ').tier).toBe('default');
  });

  it('prefers the tier model id when the driver lists ids', async () => {
    const policy = await loadPolicy();

    expect(
      routeTaskModel({
        category: 'design',
        driverModels: ['claude-opus-5', 'opus'],
        policy,
        runModel: undefined,
      }),
    ).toEqual({ kind: 'routed', model: 'claude-opus-5', tier: 'escalate' });
  });

  it('falls back to the run model when the driver lists no tier model', async () => {
    const policy = await loadPolicy();

    expect(
      routeTaskModel({
        category: 'design',
        driverModels: ['gpt-5'],
        policy,
        runModel: 'gpt-5',
      }),
    ).toEqual({
      kind: 'fallback',
      model: 'gpt-5',
      reason: 'model_not_valid_for_driver',
      tier: 'escalate',
    });
  });

  it('falls back when the driver lists nothing', async () => {
    const policy = await loadPolicy();
    const result = routeTaskModel({
      category: 'test',
      driverModels: [],
      policy,
      runModel: undefined,
    });

    expect(result).toMatchObject({
      kind: 'fallback',
      model: undefined,
      reason: 'driver_models_unavailable',
    });
  });
});

describe('createModelRouter through the state machine', () => {
  it('records exactly the model passed to the driver, discovering once', async () => {
    const policy = await loadPolicy();
    let discoveries = 0;
    const router = await createModelRouter({
      discoverModels: () => {
        discoveries += 1;

        return Promise.resolve(CLAUDE_MODELS);
      },
      policy,
      runModel: 'haiku',
    });
    const world = makeWorld({
      tasks: [
        makeTask('1', { category: 'research' }),
        makeTask('2', { category: 'docs' }),
        makeTask('3', { category: null }),
      ],
    });

    await runOtLoop({
      deps: { ...world.deps, modelFor: router.modelFor },
      maxRetries: 0,
      planId: 'p1',
      taskId: undefined,
    });

    expect(discoveries).toBe(1);
    expect(world.sessions.map((session) => session.model)).toEqual([
      'opus',
      'sonnet',
      'sonnet',
    ]);

    const attemptModels = world.workerInputs.map((input) => input.model);

    expect(attemptModels).toEqual(
      world.sessions.map((session) => session.model),
    );
  });

  it('records the run model honestly when the driver rejects the tier model', async () => {
    const policy = await loadPolicy();
    const router = await createModelRouter({
      discoverModels: () => Promise.resolve(['gpt-5']),
      policy,
      runModel: 'gpt-5',
    });
    const world = makeWorld({
      tasks: [makeTask('1', { category: 'research' })],
    });

    await runOtLoop({
      deps: { ...world.deps, modelFor: router.modelFor },
      maxRetries: 0,
      planId: 'p1',
      taskId: undefined,
    });

    expect(world.sessions.map((session) => session.model)).toEqual(['gpt-5']);
    expect(world.workerInputs.map((input) => input.model)).toEqual(['gpt-5']);
  });

  it('treats a failed discovery as an empty list', async () => {
    const policy = await loadPolicy();
    const router = await createModelRouter({
      discoverModels: () => Promise.reject(new Error('no cli')),
      policy,
      runModel: 'run-model',
    });

    expect(router.modelFor(makeTask('1', { category: 'design' }))).toBe(
      'run-model',
    );
  });
});

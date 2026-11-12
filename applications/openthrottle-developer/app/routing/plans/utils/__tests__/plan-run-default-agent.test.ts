import type { ChatModelOption } from '@openthrottle/react-router-chat';
import { describe, expect, it } from 'vitest';

import {
  isPlanRunAgentUnset,
  resolvePlanRunDefaultAgent,
  seedPlanRunAgent,
} from '~/routing/plans/utils/plan-run-default-agent';
import type { WorkflowRalphRunOptionsInput } from '~/routing/plans/utils/workflow-ralph-config';
import type { DefaultAgentDraft } from '~/routing/settings/utils/user-preferences';

const models: ChatModelOption[] = [
  { id: 'claude', label: 'Claude Code' },
  { id: 'claude|opus', label: 'Opus' },
];

const systemAgent: Pick<
  WorkflowRalphRunOptionsInput,
  'effort' | 'executionBackend' | 'model'
> = { effort: '', executionBackend: 'cursor', model: 'auto' };

const defaultAgent: DefaultAgentDraft = {
  backend: 'claude',
  effort: 'high',
  model: 'opus',
};

describe('resolvePlanRunDefaultAgent', () => {
  it('returns null when there is no preference', () => {
    expect(resolvePlanRunDefaultAgent(null, models)).toBeNull();
  });

  it('returns the draft for an offered agent and model', () => {
    expect(
      resolvePlanRunDefaultAgent(
        { backend: 'claude', effort: 'high', model: 'opus' },
        models,
      ),
    ).toEqual(defaultAgent);
  });

  it('returns null for a model that is no longer offered (disabled or gone)', () => {
    expect(
      resolvePlanRunDefaultAgent(
        { backend: 'claude', effort: null, model: 'retired' },
        models,
      ),
    ).toBeNull();
  });

  it('returns null for a backend a plan cannot run', () => {
    expect(
      resolvePlanRunDefaultAgent(
        { backend: 'not-a-runner', effort: null, model: 'opus' },
        models,
      ),
    ).toBeNull();
  });
});

describe('isPlanRunAgentUnset', () => {
  it('is true for the system default agent', () => {
    expect(isPlanRunAgentUnset(systemAgent)).toBe(true);
  });

  it('treats a blank model like the default model', () => {
    expect(isPlanRunAgentUnset({ ...systemAgent, model: ' ' })).toBe(true);
  });

  it('is false once any agent field differs from the system default', () => {
    expect(
      isPlanRunAgentUnset({ ...systemAgent, executionBackend: 'claude' }),
    ).toBe(false);
    expect(isPlanRunAgentUnset({ ...systemAgent, model: 'gpt-5.2' })).toBe(
      false,
    );
    expect(isPlanRunAgentUnset({ ...systemAgent, effort: 'high' })).toBe(false);
  });
});

describe('seedPlanRunAgent', () => {
  it('stamps the default agent over an unset plan agent', () => {
    expect(seedPlanRunAgent(systemAgent, defaultAgent)).toEqual({
      effort: 'high',
      executionBackend: 'claude',
      model: 'opus',
    });
  });

  it('keeps an explicit plan agent', () => {
    const explicit = { ...systemAgent, model: 'gpt-5.2' };

    expect(seedPlanRunAgent(explicit, defaultAgent)).toBe(explicit);
  });

  it('keeps the plan agent when there is no default', () => {
    expect(seedPlanRunAgent(systemAgent, null)).toBe(systemAgent);
  });
});

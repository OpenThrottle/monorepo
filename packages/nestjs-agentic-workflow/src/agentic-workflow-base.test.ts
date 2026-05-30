import type {
  WorkflowFlowContext,
  WorkflowOrchestrator,
  WorkflowRunResult,
} from '@openthrottle/openthrottle-agentic-workflow';
import { describe, it, expect } from 'vitest';
import { AgenticWorkflowBase } from './agentic-workflow-base';
import { createAgenticWorkflowRegistry } from './agentic-workflow-base';

/**
 * @description Minimal workflow-agnostic test double extending {@link AgenticWorkflowBase}.
 * Its orchestrator always finishes; we only assert identity/resolution here, not execution.
 */
class TestWorkflow extends AgenticWorkflowBase<'done', 'failed'> {
  constructor(readonly id: string) {
    super();
  }

  createOrchestrator(): WorkflowOrchestrator<'done', 'failed'> {
    return {
      execute: async (): Promise<WorkflowRunResult<'done', 'failed'>> => ({
        exitCode: 0,
        reason: 'done',
        status: 'finished',
      }),
    };
  }
}

describe('createAgenticWorkflowRegistry', () => {
  it('resolves a registered workflow by id', () => {
    const ralph = new TestWorkflow('ralph');
    const registry = createAgenticWorkflowRegistry([ralph]);

    expect(registry.resolve('ralph')).toBe(ralph);
    expect(registry.get('ralph')).toBe(ralph);
    expect(registry.ids()).toEqual(['ralph']);
  });

  describe('when the id is unknown', () => {
    it('get returns undefined', () => {
      const registry = createAgenticWorkflowRegistry([
        new TestWorkflow('ralph'),
      ]);

      expect(registry.get('nope')).toBeUndefined();
    });

    it('resolve throws an actionable error listing known ids', () => {
      const registry = createAgenticWorkflowRegistry([
        new TestWorkflow('ralph'),
      ]);

      expect(() => registry.resolve('nope')).toThrow(
        /Unknown agentic workflow id: "nope".*ralph/,
      );
    });
  });

  describe('when two workflows share an id', () => {
    it('throws on duplicate id registration', () => {
      expect(() =>
        createAgenticWorkflowRegistry([
          new TestWorkflow('ralph'),
          new TestWorkflow('ralph'),
        ]),
      ).toThrow(/Duplicate agentic workflow id/);
    });
  });

  describe('with multiple registered workflows', () => {
    it('resolves each side-by-side without changing the dispatcher contract', () => {
      const ralph = new TestWorkflow('ralph');
      const other = new TestWorkflow('other');
      const registry = createAgenticWorkflowRegistry([ralph, other]);

      expect(registry.resolve('ralph')).toBe(ralph);
      expect(registry.resolve('other')).toBe(other);
      expect(registry.ids()).toEqual(['ralph', 'other']);
    });
  });
});

/**
 * @description The base is parameterized only over the transport-free contract; this compile-time
 * usage guards that a context subtype still satisfies the generic.
 */
interface NarrowContext extends WorkflowFlowContext {
  readonly extra: string;
}

class NarrowWorkflow extends AgenticWorkflowBase<'ok', 'bad', NarrowContext> {
  readonly id = 'narrow';

  createOrchestrator(): WorkflowOrchestrator<'ok', 'bad', NarrowContext> {
    return {
      execute: async (): Promise<WorkflowRunResult<'ok', 'bad'>> => ({
        exitCode: 0,
        reason: 'ok',
        status: 'finished',
      }),
    };
  }
}

describe('AgenticWorkflowBase generic parameterization', () => {
  it('accepts a narrowed WorkflowFlowContext subtype', () => {
    const workflow = new NarrowWorkflow();
    expect(workflow.id).toBe('narrow');
    expect(workflow.createOrchestrator()).toHaveProperty('execute');
  });
});

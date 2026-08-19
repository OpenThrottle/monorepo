import { describe, expect, it } from 'vitest';

import * as packageEntry from '@openthrottle/nestjs-agentic-workflow';

describe('@openthrottle/nestjs-agentic-workflow package entry', () => {
  it('resolves the documented public symbols from the package name', () => {
    // Imports by package name rather than relatively on purpose: this asserts
    // the entry actually resolves for a consumer, which is the contract that
    // broke shard-dependently in CI when it could only resolve through a
    // previously built `dist/`.
    expect(packageEntry).toEqual(
      expect.objectContaining({
        AGENTIC_WORKFLOW_RALPH_ID: expect.any(String),
        AGENTIC_WORKFLOW_REGISTRY: expect.any(Symbol),
        AgenticWorkflowBase: expect.any(Function),
        AgenticWorkflowRalph: expect.any(Function),
        NestjsAgenticWorkflowModule: expect.any(Function),
        createAgenticWorkflowRegistry: expect.any(Function),
      }),
    );
  });
});

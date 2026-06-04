# Workflows Plan

Say we have an "abstract" idea for executing agentic loops. We're going to call it `agentic-workflow` and its a BullMQ job.

Each `agentic-workflow` should extend the same payload/configuration @packages/openthrottle-agentic-workflow/src/types/config.ts:34 `WorkflowConfig`

1. Each workflow is tied to a plan, the configuration `WorkflowConfig` will also be saved on that plan, so we need to look this plan up
   1. Mark the current plan `in progress`
   2. If there are any `beforeAll` hooks, we run through them before starting the `plan`
   3. Next we grab the first of `n` tasks for processing
      1. if there are any `beforeEach` hooks, we run through them
      2. Then we execute the primary workflow
      3. If there are any 'afterEach` hooks we run through those
   4. Once all `n` tasks have been completed we can run any `afterAll` hooks
   5. Now the job can be marked as `complete`

---

1. It has an optional beforeAll: AgenticLifeCycleHook[]
2. it has an optional beforeEach: AgenticLifeCycleHook[]
3. Executes the WorkflowOrchestrator (n iterations)
   1. @packages/openthrottle-agentic-workflow/src/types/index.ts:107
4. it has an optional afterEach: AgenticLifeCycleHook[]
5. it has an optional afterAll: AgenticLifeCycleHook[]

These life cycle hooks should effectively

This could be an afterEach/afterAll hook (any lifecycle really)

- @applications/openthrottle-server/src/queues/plans/plans.processor.ts:1128-1173
- Each lifecycle hook should have access to the previous results @applications/openthrottle-server/src/queues/plans/plans.processor.ts:1080 so it can conditionally apply
  - We should also have access to the job data here, in this instance potentially the taskId in an afterEach so we can commit with that taskId

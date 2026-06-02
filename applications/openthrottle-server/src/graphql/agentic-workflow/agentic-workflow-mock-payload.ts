/**
 * @description Deterministic BullMQ job data for agentic-workflow GraphQL smoke enqueue.
 */

import type { AgenticTestJobPayload } from '../../queues/agentic-test/agentic-test.types';

/** @description Fixed payload enqueued by {@link AgenticWorkflowService.enqueueMockAgenticTest}. */
export const AGENTIC_WORKFLOW_MOCK_PAYLOAD: AgenticTestJobPayload = {
  label: 'agentic-workflow-mock',
};

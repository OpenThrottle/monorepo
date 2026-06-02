/**
 * @description GraphQL resolver for agentic-workflow (agentic-test queue smoke enqueue).
 */

import { Resolver } from '@nestjs/graphql';
import { AgenticWorkflowService } from './agentic-workflow.service';

@Resolver()
export class AgenticWorkflowResolver {
  constructor(
    private readonly agenticWorkflowService: AgenticWorkflowService,
  ) {}
}

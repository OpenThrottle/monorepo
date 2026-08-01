import { Injectable } from '@nestjs/common';
import { runAgentPrompt } from '@openthrottle/openthrottle-drivers';
import type {
  RunAgentPromptConfig,
  RunAgentPromptResult,
} from '@openthrottle/openthrottle-drivers';

/**
 * @description Thin injectable wrapper over openthrottle-drivers `runAgentPrompt`. Exists purely as a
 * DI seam so the processor is unit-testable with a stubbed driver entrypoint — no invocation logic
 * lives here (that stays in the drivers package, the choke point).
 */
@Injectable()
export class ScheduledAgentRunnerService {
  run(config: RunAgentPromptConfig): Promise<RunAgentPromptResult> {
    return runAgentPrompt(config);
  }
}

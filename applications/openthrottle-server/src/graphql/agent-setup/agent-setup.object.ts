/**
 * @description GraphQL ObjectTypes for the agent-CLI install/update surface: the streamed
 * stdout/stderr chunk emitted over the subscription, and the start-run mutation result. The chunk
 * fields mirror {@link AgentSetupStreamChunkPayload} so a published payload resolves directly.
 */

import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AgentCliSetupConfigObject {
  @Field(() => Boolean, {
    description: `True when the current user may run installs/updates (has the SETTINGS_WRITE permission). The UI disables the controls when false.`,
  })
  canManage!: boolean;

  @Field(() => Boolean, {
    description: `True when server-side install/update is enabled (OT_AGENT_CLI_INSTALL_ENABLED). Default-off; the UI explains disabled controls when false.`,
  })
  installEnabled!: boolean;
}

@ObjectType()
export class AgentSetupStreamChunkObject {
  @Field(() => String, {
    description: `Incremental stdout/stderr text for this chunk (empty on the terminal chunk).`,
  })
  data!: string;

  @Field(() => Boolean, {
    description: `True exactly once, on the terminal chunk of the run.`,
  })
  done!: boolean;

  @Field(() => String, {
    description: `Executor failure classifier when the run failed; null otherwise.`,
    nullable: true,
  })
  error!: string | null;

  @Field(() => Int, {
    description: `Child exit code on the terminal chunk; null while running or when killed by signal.`,
    nullable: true,
  })
  exitCode!: number | null;

  @Field(() => String, {
    description: `Unique id for this chunk (subscription dedupe / cursor).`,
  })
  id!: string;

  @Field(() => String, {
    description: `The install/update run id these chunks belong to.`,
  })
  runId!: string;

  @Field(() => Int, { description: `Monotonic index within the run.` })
  sortOrder!: number;

  @Field(() => String, {
    description: `Which stream the text came from: stdout | stderr.`,
  })
  stream!: string;
}

/**
 * @description Result of startAgentCliInstall / startAgentCliUpdate. On success `runId` is set and
 * `errorMessage`/`disabled` reflect the state; on a rejected request `errorMessage` is set (and
 * `disabled` is true when the feature flag is off) with a null `runId`.
 */
@ObjectType()
export class StartAgentSetupResult {
  @Field(() => String, {
    description: `The backend (driver id) this run targeted.`,
  })
  backend!: string;

  @Field(() => Boolean, {
    description: `True when the request was rejected because server-side install/update is disabled by env flag (OT_AGENT_CLI_INSTALL_ENABLED).`,
  })
  disabled!: boolean;

  @Field(() => String, {
    description: `Validation or policy error (no throw). Null on success.`,
    nullable: true,
  })
  errorMessage!: string | null;

  @Field(() => String, {
    description: `install | update — the mode that was started.`,
  })
  mode!: string;

  @Field(() => String, {
    description: `Correlation id to subscribe to via agentSetupChunkAdded. Null when the request was rejected.`,
    nullable: true,
  })
  runId!: string | null;
}

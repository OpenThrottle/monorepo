/**
 * @description GraphQL resolver for server-side agent-CLI install/update. `installAgentCli` /
 * `updateAgentCli` take ONLY a `backend` id (validated against the drivers registry — never a URL or
 * command from the client), are gated behind the SETTINGS_WRITE permission AND the default-off
 * `OT_AGENT_CLI_INSTALL_ENABLED` env flag, and return a runId to correlate the streamed output.
 * `agentSetupChunkAdded` streams that output over graphql-ws (topic agent-setup:<runId>:stream).
 *
 * Security posture: running the registry-defined `curl | shell` installers on the server host is
 * RCE-on-demand, so both the WRITE permission and the env flag must be satisfied; when the flag is
 * off the mutation resolves a `disabled` result and NEVER spawns.
 */

import {
  BadRequestException,
  ForbiddenException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Args,
  Context,
  ID,
  Mutation,
  Query,
  Resolver,
  Subscription,
} from '@nestjs/graphql';
import {
  AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
  type AuthPrincipal,
  CurrentUser,
  Public,
} from '@openthrottle/nestjs-auth';
import { isDriverId } from '@openthrottle/openthrottle-drivers';
import type { AgentSetupMode } from '@openthrottle/openthrottle-agentic-utils';
import { PERMISSIONS, Permissions } from '@openthrottle/nestjs-rbac';
import {
  AgentCliPreferencesService,
  RolesService,
} from '@openthrottle/nestjs-repositories';
import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard';
import { readAgentCliInstallEnabledFromConfig } from './agent-setup.config';
import {
  AgentCliSetupConfigObject,
  AgentSetupStreamChunkObject,
  SetAgentEnabledResult,
  SetAgentModelEnabledResult,
  SetAgentModelFavoriteResult,
  SetAgentModelsEnabledResult,
  StartAgentSetupResult,
} from './agent-setup.object';
import { AgentSetupService } from './agent-setup.service';
import { type AgentSetupStreamChunkEnvelope } from './agent-setup.types';

@Resolver()
export class AgentSetupResolver {
  constructor(
    private readonly config: ConfigService,
    private readonly preferences: AgentCliPreferencesService,
    private readonly roles: RolesService,
    private readonly setupService: AgentSetupService,
  ) {}

  @Query(() => AgentCliSetupConfigObject, {
    description: `Whether server-side agent-CLI install/update is enabled (env flag) and whether the current user may run it (SETTINGS_WRITE). Drives the /settings/setup control gating.`,
  })
  @UseGuards(GqlPermissionsGuard)
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async agentCliSetupConfig(
    @CurrentUser() principal: AuthPrincipal | undefined,
  ): Promise<AgentCliSetupConfigObject> {
    const installEnabled = readAgentCliInstallEnabledFromConfig(this.config);

    let canManage = false;
    if (principal != null) {
      const permissions =
        principal.kind === AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT
          ? await this.roles.getPermissionsForServiceAccount(principal.sub)
          : await this.roles.getPermissionsForUser(principal.sub);
      canManage = permissions.includes(PERMISSIONS.SETTINGS_WRITE);
    }

    return { canManage, installEnabled };
  }

  @Mutation(() => SetAgentEnabledResult, {
    description: `Enable or disable an agent CLI backend for the current user. A disabled agent is hidden from chat/model pickers and rejected when starting new runs. Presence-as-disabled: enabled=false records the preference, enabled=true clears it (default is enabled). Gated by SETTINGS_WRITE, in parity with install/update; rejects unknown backends.`,
    name: 'setAgentEnabled',
  })
  @UseGuards(GqlPermissionsGuard)
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async setAgentEnabled(
    @CurrentUser() principal: AuthPrincipal | undefined,
    @Args('backend', { type: () => String }) backend: string,
    @Args('enabled', { type: () => Boolean }) enabled: boolean,
  ): Promise<SetAgentEnabledResult> {
    if (principal == null) {
      throw new ForbiddenException('An authenticated user is required.');
    }
    if (!isDriverId(backend)) {
      throw new BadRequestException(`Unknown agent CLI backend: ${backend}.`);
    }

    await this.preferences.setEnabled(principal.sub, backend, enabled);
    return { backend, enabled };
  }

  @Mutation(() => SetAgentModelEnabledResult, {
    description: `Enable or disable a single MODEL of an agent CLI backend for the current user. A disabled model is hidden from chat/model pickers and rejected when starting new runs, even while the agent itself stays enabled (an agent-level OFF hard-overrides all its models). Presence-as-disabled: enabled=false records the preference, enabled=true clears it (default is enabled). Gated by SETTINGS_WRITE; rejects unknown backends.`,
    name: 'setAgentModelEnabled',
  })
  @UseGuards(GqlPermissionsGuard)
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async setAgentModelEnabled(
    @CurrentUser() principal: AuthPrincipal | undefined,
    @Args('backend', { type: () => String }) backend: string,
    @Args('model', { type: () => String }) model: string,
    @Args('enabled', { type: () => Boolean }) enabled: boolean,
  ): Promise<SetAgentModelEnabledResult> {
    if (principal == null) {
      throw new ForbiddenException('An authenticated user is required.');
    }
    if (!isDriverId(backend)) {
      throw new BadRequestException(`Unknown agent CLI backend: ${backend}.`);
    }

    await this.preferences.setModelEnabled(
      principal.sub,
      backend,
      model,
      enabled,
    );
    return { backend, enabled, model };
  }

  @Mutation(() => SetAgentModelsEnabledResult, {
    description: `Bulk enable or disable EVERY model of an agent CLI backend for the current user (the select-all / deselect-all affordance). enabled=true clears all per-model disables for the backend; enabled=false records each supplied model id as disabled. An agent-level OFF still hard-overrides all its models. Gated by SETTINGS_WRITE; rejects unknown backends.`,
    name: 'setAgentModelsEnabled',
  })
  @UseGuards(GqlPermissionsGuard)
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async setAgentModelsEnabled(
    @CurrentUser() principal: AuthPrincipal | undefined,
    @Args('backend', { type: () => String }) backend: string,
    @Args('models', { type: () => [String] }) models: string[],
    @Args('enabled', { type: () => Boolean }) enabled: boolean,
  ): Promise<SetAgentModelsEnabledResult> {
    if (principal == null) {
      throw new ForbiddenException('An authenticated user is required.');
    }
    if (!isDriverId(backend)) {
      throw new BadRequestException(`Unknown agent CLI backend: ${backend}.`);
    }

    await this.preferences.setModelsEnabled(
      principal.sub,
      backend,
      models,
      enabled,
    );
    return { backend, enabled };
  }

  @Mutation(() => SetAgentModelFavoriteResult, {
    description: `Star or unstar a single MODEL of an agent CLI backend for the current user. Favorited models float to the top of / are highlighted in chat/model pickers and run selection. Favoriting is orthogonal to enablement — it never enables a disabled model. Presence-as-favorite: favorite=true records the star, favorite=false clears it. Gated by SETTINGS_WRITE; rejects unknown backends.`,
    name: 'setAgentModelFavorite',
  })
  @UseGuards(GqlPermissionsGuard)
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async setAgentModelFavorite(
    @CurrentUser() principal: AuthPrincipal | undefined,
    @Args('backend', { type: () => String }) backend: string,
    @Args('model', { type: () => String }) model: string,
    @Args('favorite', { type: () => Boolean }) favorite: boolean,
  ): Promise<SetAgentModelFavoriteResult> {
    if (principal == null) {
      throw new ForbiddenException('An authenticated user is required.');
    }
    if (!isDriverId(backend)) {
      throw new BadRequestException(`Unknown agent CLI backend: ${backend}.`);
    }

    await this.preferences.setModelFavorite(
      principal.sub,
      backend,
      model,
      favorite,
    );
    return { backend, favorite, model };
  }

  // 🔌 graphql-ws only: connection auth (onConnect) validated the token and
  // stashed userId on the context. There is no DB row to own a runId; the run id
  // is an unguessable UUID handed only to the caller of the start mutation, so
  // requiring an authenticated connection is the gate.
  @Public()
  @Subscription(() => AgentSetupStreamChunkObject, {
    description: `Live stdout/stderr for an agent-CLI install/update run (topic agent-setup:<runId>:stream). Requires an authenticated connection.`,
  })
  async agentSetupChunkAdded(
    @Args('runId', { type: () => ID }) runId: string,
    @Context() context: { userId?: string },
  ): Promise<AsyncIterator<AgentSetupStreamChunkEnvelope>> {
    if (!context.userId) {
      throw new ForbiddenException(
        'A subscription requires an authenticated connection',
      );
    }
    return this.setupService.subscribe(runId);
  }

  @Mutation(() => StartAgentSetupResult, {
    description: `Install an allowlisted agent CLI on the server host by driver id. Gated by SETTINGS_WRITE and the default-off OT_AGENT_CLI_INSTALL_ENABLED flag; returns a runId to stream via agentSetupChunkAdded.`,
    name: 'installAgentCli',
  })
  @UseGuards(GqlPermissionsGuard)
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  installAgentCli(
    @Args('backend', { type: () => String }) backend: string,
  ): StartAgentSetupResult {
    return this.startRun(backend, 'install');
  }

  @Mutation(() => StartAgentSetupResult, {
    description: `Update an allowlisted agent CLI on the server host by driver id. Gated by SETTINGS_WRITE and the default-off OT_AGENT_CLI_INSTALL_ENABLED flag; returns a runId to stream via agentSetupChunkAdded.`,
    name: 'updateAgentCli',
  })
  @UseGuards(GqlPermissionsGuard)
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  updateAgentCli(
    @Args('backend', { type: () => String }) backend: string,
  ): StartAgentSetupResult {
    return this.startRun(backend, 'update');
  }

  /**
   * Validate the flag + backend, then start the run. Never spawns when the feature is disabled or the
   * backend is unknown; both resolve a typed rejection result instead.
   */
  private startRun(
    backend: string,
    mode: AgentSetupMode,
  ): StartAgentSetupResult {
    const result = new StartAgentSetupResult();
    result.backend = backend;
    result.mode = mode;
    result.disabled = false;
    result.errorMessage = null;
    result.runId = null;

    if (!readAgentCliInstallEnabledFromConfig(this.config)) {
      result.disabled = true;
      result.errorMessage =
        'Server-side agent-CLI install/update is disabled. Set OT_AGENT_CLI_INSTALL_ENABLED to enable it (local developer machines only).';
      return result;
    }

    if (!isDriverId(backend)) {
      result.errorMessage = `Unknown agent CLI backend: ${backend}.`;
      return result;
    }

    result.runId = this.setupService.start({ backend, mode });
    return result;
  }
}

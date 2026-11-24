/**
 * @description Adds `userEnvFile` to `serverHealth` as a field resolver, so the file read and the
 * token check run only when a client selects it (MCP `health` does).
 */

import { ResolveField, Resolver } from '@nestjs/graphql';
import { Public } from '@openthrottle/nestjs-auth';
import { LoggerService } from '@openthrottle/nestjs-modules';

import { UserEnvFileService } from '../../../services/user-env-file/user-env-file.service.ts';
import { ServerHealthObject } from '../server-health.object.ts';
import { UserEnvFileHealthObject } from './user-env-file-health.object.ts';

@Public()
@Resolver(() => ServerHealthObject)
export class UserEnvFileHealthResolver {
  constructor(
    private readonly logger: LoggerService,
    private readonly userEnvFileService: UserEnvFileService,
  ) {}

  @ResolveField('userEnvFile', () => UserEnvFileHealthObject, {
    description: `Whether ~/.openthrottle/.env lets agents in other checkouts reach this server (statuses only). Null when it cannot be computed — that never fails the rest of serverHealth.`,
    nullable: true,
  })
  async userEnvFile(): Promise<UserEnvFileHealthObject | null> {
    try {
      return await this.userEnvFileService.getHealth();
    } catch (error: unknown) {
      this.logger.warn(
        `User env file health unavailable: ${error instanceof Error ? error.message : String(error)}`,
        UserEnvFileHealthResolver.name,
      );

      return null;
    }
  }
}

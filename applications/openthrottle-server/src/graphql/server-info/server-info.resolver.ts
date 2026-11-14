/**
 * @description GraphQL resolver for serverInfo. Public like serverHealth: the version is not
 * sensitive and clients (desktop shell, status pages) read it before sign-in.
 */

import { Query, Resolver } from '@nestjs/graphql';
import { Public } from '@openthrottle/nestjs-auth';

import { ServerInfoObject } from './server-info.object.ts';
import { ServerInfoService } from './server-info.service.ts';

@Public()
@Resolver(() => ServerInfoObject)
export class ServerInfoResolver {
  constructor(private readonly serverInfoService: ServerInfoService) {}

  /**
   * @description The running server's version, read from its package.json.
   */
  @Query(() => ServerInfoObject, {
    description: `Static facts about the running server build, currently its package.json version.`,
  })
  serverInfo(): ServerInfoObject {
    return this.serverInfoService.getServerInfo();
  }
}

import { Module } from '@nestjs/common';

import { appProviders } from '../app.provider.ts';
import { PROCESS_ROLES } from '../config/config.constants.ts';
import { buildImports } from '../openthrottle-server.utils.ts';

/**
 * @description HTTP/GraphQL + queue producers, no BullMQ processors
 * (PROCESS_ROLE=api).
 */
@Module({
  imports: buildImports(PROCESS_ROLES.api),
  providers: appProviders,
})
export class ApiAppModule {}

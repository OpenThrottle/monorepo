import { Module } from '@nestjs/common';

import { appProviders } from '../app.provider.ts';
import { PROCESS_ROLES } from '../config/config.constants.ts';
import { buildImports } from '../openthrottle-server.utils.ts';

/**
 * @description BullMQ processors only, no HTTP/GraphQL surface
 * (PROCESS_ROLE=worker).
 */
@Module({
  imports: buildImports(PROCESS_ROLES.worker),
  providers: appProviders,
})
export class WorkerAppModule {}

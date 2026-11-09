import { Module } from '@nestjs/common';

import { appProviders } from './app.provider.ts';
import { PROCESS_ROLES } from './config/config.constants.ts';
import { buildImports } from './openthrottle-server.utils.ts';

/**
 * @description The historical single-process composition (PROCESS_ROLE=all).
 */
@Module({
  imports: buildImports(PROCESS_ROLES.all),
  providers: appProviders,
})
export class AppModule {}

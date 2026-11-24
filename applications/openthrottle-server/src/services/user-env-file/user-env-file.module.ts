import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { ServiceAccountCredentialsModule } from '@openthrottle/nestjs-repositories-server';

import { UserEnvFileService } from './user-env-file.service.ts';

/**
 * @description Provides {@link UserEnvFileService}, which keeps `~/.openthrottle/.env`
 * pointing at this server while it runs.
 */
@Module({
  exports: [UserEnvFileService],
  imports: [LoggerModule, ServiceAccountCredentialsModule],
  providers: [UserEnvFileService],
})
export class UserEnvFileModule {}

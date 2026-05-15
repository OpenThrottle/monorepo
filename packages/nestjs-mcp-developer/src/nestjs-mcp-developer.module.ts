import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsMcpDeveloperService } from './nestjs-mcp-developer.service';

@Module({
  controllers: [],
  exports: [NestjsMcpDeveloperService],
  imports: [LoggerModule],
  providers: [NestjsMcpDeveloperService],
})
export class NestjsMcpDeveloperModule {}

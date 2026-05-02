import { DynamicModule, Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import type { NestjsSlackModuleOptions } from '../config/nestjs-slack.options';
import {
  NESTJS_SLACK_OPTIONS,
  validateNestjsSlackOptions,
} from '../config/nestjs-slack.options';
import { NestjsSlackService } from '../services/nestjs-slack.service';

@Module({
  controllers: [],
  exports: [NestjsSlackService],
  imports: [LoggerModule],
  providers: [NestjsSlackService],
})
export class NestjsSlackModule {
  /**
   * Registers the module with required options. Validation runs in the dynamic module factory;
   * missing or invalid options (e.g. webhookUrl) cause the app to fail at bootstrap.
   */
  static forRoot(options: NestjsSlackModuleOptions): DynamicModule {
    validateNestjsSlackOptions(options);
    return {
      exports: [NestjsSlackService],
      global: false,
      imports: [LoggerModule],
      module: NestjsSlackModule,
      providers: [
        { provide: NESTJS_SLACK_OPTIONS, useValue: options },
        NestjsSlackService,
      ],
    };
  }
}

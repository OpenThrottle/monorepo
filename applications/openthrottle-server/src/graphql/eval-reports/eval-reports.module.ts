/**
 * @description GraphQL module for eval reports: registers EvalReportsResolver, importing
 * NestjsRepositoriesModule for the run, dataset and calibration services.
 */

import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { EvalReportsResolver } from './eval-reports.resolver.ts';

@Module({
  imports: [NestjsRepositoriesModule],
  providers: [EvalReportsResolver],
})
export class EvalReportsGraphqlModule {}

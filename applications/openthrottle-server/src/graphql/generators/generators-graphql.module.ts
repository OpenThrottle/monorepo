/**
 * @description GraphQL module for generators (list and by name). Uses getGeneratorsList and getGeneratorByName from modules/generators.
 */

import { Module } from '@nestjs/common';
import { GeneratorsResolver } from './generators.resolver';

@Module({
  providers: [GeneratorsResolver],
})
export class GeneratorsGraphqlModule {}

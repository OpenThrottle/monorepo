/**
 * @description GraphQL resolver for NX generators. Wraps getGeneratorsList and getGeneratorByName.
 */

import { Args, Query, Resolver } from '@nestjs/graphql';
import {
  GeneratorDetail,
  getGeneratorByName,
  getGeneratorsList,
} from '../../modules/generators/generators.service';
import { GetGeneratorInput } from './generator.input';
import { GeneratorDetailObject, GeneratorObject } from './generator.object';

// @authz-stance: authenticated-only (Path A — see OT plan 18e16dfc-4f22-43f9-9b77-6fc90309b60a)
@Resolver()
export class GeneratorsResolver {
  @Query(() => [GeneratorObject], {
    description: `List available NX generators from @tools/generators`,
  })
  async generators(): Promise<GeneratorObject[]> {
    const list = getGeneratorsList();

    return list;
  }

  @Query(() => GeneratorDetailObject, {
    description: `Get a generator by name (includes schema JSON)`,
    nullable: true,
  })
  async generator(
    @Args('input', { type: () => GetGeneratorInput }) input: GetGeneratorInput,
  ): Promise<GeneratorDetail | null> {
    const detail = getGeneratorByName(input.name);

    return detail;
  }
}

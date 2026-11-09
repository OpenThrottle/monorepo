import { Controller, Get, NotFoundException, Param } from '@nestjs/common';

import type { GeneratorItem } from './generators.types.ts';
import { getGeneratorByName, getGeneratorsList } from './generators.utils.ts';

@Controller('generators')
export class GeneratorsController {
  @Get()
  list(): GeneratorItem[] {
    return getGeneratorsList();
  }

  @Get(':name')
  getByName(@Param('name') name: string) {
    const generator = getGeneratorByName(name);
    if (!generator) {
      throw new NotFoundException(`Generator "${name}" not found`);
    }
    return generator;
  }
}

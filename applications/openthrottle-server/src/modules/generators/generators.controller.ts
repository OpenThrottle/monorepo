import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import {
  GeneratorItem,
  getGeneratorByName,
  getGeneratorsList,
} from './generators.service';

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

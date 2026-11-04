import { Module } from '@nestjs/common';

import { GeneratorsController } from './generators.controller.ts';

@Module({
  controllers: [GeneratorsController],
})
export class GeneratorsModule {}

import { Module } from '@nestjs/common';
import { GeneratorsController } from './generators.controller';

@Module({
  controllers: [GeneratorsController],
})
export class GeneratorsModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { Plan } from './plan.entity';
import { PlansService } from './plans.service';

@Module({
  controllers: [],
  exports: [PlansService],
  imports: [LoggerModule, TypeOrmModule.forFeature([Plan])],
  providers: [PlansService],
})
export class PlansModule {}

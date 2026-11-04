import { repl } from '@nestjs/core';

import { AppModule } from './app.module.ts';

async function bootstrap() {
  await repl(AppModule);
}

bootstrap();

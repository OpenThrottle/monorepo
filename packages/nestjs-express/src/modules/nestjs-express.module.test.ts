import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { NestjsExpressModule } from './nestjs-express.module';

describe('NestjsExpressModule', () => {
  it('compiles as a valid NestJS module', async () => {
    const app = await Test.createTestingModule({
      imports: [NestjsExpressModule],
    }).compile();

    expect(app.get(NestjsExpressModule)).toBeInstanceOf(NestjsExpressModule);
  });
});

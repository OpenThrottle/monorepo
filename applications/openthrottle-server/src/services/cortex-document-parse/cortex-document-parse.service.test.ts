import { createMock } from '@golevelup/ts-vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { beforeEach, describe, expect, it } from 'vitest';
import { CortexDocumentParseService } from './cortex-document-parse.service';

describe('CortexDocumentParseService', () => {
  let service: CortexDocumentParseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CortexDocumentParseService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    service = module.get<CortexDocumentParseService>(
      CortexDocumentParseService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(service.parseUpload).toBeDefined();
  });

  it('parses markdown via parseUpload', () => {
    const res = service.parseUpload(Buffer.from('# T\n\np', 'utf8'), {
      mimeType: 'text/markdown',
      originalFilename: 'd.md',
    });
    expect(res.ok).toBe(true);
  });
});

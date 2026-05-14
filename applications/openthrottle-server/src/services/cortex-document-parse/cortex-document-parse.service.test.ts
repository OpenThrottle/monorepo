import { createMock } from '@golevelup/ts-vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CortexDocumentParseService } from './cortex-document-parse.service';

describe('CortexDocumentParseService', () => {
  let service: CortexDocumentParseService;
  let logger: LoggerService;

  beforeEach(async () => {
    const loggerMock = createMock<LoggerService>({
      warn: vi.fn(),
    });
    logger = loggerMock;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CortexDocumentParseService,
        {
          provide: LoggerService,
          useValue: loggerMock,
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

  describe('when parseUpload fails', () => {
    it('logs a warning with the parse error message', () => {
      const res = service.parseUpload(Buffer.from('{', 'utf8'), {
        mimeType: 'application/json',
        originalFilename: 'bad.json',
      });
      expect(res.ok).toBe(false);
      expect(logger.warn).toHaveBeenCalled();
      const firstArg = vi.mocked(logger.warn).mock.calls[0]?.[0];
      expect(typeof firstArg).toBe('string');
      expect(String(firstArg).length).toBeGreaterThan(0);
    });
  });
});

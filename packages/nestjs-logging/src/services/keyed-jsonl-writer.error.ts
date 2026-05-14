import { NestjsLoggingError } from '../config/nestjs-logging.error';

export type KeyedJsonlWriterErrorCode = 'INVALID_KEY' | 'INVALID_CHUNK';

/**
 * @description Thrown for invalid queue/job identifiers or chunk shape vs {@link KeyedJsonlWriter} line format.
 */
export class KeyedJsonlWriterError extends NestjsLoggingError {
  readonly code: KeyedJsonlWriterErrorCode;

  constructor(code: KeyedJsonlWriterErrorCode, message: string) {
    super(message);
    this.name = 'KeyedJsonlWriterError';
    this.code = code;
    Object.setPrototypeOf(this, KeyedJsonlWriterError.prototype);
  }
}

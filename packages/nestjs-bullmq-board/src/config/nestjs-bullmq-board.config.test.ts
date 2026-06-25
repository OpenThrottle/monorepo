import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { bullmqBoardConfig } from './nestjs-bullmq-board.config';

describe('bullmqBoardConfig', () => {
  const original = {
    password: process.env.BULLMQ_BOARD_ADMIN_PASSWORD,
    username: process.env.BULLMQ_BOARD_ADMIN_USERNAME,
  };

  beforeEach(() => {
    delete process.env.BULLMQ_BOARD_ADMIN_PASSWORD;
    delete process.env.BULLMQ_BOARD_ADMIN_USERNAME;
  });

  afterEach(() => {
    if (original.password === undefined) {
      delete process.env.BULLMQ_BOARD_ADMIN_PASSWORD;
    } else {
      process.env.BULLMQ_BOARD_ADMIN_PASSWORD = original.password;
    }

    if (original.username === undefined) {
      delete process.env.BULLMQ_BOARD_ADMIN_USERNAME;
    } else {
      process.env.BULLMQ_BOARD_ADMIN_USERNAME = original.username;
    }
  });

  it('throws when BULLMQ_BOARD_ADMIN_PASSWORD is not set', () => {
    process.env.BULLMQ_BOARD_ADMIN_USERNAME = 'admin';

    expect(() => bullmqBoardConfig()).toThrow(
      /BULLMQ_BOARD_ADMIN_PASSWORD is not set/,
    );
  });

  it('throws when BULLMQ_BOARD_ADMIN_USERNAME is not set', () => {
    process.env.BULLMQ_BOARD_ADMIN_PASSWORD = 'a-sufficiently-long-secret';

    expect(() => bullmqBoardConfig()).toThrow(
      /BULLMQ_BOARD_ADMIN_USERNAME is not set/,
    );
  });

  it('returns the resolved credentials when both env vars are set', () => {
    process.env.BULLMQ_BOARD_ADMIN_PASSWORD = 'a-sufficiently-long-secret';
    process.env.BULLMQ_BOARD_ADMIN_USERNAME = 'admin';

    expect(bullmqBoardConfig()).toEqual({
      password: 'a-sufficiently-long-secret',
      username: 'admin',
    });
  });
});

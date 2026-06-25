import { registerAs } from '@nestjs/config';
import * as Joi from 'joi';

/**
 * @external https://docs.nestjs.com/techniques/configuration
 *
 * @description 🚨 🚨 🚨
 * There is lots to read up on here, we should be able to lock
 * down our environment variables per-package.
 */
export const configValidationSchema = Joi.object({
  BULLMQ_BOARD_ADMIN_PASSWORD: Joi.string().min(16).required(),
  BULLMQ_BOARD_ADMIN_USERNAME: Joi.string().min(1).required(),
});

export const bullmqBoardConfig = registerAs('bullmqBoard', () => {
  const password = process.env.BULLMQ_BOARD_ADMIN_PASSWORD;
  const username = process.env.BULLMQ_BOARD_ADMIN_USERNAME;

  if (!password) throw new Error('BULLMQ_BOARD_ADMIN_PASSWORD is not set');
  if (!username) throw new Error('BULLMQ_BOARD_ADMIN_USERNAME is not set');

  return { password, username };
});

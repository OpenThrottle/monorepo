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
  BULLMQ_BOARD_ADMIN_PASSWORD: Joi.string().required(),
  BULLMQ_BOARD_ADMIN_USERNAME: Joi.string().required(),
});

export const bullmqBoardConfig = registerAs('bullmqBoard', () => {
  const password = process.env.BULLMQ_BOARD_ADMIN_PASSWORD;
  const username = process.env.BULLMQ_BOARD_ADMIN_USERNAME;

  if (!password) throw new Error('BULLMQ_BOARD_ADMIN_PASSWORD is not set');
  if (!username) throw new Error('BULLMQ_BOARD_ADMIN_USERNAME is not set');

  return { password, username };
});
// .unkonwn()

/**
 * allowUnknown defaults to true to account for other system environment variables and prevent errors.
 *
 * @external Link: According to a GitHub discussion https://github.com/nestjs/config/issues/618
 * @external Link: a Medium article https://mdjamilkashemporosh.medium.com/nestjs-environment-variables-best-practices-for-validating-and-structuring-configs-a24a8e8d93c1
 */

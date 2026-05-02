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
  NODE_ENV: Joi.string()
    .valid('development', 'staging', 'production', 'test')
    .default('production'),
  REDIS_HOST: Joi.string().hostname().required(),
  REDIS_PORT: Joi.number().default(6379),
});

export const redisConfig = registerAs('redis', () => {
  const host = process.env.REDIS_HOST;
  const port = process.env.REDIS_PORT || 6379;

  if (!host) throw new Error('REDIS_HOST is not set');
  if (!port) throw new Error('REDIS_PORT is not set');

  return { host, port };
});
// .unkonwn()

/**
 * allowUnknown defaults to true to account for other system environment variables and prevent errors.
 *
 * @external Link: According to a GitHub discussion https://github.com/nestjs/config/issues/618
 * @external Link: a Medium article https://mdjamilkashemporosh.medium.com/nestjs-environment-variables-best-practices-for-validating-and-structuring-configs-a24a8e8d93c1
 */

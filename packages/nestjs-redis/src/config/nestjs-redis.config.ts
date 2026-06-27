import { registerAs } from '@nestjs/config';

const parseBoolean = (value: string | undefined): boolean =>
  value === 'true' || value === '1';

interface RedisConfig {
  host: string;
  password: string | undefined;
  port: number;
  tls: boolean;
  username: string | undefined;
}

export const redisConfig = registerAs('redis', (): RedisConfig => {
  const host = process.env.REDIS_HOST;
  const port = Number(process.env.REDIS_PORT) || 6379;
  const password = process.env.REDIS_PASSWORD;
  const tls = parseBoolean(process.env.REDIS_TLS);
  const username = process.env.REDIS_USERNAME;

  if (!host) throw new Error('REDIS_HOST is not set');
  if (!port) throw new Error('REDIS_PORT is not set');

  return { host, password, port, tls, username };
});

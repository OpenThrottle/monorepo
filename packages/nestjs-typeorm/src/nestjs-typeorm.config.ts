import * as Joi from 'joi';

interface Schema {
  POSTGRES_DB: string;
  POSTGRES_HOST: string;
  POSTGRES_PASSWORD: string;
  POSTGRES_PATH_MIGRATIONS: string;
  POSTGRES_PORT: number;
  POSTGRES_USER: string;
  POSTGRES_VERSION: string;
}

export const schema = Joi.object<Schema>({
  POSTGRES_DB: Joi.string().required(),
  POSTGRES_HOST: Joi.string().required(),
  POSTGRES_PASSWORD: Joi.string().required(),
  POSTGRES_PATH_MIGRATIONS: Joi.string().required(),
  POSTGRES_PORT: Joi.number().port().required(),
  POSTGRES_USER: Joi.string().required(),
  POSTGRES_VERSION: Joi.string().required(),
});

export const getTypeormConfig = () => {
  const config: Schema = {
    POSTGRES_DB: process.env.POSTGRES_DB!,
    POSTGRES_HOST: process.env.POSTGRES_HOST!,
    POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD!,
    POSTGRES_PATH_MIGRATIONS: process.env.POSTGRES_PATH_MIGRATIONS!,
    POSTGRES_PORT: Number(process.env.POSTGRES_PORT!),
    POSTGRES_USER: process.env.POSTGRES_USER!,
    POSTGRES_VERSION: process.env.POSTGRES_VERSION!,
  };

  console.info('getTypeormConfig', { config });

  return config;
};

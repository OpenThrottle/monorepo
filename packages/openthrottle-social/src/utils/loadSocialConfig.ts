import { OT_ENV_KEYS } from '../config/ot-api.ts';
import type { Result } from '../types/social-post.ts';
import { getUserEnvPath, readEnvValues } from './user-env-file.ts';

/** @description What every social script needs to reach OpenThrottle. */
export interface SocialConfig {
  readonly dryRun: boolean;
  readonly envPath: string;
  readonly otToken: string;
  readonly otUrl: string;
  readonly planId: string;
}

const readFlag = (
  argv: readonly string[],
  name: string,
): string | undefined => {
  const index = argv.indexOf(name);
  const inline = argv.find((arg) => arg.startsWith(`${name}=`));

  if (inline !== undefined) {
    return inline.slice(name.length + 1);
  }

  return index === -1 ? undefined : argv[index + 1];
};

/**
 * @description Resolve the config from the command line, the environment and
 * `~/.openthrottle/.env`, in that order: `--plan <id>` (or `OPENTHROTTLE_SOCIAL_PLAN_ID`),
 * `--dry-run`, and the OpenThrottle endpoint and token the MCP uses. A missing value is an error
 * naming the key, never a guess.
 * @public
 */
export const loadSocialConfig = async (
  argv: readonly string[],
  env: Readonly<Record<string, string | undefined>>,
): Promise<Result<SocialConfig, string>> => {
  const envPath = getUserEnvPath();
  const file = await readEnvValues(envPath);

  if (!file.ok) {
    return { error: `could not read ${envPath}: ${file.error}`, ok: false };
  }

  const pick = (key: string): string | undefined => {
    const value = env[key] ?? file.value[key];

    return value === undefined || value.trim() === ''
      ? undefined
      : value.trim();
  };
  const planId = readFlag(argv, '--plan') ?? pick(OT_ENV_KEYS.socialPlanId);
  const otUrl = pick(OT_ENV_KEYS.graphqlUrl);
  const otToken = pick(OT_ENV_KEYS.authToken);

  if (planId === undefined) {
    return {
      error: `pass --plan <social plan id> or set ${OT_ENV_KEYS.socialPlanId}`,
      ok: false,
    };
  }

  if (otUrl === undefined || otToken === undefined) {
    return {
      error: `${OT_ENV_KEYS.graphqlUrl} and ${OT_ENV_KEYS.authToken} must be set (in ${envPath} or the environment)`,
      ok: false,
    };
  }

  return {
    ok: true,
    value: {
      dryRun: argv.includes('--dry-run'),
      envPath,
      otToken,
      otUrl,
      planId,
    },
  };
};

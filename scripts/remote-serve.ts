/**
 * @description Reach the local developer app from a phone, over a private
 * network with HTTPS (docs/monorepo/phone-access.md).
 *
 *   pnpm run remote:serve   # https://<mac>.<tailnet>.ts.net → the developer app
 *   pnpm run remote:stop    # remove that forward
 *
 * The provider today is Tailscale, and it supplies exactly two things: the
 * private network and the certificate. It forwards one HTTPS port to the
 * developer app; all routing (`/api` included) stays in our own stack. Every
 * Tailscale-specific line lives in this file, so swapping the provider out
 * (Headscale, plain WireGuard plus a certificate) is local to it.
 *
 * NEVER point this at a public tunnel (ngrok, Cloudflare Tunnel, `tailscale
 * funnel`, ...). The local stack does not enforce the passkey gate on agents,
 * so the private network is its only protection.
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { createLogger, positionals, readEnvValue, run } from './utils/index.ts';

const logger = createLogger();

const DEVELOPER_ENV = 'applications/openthrottle-developer/.env';
const DEVELOPER_ENV_DEFAULT =
  'applications/openthrottle-developer/.env.default';
const HTTPS_PORT = '443';
const INSTALL_URL = 'https://tailscale.com/download';
/** Where the Mac App Store / standalone app keeps its CLI when it is not on PATH. */
const MAC_APP_CLI = '/Applications/Tailscale.app/Contents/MacOS/Tailscale';

/**
 * @description The parts of `tailscale status --json` this script reads.
 */
export interface TailnetStatus {
  /** Hostname without the trailing dot, e.g. `mac.tail1234.ts.net`. */
  readonly hostname: string;
  /** False until HTTPS certificates are enabled in the tailnet admin. */
  readonly httpsEnabled: boolean;
  /** `Running` once logged in and connected. */
  readonly state: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * @description Parse `tailscale status --json`. Returns undefined for output
 * that is not the expected shape, so the caller reports it instead of guessing.
 */
export const parseTailnetStatus = (json: string): TailnetStatus | undefined => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch {
    return undefined;
  }

  if (!isRecord(parsed) || typeof parsed.BackendState !== 'string') {
    return undefined;
  }

  const self = isRecord(parsed.Self) ? parsed.Self : {};
  const dnsName = typeof self.DNSName === 'string' ? self.DNSName : '';
  const certDomains = Array.isArray(parsed.CertDomains)
    ? parsed.CertDomains
    : [];

  return {
    hostname: dnsName.replace(/\.$/, ''),
    httpsEnabled: certDomains.length > 0,
    state: parsed.BackendState,
  };
};

/**
 * @description True when the dev server's `DEV_ALLOWED_HOSTS` already lets the
 * tailnet hostname through Vite's host check.
 */
export const isHostAllowed = (
  allowedHosts: string,
  hostname: string,
): boolean =>
  allowedHosts
    .split(',')
    .map((host) => host.trim())
    .includes(hostname);

/** The developer app's port: its `.env`, then `.env.default`, then 6020. */
const developerPort = (): string =>
  readEnvValue(
    DEVELOPER_ENV,
    'PORT',
    readEnvValue(DEVELOPER_ENV_DEFAULT, 'PORT', '6020'),
  );

/** Find the CLI: `TAILSCALE_BIN`, then PATH, then the Mac app bundle. */
const findCli = (): string | undefined => {
  const override = process.env.TAILSCALE_BIN;
  if (override) return override;

  const onPath = run('which', ['tailscale'], { allowFailure: true });
  if (onPath.exitCode === 0 && onPath.stdout) return onPath.stdout;

  return existsSync(MAC_APP_CLI) ? MAC_APP_CLI : undefined;
};

const exitWithInstallHint = (): never => {
  logger.fail('Tailscale is not installed.');
  logger.detail(`1. Install it on this Mac and on your phone: ${INSTALL_URL}`);
  logger.detail('2. Sign in to the same tailnet on both.');
  logger.detail('3. Re-run: pnpm run remote:serve');
  process.exit(1);
};

const readStatus = (cli: string): TailnetStatus => {
  const result = run(cli, ['status', '--json'], { allowFailure: true });
  const status = parseTailnetStatus(result.stdout);

  if (!status) {
    logger.fail('Could not read `tailscale status --json`.');
    logger.detail(result.stderr || 'Is the Tailscale app running?');
    process.exit(1);
  }

  if (status.state !== 'Running') {
    logger.fail(`Tailscale is not connected (state: ${status.state}).`);
    logger.detail('Open the Tailscale app and sign in, then re-run.');
    process.exit(1);
  }

  if (!status.httpsEnabled) {
    logger.fail('HTTPS certificates are not enabled for this tailnet.');
    logger.detail(
      'Tailnet admin → DNS: enable MagicDNS and HTTPS Certificates, then re-run.',
    );
    process.exit(1);
  }

  return status;
};

const serve = (cli: string): void => {
  const status = readStatus(cli);
  const port = developerPort();

  logger.heading('remote:serve — the developer app over the tailnet');
  logger.step(
    `${cli} serve --bg --https=${HTTPS_PORT} http://localhost:${port}`,
  );
  run(
    cli,
    ['serve', '--bg', `--https=${HTTPS_PORT}`, `http://localhost:${port}`],
    { stdio: 'inherit' },
  );

  logger.success(`https://${status.hostname}`);
  logger.detail('Open it on any device signed in to this tailnet.');

  const allowedHosts = readEnvValue(DEVELOPER_ENV, 'DEV_ALLOWED_HOSTS');
  if (!isHostAllowed(allowedHosts, status.hostname)) {
    logger.warn('The dev server will refuse this hostname until you allow it:');
    logger.detail(
      `Add to ${DEVELOPER_ENV}: DEV_ALLOWED_HOSTS="${status.hostname}"`,
    );
    logger.detail('then restart: pnpm nx run openthrottle-developer:dev');
  }

  const apiUrl = readEnvValue(DEVELOPER_ENV, 'API_URL_EXTERNAL');
  if (apiUrl && !apiUrl.startsWith('/')) {
    logger.warn(`API_URL_EXTERNAL is ${apiUrl}; a phone cannot reach that.`);
    logger.detail(`Set API_URL_EXTERNAL="/api" in ${DEVELOPER_ENV}.`);
  }
};

const stop = (cli: string): void => {
  logger.step(`${cli} serve --https=${HTTPS_PORT} off`);
  run(cli, ['serve', `--https=${HTTPS_PORT}`, 'off'], { stdio: 'inherit' });
  logger.success('Tailnet forward removed.');
};

const main = (): void => {
  const [command = 'serve'] = positionals();
  const cli = findCli() ?? exitWithInstallHint();

  if (command === 'stop') {
    stop(cli);
    return;
  }

  if (command !== 'serve') {
    logger.fail(`Unknown command "${command}" — use serve or stop.`);
    process.exit(1);
  }

  serve(cli);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

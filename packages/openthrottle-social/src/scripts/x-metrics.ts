/**
 * @description The daily metrics step: `pnpm run social:x-metrics -- --plan <id> [--dry-run]`,
 * run after `social:x-post`. Records views on tweets posted a day or more ago, in one X read.
 * Exit codes: 0 recorded or nothing due, 1 X or OpenThrottle failed, 2 configuration is missing.
 */
import { EXIT_CODES } from '../config/exit-codes.ts';
import { createOtClient } from '../utils/createOtClient.ts';
import { createXClient } from '../utils/createXClient.ts';
import { createXTokenClient } from '../utils/createXTokenClient.ts';
import { loadSocialConfig } from '../utils/loadSocialConfig.ts';
import { redactSecrets } from '../utils/redactSecrets.ts';
import { runXMetrics } from '../utils/runXMetrics.ts';

const config = await loadSocialConfig(process.argv.slice(2), process.env);

if (!config.ok) {
  console.error(`x-metrics: ${config.error}`);
  process.exit(EXIT_CODES.config);
}

const { dryRun, envPath, otToken, otUrl, planId } = config.value;
const tokens = createXTokenClient({ envPath, fetch, now: Date.now });
const result = await runXMetrics({
  dryRun,
  now: () => new Date(),
  ot: createOtClient({ fetch, token: otToken, url: otUrl }),
  planId,
  redact: (text) => redactSecrets(text, [otToken, ...tokens.secrets()]),
  x: () => createXClient({ fetch, getAccessToken: tokens.getAccessToken }),
});

result.lines.forEach((line) => {
  console.log(line);
});
process.exit(result.exitCode);

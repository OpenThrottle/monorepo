/**
 * @description The daily poster: `pnpm run social:x-post -- --plan <id> [--dry-run]`. Posts the
 * social plan's approved tweet for today (America/Los_Angeles) and prints one line per step.
 * Exit codes: 0 posted or nothing to post, 1 a task went BLOCKED or a service was unreachable,
 * 2 configuration is missing, 3 a media post waits for a human.
 */
import { EXIT_CODES } from '../config/exit-codes.ts';
import { createOtClient } from '../utils/createOtClient.ts';
import { createXClient } from '../utils/createXClient.ts';
import { createXTokenClient } from '../utils/createXTokenClient.ts';
import { loadSocialConfig } from '../utils/loadSocialConfig.ts';
import { redactSecrets } from '../utils/redactSecrets.ts';
import { runXPost } from '../utils/runXPost.ts';

const config = await loadSocialConfig(process.argv.slice(2), process.env);

if (!config.ok) {
  console.error(`x-post: ${config.error}`);
  process.exit(EXIT_CODES.config);
}

const { dryRun, envPath, otToken, otUrl, planId } = config.value;
const tokens = createXTokenClient({ envPath, fetch, now: Date.now });
const result = await runXPost({
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

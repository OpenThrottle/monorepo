import { checkNodeVersion } from './config/config.utils.ts';

/**
 * @description Refuse to boot on an unsupported Node. Imported FIRST by
 * `main.ts`, so it runs before any other module touches a newer Node API and
 * fails with a stack trace that names nothing.
 */
const nodeVersionCheck = checkNodeVersion(process.versions.node);

if (nodeVersionCheck.kind === 'unsupported') {
  console.error(`🔴 ${nodeVersionCheck.message}`);
  process.exit(1);
}

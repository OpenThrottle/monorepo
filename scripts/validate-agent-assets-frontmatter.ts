/**
 * @description CI entrypoint: validate `.agents/` skill/persona/rule frontmatter (D5).
 */

import { validateAgentAssetsOnDisk } from '@openthrottle/openthrottle-skills';

import { createLogger } from './lib/index.ts';

const logger = createLogger();

const formatIssue = (issue: {
  readonly field: string;
  readonly message: string;
  readonly path: string;
}): string => `${issue.path}: [${issue.field}] ${issue.message}`;

const run = (): void => {
  const monorepoRoot = process.cwd();
  const { errors, warnings } = validateAgentAssetsOnDisk({ monorepoRoot });

  for (const warning of warnings) {
    logger.warn(
      `validate-agent-assets-frontmatter: warning: ${formatIssue(warning)}`,
    );
  }

  if (errors.length > 0) {
    for (const error of errors) {
      logger.fail(
        `validate-agent-assets-frontmatter: error: ${formatIssue(error)}`,
      );
    }
    logger.fail(
      `validate-agent-assets-frontmatter: ${errors.length} error(s); fix skill/persona frontmatter under .agents/`,
    );
    process.exit(1);
  }

  logger.success(
    `validate-agent-assets-frontmatter: OK (${warnings.length} rule warning(s))`,
  );
};

run();

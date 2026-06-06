/**
 * @description CI entrypoint: validate `.agents/` skill/persona/rule frontmatter (D5).
 */

import { validateAgentAssetsOnDisk } from '@openthrottle/openthrottle-skills';

const formatIssue = (issue: {
  readonly field: string;
  readonly message: string;
  readonly path: string;
}): string => `${issue.path}: [${issue.field}] ${issue.message}`;

const run = (): void => {
  const monorepoRoot = process.cwd();
  const { errors, warnings } = validateAgentAssetsOnDisk({ monorepoRoot });

  for (const warning of warnings) {
    console.warn(
      `validate-agent-assets-frontmatter: warning: ${formatIssue(warning)}`,
    );
  }

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(
        `validate-agent-assets-frontmatter: error: ${formatIssue(error)}`,
      );
    }
    console.error(
      `validate-agent-assets-frontmatter: ${errors.length} error(s); fix skill/persona frontmatter under .agents/`,
    );
    process.exit(1);
  }

  console.log(
    `validate-agent-assets-frontmatter: OK (${warnings.length} rule warning(s))`,
  );
};

run();

/**
 * Shell commands risky enough that a pending plan-inbox message should be seen
 * before they run. Each pattern is anchored to a command position (line start,
 * or after `;`, `&`, `|`, `(`, `{`, a newline, `sudo` or `xargs`) so `grep rm`
 * or `form` never matches, and keeps its arguments inside one command
 * (`[^;&|\n]*`) so a chained safe command cannot borrow a flag.
 */
const AT_COMMAND = String.raw`(?:^|[;&|({\n]|\b(?:sudo|xargs|then|do|else))\s*`;
const GIT = String.raw`git\s+(?:-[cC]\s+\S+\s+)*`;
const ANY_ARGS = String.raw`[^;&|\n]*`;

/**
 * Patterns for commands that delete, rewrite history, publish or migrate.
 *
 * @public
 */
export const DESTRUCTIVE_COMMAND_PATTERNS: readonly RegExp[] = [
  new RegExp(`${AT_COMMAND}rm\\s`),
  new RegExp(`${AT_COMMAND}rmdir\\s`),
  new RegExp(`${AT_COMMAND}${GIT}rm\\s`),
  new RegExp(`${AT_COMMAND}${GIT}clean\\b`),
  new RegExp(`${AT_COMMAND}${GIT}reset\\b${ANY_ARGS}--hard\\b`),
  new RegExp(`${AT_COMMAND}${GIT}rebase\\b`),
  new RegExp(`${AT_COMMAND}${GIT}commit\\b${ANY_ARGS}--amend\\b`),
  new RegExp(`${AT_COMMAND}${GIT}push\\b`),
  new RegExp(`${AT_COMMAND}${GIT}branch\\s(?:${ANY_ARGS}\\s)?-D\\b`),
  new RegExp(
    `${AT_COMMAND}${GIT}branch\\s${ANY_ARGS}--delete\\b${ANY_ARGS}--force\\b`,
  ),
  new RegExp(
    `${AT_COMMAND}${GIT}branch\\s${ANY_ARGS}--force\\b${ANY_ARGS}--delete\\b`,
  ),
  new RegExp(`${AT_COMMAND}gh\\s+pr\\s+create\\b`),
  new RegExp(
    `${AT_COMMAND}(?:pnpm|npm|yarn)\\s+(?:run\\s+)?(?:\\S+\\s+)*?(?:worktree:remove|database:migrate)\\b`,
  ),
];

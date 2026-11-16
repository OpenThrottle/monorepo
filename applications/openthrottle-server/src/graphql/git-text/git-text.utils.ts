import {
  ATTRIBUTION_ALTERNATION,
  BRANCH_PREFIX,
  BRANCH_SLUG_MAX,
  COMMIT_LINE_MAX,
  COMMIT_TYPE_BY_CATEGORY,
  DEFAULT_COMMIT_TYPE,
} from './git-text.constants.ts';
import type { GitTextPlan, GitTextTask } from './git-text.types.ts';

const ATTRIBUTION_LINE = new RegExp(`^\\s*${ATTRIBUTION_ALTERNATION}`, 'iu');
const ATTRIBUTION_INLINE = new RegExp(ATTRIBUTION_ALTERNATION, 'iu');

/** @description The conventional-commit type a plan or task category implies. */
export function commitTypeFor(category: string | null): string {
  const key = category?.trim().toLowerCase() ?? '';

  return COMMIT_TYPE_BY_CATEGORY[key] ?? DEFAULT_COMMIT_TYPE;
}

/**
 * @description Drop every line that is a tool/model credit, the same lines the attribution guard
 * strips from a commit message. Line-anchored, so prose that merely mentions "made with care"
 * survives.
 */
export function stripAttributionLines(text: string): string {
  return text
    .split('\n')
    .filter((line) => !ATTRIBUTION_LINE.test(line))
    .join('\n');
}

/**
 * @description Cut a single-line field (a subject, a PR title) at the first credit, where an inline
 * one lands ("feat: thing 🤖"), and trim what is left.
 */
export function stripAttributionInline(line: string): string {
  const match = ATTRIBUTION_INLINE.exec(line);

  return (match == null ? line : line.slice(0, match.index)).trimEnd();
}

/**
 * @description Greedy word wrap to `width`, paragraph by paragraph. A list item's continuation lines
 * keep its indent, and a line inside a fenced code block is never touched.
 */
export function wrapText(text: string, width: number): string {
  let inFence = false;

  return text
    .split('\n')
    .flatMap((line) => {
      if (line.trimStart().startsWith('```')) inFence = !inFence;

      if (inFence || line.length <= width) return [line];

      const indent = /^\s*(?:[-*]\s+|\d+\.\s+)?/u.exec(line)?.[0] ?? '';
      const hanging = ' '.repeat(indent.length);
      const words = line.slice(indent.length).split(/\s+/u);
      const lines: string[] = [];
      let current = indent;

      for (const word of words) {
        const isFirst = current === indent || current === hanging;
        const candidate = isFirst ? `${current}${word}` : `${current} ${word}`;

        if (candidate.length > width && !isFirst) {
          lines.push(current);
          current = `${hanging}${word}`;
        } else {
          current = candidate;
        }
      }

      lines.push(current);

      return lines;
    })
    .join('\n');
}

/** @description A git-safe branch name for a plan: `ot/<slug>-<first 8 of its id>`. */
export function branchNameFor(plan: GitTextPlan): string {
  const slug = plan.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .slice(0, BRANCH_SLUG_MAX)
    .replace(/-+$/u, '');
  const suffix = plan.id.slice(0, 8);

  return slug === ''
    ? `${BRANCH_PREFIX}${suffix}`
    : `${BRANCH_PREFIX}${slug}-${suffix}`;
}

/**
 * @description `type(scope): subject`, or `type: subject` when there is no scope, credit-free and
 * within commitlint's header length. No scope is the portable default: a repo's commitlint
 * `scope-enum` may not contain any name this server could guess.
 */
export function conventionalHeader(
  type: string,
  scope: string | null,
  title: string,
): string {
  const cleaned = stripAttributionInline(title.trim().replace(/\s+/gu, ' '));
  const subject = cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
  const prefix = scope == null ? type : `${type}(${scope})`;
  const header = `${prefix}: ${subject.replace(/\.+$/u, '')}`;

  return header.length <= COMMIT_LINE_MAX
    ? header
    : `${header.slice(0, COMMIT_LINE_MAX - 1).trimEnd()}…`;
}

/**
 * @description A per-task commit message: header from the task, body from its summary (else its
 * description), wrapped to commitlint's body width, then the Plan-Id / Task-Id footers.
 */
export function commitMessageFor(
  plan: GitTextPlan,
  task: GitTextTask,
  scope: string | null,
): string {
  const type = commitTypeFor(task.category ?? plan.category);
  const header = conventionalHeader(type, scope, task.title);
  const prose = stripAttributionLines(
    (task.summary ?? task.description ?? '').trim(),
  );
  const body = prose === '' ? null : wrapText(prose, COMMIT_LINE_MAX);
  const footers = `Plan-Id: ${plan.id}\nTask-Id: ${task.id}`;

  return [header, body, footers].filter((part) => part != null).join('\n\n');
}

/** @description The PR title: a conventional header for the plan as a whole. */
export function pullRequestTitleFor(
  plan: GitTextPlan,
  scope: string | null,
): string {
  return conventionalHeader(commitTypeFor(plan.category), scope, plan.title);
}

/** The plan's PR summary: its summary (else first description paragraph) plus a line per task. */
function summaryFor(plan: GitTextPlan, tasks: readonly GitTextTask[]): string {
  const intro = (plan.summary ?? plan.description ?? '')
    .trim()
    .split(/\n\s*\n/u)[0]
    ?.trim();
  const taskLines = tasks.map((task) => {
    const unfinished = task.status === 'COMPLETED' ? '' : ` (${task.status})`;

    return `- ${task.title}${unfinished}`;
  });

  return [intro === '' ? null : intro, taskLines.join('\n')]
    .filter((part) => part != null && part !== '')
    .join('\n\n');
}

/**
 * @description Fill a repo's own PR template: the summary replaces the body of its first section,
 * and every other heading, checklist and comment stays exactly as the template wrote it, prompts
 * included, because those are the author's to answer. A template with no heading gets the summary
 * above it.
 */
export function fillPullRequestTemplate(
  template: string,
  summary: string,
): string {
  const lines = template.replace(/\r\n/gu, '\n').trim().split('\n');
  const isHeading = (line: string): boolean => {
    return /^#{1,6} /u.test(line);
  };
  const first = lines.findIndex(isHeading);

  if (first === -1) return `${summary}\n\n${lines.join('\n')}`;

  const afterFirst = lines.slice(first + 1);
  const nextOffset = afterFirst.findIndex(isHeading);
  const rest = nextOffset === -1 ? [] : afterFirst.slice(nextOffset);

  return [
    ...lines.slice(0, first + 1),
    '',
    summary,
    ...(rest.length === 0 ? [] : ['', ...rest]),
  ].join('\n');
}

/**
 * @description The PR body. With the target repo's template, that template filled
 * ({@link fillPullRequestTemplate}); without one, this repo's template headings. Testing keeps its
 * TODO either way: the server knows what changed, not how to prove it, and an invented test plan
 * is worse than an honest gap. Always ends with the Plan-Id footer.
 */
export function pullRequestBodyFor(
  plan: GitTextPlan,
  tasks: readonly GitTextTask[],
  template: string | null,
): string {
  const summary = summaryFor(plan, tasks);
  const hasTemplate = template != null && template.trim() !== '';
  const filled = hasTemplate
    ? fillPullRequestTemplate(template, summary)
    : defaultBody(summary);

  return stripAttributionLines(`${filled}\n\nPlan-Id: ${plan.id}`);
}

/** The body on {@link PULL_REQUEST_TEMPLATE_HEADINGS}, for a caller that sends no template. */
function defaultBody(summary: string): string {
  return [
    '# Summary',
    summary,
    '## Testing',
    '- [ ] Pipelines should be passing\n- [ ] **TODO:** Provide steps to test the changes fully',
    '## Review focus',
    '<!-- Where a reviewer should look hardest: decisions you made, anything you are unsure of, what breaks if this is wrong and how to roll it back. "Nothing unusual" is a fine answer. -->',
    '## Follow-ups',
    [
      '- [ ] Out-of-scope work found here is filed as its own OT plan (tagged `follow-up`), not folded into this PR',
      '- [ ] Friction an agent or a reviewer hit is fed back into the system — a skill, an `AGENTS.md` line, a lint rule, a test or a check — so the next run does not hit it',
    ].join('\n'),
  ].join('\n\n');
}

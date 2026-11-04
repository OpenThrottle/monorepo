/**
 * Pure builders for the host-written plan-run PR title and body — the deterministic fallback the
 * finalize step publishes when no agent-drafted body is available. All I/O (git, GraphQL, the
 * template file) happens in `finalize-plan-run.ts`; this module only shapes text so every rule is
 * unit-testable without a stub runner.
 */

/**
 * @description Opens a host-written PR body; a refresh only rewrites a body still wrapped in these
 * markers.
 * @public
 */
export const PLAN_RUN_BODY_OPEN_MARKER = '<!-- ot:plan-run-body -->';

/**
 * @description Closes a host-written PR body.
 * @public
 */
export const PLAN_RUN_BODY_CLOSE_MARKER = '<!-- /ot:plan-run-body -->';

/** Used when the repository has no `.github/pull_request_template.md`. */
export const PR_TEMPLATE_FALLBACK =
  '# Summary\n\n**TODO:** Describe the changes in this PR.\n\n## Testing\n\n- [ ] Pipelines should be passing\n';

const SUMMARY_TODO = '**TODO:** Describe the changes in this PR.';
const TODO_MARKER = '**TODO:**';
const DESCRIPTION_EXCERPT_MAX = 600;
const LINE_EXCERPT_MAX = 200;

/** Conventional types, most significant first. Unknown types rank after all of these. */
const TYPE_SIGNIFICANCE = [
  'feat',
  'fix',
  'perf',
  'refactor',
  'revert',
  'build',
  'ci',
  'test',
  'docs',
  'style',
  'chore',
] as const;

const CONVENTIONAL_SUBJECT =
  /^(?<type>[a-z]+)(?:\((?<scope>[^)]+)\))?(?<breaking>!)?: \S/;

export interface PlanRunPrCommit {
  readonly sha: string;
  readonly subject: string;
}

export interface PlanRunPrPlan {
  readonly description: string | undefined;
  readonly summary: string | undefined;
  readonly title: string;
}

export interface PlanRunPrTask {
  readonly id: string;
  readonly status: string;
  readonly summary: string | undefined;
  readonly title: string;
}

export interface BuildPlanRunPrBodyParams {
  readonly commits: readonly PlanRunPrCommit[];
  readonly footerTaskIds: readonly string[];
  readonly plan: PlanRunPrPlan | undefined;
  readonly planId: string;
  readonly tasks: readonly PlanRunPrTask[];
  readonly template: string;
}

export interface ResolvePlanRunPrTitleParams {
  readonly commits: readonly PlanRunPrCommit[];
  readonly plan: PlanRunPrPlan | undefined;
  readonly planId: string;
}

export interface SelectFooterTaskIdsParams {
  readonly rangeTaskIds: readonly string[];
  readonly taskIdsOnBase: ReadonlySet<string>;
  readonly tasks: readonly PlanRunPrTask[] | undefined;
}

const truncate = (text: string, max: number): string =>
  text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;

/**
 * @description First non-empty line of free prose, with list/heading markers stripped — task
 * summaries are often multi-paragraph Markdown and one line is what fits a bullet.
 */
const firstLine = (text: string | undefined): string | undefined => {
  const line = (text ?? '')
    .split('\n')
    .map((candidate) => candidate.trim().replace(/^(?:[-*+]\s+|#+\s+)/, ''))
    .find((candidate) => candidate !== '');

  return line === undefined ? undefined : truncate(line, LINE_EXCERPT_MAX);
};

/**
 * @description First prose paragraph of a plan description, skipping headings and tables, so the
 * fallback body carries the "why" without pasting the whole PRD.
 */
const descriptionExcerpt = (
  description: string | undefined,
): string | undefined => {
  const paragraph = (description ?? '')
    .split(/\n\s*\n/)
    .map((candidate) => candidate.trim())
    .find(
      (candidate) =>
        candidate !== '' &&
        !candidate.startsWith('#') &&
        !candidate.startsWith('|'),
    );

  return paragraph === undefined
    ? undefined
    : truncate(paragraph, DESCRIPTION_EXCERPT_MAX);
};

const bulletWithSummary = (task: PlanRunPrTask, suffix: string): string => {
  const detail = firstLine(task.summary);
  return detail === undefined
    ? `- ${task.title}${suffix}`
    : `- ${task.title}${suffix} — ${detail}`;
};

/**
 * @description Parses `git log --oneline --no-decorate` output (newest first) into commits.
 * @public
 */
export const parseOnelineLog = (stdout: string): PlanRunPrCommit[] =>
  stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .map((line) => {
      const space = line.indexOf(' ');
      return space === -1
        ? { sha: line, subject: '' }
        : { sha: line.slice(0, space), subject: line.slice(space + 1).trim() };
    });

/**
 * @description Collects `Task-Id:` trailer values from `git log --format=%b` output.
 * @public
 */
export const parseTaskIdTrailers = (stdout: string): string[] => {
  const ids = stdout
    .split('\n')
    .map((line) => /^Task-Id:\s*(?<id>\S+)\s*$/.exec(line.trim())?.groups?.id)
    .filter((id): id is string => id !== undefined);

  return [...new Set(ids)];
};

/**
 * @description The `Task-Id:` set the branch delivered, per github-squash § Footers: COMPLETED tasks
 * from OT (whether or not they produced a commit) minus ids already on the base branch. When OT is
 * unreachable (`tasks` undefined) the branch's own commit trailers are the only evidence left.
 * @public
 */
export const selectFooterTaskIds = (
  params: SelectFooterTaskIdsParams,
): string[] => {
  const { rangeTaskIds, taskIdsOnBase, tasks } = params;

  if (tasks === undefined) {
    return [...rangeTaskIds];
  }

  return tasks
    .filter((task) => task.status === 'COMPLETED')
    .map((task) => task.id)
    .filter((id) => !taskIdsOnBase.has(id));
};

/**
 * @description Conventional PR title. One commit keeps its subject. Several commits take the type
 * and scope of the most significant one with the plan title as the description, because the tip
 * subject describes only the last task.
 * @public
 */
export const resolvePlanRunPrTitle = (
  params: ResolvePlanRunPrTitleParams,
): string => {
  const { commits, plan, planId } = params;
  const fallback = `chore: complete plan ${planId.slice(0, 8)}`;
  const tipSubject = commits[0]?.subject ?? '';

  if (commits.length <= 1 || plan === undefined || plan.title.trim() === '') {
    return tipSubject !== '' ? tipSubject : fallback;
  }

  const parsed = commits
    .map((commit) => CONVENTIONAL_SUBJECT.exec(commit.subject)?.groups)
    .filter((groups) => groups !== undefined)
    .map((groups) => ({
      breaking: groups.breaking === '!',
      scope: groups.scope,
      type: groups.type ?? '',
    }));

  const rankOf = (type: string): number => {
    const index = TYPE_SIGNIFICANCE.findIndex(
      (candidate) => candidate === type,
    );
    return index === -1 ? TYPE_SIGNIFICANCE.length : index;
  };

  // `git log` lists newest first; reverse so ties go to the earliest commit on the branch.
  const best = [...parsed]
    .reverse()
    .reduce<(typeof parsed)[number] | undefined>(
      (current, candidate) =>
        current === undefined || rankOf(candidate.type) < rankOf(current.type)
          ? candidate
          : current,
      undefined,
    );

  if (best === undefined) {
    return tipSubject !== '' ? tipSubject : fallback;
  }

  const rawTitle = plan.title.trim().replace(/\.$/, '');
  const startsWithAcronym = /^[A-Z]{2}/.test(rawTitle);
  const description = startsWithAcronym
    ? rawTitle
    : `${rawTitle.charAt(0).toLowerCase()}${rawTitle.slice(1)}`;
  const scope = best.scope === undefined ? '' : `(${best.scope})`;
  const breaking = parsed.some((entry) => entry.breaking) ? '!' : '';

  return `${best.type}${scope}${breaking}: ${description}`;
};

const buildSummarySection = (params: BuildPlanRunPrBodyParams): string => {
  const { commits, plan, planId, tasks } = params;
  const blocks: string[] = [];

  if (plan === undefined) {
    blocks.push(`Plan \`${planId}\` run.`);
  } else {
    blocks.push(`**${plan.title.trim()}**`);
    const why = plan.summary?.trim() || descriptionExcerpt(plan.description);
    if (why !== undefined && why !== '') {
      blocks.push(why);
    }
  }

  const delivered = tasks
    .filter((task) => task.status === 'COMPLETED')
    .map((task) => bulletWithSummary(task, ''));
  if (delivered.length > 0) {
    blocks.push(delivered.join('\n'));
  }

  const notDelivered = tasks
    .filter((task) => task.status === 'BLOCKED' || task.status === 'SKIPPED')
    .map((task) => bulletWithSummary(task, ` (${task.status})`));
  if (notDelivered.length > 0) {
    blocks.push(`### Not delivered\n\n${notDelivered.join('\n')}`);
  }

  const commitLines =
    commits.length > 0
      ? commits.map((commit) => `- ${commit.subject} (\`${commit.sha}\`)`)
      : ['- No commits on this branch beyond the base.'];
  blocks.push(`### Commits\n\n${commitLines.join('\n')}`);

  return blocks.join('\n\n');
};

const buildTestingSteps = (tasks: readonly PlanRunPrTask[]): string[] =>
  tasks
    .filter((task) => task.status === 'COMPLETED')
    .flatMap((task) => {
      const detail = firstLine(task.summary);
      return detail === undefined
        ? []
        : [`- [ ] Check ${task.title}: ${detail}`];
    });

/**
 * @description Replaces the template's Testing TODO with steps from task summaries (or drops it),
 * then strips any TODO line left anywhere — the template's placeholder text must never ship.
 */
const fillTesting = (body: string, steps: readonly string[]): string => {
  const lines = body.split('\n');
  const firstTodo = lines.findIndex((line) => line.includes(TODO_MARKER));
  const filled =
    firstTodo === -1
      ? lines
      : [...lines.slice(0, firstTodo), ...steps, ...lines.slice(firstTodo + 1)];
  const withoutTodos = filled.filter((line) => !line.includes(TODO_MARKER));

  if (firstTodo !== -1 || steps.length === 0) {
    return withoutTodos.join('\n');
  }

  const hasTesting = withoutTodos.some((line) => /^#+\s+Testing\b/i.test(line));
  const joined = withoutTodos.join('\n').trimEnd();

  return hasTesting
    ? `${joined}\n${steps.join('\n')}`
    : `${joined}\n\n## Testing\n\n- [ ] Pipelines should be passing\n${steps.join('\n')}`;
};

/**
 * @description The host-written PR body: the repository template with its Summary filled from OT
 * plan/task data plus the branch's own commits, Testing steps from task summaries, one `Plan-Id:`
 * and every delivered `Task-Id:`, all wrapped in {@link PLAN_RUN_BODY_OPEN_MARKER} /
 * {@link PLAN_RUN_BODY_CLOSE_MARKER}. Never adds agent attribution.
 * @public
 */
export const buildPlanRunPrBody = (
  params: BuildPlanRunPrBodyParams,
): string => {
  const { footerTaskIds, planId, tasks, template } = params;
  const summary = buildSummarySection(params);

  const withSummary = template.includes(SUMMARY_TODO)
    ? template.replace(SUMMARY_TODO, summary)
    : `${template.trimEnd()}\n\n## Summary\n\n${summary}\n`;

  const filled = fillTesting(withSummary, buildTestingSteps(tasks));
  const footer = [
    `Plan-Id: ${planId}`,
    ...footerTaskIds.map((id) => `Task-Id: ${id}`),
  ].join('\n');

  return `${PLAN_RUN_BODY_OPEN_MARKER}\n${filled.trim()}\n\n${footer}\n${PLAN_RUN_BODY_CLOSE_MARKER}\n`;
};

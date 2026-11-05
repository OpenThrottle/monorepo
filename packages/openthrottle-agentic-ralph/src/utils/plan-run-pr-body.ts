/**
 * Pure builders for the host-written plan-run PR title and body — the deterministic fallback the
 * finalize step publishes when no agent-drafted body is available. All I/O (git, GraphQL, the
 * template file) happens in `finalize-plan-run.ts`; this module only shapes text so every rule is
 * unit-testable without a stub runner.
 */

import { createHash } from 'node:crypto';

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
export const PR_TEMPLATE_FALLBACK = `# Summary\n\n**TODO:** Describe the changes in this PR.\n\n## Testing\n\n- [ ] Pipelines should be passing\n`;

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

const truncate = (text: string, max: number): string => {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
};

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
export const parseOnelineLog = (stdout: string): PlanRunPrCommit[] => {
  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .map((line) => {
      const space = line.indexOf(' ');
      return space === -1
        ? { sha: line, subject: '' }
        : { sha: line.slice(0, space), subject: line.slice(space + 1).trim() };
    });
};

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
    .reduce<(typeof parsed)[number] | undefined>((current, candidate) => {
      const outranks =
        current === undefined || rankOf(candidate.type) < rankOf(current.type);
      return outranks ? candidate : current;
    }, undefined);

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

  const commitBullets = commits.map(
    (commit) => `- ${commit.subject} (\`${commit.sha}\`)`,
  );
  const noCommits = ['- No commits on this branch beyond the base.'];
  const commitLines = commits.length > 0 ? commitBullets : noCommits;
  blocks.push(`### Commits\n\n${commitLines.join('\n')}`);

  return blocks.join('\n\n');
};

const buildTestingSteps = (tasks: readonly PlanRunPrTask[]): string[] => {
  return tasks
    .filter((task) => task.status === 'COMPLETED')
    .flatMap((task) => {
      const detail = firstLine(task.summary);
      return detail === undefined
        ? []
        : [`- [ ] Check ${task.title}: ${detail}`];
    });
};

/**
 * @description Replaces the template's Testing TODO with steps from task summaries (or drops it),
 * then strips any TODO line left anywhere — the template's placeholder text must never ship.
 */
const fillTesting = (body: string, steps: readonly string[]): string => {
  const lines = body.split('\n');
  const firstTodo = lines.findIndex((line) => line.includes(TODO_MARKER));
  const hasTodo = firstTodo !== -1;
  const before = lines.slice(0, firstTodo);
  const after = lines.slice(firstTodo + 1);
  const filled = hasTodo ? [...before, ...steps, ...after] : lines;
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
  const footer = buildPlanRunPrFooter({ footerTaskIds, planId });

  return wrapPlanRunBody(`${filled.trim()}\n\n${footer}`);
};

/**
 * @description The authoritative trailer block: one `Plan-Id:` and every delivered `Task-Id:`, in
 * the github-squash § Footers shape.
 * @public
 */
export const buildPlanRunPrFooter = (params: {
  readonly footerTaskIds: readonly string[];
  readonly planId: string;
}): string => {
  return [
    `Plan-Id: ${params.planId}`,
    ...params.footerTaskIds.map((id) => `Task-Id: ${id}`),
  ].join('\n');
};

const DIGEST_LINE =
  /^<!-- ot:plan-run-digest sha256:(?<digest>[0-9a-f]{64}) -->$/;

const normalizeBodyText = (text: string): string => {
  return text.replace(/\r\n?/g, '\n').trim();
};

const digestOf = (inner: string): string => {
  return createHash('sha256')
    .update(normalizeBodyText(inner), 'utf8')
    .digest('hex');
};

/**
 * @description Wraps host-written PR text in {@link PLAN_RUN_BODY_OPEN_MARKER} /
 * {@link PLAN_RUN_BODY_CLOSE_MARKER} with a digest of the wrapped text, so a later refresh can tell
 * an untouched host body from one a human edited — including an edit made inside the markers.
 * @public
 */
export const wrapPlanRunBody = (inner: string): string => {
  const trimmed = normalizeBodyText(inner);

  return `${PLAN_RUN_BODY_OPEN_MARKER}\n${trimmed}\n<!-- ot:plan-run-digest sha256:${digestOf(trimmed)} -->\n${PLAN_RUN_BODY_CLOSE_MARKER}\n`;
};

/**
 * @description Who owns an existing PR body. `empty` and `host` may be refreshed; `edited` (no
 * marked block, more than one, a malformed one, or a digest that no longer matches) must be left
 * alone. Text outside the marked block never decides this on its own.
 * @public
 */
export type PlanRunPrBodyOwner = 'edited' | 'empty' | 'host';

/**
 * @description An existing PR body split around its one host-marked block. `before` and `after`
 * are the raw text outside the block, byte for byte; they belong to whoever wrote them (a human or
 * any bot) and a refresh always keeps them.
 * @public
 */
export type PlanRunPrBodyRegion =
  | { readonly after: string; readonly before: string; readonly owner: 'host' }
  | { readonly owner: 'edited' }
  | { readonly owner: 'empty' };

const countOccurrences = (text: string, needle: string): number => {
  return text.split(needle).length - 1;
};

/**
 * @description True when the marker at `index` starts a line and its line holds nothing else.
 */
const isMarkerOnOwnLine = (
  text: string,
  index: number,
  marker: string,
): boolean => {
  const end = index + marker.length;
  const startsLine = index === 0 || text[index - 1] === '\n';
  const rest = text.slice(end);
  const endsLine = rest === '' || /^\r?\n/.test(rest);

  return startsLine && endsLine;
};

/**
 * @description Finds the single host-marked block in a PR body and checks its digest. Only the
 * marked region is inspected: whatever sits above or below it is kept as-is and never makes the
 * body `edited`, so a footer any bot appends (or prose a human adds) doesn't block a refresh. No
 * bot's markers are known here, by design — a vendor allow-list would rot.
 * @public
 */
export const locatePlanRunPrBody = (body: string): PlanRunPrBodyRegion => {
  if (normalizeBodyText(body) === '') {
    return { owner: 'empty' };
  }

  const openIndex = body.indexOf(PLAN_RUN_BODY_OPEN_MARKER);
  const closeIndex = body.indexOf(PLAN_RUN_BODY_CLOSE_MARKER);
  const isSingleBlock =
    countOccurrences(body, PLAN_RUN_BODY_OPEN_MARKER) === 1 &&
    countOccurrences(body, PLAN_RUN_BODY_CLOSE_MARKER) === 1 &&
    openIndex < closeIndex &&
    isMarkerOnOwnLine(body, openIndex, PLAN_RUN_BODY_OPEN_MARKER) &&
    isMarkerOnOwnLine(body, closeIndex, PLAN_RUN_BODY_CLOSE_MARKER);

  if (!isSingleBlock) {
    return { owner: 'edited' };
  }

  const lines = normalizeBodyText(
    body.slice(openIndex + PLAN_RUN_BODY_OPEN_MARKER.length, closeIndex),
  ).split('\n');
  const digest = DIGEST_LINE.exec(lines[lines.length - 1] ?? '')?.groups
    ?.digest;
  const inner = lines.slice(0, -1).join('\n');

  const isHostOwned =
    lines.length >= 2 && digest !== undefined && digest === digestOf(inner);
  if (!isHostOwned) {
    return { owner: 'edited' };
  }

  return {
    after: body.slice(closeIndex + PLAN_RUN_BODY_CLOSE_MARKER.length),
    before: body.slice(0, openIndex),
    owner: 'host',
  };
};

/**
 * @description Classifies an existing PR body for the refresh decision; see {@link PlanRunPrBodyOwner}.
 * @public
 */
export const classifyPlanRunPrBody = (body: string): PlanRunPrBodyOwner => {
  return locatePlanRunPrBody(body).owner;
};

/**
 * @description The body a refresh publishes for a refreshable `region` (from
 * {@link locatePlanRunPrBody}): `replacement`, a freshly wrapped host block, in place of the old
 * marked region, with everything outside that region kept byte for byte. An empty body is
 * replaced outright.
 * @public
 */
export const replacePlanRunPrBodyRegion = (params: {
  readonly region: Exclude<PlanRunPrBodyRegion, { readonly owner: 'edited' }>;
  readonly replacement: string;
}): string => {
  const { region, replacement } = params;

  return region.owner === 'empty'
    ? replacement
    : `${region.before}${replacement.replace(/\n+$/, '')}${region.after}`;
};

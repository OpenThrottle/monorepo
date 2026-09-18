import type { ReportEnvelope } from './envelope.ts';
import { describeDetailLevel } from './envelope.ts';
import {
  isAgentConversationsMetrics,
  isDisabledAgentClisMetrics,
  isFavoriteModelsMetrics,
  isModelTokenUsageMetrics,
  isPlanRunsMetrics,
  isPlansMetrics,
  isScheduledAgentJobsMetrics,
  isSkillUsageMetrics,
  isSkillUsageOutcomeMetrics,
  isTagCountList,
  isTasksMetrics,
  isWorkSessionsMetrics,
} from './metric-type-guards.ts';
import type { WindowCount } from './window-count.ts';

/**
 * @description Renders a {@link ReportEnvelope} into the human-readable `report.md` companion to
 * `report.json`. The whole point of this file, per SKILL.md, is that an engineer can verify the
 * privacy claim by reading it — so every section here stays a small table of counts/labels, never
 * a dump of raw rows, and the "what is in this file" note and the skipped-metrics list are always
 * shown, never omitted when empty.
 */

const TABLE_ROW_LIMIT = 15;

function renderTable(
  headers: readonly string[],
  rows: readonly (readonly string[])[],
): string {
  if (rows.length === 0) {
    return '_(no rows in this window)_';
  }
  const headerLine = `| ${headers.join(' | ')} |`;
  const separatorLine = `| ${headers.map(() => '---').join(' | ')} |`;
  const bodyLines = rows.map((row) => `| ${row.join(' | ')} |`);
  return [headerLine, separatorLine, ...bodyLines].join('\n');
}

function capNote(totalCount: number, shownCount: number): string {
  return totalCount > shownCount
    ? `\n\n_Showing the top ${shownCount} of ${totalCount} rows._`
    : '';
}

function fmtInt(value: number | null | undefined): string {
  return value === null || value === undefined
    ? 'n/a'
    : value.toLocaleString('en-US');
}

function fmtRatio(value: number | null | undefined): string {
  return value === null || value === undefined
    ? 'n/a'
    : `${(value * 100).toFixed(1)}%`;
}

function fmtUsd(value: number | null | undefined): string {
  return value === null || value === undefined
    ? 'n/a'
    : `$${value.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
}

function fmtSeconds(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'n/a';
  if (value < 60) return `${value.toFixed(0)}s`;
  if (value < 3600) return `${(value / 60).toFixed(1)}m`;
  if (value < 86400) return `${(value / 3600).toFixed(1)}h`;
  return `${(value / 86400).toFixed(1)}d`;
}

function fmtMs(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'n/a';
  if (value < 1000) return `${value.toFixed(0)}ms`;
  return fmtSeconds(value / 1000);
}

/** Sorts a copy of `rows` by `count` descending (ties broken by original order) and caps it. */
function topByCount<T extends { readonly count: number }>(
  rows: readonly T[],
  limit: number = TABLE_ROW_LIMIT,
): { readonly shown: readonly T[]; readonly total: number } {
  const sorted = [...rows].sort((a, b) => b.count - a.count);
  return { shown: sorted.slice(0, limit), total: rows.length };
}

function fmtWindowCount(value: WindowCount): string {
  return `${fmtInt(value.count)} (source: ${value.source})`;
}

function renderWhatIsInThisFile(envelope: ReportEnvelope): string {
  return [
    '## What is in this file',
    '',
    'This report was generated entirely from a **local, read-only** connection to your ' +
      'OpenThrottle Postgres database. Nothing in this file — or in the run that produced it — ' +
      'was ever uploaded anywhere; there is no network call in this script other than that local ' +
      'Postgres connection. You can verify every claim below by reading `report.json` alongside ' +
      'this file: every number here traces back to a field in that envelope.',
    '',
    `- **Detail level:** \`${envelope.detailLevel}\` — ${describeDetailLevel(envelope.detailLevel)}`,
    '- **Never included, at any detail level today:** plan/task titles or descriptions, ' +
      'working-directory or file-system paths, git branch names, free-text args or invocation ' +
      'paths, or any provider `raw_usage` blob.',
    '- **Identity:** `actorKey` (if present) is a one-way hash of a git email, namespaced with a ' +
      'constant. It dedupes people across runs without naming anyone, and there is no way to read ' +
      'an email back out of it. It is pseudonymous, not anonymous: because the namespace is a ' +
      'public constant in the skill, someone holding a list of candidate emails (a repo git log, ' +
      'say) can hash those and see which one matches. Treat it as "stable id for this person", ' +
      'not as "unlinkable to this person".',
    '',
  ].join('\n');
}

function renderHeader(envelope: ReportEnvelope): string {
  const lines = [
    '# OpenThrottle Usage Report',
    '',
    `- **Window:** ${envelope.window.since} → ${envelope.window.until}`,
    `- **Generated at:** ${envelope.generatedAt}`,
    `- **Detail level:** \`${envelope.detailLevel}\``,
    `- **Repo:** ${envelope.repoSlug ?? '_none (no git remote)_'}`,
    `- **Schema version:** ${envelope.schemaVersion}`,
    `- **Migration high-water mark:** ${envelope.migrationHighWaterMark ?? 'n/a'}`,
    `- **Actor key:** ${envelope.actorKey ?? '_none (no git identity configured)_'}`,
    '',
  ];
  return lines.join('\n');
}

function renderHeadline(envelope: ReportEnvelope): string {
  const { metrics } = envelope;
  const plans = isPlansMetrics(metrics.plans) ? metrics.plans : undefined;
  const tasks = isTasksMetrics(metrics.tasks) ? metrics.tasks : undefined;
  const skillUsage = isSkillUsageMetrics(metrics.skill_usage)
    ? metrics.skill_usage
    : undefined;
  const modelUsage = isModelTokenUsageMetrics(metrics.model_token_usage)
    ? metrics.model_token_usage
    : undefined;

  const topSkills = skillUsage
    ? skillUsage.bySkill
        .slice(0, 3)
        .map((row) => `${row.skillName} (${fmtInt(row.count)})`)
        .join(', ')
    : undefined;
  const topModels = modelUsage
    ? modelUsage.byModel
        .slice(0, 3)
        .map(
          (row) =>
            `${row.provider}/${row.model} (${fmtInt(row.invocationCount)})`,
        )
        .join(', ')
    : undefined;
  const totalSpend = modelUsage
    ? modelUsage.byProvider.reduce((sum, row) => sum + row.costUsd, 0)
    : undefined;

  const days = Math.round(
    (new Date(envelope.window.until).getTime() -
      new Date(envelope.window.since).getTime()) /
      (24 * 60 * 60 * 1000),
  );

  const sentences = [
    `Over the last ${days} days,`,
    plans
      ? `${fmtInt(plans.completedInWindow.count)} plan(s) and`
      : 'plan data unavailable and',
    tasks
      ? `${fmtInt(tasks.completedInWindow.count)} task(s) were completed.`
      : 'task data unavailable.',
  ];

  const paragraph = [sentences.join(' ')];
  paragraph.push(
    topSkills
      ? `Top skills by invocation count: ${topSkills}.`
      : 'Skill-usage data unavailable for this window.',
  );
  paragraph.push(
    topModels
      ? `Top models by invocation count: ${topModels}.`
      : 'Model/token data unavailable for this window.',
  );
  paragraph.push(
    totalSpend !== undefined
      ? `Total tracked spend in window: ${fmtUsd(totalSpend)}.`
      : 'Spend data unavailable for this window.',
  );

  return ['## Headline', '', paragraph.join(' '), ''].join('\n');
}

function renderSkipped(envelope: ReportEnvelope): string {
  const lines = ['## Skipped metrics', ''];
  if (envelope.skipped.length === 0) {
    lines.push(
      'None — every metric family in this schema version could be computed against this ' +
        'database.',
    );
  } else {
    lines.push(
      "The following could not be computed on this box (usually because it's on an older " +
        'migration than this script expects):',
      '',
      renderTable(
        ['Metric', 'Reason'],
        envelope.skipped.map((entry) => [entry.name, entry.reason]),
      ),
    );
  }
  lines.push('');
  return lines.join('\n');
}

function renderPlans(envelope: ReportEnvelope): string {
  const plans = envelope.metrics.plans;
  if (!isPlansMetrics(plans)) return '';

  const rows = [
    ['Lifetime total', fmtInt(plans.lifetimeTotal)],
    ['Created in window', fmtWindowCount(plans.createdInWindow)],
    ['Completed in window', fmtWindowCount(plans.completedInWindow)],
    ['Zero-task plans', fmtInt(plans.zeroTaskPlanCount)],
    [
      'Time to complete (median)',
      fmtSeconds(plans.timeToCompleteInWindow.medianSeconds),
    ],
    [
      'Time to complete (p90)',
      fmtSeconds(plans.timeToCompleteInWindow.p90Seconds),
    ],
  ];

  return [
    '## Plans',
    '',
    renderTable(['Metric', 'Value'], rows),
    '',
    '**By status:**',
    '',
    renderTable(
      ['Status', 'Count'],
      plans.byStatus.map((row) => [row.status, fmtInt(row.count)]),
    ),
    '',
    '**By category:**',
    '',
    (() => {
      const { shown, total } = topByCount(plans.byCategory);
      return (
        renderTable(
          ['Category', 'Count'],
          shown.map((row) => [row.category, fmtInt(row.count)]),
        ) + capNote(total, shown.length)
      );
    })(),
    '',
  ].join('\n');
}

function renderPlanTags(envelope: ReportEnvelope): string {
  const tags = envelope.metrics.plan_tags;
  if (!isTagCountList(tags)) return '';

  const shown = tags.slice(0, TABLE_ROW_LIMIT);
  return [
    '## Plan tags',
    '',
    renderTable(
      ['Tag', 'Count'],
      shown.map((row) => [row.tag, fmtInt(row.count)]),
    ) + capNote(tags.length, shown.length),
    '',
  ].join('\n');
}

function renderTasks(envelope: ReportEnvelope): string {
  const tasks = envelope.metrics.tasks;
  if (!isTasksMetrics(tasks)) return '';

  const rows = [
    ['Lifetime total', fmtInt(tasks.lifetimeTotal)],
    ['Created in window', fmtWindowCount(tasks.createdInWindow)],
    ['Completed in window', fmtWindowCount(tasks.completedInWindow)],
    [
      'Cohort completion rate (in window)',
      fmtRatio(tasks.cohortCompletionRateInWindow),
    ],
    ['Tasks per plan (median)', fmtInt(tasks.tasksPerPlan.median)],
    ['Tasks per plan (p90)', fmtInt(tasks.tasksPerPlan.p90)],
    [
      'Tasks per plan (min / max)',
      `${fmtInt(tasks.tasksPerPlan.min)} / ${fmtInt(tasks.tasksPerPlan.max)}`,
    ],
  ];

  return [
    '## Tasks',
    '',
    renderTable(['Metric', 'Value'], rows),
    '',
    '**By status:**',
    '',
    renderTable(
      ['Status', 'Count'],
      tasks.byStatus.map((row) => [row.status, fmtInt(row.count)]),
    ),
    '',
    '**By category:**',
    '',
    (() => {
      const { shown, total } = topByCount(tasks.byCategory);
      return (
        renderTable(
          ['Category', 'Count'],
          shown.map((row) => [row.category, fmtInt(row.count)]),
        ) + capNote(total, shown.length)
      );
    })(),
    '',
  ].join('\n');
}

function renderTaskTags(envelope: ReportEnvelope): string {
  const tags = envelope.metrics.task_tags;
  if (!isTagCountList(tags)) return '';

  const shown = tags.slice(0, TABLE_ROW_LIMIT);
  return [
    '## Task tags',
    '',
    renderTable(
      ['Tag', 'Count'],
      shown.map((row) => [row.tag, fmtInt(row.count)]),
    ) + capNote(tags.length, shown.length),
    '',
  ].join('\n');
}

function renderSkillUsage(envelope: ReportEnvelope): string {
  const usage = envelope.metrics.skill_usage;
  if (!isSkillUsageMetrics(usage)) return '';

  const shownSkills = usage.bySkill.slice(0, TABLE_ROW_LIMIT);
  const activeDays = usage.dailyInvocations.length;

  return [
    '## Skill usage',
    '',
    renderTable(
      ['Metric', 'Value'],
      [
        ['Total invocations in window', fmtInt(usage.totalInWindow)],
        [
          'Distinct sessions',
          fmtInt(usage.sessionInvocations.distinctSessionCount),
        ],
        [
          'Invocations per session (median / p90)',
          `${fmtInt(usage.sessionInvocations.median)} / ${fmtInt(usage.sessionInvocations.p90)}`,
        ],
        ['Active days in window', fmtInt(activeDays)],
      ],
    ),
    '',
    '**By skill (skill, scope):**',
    '',
    renderTable(
      ['Skill', 'Scope', 'Count'],
      shownSkills.map((row) => [row.skillName, row.scope, fmtInt(row.count)]),
    ) + capNote(usage.bySkill.length, shownSkills.length),
    '',
    '**By agent type:**',
    '',
    renderTable(
      ['Agent type', 'Count'],
      usage.agentTypes.map((row) => [row.label, fmtInt(row.count)]),
    ),
    '',
    '**By hook event:**',
    '',
    renderTable(
      ['Hook event', 'Count'],
      usage.hookEventNames.map((row) => [row.label, fmtInt(row.count)]),
    ),
    '',
    '**By privacy level:**',
    '',
    renderTable(
      ['Privacy level', 'Count'],
      usage.privacyLevels.map((row) => [row.label, fmtInt(row.count)]),
    ),
    '',
  ].join('\n');
}

function renderSkillUsageOutcomes(envelope: ReportEnvelope): string {
  const outcomes = envelope.metrics.skill_usage_outcomes;
  if (!isSkillUsageOutcomeMetrics(outcomes)) return '';

  const shownDurations = outcomes.durationsBySkill.slice(0, TABLE_ROW_LIMIT);
  const shownMix = outcomes.outcomeMixBySkill.slice(0, TABLE_ROW_LIMIT);

  const sections = [
    '## Skill usage outcomes',
    '',
    '**Event outcome coverage** (partitions `skill_usage.totalInWindow`):',
    '',
    renderTable(
      ['Coverage', 'Count'],
      [
        ['Reported', fmtInt(outcomes.eventOutcomeCoverage.reported)],
        [
          'Legacy-assumed only',
          fmtInt(outcomes.eventOutcomeCoverage.legacyAssumedOnly),
        ],
        [
          'No outcome (abandonment signal)',
          fmtInt(outcomes.eventOutcomeCoverage.noOutcome),
        ],
      ],
    ),
    '',
    '**Overall outcome mix (reported only):**',
    '',
    renderTable(
      ['Outcome', 'Count'],
      outcomes.outcomeMixOverall.map((row) => [row.label, fmtInt(row.count)]),
    ),
    '',
    '**Outcome mix by skill:**',
    '',
    renderTable(
      ['Skill', 'Outcome', 'Count'],
      shownMix.map((row) => [row.skillName, row.outcome, fmtInt(row.count)]),
    ) + capNote(outcomes.outcomeMixBySkill.length, shownMix.length),
    '',
    '**Duration by skill (ms):**',
    '',
    renderTable(
      ['Skill', 'Median', 'p90', 'p99', 'Samples'],
      shownDurations.map((row) => [
        row.skillName,
        fmtMs(row.medianMs),
        fmtMs(row.p90Ms),
        fmtMs(row.p99Ms),
        fmtInt(row.sampleCount),
      ]),
    ) + capNote(outcomes.durationsBySkill.length, shownDurations.length),
    '',
  ];

  if (outcomes.outcomesBySource) {
    sections.push(
      '**Outcomes by source:**',
      '',
      renderTable(
        ['Source', 'Count'],
        outcomes.outcomesBySource.map((row) => [row.label, fmtInt(row.count)]),
      ),
      '',
    );
  }

  return sections.join('\n');
}

function renderModelTokenUsage(envelope: ReportEnvelope): string {
  const usage = envelope.metrics.model_token_usage;
  if (!isModelTokenUsageMetrics(usage)) return '';

  const shownModels = usage.byModel.slice(0, TABLE_ROW_LIMIT);
  const totalCost = usage.byProvider.reduce((sum, row) => sum + row.costUsd, 0);
  const totalTokens = usage.byProvider.reduce(
    (sum, row) => sum + row.totalTokens,
    0,
  );

  return [
    '## Model / token usage',
    '',
    renderTable(
      ['Metric', 'Value'],
      [
        ['Invocations in window', fmtInt(usage.invocationCountInWindow)],
        ['Total tokens', fmtInt(totalTokens)],
        ['Total cost', fmtUsd(totalCost)],
        ['Cache hit ratio', fmtRatio(usage.cacheHitRatio)],
        ['Days with usage', fmtInt(usage.dailyUsage.length)],
      ],
    ),
    '',
    '**By provider:**',
    '',
    renderTable(
      ['Provider', 'Invocations', 'Total tokens', 'Cost'],
      usage.byProvider.map((row) => [
        row.provider,
        fmtInt(row.invocationCount),
        fmtInt(row.totalTokens),
        fmtUsd(row.costUsd),
      ]),
    ),
    '',
    '**By model:**',
    '',
    renderTable(
      ['Provider', 'Model', 'Invocations', 'Total tokens', 'Cost'],
      shownModels.map((row) => [
        row.provider,
        row.model,
        fmtInt(row.invocationCount),
        fmtInt(row.totalTokens),
        fmtUsd(row.costUsd),
      ]),
    ) + capNote(usage.byModel.length, shownModels.length),
    '',
  ].join('\n');
}

function renderFavoriteModels(envelope: ReportEnvelope): string {
  const favorites = envelope.metrics.favorite_models;
  if (!isFavoriteModelsMetrics(favorites)) return '';

  return [
    '## Favorite models',
    '',
    `Total favorites: ${fmtInt(favorites.totalFavorites)}`,
    '',
    renderTable(
      ['Backend', 'Model', 'Count'],
      favorites.byBackendModel.map((row) => [
        row.backend,
        row.model,
        fmtInt(row.count),
      ]),
    ),
    '',
  ].join('\n');
}

function renderDisabledAgentClis(envelope: ReportEnvelope): string {
  const disabled = envelope.metrics.disabled_agent_clis;
  if (!isDisabledAgentClisMetrics(disabled)) return '';

  const { shown, total } = topByCount(disabled.byBackendModel);

  return [
    '## Disabled agent CLIs',
    '',
    `Total disables: ${fmtInt(disabled.totalDisables)}`,
    '',
    renderTable(
      ['Backend', 'Model', 'Count'],
      shown.map((row) => [
        row.backend,
        row.model ?? '_(whole agent)_',
        fmtInt(row.count),
      ]),
    ) + capNote(total, shown.length),
    '',
  ].join('\n');
}

function renderPlanRuns(envelope: ReportEnvelope): string {
  const runs = envelope.metrics.plan_runs;
  if (!isPlanRunsMetrics(runs)) return '';

  const shownGroups = runs.byBackendKindStatus.slice(0, TABLE_ROW_LIMIT);

  return [
    '## Plan runs',
    '',
    renderTable(
      ['Metric', 'Value'],
      [
        ['Total in window', fmtInt(runs.totalInWindow)],
        [
          'Runs per plan (median / p90)',
          `${fmtInt(runs.runsPerPlan.median)} / ${fmtInt(runs.runsPerPlan.p90)}`,
        ],
      ],
    ),
    '',
    '**Success rate by backend:**',
    '',
    renderTable(
      ['Backend', 'Total', 'Success rate'],
      runs.successRateByBackend.map((row) => [
        row.executionBackend,
        fmtInt(row.totalCount),
        fmtRatio(row.successRate),
      ]),
    ),
    '',
    '**By backend / kind / status:**',
    '',
    renderTable(
      ['Backend', 'Kind', 'Status', 'Count'],
      shownGroups.map((row) => [
        row.executionBackend,
        row.runKind,
        row.status,
        fmtInt(row.count),
      ]),
    ) + capNote(runs.byBackendKindStatus.length, shownGroups.length),
    '',
  ].join('\n');
}

function renderWorkSessions(envelope: ReportEnvelope): string {
  const sessions = envelope.metrics.work_sessions;
  if (!isWorkSessionsMetrics(sessions)) return '';

  const shown = sessions.byToolVersionModel.slice(0, TABLE_ROW_LIMIT);

  return [
    '## Work sessions',
    '',
    `Total in window: ${fmtInt(sessions.totalInWindow)}`,
    '',
    renderTable(
      [
        'Tool',
        'Version',
        'Model',
        'Sessions',
        'Median duration',
        'Sweeper-closed share',
      ],
      shown.map((row) => [
        row.toolName,
        row.toolVersion ?? 'n/a',
        row.model ?? 'n/a',
        fmtInt(row.sessionCount),
        fmtSeconds(row.medianDurationSeconds),
        fmtRatio(row.sweeperClosedShare),
      ]),
    ) + capNote(sessions.byToolVersionModel.length, shown.length),
    '',
  ].join('\n');
}

function renderAgentConversations(envelope: ReportEnvelope): string {
  const conversations = envelope.metrics.agent_conversations;
  if (!isAgentConversationsMetrics(conversations)) return '';

  return [
    '## Agent conversations',
    '',
    renderTable(
      ['Metric', 'Value'],
      [
        [
          'Conversations in window',
          fmtInt(conversations.conversationCountInWindow),
        ],
        [
          'Messages per conversation (median / p90)',
          `${fmtInt(conversations.messagesPerConversation.median)} / ${fmtInt(conversations.messagesPerConversation.p90)}`,
        ],
        [
          'Messages per conversation (min / max)',
          `${fmtInt(conversations.messagesPerConversation.min)} / ${fmtInt(conversations.messagesPerConversation.max)}`,
        ],
      ],
    ),
    '',
  ].join('\n');
}

function renderScheduledAgentJobs(envelope: ReportEnvelope): string {
  const jobs = envelope.metrics.scheduled_agent_jobs;
  if (!isScheduledAgentJobsMetrics(jobs)) return '';

  return [
    '## Scheduled agent jobs',
    '',
    renderTable(
      ['Metric', 'Value'],
      [
        ['Active jobs (current)', fmtInt(jobs.activeJobCount)],
        ['Runs in window', fmtInt(jobs.runsInWindow)],
      ],
    ),
    '',
    '**Run status mix:**',
    '',
    renderTable(
      ['Status', 'Count'],
      jobs.runStatusMix.map((row) => [row.label, fmtInt(row.count)]),
    ),
    '',
  ].join('\n');
}

/** Renders the full `report.md` body for `envelope`. Every section degrades to nothing (not an error) when its metric was skipped. */
export function renderMarkdownReport(envelope: ReportEnvelope): string {
  const sections = [
    renderHeader(envelope),
    renderWhatIsInThisFile(envelope),
    renderHeadline(envelope),
    renderSkipped(envelope),
    renderPlans(envelope),
    renderPlanTags(envelope),
    renderTasks(envelope),
    renderTaskTags(envelope),
    renderSkillUsage(envelope),
    renderSkillUsageOutcomes(envelope),
    renderModelTokenUsage(envelope),
    renderFavoriteModels(envelope),
    renderDisabledAgentClis(envelope),
    renderPlanRuns(envelope),
    renderWorkSessions(envelope),
    renderAgentConversations(envelope),
    renderScheduledAgentJobs(envelope),
  ].filter((section) => section.trim() !== '');

  return `${sections.join('\n')}\n`;
}

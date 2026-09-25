import { TABLE_ROW_LIMIT } from '../config/index.ts';
import { REPORT_TITLE, WHAT_IS_IN_THIS_FILE_COPY } from '../data/data.copy.ts';
import type { ReportEnvelope } from '../types/index.ts';
import { describeDetailLevel } from './envelope.ts';
import {
  formatInt,
  formatMs,
  formatRatio,
  formatSeconds,
  formatUsd,
  formatWindowCount,
  renderCapNote,
  renderTable,
  takeTopByCount,
} from './format.ts';
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
} from './metrics/type-guards.ts';

/**
 * @description Renders a {@link ReportEnvelope} into the human-readable `report.md` companion to
 * `report.json`. The whole point of this file, per README.md, is that an engineer can verify the
 * privacy claim by reading it — so every section here stays a small table of counts/labels, never
 * a dump of raw rows, and the "what is in this file" note and the skipped-metrics list are always
 * shown, never omitted when empty.
 */

function renderWhatIsInThisFile(envelope: ReportEnvelope): string {
  return [
    WHAT_IS_IN_THIS_FILE_COPY.heading,
    '',
    WHAT_IS_IN_THIS_FILE_COPY.intro,
    '',
    `- **Detail level:** \`${envelope.detailLevel}\` — ${describeDetailLevel(envelope.detailLevel)}`,
    WHAT_IS_IN_THIS_FILE_COPY.neverIncluded,
    WHAT_IS_IN_THIS_FILE_COPY.identity,
    '',
  ].join('\n');
}

function renderHeader(envelope: ReportEnvelope): string {
  const lines = [
    REPORT_TITLE,
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
        .map((row) => `${row.skillName} (${formatInt(row.count)})`)
        .join(', ')
    : undefined;
  const topModels = modelUsage
    ? modelUsage.byModel
        .slice(0, 3)
        .map(
          (row) =>
            `${row.provider}/${row.model} (${formatInt(row.invocationCount)})`,
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
      ? `${formatInt(plans.completedInWindow.count)} plan(s) and`
      : 'plan data unavailable and',
    tasks
      ? `${formatInt(tasks.completedInWindow.count)} task(s) were completed.`
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
      ? `Total tracked spend in window: ${formatUsd(totalSpend)}.`
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
    ['Lifetime total', formatInt(plans.lifetimeTotal)],
    ['Created in window', formatWindowCount(plans.createdInWindow)],
    ['Completed in window', formatWindowCount(plans.completedInWindow)],
    ['Zero-task plans', formatInt(plans.zeroTaskPlanCount)],
    [
      'Time to complete (median)',
      formatSeconds(plans.timeToCompleteInWindow.medianSeconds),
    ],
    [
      'Time to complete (p90)',
      formatSeconds(plans.timeToCompleteInWindow.p90Seconds),
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
      plans.byStatus.map((row) => [row.status, formatInt(row.count)]),
    ),
    '',
    '**By category:**',
    '',
    (() => {
      const { shown, total } = takeTopByCount(plans.byCategory);
      return (
        renderTable(
          ['Category', 'Count'],
          shown.map((row) => [row.category, formatInt(row.count)]),
        ) + renderCapNote(total, shown.length)
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
      shown.map((row) => [row.tag, formatInt(row.count)]),
    ) + renderCapNote(tags.length, shown.length),
    '',
  ].join('\n');
}

function renderTasks(envelope: ReportEnvelope): string {
  const tasks = envelope.metrics.tasks;
  if (!isTasksMetrics(tasks)) return '';

  const rows = [
    ['Lifetime total', formatInt(tasks.lifetimeTotal)],
    ['Created in window', formatWindowCount(tasks.createdInWindow)],
    ['Completed in window', formatWindowCount(tasks.completedInWindow)],
    [
      'Cohort completion rate (in window)',
      formatRatio(tasks.cohortCompletionRateInWindow),
    ],
    ['Tasks per plan (median)', formatInt(tasks.tasksPerPlan.median)],
    ['Tasks per plan (p90)', formatInt(tasks.tasksPerPlan.p90)],
    [
      'Tasks per plan (min / max)',
      `${formatInt(tasks.tasksPerPlan.min)} / ${formatInt(tasks.tasksPerPlan.max)}`,
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
      tasks.byStatus.map((row) => [row.status, formatInt(row.count)]),
    ),
    '',
    '**By category:**',
    '',
    (() => {
      const { shown, total } = takeTopByCount(tasks.byCategory);
      return (
        renderTable(
          ['Category', 'Count'],
          shown.map((row) => [row.category, formatInt(row.count)]),
        ) + renderCapNote(total, shown.length)
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
      shown.map((row) => [row.tag, formatInt(row.count)]),
    ) + renderCapNote(tags.length, shown.length),
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
        ['Total invocations in window', formatInt(usage.totalInWindow)],
        [
          'Distinct sessions',
          formatInt(usage.sessionInvocations.distinctSessionCount),
        ],
        [
          'Invocations per session (median / p90)',
          `${formatInt(usage.sessionInvocations.median)} / ${formatInt(usage.sessionInvocations.p90)}`,
        ],
        ['Active days in window', formatInt(activeDays)],
      ],
    ),
    '',
    '**By skill (skill, scope):**',
    '',
    renderTable(
      ['Skill', 'Scope', 'Count'],
      shownSkills.map((row) => [
        row.skillName,
        row.scope,
        formatInt(row.count),
      ]),
    ) + renderCapNote(usage.bySkill.length, shownSkills.length),
    '',
    '**By agent type:**',
    '',
    renderTable(
      ['Agent type', 'Count'],
      usage.agentTypes.map((row) => [row.label, formatInt(row.count)]),
    ),
    '',
    '**By hook event:**',
    '',
    renderTable(
      ['Hook event', 'Count'],
      usage.hookEventNames.map((row) => [row.label, formatInt(row.count)]),
    ),
    '',
    '**By privacy level:**',
    '',
    renderTable(
      ['Privacy level', 'Count'],
      usage.privacyLevels.map((row) => [row.label, formatInt(row.count)]),
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
        ['Reported', formatInt(outcomes.eventOutcomeCoverage.reported)],
        [
          'Legacy-assumed only',
          formatInt(outcomes.eventOutcomeCoverage.legacyAssumedOnly),
        ],
        [
          'No outcome (abandonment signal)',
          formatInt(outcomes.eventOutcomeCoverage.noOutcome),
        ],
      ],
    ),
    '',
    '**Overall outcome mix (reported only):**',
    '',
    renderTable(
      ['Outcome', 'Count'],
      outcomes.outcomeMixOverall.map((row) => [
        row.label,
        formatInt(row.count),
      ]),
    ),
    '',
    '**Outcome mix by skill:**',
    '',
    renderTable(
      ['Skill', 'Outcome', 'Count'],
      shownMix.map((row) => [row.skillName, row.outcome, formatInt(row.count)]),
    ) + renderCapNote(outcomes.outcomeMixBySkill.length, shownMix.length),
    '',
    '**Duration by skill (ms):**',
    '',
    renderTable(
      ['Skill', 'Median', 'p90', 'p99', 'Samples'],
      shownDurations.map((row) => [
        row.skillName,
        formatMs(row.medianMs),
        formatMs(row.p90Ms),
        formatMs(row.p99Ms),
        formatInt(row.sampleCount),
      ]),
    ) + renderCapNote(outcomes.durationsBySkill.length, shownDurations.length),
    '',
  ];

  if (outcomes.outcomesBySource) {
    sections.push(
      '**Outcomes by source:**',
      '',
      renderTable(
        ['Source', 'Count'],
        outcomes.outcomesBySource.map((row) => [
          row.label,
          formatInt(row.count),
        ]),
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
        ['Invocations in window', formatInt(usage.invocationCountInWindow)],
        ['Total tokens', formatInt(totalTokens)],
        ['Total cost', formatUsd(totalCost)],
        ['Cache hit ratio', formatRatio(usage.cacheHitRatio)],
        ['Days with usage', formatInt(usage.dailyUsage.length)],
      ],
    ),
    '',
    '**By provider:**',
    '',
    renderTable(
      ['Provider', 'Invocations', 'Total tokens', 'Cost'],
      usage.byProvider.map((row) => [
        row.provider,
        formatInt(row.invocationCount),
        formatInt(row.totalTokens),
        formatUsd(row.costUsd),
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
        formatInt(row.invocationCount),
        formatInt(row.totalTokens),
        formatUsd(row.costUsd),
      ]),
    ) + renderCapNote(usage.byModel.length, shownModels.length),
    '',
  ].join('\n');
}

function renderFavoriteModels(envelope: ReportEnvelope): string {
  const favorites = envelope.metrics.favorite_models;
  if (!isFavoriteModelsMetrics(favorites)) return '';

  return [
    '## Favorite models',
    '',
    `Total favorites: ${formatInt(favorites.totalFavorites)}`,
    '',
    renderTable(
      ['Backend', 'Model', 'Count'],
      favorites.byBackendModel.map((row) => [
        row.backend,
        row.model,
        formatInt(row.count),
      ]),
    ),
    '',
  ].join('\n');
}

function renderDisabledAgentClis(envelope: ReportEnvelope): string {
  const disabled = envelope.metrics.disabled_agent_clis;
  if (!isDisabledAgentClisMetrics(disabled)) return '';

  const { shown, total } = takeTopByCount(disabled.byBackendModel);

  return [
    '## Disabled agent CLIs',
    '',
    `Total disables: ${formatInt(disabled.totalDisables)}`,
    '',
    renderTable(
      ['Backend', 'Model', 'Count'],
      shown.map((row) => [
        row.backend,
        row.model ?? '_(whole agent)_',
        formatInt(row.count),
      ]),
    ) + renderCapNote(total, shown.length),
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
        ['Total in window', formatInt(runs.totalInWindow)],
        [
          'Runs per plan (median / p90)',
          `${formatInt(runs.runsPerPlan.median)} / ${formatInt(runs.runsPerPlan.p90)}`,
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
        formatInt(row.totalCount),
        formatRatio(row.successRate),
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
        formatInt(row.count),
      ]),
    ) + renderCapNote(runs.byBackendKindStatus.length, shownGroups.length),
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
    `Total in window: ${formatInt(sessions.totalInWindow)}`,
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
        formatInt(row.sessionCount),
        formatSeconds(row.medianDurationSeconds),
        formatRatio(row.sweeperClosedShare),
      ]),
    ) + renderCapNote(sessions.byToolVersionModel.length, shown.length),
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
          formatInt(conversations.conversationCountInWindow),
        ],
        [
          'Messages per conversation (median / p90)',
          `${formatInt(conversations.messagesPerConversation.median)} / ${formatInt(conversations.messagesPerConversation.p90)}`,
        ],
        [
          'Messages per conversation (min / max)',
          `${formatInt(conversations.messagesPerConversation.min)} / ${formatInt(conversations.messagesPerConversation.max)}`,
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
        ['Active jobs (current)', formatInt(jobs.activeJobCount)],
        ['Runs in window', formatInt(jobs.runsInWindow)],
      ],
    ),
    '',
    '**Run status mix:**',
    '',
    renderTable(
      ['Status', 'Count'],
      jobs.runStatusMix.map((row) => [row.label, formatInt(row.count)]),
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

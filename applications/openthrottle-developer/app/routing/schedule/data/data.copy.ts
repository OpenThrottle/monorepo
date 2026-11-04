/**
 * @description Single-sourced user-facing copy for the schedule routing area. The
 * component renders these and specs import the same constants, so a wording change
 * updates one place and no spec breaks on copy drift. Add new copy here rather than
 * inlining sentence-length literals in components.
 */
import type { GlobalFeatureOnboardingContent } from '@openthrottle/react-router-ui-global';
import { CalendarClockIcon } from 'lucide-react';

export const SCHEDULE_COPY = {
  activeRunsCancel: `Cancel`,
  activeRunsCancelRequested: `Cancelling…`,
  activeRunsHeading: `In flight`,
  activeRunsQueued: `Waiting to start`,
  cronLabel: `Cron pattern`,
  editPageDescription: `Edit a scheduled run's details.`,
  intervalHelp: `Counted from when the previous run finishes, so runs never overlap. At least 1 minute.`,
  intervalLabel: `Every (minutes)`,
  kindLabel: `Runs`,
  misfireHelp: `A run counts as late when it starts after the grace period, for example because the server was down. Either way, an outage gets at most one late run, and every run that does not happen appears in run history as missed.`,
  misfirePolicyLabel: `Late runs`,
  misfireThresholdLabel: `Grace period (minutes)`,
  missingCronPattern: `Enter a cron pattern.`,
  missingInterval: `Enter how many minutes to wait between runs.`,
  missingRunAt: `Enter when to run.`,
  newScheduleAction: `New schedule`,
  noSearchResults: `No schedules match your search.`,
  pageDescription: `Run an agent prompt on a cron schedule, on an interval, or once.`,
  pageTitle: `Schedule`,
  repositoryColumnLabel: `Repository`,
  repositoryEmptyState: `You have no registered repositories yet, so runs will use the workspace root.`,
  repositoryEmptyStateAction: `Add a repository`,
  repositoryHelp: `Runs execute in this checkout. The server resolves the directory, so there is no path to type.`,
  repositoryLabel: `Repository`,
  repositoryNoneOption: `Workspace root (default)`,
  runAtHelp: `An ISO 8601 time with its offset, e.g. 2026-11-03T09:00:00-08:00 or 2026-11-03T17:00:00Z. The schedule turns itself off after this run.`,
  runAtLabel: `Run at`,
  runNowAction: `Run now`,
  runNowError: `Could not queue the run.`,
  runNowQueued: `Run queued.`,
  runNowSubmitting: `Queueing…`,
  runNowViewRun: `View run`,
  runRepositoryHelp: `Where this run actually executed — a snapshot from when it fired, which may differ from the schedule's current target.`,
  runRepositoryLabel: `Repository`,
  searchLabel: `Search schedules`,
  searchPlaceholder: `Search schedules`,
  statEnabledTitle: `Enabled / total schedules`,
  statFailedTitle: `Failed today`,
  statInFlightTitle: `Running / queued`,
  statRanTodayTitle: `Ran today / succeeded`,
  tableRunningBadge: `Running`,
} as const;

/**
 * @description How a schedule's cadence reads in the table, the detail summary and search. Each
 * builder takes the one value its kind carries.
 */
export const SCHEDULE_CADENCE_COPY = {
  cron: (pattern: string, timezone: string | null): string =>
    `${pattern} (${timezone ?? 'UTC'})`,
  interval: (minutes: number): string =>
    minutes === 1 ? `Every minute` : `Every ${minutes} minutes`,
  once: (isoTime: string): string => `Once at ${isoTime}`,
  unknown: `Unknown schedule`,
} as const;

/**
 * @description Status cell of the scheduled-run tables. `usage_limited` is a run that stopped cleanly
 * on a Claude subscription usage limit; the cell says when it resumes (a continuation run exists) or
 * when the limit resets (none does).
 */
export const SCHEDULE_RUN_STATUS_CELL_COPY = {
  notResumedSuffix: `Not resumed automatically`,
  resetUnknown: `Reset time unknown`,
  resetsPrefix: `Resets at`,
  resumesPrefix: `Resumes after the reset at`,
} as const;

/**
 * @description New-user "teach-me-fast" onboarding copy for the schedule index,
 * shown when there are no scheduled jobs. Conforms to {@link GlobalFeatureOnboardingContent}
 * and is rendered through the shared `GlobalFeatureOnboarding` layout.
 */
export const SCHEDULE_ONBOARDING = {
  cta: { label: `Create your first schedule`, to: `/schedule/create` },
  icon: CalendarClockIcon,
  internalUsage: `We run our own housekeeping on schedules: nightly repo audits that open plans for what they find, recurring dependency and license sweeps, and morning digests — so the work is waiting for us instead of us remembering to kick it off.`,
  steps: [
    `Write the prompt you want the agent to run.`,
    `Pick the driver and model that should execute it.`,
    `Set the cron pattern and timezone for when it fires.`,
    `Save it — each run lands in the job's run history for review.`,
  ],
  tagline: `Put an agent on autopilot: run a prompt on a cron schedule and let recurring work happen without you.`,
  title: `Schedule`,
  useCases: [
    `Run an agent prompt on a cron — hourly, nightly, or weekly.`,
    `Generate recurring reports or digests on a fixed cadence.`,
    `Automate routine maintenance like audits and cleanup sweeps.`,
  ],
  whatItIs: `A scheduled job runs an agent prompt automatically on a cron pattern — pick a driver, model, and cadence, and it fires on its own. Every run is recorded so you can review what happened.`,
} satisfies GlobalFeatureOnboardingContent;

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

/**
 * @description The "Agent-created" marker and the approval gate. An `mcp` job came from an agent
 * through the MCP scheduling tools; with approval required it is stored disabled until a person
 * approves it, and Enable is refused by the server while it is pending.
 */
export const SCHEDULE_APPROVAL_COPY = {
  agentCreatedBadge: `Agent-created`,
  agentCreatedHint: `Created by an agent through the MCP scheduling tools.`,
  allowedCommandsLabel: `May run these commands without asking:`,
  approveAction: `Approve`,
  approveError: `Could not approve the schedule.`,
  approveSubmitting: `Approving…`,
  awaitingBadge: `Awaiting approval`,
  awaitingDescription: `An agent created this schedule. It stays disabled and cannot run until you approve it. Read the prompt first: approving enables it.`,
  awaitingHeading: `Awaiting approval`,
} as const;

/**
 * @description Webhook trigger setup on the schedule detail route, the one-time credential reveal, and
 * the delivery log. The operator guidance condenses the threat model in
 * docs/openthrottle/webhook-triggered-agent-jobs.md.
 */
export const SCHEDULE_WEBHOOK_COPY = {
  coalesceHelp: `Leading edge: the first delivery runs and the ones inside the window after it are recorded as coalesced. 0 turns it off.`,
  coalesceLabel: `Coalesce window (seconds)`,
  copied: `Copied`,
  copyAction: `Copy`,
  createAction: `Create webhook`,
  createError: `Could not create the webhook.`,
  customDeliveryIdHeaderHelp: `The sender's unique id per delivery, used to drop duplicates for 7 days. Blank dedupes on the body hash.`,
  customDeliveryIdHeaderLabel: `Delivery id header (optional)`,
  customEncodingLabel: `Signature encoding`,
  customSignatureHeaderLabel: `Signature header`,
  customTimestampHeaderHelp: `A header carrying a unix-seconds timestamp that is part of the signed string. Blank means no timestamp.`,
  customTimestampHeaderLabel: `Timestamp header (optional)`,
  deleteAction: `Delete webhook`,
  deleteConfirm: `Delete`,
  deleteDescription: `The URL stops working and the delivery log for this job is deleted. This cannot be undone.`,
  deleteTitle: `Delete this webhook?`,
  deliveriesAction: `View delivery log`,
  deliveriesBack: `Back to job`,
  deliveriesColumnDedupeKey: `Dedupe key`,
  deliveriesColumnHttp: `HTTP`,
  deliveriesColumnPrompt: `Rendered prompt`,
  deliveriesColumnReason: `Reason`,
  deliveriesColumnReceived: `Received`,
  deliveriesColumnRun: `Run`,
  deliveriesColumnStatus: `Status`,
  deliveriesDescription: `Every request that matched this job's webhook, accepted or rejected, newest first. Rows are kept for 7 days and raw bodies are never stored.`,
  deliveriesEmpty: `No deliveries yet. Send a request to the webhook URL and it shows up here.`,
  deliveriesFilterPrefix: `Filter`,
  deliveriesHeading: `Webhook deliveries`,
  deliveriesNoPrompt: `No prompt was rendered for this delivery.`,
  deliveriesNoReason: `—`,
  deliveriesPromptHide: `Hide prompt`,
  deliveriesPromptShow: `Show prompt`,
  deliveriesViewRun: `View run`,
  disabledScheduleHint: `The job's own Enabled switch only gates its schedule. A job used only by its webhook can stay disabled.`,
  enabledLabel: `Accept deliveries`,
  filterAdd: `Add filter`,
  filterCountError: `Use at most 16 filters.`,
  filterExistsNote: `No value needed.`,
  filterHelp: `All filters must match (AND), up to 16. A path is a dot path into the JSON payload (pull_request.base.ref) or header:<name> for an allowed header (header:x-github-event). There is no regex, by design.`,
  filterInError: `An "is one of" filter needs 1 to 32 comma-separated values.`,
  filterOpLabel: `Operator`,
  filterPathLabel: `Path`,
  filterRemove: `Remove filter`,
  filterValueError: `Enter a value for each filter that compares one.`,
  filterValueInHelp: `Comma-separated values, up to 32.`,
  filterValueLabel: `Value`,
  filtersHeading: `Filters`,
  intro: `Let an outside system (GitHub, CI, a monitor, any HTTP client) fire this job by POSTing JSON to a private URL. The webhook body is rendered into the job's prompt so the agent knows what happened. Every delivery must be signed with HMAC-SHA256.`,
  maxInFlightHelp: `Most webhook-triggered runs queued or running at once (1 to 10). Over it the sender gets 429 and retries later.`,
  maxInFlightLabel: `Max in flight`,
  presetLabel: `Signature preset`,
  rateLimitHelp: `Most accepted deliveries in a trailing minute (1 to 120).`,
  rateLimitLabel: `Rate limit (per minute)`,
  revealCopyHint: `Copy these now.`,
  revealDismiss: `I have copied them`,
  revealHeading: `Webhook credentials`,
  revealSecretLabel: `Signing secret`,
  revealUrlLabel: `Webhook URL`,
  revealWarning: `You won't see the URL or the secret again. They are not stored in a form that can be shown. If you lose them, rotate the webhook to get new ones.`,
  rotateAction: `Rotate URL and secret`,
  rotateConfirm: `Rotate now`,
  rotateDescription: `The URL and the secret are replaced together, and the old URL stops working immediately. Update the sender straight away or its deliveries will be refused.`,
  rotateTitle: `Rotate this webhook?`,
  rotatedLabel: `Rotated`,
  saveAction: `Save webhook`,
  saveError: `Could not save the webhook.`,
  setupHeading: `Webhook trigger`,
  signatureHeaderError: `Enter the header that carries the signature.`,
  statusDisabled: `Webhook off`,
  statusEnabled: `Webhook on`,
  tabLabel: `Webhook`,
  threatHeading: `Before you turn this on`,
  threatPoints: [
    `The payload is untrusted text. A genuine, correctly signed GitHub delivery can still carry words a stranger wrote, such as an issue title. Prompt injection is mitigated, not solved.`,
    `Point the job at a repository the agent may safely modify, and run it with the worktree setting so a bad run is disposable.`,
    `Use filters to limit which events fire. Prefer prompts that use the payload only to locate work (a PR number, a branch name) over prompts that tell the agent to act on payload text.`,
  ],
  tokenPrefixLabel: `URL token starts with`,
  toleranceHelp: `A delivery is rejected unless its signed timestamp is within this many seconds of now (30 to 900).`,
  toleranceLabel: `Timestamp tolerance (seconds)`,
  updateAction: `Save changes`,
} as const;

/**
 * @description Signing instructions per preset: which header carries the signature, what is signed,
 * and how replays are stopped. Shown beside the preset picker so the sender can be configured
 * without reading the design doc.
 */
export const SCHEDULE_WEBHOOK_SIGNING_COPY = {
  custom: {
    heading: `Custom signing`,
    steps: [
      `Compute HMAC-SHA256 with the secret as the key.`,
      `Send the digest, encoded as hex or base64, in the signature header you chose.`,
      `Without a timestamp header, sign the raw request body bytes. With one, sign the timestamp, a dot, then the raw body: <timestamp>.<body>.`,
      `Replays are stopped by the 7-day dedupe on the delivery id header, or the body hash when there is none.`,
    ],
  },
  generic: {
    heading: `OpenThrottle signing`,
    steps: [
      `Send a unix-seconds timestamp in the X-OT-Timestamp header.`,
      `Sign the string <timestamp>.<raw body> with HMAC-SHA256, using the secret as the key.`,
      `Send the lowercase hex digest in the X-OT-Signature header.`,
      `Send a unique id per delivery in X-OT-Webhook-Id so retries are deduplicated for 7 days.`,
    ],
  },
  github: {
    heading: `GitHub signing`,
    steps: [
      `In the GitHub webhook settings, set the content type to application/json and paste the secret.`,
      `GitHub signs the raw body with HMAC-SHA256 and sends sha256=<hex> in X-Hub-Signature-256.`,
      `GitHub sends no timestamp, so replays are stopped by the 7-day dedupe on X-GitHub-Delivery.`,
    ],
  },
} as const;

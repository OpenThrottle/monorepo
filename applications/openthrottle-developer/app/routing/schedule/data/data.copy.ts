/**
 * @description Single-sourced user-facing copy for the schedule routing area. The
 * component renders these and specs import the same constants, so a wording change
 * updates one place and no spec breaks on copy drift. Add new copy here rather than
 * inlining sentence-length literals in components.
 */
import { CalendarClockIcon } from 'lucide-react';
import type { GlobalFeatureOnboardingContent } from '@openthrottle/react-router-ui-global';

export const SCHEDULE_COPY = {
  newScheduleAction: `New schedule`,
  pageDescription: `Run an agent prompt on a cron schedule.`,
  pageTitle: `Schedule`,
} as const;

/**
 * @description New-user "teach-me-fast" onboarding copy for the schedule index,
 * shown when there are no scheduled jobs. Conforms to {@link GlobalFeatureOnboardingContent}
 * and is rendered through the shared `GlobalFeatureOnboarding` layout.
 */
export const SCHEDULE_ONBOARDING: GlobalFeatureOnboardingContent = {
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
};

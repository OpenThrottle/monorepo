/**
 * @description Single-sourced user-facing copy for the prompts routing area. The
 * component renders these and specs import the same constants, so a wording change
 * updates one place and no spec breaks on copy drift. Add new copy here rather than
 * inlining sentence-length literals in components.
 */
import { BrainIcon } from 'lucide-react';
import type { GlobalFeatureOnboardingContent } from '@openthrottle/react-router-ui-global';

/**
 * @description New-user "teach-me-fast" onboarding copy for the prompts index,
 * shown only when a user has zero prompts and no filters are active. Conforms to
 * {@link GlobalFeatureOnboardingContent} and is rendered through the shared
 * `GlobalFeatureOnboarding` layout.
 */
export const PROMPTS_ONBOARDING: GlobalFeatureOnboardingContent = {
  cta: { label: `Create your first prompt`, to: `/prompts/create` },
  icon: BrainIcon,
  internalUsage: `We hand-author Job_*, Before_*, and After_* prompts in .agents/prompts/, ingest them with database:import-agent-assets, and schedule the Job_* ones as recurring Ralph runs — nightly work-in-flight, weekly audits — so the document the agent executes is the same one we inspect here.`,
  steps: [
    `Give it a title and pick a type (agents, skills, commands, prompts, …).`,
    `Write the markdown body — the instructions the agent will follow.`,
    `Optionally set a repo filePath so it stays tied to the file on disk.`,
    `Save it — it lands in this list with IDs, fingerprints, and a debug snapshot.`,
  ],
  tagline: `Write the instructions once and keep them versioned: Job_* audits, lifecycle hooks, and agent docs in one list you can inspect, fingerprint, and debug.`,
  title: `Prompts`,
  useCases: [
    `Capture a Job_* prompt that files a plan on a cron.`,
    `Store a Before_ or After_ lifecycle hook injected around a run.`,
    `Debug a prompt that's already on disk: fingerprint, filePath, JSON snapshot for a ticket.`,
  ],
  whatItIs: `A prompt is a versioned AI workflow document — markdown instructions plus a type (agents, skills, commands, personas, …) and an optional repo path. Ingested from .agents/prompts/ (and related folders) or created here, then available to agents, scheduled jobs, and semantic search.`,
};

/**
 * Page chrome for the `/prompts` index — the heading and the line under it. The
 * "how it works" pitch lives in {@link PROMPTS_ONBOARDING}; this is only the
 * standing description of what the list below shows.
 */
export const PROMPTS_COPY = {
  pageDescription: `Open a prompt for versioning and debug: IDs, content fingerprints, repo filePath, and a JSON snapshot for tickets.`,
  pageTitle: `Prompts`,
} as const;

export const PROMPTS_EMPTY_COPY = {
  description: `Create your first prompt to get started.`,
  searchDescription: `Try clearing the search to see all prompts.`,
  searchTitle: `No prompts match your filters`,
  title: `No prompts yet`,
} as const;

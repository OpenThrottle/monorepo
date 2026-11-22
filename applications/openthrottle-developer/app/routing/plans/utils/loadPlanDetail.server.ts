import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';

import {
  PlanDetailCriticalDocument,
  PlanDetailInboxDocument,
  PlanDetailLedgerDocument,
  PlanDetailOutputChunksDocument,
  PlanDetailRunHistoryDocument,
  PlanDetailTagVocabularyDocument,
  PlanDetailWorkspaceRepositoriesDocument,
} from '~/__generated__/graphql';
import { markDeferredHandled } from '~/global/utils/markDeferredHandled';
import {
  loadComposerModels,
  loadDefaultAgent,
} from '~/routing/home/utils/models.server';
import { loadEnabledEditors } from '~/routing/plans/utils/loadEnabledEditors';
import { resolvePlanRunDefaultAgent } from '~/routing/plans/utils/plan-run-default-agent';

/**
 * @description Awaits ONE query — PlanDetailCritical (plan + tasksByPlanId) — and
 * returns every other key as a naked promise for RR8 Single Fetch to stream into
 * its own Suspense/Await region. Time-to-first-paint is therefore the cost of the
 * critical query alone, not of the slowest field on the page.
 *
 * Why: measured on the built server, `workspaceRepositories` costs ~1.3s cold
 * against ~10ms warm (its resolver re-inspects each checkout sequentially past a
 * 15-minute TTL), and it used to sit in the same round trip as the plan header.
 * The remaining deferred keys are cheap; they are deferred so that one failing
 * region degrades in place instead of 500-ing the whole plan page.
 *
 * 🚨 Standing rule: new fields default to DEFERRED. Only add to PlanDetailCritical
 * if the shell genuinely cannot render without it.
 */
export const loadPlanDetail = async (
  request: Request,
  planId: string | undefined,
) => {
  // 🔌 Short circuit: same key set, deferred keys pre-resolved so the component's
  // Await boundaries stay type-uniform with the real branch.
  if (!planId) {
    return {
      defaultAgent: Promise.resolve(null),
      enabledEditors: Promise.resolve([]),
      inboxMessages: Promise.resolve([]),
      ledger: Promise.resolve({ linkedArtifacts: [], ruleApplications: [] }),
      models: Promise.resolve([]),
      outputChunks: Promise.resolve([]),
      plan: null,
      runHistory: Promise.resolve({ planRunAuditRows: [], planRunMetrics: [] }),
      tagVocabulary: Promise.resolve([]),
      tasks: [],
      workspaceRepositories: Promise.resolve([]),
    };
  }

  // Every request is issued before the first await so nothing waterfalls. Each
  // deferred promise .then()s into exactly the shape its consumer wants, so no
  // component reaches into a query envelope.
  //
  // Deliberately NOT .catch()-ed: a rejection is the signal each region's
  // errorElement renders from, and swallowing it here would restore the old
  // behaviour where one bad field silently blanks its tab.
  const criticalPromise = executeGraphqlWithAuth(
    request,
    PlanDetailCriticalDocument,
    { planId },
  );

  // Editor deep links are a convenience, so they were already isolated with
  // their own catch (loadEnabledEditors degrades to []). Deferring it as well
  // keeps three toolbar buttons off the critical path entirely.
  const enabledEditors = loadEnabledEditors(request);

  // Discovered agent+model options for the Configuration tab's model picker — the same
  // shared helper the home composer and Run-skill modal use. Deferred because discovery
  // probes local model servers (cold-slow); it never rejects (degrades to []), so a failed
  // probe leaves the picker's empty state rather than an error region.
  const models = loadComposerModels(request);

  // The user's default agent, narrowed against the same discovered options so an
  // agent or model that is now disabled reads as "no preference" (D3). Seeds the
  // Run dialog for a plan whose own agent is unset. Neither half rejects.
  const defaultAgent = Promise.all([models, loadDefaultAgent(request)]).then(
    ([resolvedModels, stored]) =>
      resolvePlanRunDefaultAgent(stored, resolvedModels),
  );

  // The inbox has no error region of its own — it is optional chrome above the
  // tabs — so, like the editor links, a failure degrades it to an empty inbox
  // rather than rejecting.
  const inboxMessages = executeGraphqlWithAuth(
    request,
    PlanDetailInboxDocument,
    { planId },
  )
    .then((result) => result.planMessages)
    .catch(() => []);

  const ledger = executeGraphqlWithAuth(request, PlanDetailLedgerDocument, {
    planId,
  }).then((result) => ({
    linkedArtifacts: result.workArtifactsByPlan.artifacts ?? [],
    ruleApplications: result.ruleApplications ?? [],
  }));

  const outputChunks = executeGraphqlWithAuth(
    request,
    PlanDetailOutputChunksDocument,
    { planId },
  ).then((result) => result.planOutputStreamChunks ?? []);

  const runHistory = executeGraphqlWithAuth(
    request,
    PlanDetailRunHistoryDocument,
    { planId },
  ).then((result) => ({
    planRunAuditRows: result.planRunsByPlanId ?? [],
    planRunMetrics: result.metrics.recentPlanRunsMetrics ?? [],
  }));

  const tagVocabulary = executeGraphqlWithAuth(
    request,
    PlanDetailTagVocabularyDocument,
    {},
  ).then((result) => result.skillTagVocabulary.tags ?? []);

  const workspaceRepositories = executeGraphqlWithAuth(
    request,
    PlanDetailWorkspaceRepositoriesDocument,
    {},
  ).then((result) => result.workspaceRepositories ?? []);

  // Before the first await: a deferred rejection must never be "unhandled" —
  // neither while the critical query is still in flight, nor when it throws and
  // nothing is returned for React Router to own. Either case used to exit the
  // server process. The originals still reject for their errorElement.
  markDeferredHandled([
    defaultAgent,
    enabledEditors,
    inboxMessages,
    ledger,
    models,
    outputChunks,
    runHistory,
    tagVocabulary,
    workspaceRepositories,
  ]);

  const critical = await criticalPromise;

  return {
    defaultAgent,
    enabledEditors,
    inboxMessages,
    ledger,
    models,
    outputChunks,
    plan: critical.plan ?? null,
    runHistory,
    tagVocabulary,
    tasks: critical.tasksByPlanId ?? [],
    workspaceRepositories,
  };
};

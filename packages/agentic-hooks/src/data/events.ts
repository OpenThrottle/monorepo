/**
 * Event construction + GraphQL input mapping. Tool-neutral: an adapter hands in
 * a NormalizedInvocation and gets back the durable event shape.
 */
import { resolveGitBranch } from '../config/env';
import { applyPrivacy, DEFAULT_PRIVACY_LEVEL } from '../utils/privacy';
import { detectScope } from '../utils/scope';
import type {
  NormalizedInvocation,
  OutcomeEvent,
  PrivacyLevel,
  SkillUsageOutcome,
  UsageEvent,
} from '../types';

/** @public */
export const RECORD_SKILL_USAGE_MUTATION = `
mutation RecordSkillUsage($input: RecordSkillUsageInput!) {
  recordSkillUsage(input: $input) {
    id
    skillName
  }
}
`;

/** @public */
export const RECORD_SKILL_USAGE_OUTCOME_MUTATION = `
mutation RecordSkillUsageOutcome($input: RecordSkillUsageOutcomeInput!) {
  recordSkillUsageOutcome(input: $input) {
    id
    skillName
    outcome
  }
}
`;

/** @public */
export const SKILL_USAGE_OUTCOMES: Readonly<Record<string, SkillUsageOutcome>> =
  Object.freeze({
    ABANDONED: 'abandoned',
    ERROR: 'error',
    SUCCESS: 'success',
  });

/**
 * Build a tool-neutral usage event from an adapter's NormalizedInvocation.
 * Returns null when there is no skill name to attribute.
 *
 * @public
 */
export const buildUsageEvent = ({
  normalized,
  repoRoot,
  source,
  privacyLevel = DEFAULT_PRIVACY_LEVEL,
  timestamp = new Date().toISOString(),
  gitBranch,
}: {
  gitBranch?: string;
  normalized: NormalizedInvocation | null;
  privacyLevel?: PrivacyLevel;
  repoRoot: string;
  source?: string;
  timestamp?: string;
}): UsageEvent | null => {
  if (!normalized || !normalized.skill_name) {
    return null;
  }

  const cwd = normalized.cwd || repoRoot;
  const scope = detectScope(normalized.skill_name, repoRoot);
  const args = applyPrivacy(privacyLevel, normalized.args);
  const resolvedSource = source ?? normalized.source ?? undefined;

  const event: UsageEvent = {
    args,
    cwd,
    git_branch: gitBranch ?? resolveGitBranch(repoRoot),
    invocation_path: normalized.invocation_path ?? null,
    privacy_level: privacyLevel,
    scope,
    session_id: normalized.session_id ?? null,
    skill_name: normalized.skill_name,
    timestamp,
  };

  if (resolvedSource) {
    event.source = resolvedSource;
  }
  if (normalized.agent_id) {
    event.agent_id = normalized.agent_id;
  }
  if (normalized.agent_type) {
    event.agent_type = normalized.agent_type;
  }
  if (normalized.tool_use_id) {
    event.tool_use_id = normalized.tool_use_id;
  }
  if (normalized.prompt_id) {
    event.prompt_id = normalized.prompt_id;
  }
  if (normalized.hook_event_name) {
    event.hook_event_name = normalized.hook_event_name;
  }

  return event;
};

/**
 * Build an outcome enrichment event for our skills (Phase 4). Additive — never
 * a replacement for harness start capture. Returns null on bad input.
 *
 * @public
 */
export const buildOutcomeEvent = ({
  skillName,
  outcome,
  repoRoot,
  sessionId = null,
  toolUseId = null,
  durationMs = null,
  timestamp = new Date().toISOString(),
  gitBranch,
  cwd,
}: {
  cwd?: string | null;
  durationMs?: number | null;
  gitBranch?: string;
  // Accepts any string and validates at runtime (a JSONL/JS caller may hand in
  // a bad value); the guard below narrows it to a SkillUsageOutcome.
  outcome: string;
  repoRoot: string;
  sessionId?: string | null;
  skillName: string;
  timestamp?: string;
  toolUseId?: string | null;
}): OutcomeEvent | null => {
  const name = typeof skillName === 'string' ? skillName.trim() : '';
  if (!name) {
    return null;
  }
  if (outcome !== 'success' && outcome !== 'abandoned' && outcome !== 'error') {
    return null;
  }

  const scope = detectScope(name, repoRoot);
  const resolvedCwd = cwd || repoRoot;
  const resolvedDuration =
    durationMs == null || Number.isNaN(Number(durationMs))
      ? null
      : Math.max(0, Math.round(Number(durationMs)));

  return {
    cwd: resolvedCwd,
    duration_ms: resolvedDuration,
    event_kind: 'outcome',
    git_branch: gitBranch ?? resolveGitBranch(repoRoot),
    outcome,
    scope,
    session_id: sessionId,
    skill_name: name,
    timestamp,
    tool_use_id: toolUseId,
  };
};

/**
 * Map a usage event → RecordSkillUsageInput (camelCase).
 *
 * @public
 */
export const toRecordSkillUsageInput = (
  event: UsageEvent,
): Record<string, unknown> => {
  const input: Record<string, unknown> = {
    occurredAt: event.timestamp,
    scope: event.scope,
    skillName: event.skill_name,
  };

  if (event.source != null) {
    input.source = event.source;
  }
  if (event.args !== undefined) {
    input.args = event.args;
  }
  if (event.cwd != null) {
    input.cwd = event.cwd;
  }
  if (event.git_branch != null && event.git_branch !== '') {
    input.gitBranch = event.git_branch;
  }
  if (event.session_id != null) {
    input.sessionId = event.session_id;
  }
  if (event.privacy_level != null) {
    input.privacyLevel = event.privacy_level;
  }
  if (event.invocation_path != null) {
    input.invocationPath = event.invocation_path;
  }
  if (event.hook_event_name != null) {
    input.hookEventName = event.hook_event_name;
  }
  if (event.agent_id != null) {
    input.agentId = event.agent_id;
  }
  if (event.agent_type != null) {
    input.agentType = event.agent_type;
  }
  if (event.tool_use_id != null) {
    input.toolUseId = event.tool_use_id;
  }
  if (event.prompt_id != null) {
    input.promptId = event.prompt_id;
  }

  return input;
};

/**
 * Map an outcome event → RecordSkillUsageOutcomeInput (camelCase).
 *
 * @public
 */
export const toRecordSkillUsageOutcomeInput = (
  event: OutcomeEvent,
): Record<string, unknown> => {
  const input: Record<string, unknown> = {
    occurredAt: event.timestamp,
    outcome: event.outcome,
    skillName: event.skill_name,
  };

  if (event.scope != null) {
    input.scope = event.scope;
  }
  if (event.cwd != null) {
    input.cwd = event.cwd;
  }
  if (event.git_branch != null && event.git_branch !== '') {
    input.gitBranch = event.git_branch;
  }
  if (event.session_id != null) {
    input.sessionId = event.session_id;
  }
  if (event.tool_use_id != null) {
    input.toolUseId = event.tool_use_id;
  }
  if (event.duration_ms != null) {
    input.durationMs = event.duration_ms;
  }

  return input;
};

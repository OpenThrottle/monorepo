/**
 * @description Work-ledger tools: record_artifact, attach_session_subject, end_session.
 * These let an agent self-report the outputs it produced (git commits, PRs, documents)
 * and tie its work to a plan/task, under a session opened lazily on first use (design §4.2).
 * The session id is process-managed (see ../session/current-session.ts), never a tool arg.
 * An X-OT-Session-Id header is sent so server-side side effects can attribute to this session.
 */

import { z } from 'zod';
import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import type {
  AttachWorkSessionSubjectMutation,
  EndWorkSessionMutation,
  RecordWorkArtifactMutation,
} from '../__generated__/graphql.js';
import {
  AttachWorkSessionSubjectDocument,
  EndWorkSessionDocument,
  RecordWorkArtifactDocument,
} from '../__generated__/graphql.js';
import type { GenericResult } from '../types/index.ts';
import { getAuthToken } from '../auth/get-auth-token.ts';
import {
  clearCurrentSession,
  ensureWorkSession,
  getCurrentSessionId,
} from '../session/current-session.ts';
import { invalidArgsContent } from '../utils/errors.ts';
import { runTool } from '../utils/tool-result.ts';

const sessionHeaders = (
  sessionId: string,
): { headers: Record<string, string> } => ({
  headers: { 'X-OT-Session-Id': sessionId },
});

// ── record_artifact ────────────────────────────────────────────────────────

type RecordArtifactResult = GenericResult<{
  artifact: RecordWorkArtifactMutation['recordWorkArtifact'];
}>;

export const recordArtifactToolParameters = z.object({
  message: z.string().nullable().optional(),
  payloadJson: z.string().min(1),
  type: z.string().min(1),
});

export const recordArtifactToolDescription =
  'Record an output you produced in the current work session (opened automatically): a git_commit, pull_request, document, or deployment. payloadJson is the JSON payload for the type, e.g. git_commit {"repo":"owner/repo","sha":"<sha>"}, pull_request {"repo":"owner/repo","number":123}, document {"url":"..."}. Self-report artifacts as you create them.';

export async function recordArtifactToolHandler(
  args: z.infer<typeof recordArtifactToolParameters>,
): Promise<RecordArtifactResult> {
  const parsed = recordArtifactToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error.message);
  }

  return runTool<{
    artifact: RecordWorkArtifactMutation['recordWorkArtifact'];
  }>('record_artifact', async () => {
    const token = getAuthToken();
    const sessionId = await ensureWorkSession(token);
    if (sessionId == null) {
      throw new Error('Could not open a work session to record the artifact.');
    }

    const result = await executeGraphqlWithAuth(
      token,
      RecordWorkArtifactDocument,
      {
        input: {
          message: parsed.data.message ?? null,
          payloadJson: parsed.data.payloadJson,
          sessionId,
          type: parsed.data.type,
        },
      },
      sessionHeaders(sessionId),
    );

    const artifact = result?.recordWorkArtifact ?? null;
    if (!artifact) return null;

    const text = `Recorded ${parsed.data.type} artifact in session ${sessionId}.\n${JSON.stringify(artifact, null, 2)}`;
    return { structuredContent: { artifact }, text };
  });
}

// ── attach_session_subject ───────────────────────────────────────────────────

type AttachSubjectResult = GenericResult<{
  subject: AttachWorkSessionSubjectMutation['attachWorkSessionSubject'];
}>;

export const attachSessionSubjectToolParameters = z.object({
  planId: z.string().uuid(),
  taskId: z.string().uuid().nullable().optional(),
});

export const attachSessionSubjectToolDescription =
  'Attach the current work session to a plan (and optionally a task), so the artifacts you record are tied to that work. Opens a session automatically if none is active.';

export async function attachSessionSubjectToolHandler(
  args: z.infer<typeof attachSessionSubjectToolParameters>,
): Promise<AttachSubjectResult> {
  const parsed = attachSessionSubjectToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error.message);
  }

  return runTool<{
    subject: AttachWorkSessionSubjectMutation['attachWorkSessionSubject'];
  }>('attach_session_subject', async () => {
    const token = getAuthToken();
    const sessionId = await ensureWorkSession(token);
    if (sessionId == null) {
      throw new Error('Could not open a work session to attach the subject.');
    }

    const result = await executeGraphqlWithAuth(
      token,
      AttachWorkSessionSubjectDocument,
      {
        input: {
          planId: parsed.data.planId,
          sessionId,
          taskId: parsed.data.taskId ?? null,
        },
      },
      sessionHeaders(sessionId),
    );

    const subject = result?.attachWorkSessionSubject ?? null;
    if (!subject) return null;

    const text = `Attached session ${sessionId} to plan ${parsed.data.planId}${parsed.data.taskId ? ` / task ${parsed.data.taskId}` : ''}.`;
    return { structuredContent: { subject }, text };
  });
}

// ── end_session ──────────────────────────────────────────────────────────────

type EndSessionResult = GenericResult<{
  session: EndWorkSessionMutation['endWorkSession'];
}>;

export const endSessionToolParameters = z.object({
  summary: z.string().nullable().optional(),
});

export const endSessionToolDescription =
  'Close the current work session, optionally with a summary of what was done. No-op if no session is active.';

export async function endSessionToolHandler(
  args: z.infer<typeof endSessionToolParameters>,
): Promise<EndSessionResult> {
  const parsed = endSessionToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error.message);
  }

  return runTool<{ session: EndWorkSessionMutation['endWorkSession'] }>(
    'end_session',
    async () => {
      const sessionId = getCurrentSessionId();
      if (sessionId == null) {
        return {
          structuredContent: { session: null },
          text: 'No active work session.',
        };
      }

      const token = getAuthToken();
      const result = await executeGraphqlWithAuth(
        token,
        EndWorkSessionDocument,
        { input: { sessionId, summary: parsed.data.summary ?? null } },
        sessionHeaders(sessionId),
      );
      clearCurrentSession();

      const session = result?.endWorkSession ?? null;
      const text = `Closed work session ${sessionId}.`;
      return { structuredContent: { session }, text };
    },
  );
}

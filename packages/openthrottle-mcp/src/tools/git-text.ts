/**
 * @description draft_git_text: branch, commit and PR text drafted server-side from a plan's OT data,
 * so an agent edits a draft instead of composing git text ad hoc.
 */

import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import { z } from 'zod';

import type { GitTextDraftQuery } from '../__generated__/graphql.js';
import { GitTextDraftDocument } from '../__generated__/graphql.js';
import { getAuthToken } from '../auth/getAuthToken.ts';
import type { GenericResult } from '../types/index.ts';
import { invalidArgsContent } from '../utils/errors.ts';
import { runTool } from '../utils/runTool.ts';

type GitTextDraft = GitTextDraftQuery['gitTextDraft'];

type DraftGitTextResult = GenericResult<{ draft: GitTextDraft }>;

export const draftGitTextToolParameters = z
  .object({
    planId: z.string().uuid(),
    scope: z.string().min(1).nullable().optional(),
    taskId: z.string().uuid().nullable().optional(),
  })
  .strict();

export const draftGitTextToolDescription = `Draft git text for a plan from its OT data: a branch name, the PR title and body (repo template, Plan-Id footer), and with taskId that task's commit message (Plan-Id / Task-Id footers). scope = the Nx project touched (default monorepo). Never carries a tool or model credit. A draft: fill the PR's Testing TODO and edit before using it.`;

export async function draftGitTextToolHandler(
  args: z.infer<typeof draftGitTextToolParameters>,
): Promise<DraftGitTextResult> {
  const parsed = draftGitTextToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error);
  }

  return runTool<{ draft: GitTextDraft }>('draft_git_text', async () => {
    const token = getAuthToken();
    const result = await executeGraphqlWithAuth(token, GitTextDraftDocument, {
      input: {
        planId: parsed.data.planId,
        scope: parsed.data.scope ?? null,
        taskId: parsed.data.taskId ?? null,
      },
    });
    const draft = result.gitTextDraft;
    const sections = [
      `Branch: ${draft.branchName}`,
      draft.commitMessage == null
        ? null
        : `Commit message:\n${draft.commitMessage}`,
      `PR title: ${draft.pullRequestTitle}`,
      `PR body:\n${draft.pullRequestBody}`,
    ];

    return {
      structuredContent: { draft },
      text: sections.filter((section) => section != null).join('\n\n'),
    };
  });
}

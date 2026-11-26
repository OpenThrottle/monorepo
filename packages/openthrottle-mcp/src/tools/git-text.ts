/**
 * @description draft_git_text: branch, commit and PR text drafted server-side from a plan's OT data,
 * so an agent edits a draft instead of composing git text ad hoc.
 */

import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import { z } from 'zod';

import type { GitTextDraftFragment } from '../__generated__/graphql.js';
import { GitTextDraftDocument } from '../__generated__/graphql.js';
import type { GenericResult } from '../types/index.ts';
import { invalidArgsContent } from '../utils/errors.ts';
import { getAuthToken } from '../utils/getAuthToken.ts';
import { runTool } from '../utils/runTool.ts';

type DraftGitTextResult = GenericResult<{ draft: GitTextDraftFragment }>;

export const draftGitTextToolParameters = z
  .object({
    planId: z.string().uuid(),
    pullRequestTemplate: z.string().nullable().optional(),
    scope: z.string().min(1).nullable().optional(),
    taskId: z.string().uuid().nullable().optional(),
  })
  .strict();

export const draftGitTextToolDescription = `Draft git text for a plan from its OT data: a branch name, the PR title and body (Plan-Id footer), and with taskId that task's commit message (Plan-Id / Task-Id footers). Pass pullRequestTemplate (the target repo's template markdown) to fill that template, and scope only when you know one its commitlint accepts; omitted, the header is type: subject. Never carries a tool or model credit. A draft: answer its template prompts and edit before using it.`;

export async function draftGitTextToolHandler(
  args: z.infer<typeof draftGitTextToolParameters>,
): Promise<DraftGitTextResult> {
  const parsed = draftGitTextToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error);
  }

  return runTool<{ draft: GitTextDraftFragment }>(
    'draft_git_text',
    async () => {
      const token = getAuthToken();
      const result = await executeGraphqlWithAuth(token, GitTextDraftDocument, {
        input: {
          planId: parsed.data.planId,
          pullRequestTemplate: parsed.data.pullRequestTemplate ?? null,
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
    },
  );
}

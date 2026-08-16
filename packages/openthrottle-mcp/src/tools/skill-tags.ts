/**
 * @description Skill-tag vocabulary tool handlers + schemas: list_skill_tags, add_skill_tag,
 * rename_skill_tag, remove_skill_tag. Mirrors the skillTagVocabulary query and add/rename/remove
 * mutations via GraphQL only — GraphQL-only boundary, no core import, no Nest bootstrap in this
 * process. The vocabulary is per-user and seeded from the platform default on first read.
 */

import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import { z } from 'zod';

import {
  AddSkillTagDocument,
  RemoveSkillTagDocument,
  RenameSkillTagDocument,
  SkillTagVocabularyDocument,
} from '../__generated__/graphql.js';
import {
  AddSkillTagInputSchema,
  RemoveSkillTagInputSchema,
  RenameSkillTagInputSchema,
} from '../__generated__/schemas.ts';
import type { GenericResult } from '../types/index.ts';
import { getAuthToken } from '../auth/get-auth-token.ts';
import { invalidArgsContent } from '../utils/errors.ts';
import { runTool } from '../utils/tool-result.ts';

type SkillTag = {
  createdAt: string;
  id: string;
  tag: string;
  updatedAt: string;
  userId: string;
};

// ── list_skill_tags ──────────────────────────────────────────────────────────

export const listSkillTagsToolParameters = z.object({});

export const listSkillTagsToolDescription = `List the authenticated user's skill-tag vocabulary via the skillTagVocabulary GraphQL query. No arguments. The vocabulary is seeded from the platform default on first read, then user-owned. Returns the tags (alphabetical) and a total count.`;

export async function listSkillTagsToolHandler(
  _args: z.infer<typeof listSkillTagsToolParameters>,
): Promise<GenericResult<{ tags: SkillTag[]; totalCount: number }>> {
  return runTool<{ tags: SkillTag[]; totalCount: number }>(
    'list_skill_tags',
    async () => {
      const token = getAuthToken();
      const result = await executeGraphqlWithAuth(
        token,
        SkillTagVocabularyDocument,
        {},
      );
      const vocabulary = result?.skillTagVocabulary;
      if (!vocabulary) {
        return null;
      }

      const tags: SkillTag[] = vocabulary.tags.map((entry) => ({
        createdAt: entry.createdAt,
        id: entry.id,
        tag: entry.tag,
        updatedAt: entry.updatedAt,
        userId: entry.userId,
      }));

      const text =
        tags.length === 0
          ? 'Skill-tag vocabulary is empty.'
          : `Skill-tag vocabulary (${vocabulary.totalCount}): ${tags
              .map((entry) => entry.tag)
              .join(', ')}`;

      return {
        structuredContent: { tags, totalCount: vocabulary.totalCount },
        text,
      };
    },
  );
}

// ── add_skill_tag ────────────────────────────────────────────────────────────

export const addSkillTagToolParameters = AddSkillTagInputSchema();

export const addSkillTagToolDescription = `Add a kebab-case tag to the authenticated user's skill-tag vocabulary via the addSkillTag GraphQL mutation. Rejects non-kebab-case or duplicate tags.`;

export async function addSkillTagToolHandler(
  args: z.infer<typeof addSkillTagToolParameters>,
): Promise<GenericResult<{ tag: SkillTag }>> {
  const parsed = addSkillTagToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error);
  }

  return runTool<{ tag: SkillTag }>('add_skill_tag', async () => {
    const token = getAuthToken();
    const result = await executeGraphqlWithAuth(token, AddSkillTagDocument, {
      input: parsed.data,
    });
    const added = result?.addSkillTag;
    if (!added) {
      return null;
    }

    const tag: SkillTag = {
      createdAt: added.createdAt,
      id: added.id,
      tag: added.tag,
      updatedAt: added.updatedAt,
      userId: added.userId,
    };
    return { structuredContent: { tag }, text: `Added tag: ${tag.tag}` };
  });
}

// ── rename_skill_tag ─────────────────────────────────────────────────────────

export const renameSkillTagToolParameters = RenameSkillTagInputSchema();

export const renameSkillTagToolDescription = `Rename a tag in the authenticated user's skill-tag vocabulary via the renameSkillTag GraphQL mutation. Rejects when the source tag is absent or the target already exists.`;

export async function renameSkillTagToolHandler(
  args: z.infer<typeof renameSkillTagToolParameters>,
): Promise<GenericResult<{ tag: SkillTag }>> {
  const parsed = renameSkillTagToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error);
  }

  return runTool<{ tag: SkillTag }>('rename_skill_tag', async () => {
    const token = getAuthToken();
    const result = await executeGraphqlWithAuth(token, RenameSkillTagDocument, {
      input: parsed.data,
    });
    const renamed = result?.renameSkillTag;
    if (!renamed) {
      return null;
    }

    const tag: SkillTag = {
      createdAt: renamed.createdAt,
      id: renamed.id,
      tag: renamed.tag,
      updatedAt: renamed.updatedAt,
      userId: renamed.userId,
    };
    return {
      structuredContent: { tag },
      text: `Renamed tag ${parsed.data.from} → ${tag.tag}`,
    };
  });
}

// ── remove_skill_tag ─────────────────────────────────────────────────────────

export const removeSkillTagToolParameters = RemoveSkillTagInputSchema();

export const removeSkillTagToolDescription = `Remove a tag from the authenticated user's skill-tag vocabulary via the removeSkillTag GraphQL mutation. Returns whether a tag was removed.`;

export async function removeSkillTagToolHandler(
  args: z.infer<typeof removeSkillTagToolParameters>,
): Promise<GenericResult<{ removed: boolean }>> {
  const parsed = removeSkillTagToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error);
  }

  return runTool<{ removed: boolean }>('remove_skill_tag', async () => {
    const token = getAuthToken();
    const result = await executeGraphqlWithAuth(token, RemoveSkillTagDocument, {
      input: parsed.data,
    });
    const removed = result?.removeSkillTag ?? false;
    const text = removed
      ? `Removed tag: ${parsed.data.tag}`
      : `Tag not found: ${parsed.data.tag}`;
    return { structuredContent: { removed }, text };
  });
}

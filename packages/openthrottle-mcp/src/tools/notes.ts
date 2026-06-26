/**
 * @description Note CRUD tool handlers + schemas: create_note, get_note, list_notes, update_note, delete_note. Wired up via the shared `developerMcpToolDefinitions` registry and the Nest surface.
 */

import { z } from 'zod';
import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import {
  type CreateNoteMutation,
  type GetNoteQuery,
  type GetNotesQuery,
  type UpdateNoteMutation,
  CreateNoteDocument,
  DeleteNoteDocument,
  GetNoteDocument,
  GetNotesDocument,
  UpdateNoteDocument,
} from '../__generated__/graphql.js';
import {
  CreateNoteInputSchema,
  UpdateNoteInputSchema,
} from '../__generated__/schemas.js';
import type { GenericResult } from '../types/index.js';
import { getAuthToken } from '../auth/get-auth-token.js';
import { invalidArgsContent } from '../utils/errors.js';
import { runTool } from '../utils/tool-result.js';

type CreateNoteResult = GenericResult<{
  note: CreateNoteMutation['createNote'];
}>;

type DeleteNoteResult = GenericResult<{
  deleted: boolean;
}>;

type GetNoteResult = GenericResult<{
  note: GetNoteQuery['note'];
}>;

type ListNotesResult = GenericResult<{
  notes: GetNotesQuery['notes'];
}>;

type UpdateNoteResult = GenericResult<{
  note: UpdateNoteMutation['updateNote'];
}>;

export const createNoteToolParameters = CreateNoteInputSchema();
export const deleteNoteToolParameters = z.object({ id: z.string().min(1) });
export const getNoteToolParameters = z.object({ id: z.string().min(1) });
export const listNotesToolParameters = z.object({});
export const updateNoteToolParameters = UpdateNoteInputSchema();

export const createNoteToolDescription = `Create a note in Cortex. Requires content; optional author (e.g. GitHub username). For quick unstructured thoughts; foundation for notes route and planning workflow.`;

export const deleteNoteToolDescription = `Delete a note by id. Returns whether a row was deleted.`;

export const getNoteToolDescription = `Fetch a note by id (UUID). Returns the note row or not found.`;

export const listNotesToolDescription = `List notes in Cortex, newest first.`;

export const updateNoteToolDescription = `Update a note by id. Pass id and any of: content, author.`;

export async function createNoteToolHandler(
  args: z.infer<typeof createNoteToolParameters>,
): Promise<CreateNoteResult> {
  const parsed = createNoteToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error.message);
  }

  return runTool<{ note: CreateNoteMutation['createNote'] }>(
    'create_note',
    async () => {
      const token = getAuthToken();
      const result = await executeGraphqlWithAuth(token, CreateNoteDocument, {
        input: parsed.data,
      });

      const note = result?.createNote ?? null;
      if (!note) return null;

      const text = `Created note: ${note.id}\n${JSON.stringify(note, null, 2)}`;

      return { structuredContent: { note }, text };
    },
  );
}

export async function deleteNoteToolHandler(
  args: z.infer<typeof deleteNoteToolParameters>,
): Promise<DeleteNoteResult> {
  const parsed = deleteNoteToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error.message);
  }

  return runTool<{ deleted: boolean }>('delete_note', async () => {
    const token = getAuthToken();
    const result = await executeGraphqlWithAuth(token, DeleteNoteDocument, {
      id: parsed.data.id,
    });

    const deleted = result?.deleteNote ?? false;
    const text = deleted
      ? `Deleted note: ${parsed.data.id}`
      : `Note not found or already deleted: ${parsed.data.id}`;
    return { structuredContent: { deleted }, text };
  });
}

export async function getNoteToolHandler(
  args: z.infer<typeof getNoteToolParameters>,
): Promise<GetNoteResult> {
  const parsed = getNoteToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error.message);
  }

  return runTool<{ note: GetNoteQuery['note'] }>('get_note', async () => {
    const token = getAuthToken();
    const result = await executeGraphqlWithAuth(token, GetNoteDocument, {
      id: parsed.data.id,
    });

    const note = result?.note ?? null;
    if (!note) {
      return null;
    }

    const text = `Note: ${note.id}\n${JSON.stringify(note, null, 2)}`;
    return { structuredContent: { note }, text };
  });
}

export async function listNotesToolHandler(
  _args: z.infer<typeof listNotesToolParameters>,
): Promise<ListNotesResult> {
  return runTool<{ notes: GetNotesQuery['notes'] }>('list_notes', async () => {
    const token = getAuthToken();
    const result = await executeGraphqlWithAuth(token, GetNotesDocument, {});

    const notes = result?.notes ?? [];
    const text =
      notes.length === 0
        ? 'No notes found.'
        : `Notes (${notes.length}):\n${JSON.stringify(notes, null, 2)}`;

    return { structuredContent: { notes }, text };
  });
}

export async function updateNoteToolHandler(
  args: z.infer<typeof updateNoteToolParameters>,
): Promise<UpdateNoteResult> {
  const parsed = updateNoteToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error.message);
  }

  return runTool<{ note: UpdateNoteMutation['updateNote'] }>(
    'update_note',
    async () => {
      const token = getAuthToken();
      const result = await executeGraphqlWithAuth(token, UpdateNoteDocument, {
        input: parsed.data,
      });

      const note = result?.updateNote ?? null;
      if (!note) return null;

      const text = `Updated note: ${note.id}\n${JSON.stringify(note, null, 2)}`;
      return { structuredContent: { note }, text };
    },
  );
}

/**
 * @description Registers note CRUD tools: create_note, get_note, list_notes, update_note, delete_note.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
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
import { getAuthToken } from '../auth/index.js';
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

const createNoteSchema = CreateNoteInputSchema();
const deleteNoteSchema = z.object({ id: z.string().min(1) });
const getNoteSchema = z.object({ id: z.string().min(1) });
const listNotesSchema = z.object({});
const updateNoteSchema = UpdateNoteInputSchema();

async function createNoteHandler(
  args: z.infer<typeof createNoteSchema>,
): Promise<CreateNoteResult> {
  const parsed = createNoteSchema.safeParse(args);
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

async function deleteNoteHandler(
  args: z.infer<typeof deleteNoteSchema>,
): Promise<DeleteNoteResult> {
  const parsed = deleteNoteSchema.safeParse(args);
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

async function getNoteHandler(
  args: z.infer<typeof getNoteSchema>,
): Promise<GetNoteResult> {
  const parsed = getNoteSchema.safeParse(args);
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

async function listNotesHandler(
  _args: z.infer<typeof listNotesSchema>,
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

async function updateNoteHandler(
  args: z.infer<typeof updateNoteSchema>,
): Promise<UpdateNoteResult> {
  const parsed = updateNoteSchema.safeParse(args);
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

export function registerNoteTools(server: McpServer): void {
  server.registerTool(
    'create_note',
    {
      description: `Create a note in Cortex. Requires content; optional author (e.g. GitHub username). For quick unstructured thoughts; foundation for notes route and planning workflow.`,
      inputSchema: createNoteSchema,
    },
    createNoteHandler,
  );

  server.registerTool(
    'delete_note',
    {
      description: `Delete a note by id. Returns whether a row was deleted.`,
      inputSchema: deleteNoteSchema,
    },
    deleteNoteHandler,
  );

  server.registerTool(
    'get_note',
    {
      description: `Fetch a note by id (UUID). Returns the note row or not found.`,
      inputSchema: getNoteSchema,
    },
    getNoteHandler,
  );

  server.registerTool(
    'list_notes',
    {
      description: `List notes in Cortex, newest first.`,
      inputSchema: listNotesSchema,
    },
    listNotesHandler,
  );

  server.registerTool(
    'update_note',
    {
      description: `Update a note by id. Pass id and any of: content, author.`,
      inputSchema: updateNoteSchema,
    },
    updateNoteHandler,
  );
}

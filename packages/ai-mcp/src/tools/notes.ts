/**
 * @description Registers note CRUD tools: create_note, get_note, list_notes, update_note, delete_note.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { NoteRow } from '../cortex-client.js';
import {
  createNote as cortexCreateNote,
  deleteNote as cortexDeleteNote,
  getNoteById as cortexGetNoteById,
  listNotes as cortexListNotes,
  updateNote as cortexUpdateNote,
} from '../cortex-client.js';
import {
  createNoteInputSchema,
  deleteNoteInputSchema,
  getNoteInputSchema,
  listNotesInputSchema,
  updateNoteInputSchema,
} from '../schemas.js';
import { invalidArgsContent } from './errors.js';

type NoteToolResult =
  | { content: { text: string; type: 'text' }[]; isError: true }
  | {
      content: { text: string; type: 'text' }[];
      structuredContent: { note: NoteRow };
    }
  | {
      content: { text: string; type: 'text' }[];
      structuredContent: { notes: NoteRow[] };
    }
  | {
      content: { text: string; type: 'text' }[];
      structuredContent: { deleted: boolean };
    };

async function createNoteHandler(
  args: z.infer<typeof createNoteInputSchema>,
): Promise<NoteToolResult> {
  const parsed = createNoteInputSchema.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error.message);
  }

  try {
    const data = parsed.data;
    const note = await cortexCreateNote(data);
    return {
      content: [
        {
          text: `Created note: ${note.id}\n${JSON.stringify(note, null, 2)}`,
          type: 'text' as const,
        },
      ],
      structuredContent: { note },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [
        { text: `create_note failed: ${message}`, type: 'text' as const },
      ],
      isError: true,
    };
  }
}

async function getNoteHandler(
  args: z.infer<typeof getNoteInputSchema>,
): Promise<NoteToolResult> {
  const parsed = getNoteInputSchema.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error.message);
  }

  try {
    const note = await cortexGetNoteById(parsed.data.id);
    if (!note) {
      return {
        content: [
          {
            text: `No note found for id: ${parsed.data.id}`,
            type: 'text' as const,
          },
        ],
        isError: true,
      };
    }
    return {
      content: [{ text: JSON.stringify(note, null, 2), type: 'text' as const }],
      structuredContent: { note },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ text: `get_note failed: ${message}`, type: 'text' as const }],
      isError: true,
    };
  }
}

async function listNotesHandler(
  args: z.infer<typeof listNotesInputSchema>,
): Promise<NoteToolResult> {
  const parsed = listNotesInputSchema.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error.message);
  }

  try {
    const data = parsed.data;
    const notes = await cortexListNotes({
      author: data.author ?? undefined,
      limit: data.limit,
    });
    const text =
      notes.length === 0 ? 'No notes.' : JSON.stringify(notes, null, 2);
    return {
      content: [{ text, type: 'text' as const }],
      structuredContent: { notes: [...notes] },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [
        { text: `list_notes failed: ${message}`, type: 'text' as const },
      ],
      isError: true,
    };
  }
}

async function updateNoteHandler(
  args: z.infer<typeof updateNoteInputSchema>,
): Promise<NoteToolResult> {
  const parsed = updateNoteInputSchema.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error.message);
  }

  try {
    const { id, ...rest } = parsed.data;
    const note = await cortexUpdateNote(id, rest);
    if (!note) {
      return {
        content: [
          { text: `No note found for id: ${id}`, type: 'text' as const },
        ],
        isError: true,
      };
    }
    return {
      content: [{ text: JSON.stringify(note, null, 2), type: 'text' as const }],
      structuredContent: { note },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [
        { text: `update_note failed: ${message}`, type: 'text' as const },
      ],
      isError: true,
    };
  }
}

async function deleteNoteHandler(
  args: z.infer<typeof deleteNoteInputSchema>,
): Promise<NoteToolResult> {
  const parsed = deleteNoteInputSchema.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error.message);
  }

  try {
    const deleted = await cortexDeleteNote(parsed.data.id);
    const text = deleted
      ? `Note ${parsed.data.id} deleted.`
      : `No note found for id: ${parsed.data.id}.`;
    return {
      content: [{ text, type: 'text' as const }],
      structuredContent: { deleted },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [
        { text: `delete_note failed: ${message}`, type: 'text' as const },
      ],
      isError: true,
    };
  }
}

export function registerNoteTools(server: McpServer): void {
  server.registerTool(
    'create_note',
    {
      description: `Create a note in Cortex. Requires content; optional author (e.g. GitHub username). For quick unstructured thoughts; foundation for notes route and planning workflow.`,
      inputSchema: {
        author: z.string().nullable().optional(),
        content: z.string().min(1),
      },
    },
    createNoteHandler,
  );

  server.registerTool(
    'get_note',
    {
      description: `Fetch a note by id (UUID). Returns the note row or not found.`,
      inputSchema: { id: z.uuid() },
    },
    getNoteHandler,
  );

  server.registerTool(
    'list_notes',
    {
      description: `List notes in Cortex, newest first. Optional author filter and limit (default 50, max 200).`,
      inputSchema: {
        author: z.string().nullable().optional(),
        limit: z.number().int().min(1).max(200).optional(),
      },
    },
    listNotesHandler,
  );

  server.registerTool(
    'update_note',
    {
      description: `Update a note by id. Pass id and any of: content, author.`,
      inputSchema: {
        author: z.string().nullable().optional(),
        content: z.string().min(1).optional(),
        id: z.uuid(),
      },
    },
    updateNoteHandler,
  );

  server.registerTool(
    'delete_note',
    {
      description: `Delete a note by id. Returns whether a row was deleted.`,
      inputSchema: { id: z.uuid() },
    },
    deleteNoteHandler,
  );
}

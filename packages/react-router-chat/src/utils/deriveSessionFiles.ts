import { isRecord } from '@openthrottle/nodejs-utils';

import { normalizeToolName, toolCategoryOf } from '../turn-tool-groups';
import type { ChatMessage, ChatTurnToolEvent } from '../types';
import { CHAT_TOOL_STATUS } from '../types';

/**
 * What happened to a file in the conversation. `Write`-style tools are
 * `edited`: the tool cannot say whether the file pre-existed, so only an
 * explicit create (patch `Add File`, Codex `add`, Cursor `create_file`) is
 * `created`.
 */
export type SessionFileOp = 'created' | 'deleted' | 'edited';

/** One file the agent touched, deduped across the whole conversation. */
export interface SessionFile {
  /** Lines added across every touch; undefined when any touch was not exact. */
  readonly added: number | undefined;
  /** How many tool calls touched the file. */
  readonly count: number;
  /** The net operation (created stays created; a later delete wins). */
  readonly op: SessionFileOp;
  /** Relative to the checkout root when one was given and matched. */
  readonly path: string;
  /** Lines removed across every touch; undefined when any touch was not exact. */
  readonly removed: number | undefined;
}

interface Touch {
  readonly added: number | undefined;
  readonly op: SessionFileOp;
  readonly path: string;
  readonly removed: number | undefined;
}

interface Accumulator {
  added: number | undefined;
  count: number;
  lastTouched: number;
  op: SessionFileOp;
  removed: number | undefined;
}

const PATH_KEYS = [
  'file_path',
  'filePath',
  'notebook_path',
  'path',
  'target_file',
  'TargetFile',
  'file',
] as const;

const PATCH_KEYS = ['patch', 'patchText', 'input', 'diff'] as const;

const PATCH_HEADER =
  /^\*\*\* (Add File|Update File|Delete File|Move to):\s*(.+?)\s*$/;

const PATCH_KIND_OPS: Readonly<Record<string, SessionFileOp | undefined>> = {
  'Add File': 'created',
  'Delete File': 'deleted',
};

const parseJson = (json: string | null): unknown => {
  if (json === null) {
    return undefined;
  }

  try {
    return JSON.parse(json);
  } catch {
    return undefined;
  }
};

const countLines = (text: string): number => {
  return text === '' ? 0 : text.split('\n').length;
};

const readString = (
  record: Record<string, unknown>,
  keys: readonly string[],
): string | undefined => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value !== '') {
      return value;
    }
  }

  return undefined;
};

const textDelta = (
  oldText: unknown,
  newText: unknown,
): Pick<Touch, 'added' | 'removed'> => {
  if (typeof oldText !== 'string' || typeof newText !== 'string') {
    return { added: undefined, removed: undefined };
  }

  return { added: countLines(newText), removed: countLines(oldText) };
};

const readReplacement = (
  record: Record<string, unknown>,
): Pick<Touch, 'added' | 'removed'> => {
  return textDelta(
    record.old_string ?? record.oldString,
    record.new_string ?? record.newString,
  );
};

const readMultiEdit = (
  record: Record<string, unknown>,
): Pick<Touch, 'added' | 'removed'> => {
  const edits = record.edits;
  if (!Array.isArray(edits) || edits.length === 0) {
    return { added: undefined, removed: undefined };
  }

  let added = 0;
  let removed = 0;
  for (const edit of edits) {
    const delta = isRecord(edit)
      ? readReplacement(edit)
      : { added: undefined, removed: undefined };
    if (delta.added === undefined || delta.removed === undefined) {
      return { added: undefined, removed: undefined };
    }
    added += delta.added;
    removed += delta.removed;
  }

  return { added, removed };
};

const readWrite = (
  record: Record<string, unknown>,
): Pick<Touch, 'added' | 'removed'> => {
  const content = record.content;

  return typeof content === 'string'
    ? { added: countLines(content), removed: undefined }
    : { added: undefined, removed: undefined };
};

/** Touches described by `*** Add/Update/Delete File:` patch headers. */
const readPatchText = (patch: string): readonly Touch[] => {
  const touches: Touch[] = [];
  let current: { added: number; op: SessionFileOp; path: string } | undefined;
  let removed = 0;

  const flush = (): void => {
    if (current !== undefined) {
      const isDelete = current.op === 'deleted';
      touches.push({
        added: isDelete ? undefined : current.added,
        op: current.op,
        path: current.path,
        removed: isDelete ? undefined : removed,
      });
    }
    current = undefined;
    removed = 0;
  };

  for (const line of patch.split('\n')) {
    const header = PATCH_HEADER.exec(line);
    const kind = header?.[1];
    const path = header?.[2];

    if (kind === 'Move to' && path !== undefined && current !== undefined) {
      // A rename: the content now lives at the destination path.
      current = { ...current, path };
    } else if (kind !== undefined && path !== undefined) {
      flush();
      current = { added: 0, op: PATCH_KIND_OPS[kind] ?? 'edited', path };
    } else if (current !== undefined && current.op !== 'deleted') {
      if (line.startsWith('+')) {
        current = { ...current, added: current.added + 1 };
      } else if (line.startsWith('-')) {
        removed += 1;
      }
    }
  }
  flush();

  return touches;
};

const CODEX_KIND_OPS: Readonly<Record<string, SessionFileOp | undefined>> = {
  add: 'created',
  delete: 'deleted',
};

const readCodexChanges = (
  record: Record<string, unknown>,
): readonly Touch[] => {
  const changes = Array.isArray(record.changes) ? record.changes : [];
  const touches: Touch[] = [];

  for (const change of changes) {
    if (!isRecord(change) || typeof change.path !== 'string') {
      continue;
    }
    const rawKind = isRecord(change.kind) ? change.kind.type : change.kind;
    const kind = typeof rawKind === 'string' ? rawKind.toLowerCase() : '';
    touches.push({
      added: undefined,
      op: CODEX_KIND_OPS[kind] ?? 'edited',
      path: change.path,
      removed: undefined,
    });
  }

  return touches;
};

const readPatchArgument = (args: unknown): string | undefined => {
  if (typeof args === 'string') {
    return args;
  }

  return isRecord(args) ? readString(args, PATCH_KEYS) : undefined;
};

const readToolTouches = (name: string, args: unknown): readonly Touch[] => {
  if (name === 'apply_patch' || name === 'patch') {
    const patch = readPatchArgument(args);
    if (patch !== undefined) {
      const touches = readPatchText(patch);
      if (touches.length > 0) {
        return touches;
      }
    }
  }

  if (!isRecord(args)) {
    return [];
  }

  if (name === 'file_change') {
    return readCodexChanges(args);
  }

  const path = readString(args, PATH_KEYS);
  if (path === undefined) {
    return [];
  }

  const none = { added: undefined, removed: undefined };
  switch (name) {
    case 'create_file':
      return [{ ...none, op: 'created', path }];
    case 'delete_file':
      return [{ ...none, op: 'deleted', path }];
    case 'multi_edit':
    case 'multiedit':
      return [{ ...readMultiEdit(args), op: 'edited', path }];
    case 'write':
    case 'write_file':
    case 'write_to_file':
      return [{ ...readWrite(args), op: 'edited', path }];
    case 'edit':
    case 'replace':
    case 'str_replace':
    case 'search_replace':
      return [{ ...readReplacement(args), op: 'edited', path }];
    default:
      return [{ ...none, op: 'edited', path }];
  }
};

/**
 * Strip a trailing slash run from a root, and `./` or the root itself from a
 * path, so the same file reads one way however each driver spelled it.
 */
const relativize = (path: string, rootPath: string | undefined): string => {
  const root = (rootPath ?? '').replace(/\/+$/, '');
  const withoutDot = path.replace(/^\.\//, '');

  return root !== '' && withoutDot.startsWith(`${root}/`)
    ? withoutDot.slice(root.length + 1)
    : withoutDot;
};

const mergeOp = (
  previous: SessionFileOp,
  next: SessionFileOp,
): SessionFileOp => {
  if (next === 'deleted') {
    return 'deleted';
  }
  if (next === 'created') {
    return 'created';
  }

  // An edit keeps a create, and revives a delete as an edit.
  return previous === 'created' ? 'created' : 'edited';
};

const sumKnown = (
  previous: number | undefined,
  next: number | undefined,
  isFirst: boolean,
): number | undefined => {
  if (isFirst) {
    return next;
  }

  return previous === undefined || next === undefined
    ? undefined
    : previous + next;
};

const isSettled = (tool: ChatTurnToolEvent): boolean => {
  return tool.status === CHAT_TOOL_STATUS.succeeded && tool.error === null;
};

/**
 * @description The files the agent touched in a conversation, derived from its
 * file-mutating tool calls across every driver (Claude Edit/MultiEdit/Write/
 * NotebookEdit, Codex `file_change`/`apply_patch`, OpenCode edit/write/patch,
 * Gemini write_file/replace, Cursor/Antigravity path-keyed edits). Deduped by
 * path with call counts, most recently touched first. Only `succeeded` calls
 * count: failed, not-run and still-running calls are skipped, so a file appears
 * once its edit has landed. +/- counts are summed only while every touch was
 * exact (Edit, MultiEdit, Write, patch text); one inexact touch makes them
 * undefined rather than guessed. Pure over `messages`, so a reopened
 * conversation rebuilds the same list from its persisted events.
 *
 * @public
 */
export const deriveSessionFiles = (
  messages: readonly ChatMessage[],
  rootPath: string | undefined,
): readonly SessionFile[] => {
  const files = new Map<string, Accumulator>();
  let tick = 0;

  for (const message of messages) {
    const events = [...(message.events ?? [])].sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );

    for (const event of events) {
      if (
        event.kind !== 'tool' ||
        !isSettled(event) ||
        toolCategoryOf(event.name) !== 'edit'
      ) {
        continue;
      }

      const name = normalizeToolName(event.name);
      const touches = readToolTouches(name, parseJson(event.argsJson));

      for (const touch of touches) {
        const path = relativize(touch.path, rootPath);
        const known = files.get(path);
        tick += 1;
        files.set(path, {
          added: sumKnown(known?.added, touch.added, known === undefined),
          count: (known?.count ?? 0) + 1,
          lastTouched: tick,
          op: known === undefined ? touch.op : mergeOp(known.op, touch.op),
          removed: sumKnown(known?.removed, touch.removed, known === undefined),
        });
      }
    }
  }

  return [...files.entries()]
    .sort(([, a], [, b]) => b.lastTouched - a.lastTouched)
    .map(([path, file]) => {
      return {
        added: file.added,
        count: file.count,
        op: file.op,
        path,
        removed: file.removed,
      };
    });
};

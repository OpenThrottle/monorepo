import { describe, expect, test } from 'vitest';

import type { ChatMessage, ChatToolStatusValue } from '../../types';
import { deriveSessionFiles } from '../deriveSessionFiles';

let order = 0;

const call = (
  name: string,
  args: unknown,
  options: { error?: string; status?: ChatToolStatusValue } = {},
): NonNullable<ChatMessage['events']> => {
  order += 1;

  return [
    {
      argsJson: JSON.stringify(args),
      callId: `c${order}`,
      error: options.error ?? null,
      kind: 'tool',
      name,
      resultJson: null,
      sortOrder: order,
      status: options.status ?? 'succeeded',
    },
  ];
};

const turn = (
  ...calls: ReadonlyArray<NonNullable<ChatMessage['events']>>
): ChatMessage => {
  return {
    body: '',
    events: calls.flat(),
    id: `m${order}`,
    role: 'assistant',
  };
};

describe('deriveSessionFiles', () => {
  describe('Claude shapes', () => {
    test('Edit counts old/new string lines', () => {
      const [file] = deriveSessionFiles(
        [
          turn(
            call('Edit', {
              file_path: '/r/a.ts',
              new_string: 'x\ny\nz',
              old_string: 'q',
            }),
          ),
        ],
        undefined,
      );

      expect(file).toEqual({
        added: 3,
        count: 1,
        op: 'edited',
        path: '/r/a.ts',
        removed: 1,
      });
    });

    test('MultiEdit sums its edits', () => {
      const [file] = deriveSessionFiles(
        [
          turn(
            call('MultiEdit', {
              edits: [
                { new_string: 'a\nb', old_string: 'x' },
                { new_string: 'c', old_string: 'y\nz' },
              ],
              file_path: '/r/a.ts',
            }),
          ),
        ],
        undefined,
      );

      expect(file).toMatchObject({ added: 3, removed: 3 });
    });

    test('MultiEdit with a malformed edit leaves counts undefined', () => {
      const [file] = deriveSessionFiles(
        [
          turn(
            call('MultiEdit', {
              edits: [{ new_string: 'a' }],
              file_path: '/r/a.ts',
            }),
          ),
        ],
        undefined,
      );

      expect(file).toMatchObject({ added: undefined, removed: undefined });
    });

    test('Write is edited, with content lines added', () => {
      const [file] = deriveSessionFiles(
        [turn(call('Write', { content: 'a\nb', file_path: '/r/w.ts' }))],
        undefined,
      );

      expect(file).toMatchObject({
        added: 2,
        op: 'edited',
        removed: undefined,
      });
    });

    test('NotebookEdit reads notebook_path', () => {
      const [file] = deriveSessionFiles(
        [turn(call('NotebookEdit', { notebook_path: '/r/n.ipynb' }))],
        undefined,
      );

      expect(file).toMatchObject({ op: 'edited', path: '/r/n.ipynb' });
    });
  });

  describe('other drivers', () => {
    test('Codex file_change maps add/update/delete, string or object kind', () => {
      const files = deriveSessionFiles(
        [
          turn(
            call('file_change', {
              changes: [
                { kind: 'add', path: '/r/new.ts' },
                { kind: { type: 'update' }, path: '/r/up.ts' },
                { kind: 'delete', path: '/r/old.ts' },
                { kind: 'add' },
              ],
            }),
          ),
        ],
        undefined,
      );

      expect(
        Object.fromEntries(files.map((file) => [file.path, file.op])),
      ).toEqual({
        '/r/new.ts': 'created',
        '/r/old.ts': 'deleted',
        '/r/up.ts': 'edited',
      });
    });

    test('apply_patch parses headers, counts and rename targets', () => {
      const patch = [
        '*** Begin Patch',
        '*** Add File: src/new.ts',
        '+one',
        '+two',
        '*** Update File: src/up.ts',
        '@@',
        ' keep',
        '-gone',
        '+here',
        '+more',
        '*** Update File: src/from.ts',
        '*** Move to: src/to.ts',
        '+x',
        '*** Delete File: src/old.ts',
        '*** End Patch',
      ].join('\n');
      const files = deriveSessionFiles(
        [turn(call('apply_patch', { input: patch }))],
        undefined,
      );
      const byPath = Object.fromEntries(files.map((f) => [f.path, f]));

      expect(byPath['src/new.ts']).toMatchObject({ added: 2, op: 'created' });
      expect(byPath['src/up.ts']).toMatchObject({ added: 2, removed: 1 });
      expect(byPath['src/to.ts']).toMatchObject({ added: 1, op: 'edited' });
      expect(byPath['src/from.ts']).toBeUndefined();
      expect(byPath['src/old.ts']).toMatchObject({
        added: undefined,
        op: 'deleted',
      });
    });

    test('a bare-string patch argument and OpenCode patchText are read', () => {
      const patch = '*** Add File: a.ts\n+x';
      const bare = deriveSessionFiles(
        [turn(call('apply_patch', patch))],
        undefined,
      );
      const opencode = deriveSessionFiles(
        [turn(call('patch', { patchText: patch }))],
        undefined,
      );

      expect(bare[0]).toMatchObject({ op: 'created', path: 'a.ts' });
      expect(opencode[0]).toMatchObject({ op: 'created', path: 'a.ts' });
    });

    test('OpenCode edit/write read filePath and camelCase strings', () => {
      const files = deriveSessionFiles(
        [
          turn(
            call('edit', {
              filePath: '/r/o.ts',
              newString: 'b',
              oldString: 'a\na',
            }),
            call('write', { content: 'x', filePath: '/r/w.ts' }),
          ),
        ],
        undefined,
      );

      expect(files.find((f) => f.path === '/r/o.ts')).toMatchObject({
        added: 1,
        removed: 2,
      });
      expect(files.find((f) => f.path === '/r/w.ts')).toMatchObject({
        added: 1,
      });
    });

    test('Gemini write_file and replace use file_path', () => {
      const files = deriveSessionFiles(
        [
          turn(
            call('write_file', { content: 'a', file_path: '/r/g.ts' }),
            call('replace', {
              file_path: '/r/h.ts',
              new_string: 'b',
              old_string: 'a',
            }),
          ),
        ],
        undefined,
      );

      expect(files.map((f) => f.path).sort()).toEqual(['/r/g.ts', '/r/h.ts']);
    });

    test.each([
      ['path', 'edit'],
      ['target_file', 'edit_file'],
      ['TargetFile', 'write_to_file'],
      ['file', 'edit_file'],
    ])('Cursor/Antigravity key %s', (key, tool) => {
      const [file] = deriveSessionFiles(
        [turn(call(tool, { [key]: '/r/c.ts' }))],
        undefined,
      );

      expect(file).toMatchObject({ added: undefined, path: '/r/c.ts' });
    });

    test('create_file is created and delete_file is deleted', () => {
      const files = deriveSessionFiles(
        [
          turn(
            call('create_file', { path: '/r/a.ts' }),
            call('delete_file', { path: '/r/b.ts' }),
          ),
        ],
        undefined,
      );

      expect(files.map((f) => f.op).sort()).toEqual(['created', 'deleted']);
    });

    test('tool names are normalized (case and dashes)', () => {
      const [file] = deriveSessionFiles(
        [turn(call('Multi-Edit', { file_path: '/r/a' }))],
        undefined,
      );

      expect(file?.path).toBe('/r/a');
    });
  });

  describe('dedupe and precedence', () => {
    test('dedupes across turns, counting touches and summing lines', () => {
      const edit = { file_path: '/r/a.ts', new_string: 'a', old_string: 'b' };
      const [file, ...rest] = deriveSessionFiles(
        [turn(call('Edit', edit)), turn(call('Edit', edit))],
        undefined,
      );

      expect(rest).toHaveLength(0);
      expect(file).toMatchObject({ added: 2, count: 2, removed: 2 });
    });

    test('one inexact touch makes counts undefined', () => {
      const [file] = deriveSessionFiles(
        [
          turn(
            call('Edit', {
              file_path: '/r/a',
              new_string: 'a',
              old_string: 'b',
            }),
            call('edit_file', { path: '/r/a' }),
          ),
        ],
        undefined,
      );

      expect(file).toMatchObject({ added: undefined, count: 2 });
    });

    test('created then edited stays created', () => {
      const [file] = deriveSessionFiles(
        [
          turn(
            call('create_file', { path: '/r/a' }),
            call('Edit', { file_path: '/r/a' }),
          ),
        ],
        undefined,
      );

      expect(file?.op).toBe('created');
    });

    test('edited then deleted is deleted', () => {
      const [file] = deriveSessionFiles(
        [
          turn(
            call('Edit', { file_path: '/r/a' }),
            call('delete_file', { path: '/r/a' }),
          ),
        ],
        undefined,
      );

      expect(file?.op).toBe('deleted');
    });

    test('deleted then recreated is created', () => {
      const [file] = deriveSessionFiles(
        [
          turn(
            call('delete_file', { path: '/r/a' }),
            call('create_file', { path: '/r/a' }),
          ),
        ],
        undefined,
      );

      expect(file?.op).toBe('created');
    });

    test('orders the most recently touched first', () => {
      const files = deriveSessionFiles(
        [
          turn(
            call('Edit', { file_path: '/r/a' }),
            call('Edit', { file_path: '/r/b' }),
            call('Edit', { file_path: '/r/a' }),
          ),
        ],
        undefined,
      );

      expect(files.map((f) => f.path)).toEqual(['/r/a', '/r/b']);
    });
  });

  describe('skipping', () => {
    test('skips failed, errored, running and not-run calls', () => {
      const files = deriveSessionFiles(
        [
          turn(
            call('Edit', { file_path: '/r/1' }, { status: 'failed' }),
            call('Edit', { file_path: '/r/2' }, { error: 'boom' }),
            call('Edit', { file_path: '/r/3' }, { status: 'running' }),
            call('Edit', { file_path: '/r/4' }, { status: 'not_run' }),
          ),
        ],
        undefined,
      );

      expect(files).toEqual([]);
    });

    test('ignores non-edit tools and non-tool events', () => {
      const files = deriveSessionFiles(
        [
          turn(
            call('Read', { file_path: '/r/a' }),
            call('Bash', { command: 'x' }),
          ),
          { body: 'hi', id: 'u', role: 'user' },
        ],
        undefined,
      );

      expect(files).toEqual([]);
    });

    test('ignores malformed args', () => {
      const bad: ChatMessage = {
        body: '',
        events: [
          {
            argsJson: '{not json',
            callId: null,
            error: null,
            kind: 'tool',
            name: 'Edit',
            resultJson: null,
            sortOrder: 1,
            status: 'succeeded',
          },
          {
            argsJson: null,
            callId: null,
            error: null,
            kind: 'tool',
            name: 'Edit',
            resultJson: null,
            sortOrder: 2,
            status: 'succeeded',
          },
        ],
        id: 'bad',
        role: 'assistant',
      };

      expect(
        deriveSessionFiles(
          [bad, turn(call('Edit', ['x']), call('Edit', { file_path: 3 }))],
          undefined,
        ),
      ).toEqual([]);
    });
  });

  describe('root stripping', () => {
    test('strips the root, tolerating trailing slashes and ./', () => {
      const files = deriveSessionFiles(
        [
          turn(
            call('Edit', { file_path: '/repo/src/a.ts' }),
            call('Edit', { file_path: './src/a.ts' }),
            call('Edit', { file_path: '/elsewhere/b.ts' }),
            call('Edit', { file_path: '/repository/c.ts' }),
          ),
        ],
        '/repo//',
      );

      expect(files.map((f) => f.path).sort()).toEqual([
        '/elsewhere/b.ts',
        '/repository/c.ts',
        'src/a.ts',
      ]);
      expect(files.find((f) => f.path === 'src/a.ts')?.count).toBe(2);
    });
  });
});

import { describe, expect, test } from 'vitest';
import {
  areFilesUpdated,
  getFilenameError,
  getLanguageFromExt,
  isHiddenFile,
  parseFilePath,
  validateFilename,
} from '../index';
import type { EditorFile } from '../../data/atom.editor';

const file = (overrides: Partial<EditorFile> = {}): EditorFile => ({
  directory: '.',
  filename: 'readme.md',
  language: 'markdown',
  ...overrides,
});

describe('utils/getLanguageFromExt', () => {
  test('maps known extensions to their Monaco language', () => {
    expect(getLanguageFromExt('ts')).toBe('typescript');
    expect(getLanguageFromExt('tsx')).toBe('typescript');
    expect(getLanguageFromExt('js')).toBe('javascript');
    expect(getLanguageFromExt('json')).toBe('json');
    expect(getLanguageFromExt('css')).toBe('css');
    expect(getLanguageFromExt('yml')).toBe('yaml');
    expect(getLanguageFromExt('yaml')).toBe('yaml');
  });

  test('is case-insensitive', () => {
    expect(getLanguageFromExt('TS')).toBe('typescript');
    expect(getLanguageFromExt('Md')).toBe('markdown');
  });

  test('falls back to markdown for unknown extensions', () => {
    expect(getLanguageFromExt('xyz')).toBe('markdown');
    expect(getLanguageFromExt('')).toBe('markdown');
  });
});

describe('utils/parseFilePath', () => {
  test('splits a nested path into parts, name, and extension', () => {
    const result = parseFilePath('agents/sub/MyAgent.tsx');

    expect(result.parts).toEqual(['agents', 'sub', 'MyAgent.tsx']);
    expect(result.name).toBe('MyAgent.tsx');
    expect(result.extension).toBe('tsx');
    expect(result.language).toBe('typescript');
    expect(result.path).toBe('agents/sub/MyAgent.tsx');
  });

  test('handles a bare filename with no directory', () => {
    const result = parseFilePath('notes.md');

    expect(result.parts).toEqual(['notes.md']);
    expect(result.name).toBe('notes.md');
    expect(result.extension).toBe('md');
    expect(result.language).toBe('markdown');
  });

  test('treats a path without a dot as having no extension and falls back to markdown', () => {
    const result = parseFilePath('Dockerfile');

    expect(result.extension).toBe('Dockerfile');
    expect(result.language).toBe('markdown');
  });
});

describe('utils/areFilesUpdated', () => {
  test('returns false for the same reference', () => {
    const files = [file()];
    expect(areFilesUpdated(files, files)).toBe(false);
  });

  test('returns true when the lengths differ', () => {
    expect(areFilesUpdated([file()], [])).toBe(true);
  });

  test('returns false when files match by key and language', () => {
    const current = [
      file({ filename: 'a.md' }),
      file({ filename: 'b.ts', language: 'typescript' }),
    ];
    const next = [
      file({ filename: 'a.md' }),
      file({ filename: 'b.ts', language: 'typescript' }),
    ];

    expect(areFilesUpdated(next, current)).toBe(false);
  });

  test('returns true when a file key is missing in current', () => {
    const current = [file({ filename: 'a.md' })];
    const next = [file({ filename: 'b.md' })];

    expect(areFilesUpdated(next, current)).toBe(true);
  });

  test('returns true when a matching file changed language', () => {
    const current = [file({ filename: 'a.md', language: 'markdown' })];
    const next = [file({ filename: 'a.md', language: 'typescript' })];

    expect(areFilesUpdated(next, current)).toBe(true);
  });

  test('uses directory + filename as the comparison key', () => {
    const current = [file({ directory: 'one', filename: 'a.md' })];
    const next = [file({ directory: 'two', filename: 'a.md' })];

    expect(areFilesUpdated(next, current)).toBe(true);
  });
});

describe('utils/validateFilename', () => {
  test('rejects empty or whitespace-only names', () => {
    expect(validateFilename('')).toBe(false);
    expect(validateFilename('   ')).toBe(false);
  });

  test('rejects names without an extension or with a trailing dot', () => {
    expect(validateFilename('readme')).toBe(false);
    expect(validateFilename('readme.')).toBe(false);
  });

  test('rejects unsupported extensions', () => {
    expect(validateFilename('image.png')).toBe(false);
  });

  test('requires PascalCase for tsx/jsx files', () => {
    expect(validateFilename('MyComponent.tsx')).toBe(true);
    expect(validateFilename('my-component.tsx')).toBe(false);
    expect(validateFilename('Widget.jsx')).toBe(true);
  });

  test('allows kebab-case or PascalCase for markdown files', () => {
    expect(validateFilename('my-prompt.md')).toBe(true);
    expect(validateFilename('MyPrompt.md')).toBe(true);
    expect(validateFilename('my_prompt.md')).toBe(false);
    expect(validateFilename('agent-rules.mdc')).toBe(true);
  });

  test('allows any name for other supported extensions', () => {
    expect(validateFilename('any_name.ts')).toBe(true);
    expect(validateFilename('config.json')).toBe(true);
  });
});

describe('utils/getFilenameError', () => {
  test('reports empty names', () => {
    expect(getFilenameError('  ')).toBe('Filename cannot be empty');
  });

  test('reports a missing extension', () => {
    expect(getFilenameError('readme')).toBe('File extension is required');
    expect(getFilenameError('readme.')).toBe('File extension is required');
  });

  test('reports an unsupported extension and lists supported ones', () => {
    const error = getFilenameError('image.png');
    expect(error).toContain('Unsupported file extension');
    expect(error).toContain('md');
  });

  test('reports PascalCase requirement for tsx/jsx', () => {
    expect(getFilenameError('my-component.tsx')).toContain('PascalCase');
  });

  test('reports kebab/PascalCase requirement for markdown', () => {
    expect(getFilenameError('my_prompt.md')).toContain('kebab-case');
  });

  test('returns an empty string for a valid filename', () => {
    expect(getFilenameError('my-prompt.md')).toBe('');
    expect(getFilenameError('MyComponent.tsx')).toBe('');
  });
});

describe('utils/isHiddenFile', () => {
  test('treats dotfiles as hidden', () => {
    expect(isHiddenFile('.gitignore')).toBe(true);
    expect(isHiddenFile('dir/.env')).toBe(true);
  });

  test('treats regular files as visible', () => {
    expect(isHiddenFile('readme.md')).toBe(false);
    expect(isHiddenFile('dir/readme.md')).toBe(false);
  });
});

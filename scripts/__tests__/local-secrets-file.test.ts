import { chmod, readFile, writeFile } from 'node:fs/promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  LOCAL_SECRETS_FILENAME,
  readLocalSecrets,
  upsertLocalSecrets,
} from '../local-secrets-file.ts';

vi.mock('node:fs/promises', () => ({
  chmod: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

const readFileMock = vi.mocked(readFile);
const writeFileMock = vi.mocked(writeFile);
const chmodMock = vi.mocked(chmod);

/** An ENOENT rejection, as `node:fs` raises for a missing file. */
function enoent(): NodeJS.ErrnoException {
  const error: NodeJS.ErrnoException = new Error('missing');
  error.code = 'ENOENT';

  return error;
}

/** The string contents handed to the most recent writeFile call. */
function lastWritten(): string {
  const calls = writeFileMock.mock.calls;

  return String(calls[calls.length - 1][1]);
}

/** The `KEY=VALUE` lines of a rendered file, in order (comments dropped). */
function keyLines(contents: string): string[] {
  return contents
    .split('\n')
    .filter((line) => line.includes('=') && !line.startsWith('#'));
}

beforeEach(() => {
  vi.clearAllMocks();
  writeFileMock.mockResolvedValue(undefined);
  chmodMock.mockResolvedValue(undefined);
});

describe('readLocalSecrets', () => {
  it('parses KEY=VALUE lines, ignoring blanks and comments', async () => {
    readFileMock.mockResolvedValue('# header\n\nA=1\nB=two=three\n');

    expect(await readLocalSecrets()).toEqual({ A: '1', B: 'two=three' });
  });

  it('returns an empty record when the file does not exist (ENOENT)', async () => {
    readFileMock.mockRejectedValue(enoent());

    expect(await readLocalSecrets()).toEqual({});
  });

  it('re-throws non-ENOENT read errors', async () => {
    readFileMock.mockRejectedValue(new Error('EACCES'));

    await expect(readLocalSecrets()).rejects.toThrow('EACCES');
  });
});

describe('upsertLocalSecrets', () => {
  it('merges new keys without clobbering existing ones', async () => {
    readFileMock.mockResolvedValue('EXISTING=keep\n');

    await upsertLocalSecrets({ OPENTHROTTLE_MCP_AUTH_TOKEN: 'ot_sa_new' });

    const written = lastWritten();
    expect(written).toContain('EXISTING=keep');
    expect(written).toContain('OPENTHROTTLE_MCP_AUTH_TOKEN=ot_sa_new');
  });

  it('overwrites the value of a key that is upserted again (self-heal)', async () => {
    readFileMock.mockResolvedValue('OPENTHROTTLE_MCP_AUTH_TOKEN=old\n');

    await upsertLocalSecrets({ OPENTHROTTLE_MCP_AUTH_TOKEN: 'new' });

    const written = lastWritten();
    expect(written).toContain('OPENTHROTTLE_MCP_AUTH_TOKEN=new');
    expect(written).not.toContain('OPENTHROTTLE_MCP_AUTH_TOKEN=old');
  });

  it('renders keys alphabetized', async () => {
    readFileMock.mockRejectedValue(enoent());

    await upsertLocalSecrets({ A: '1', B: '2', C: '3' });

    expect(keyLines(lastWritten())).toEqual(['A=1', 'B=2', 'C=3']);
  });

  it('writes with mode 0600 and re-chmods to 0600', async () => {
    readFileMock.mockRejectedValue(enoent());

    await upsertLocalSecrets({ A: '1' });

    expect(writeFileMock).toHaveBeenCalledWith(
      expect.stringContaining(LOCAL_SECRETS_FILENAME),
      expect.any(String),
      { encoding: 'utf8', mode: 0o600 },
    );
    expect(chmodMock).toHaveBeenCalledWith(
      expect.stringContaining(LOCAL_SECRETS_FILENAME),
      0o600,
    );
  });

  it('targets the repo-root LOCAL_SECRETS_FILENAME', async () => {
    readFileMock.mockRejectedValue(enoent());

    const path = await upsertLocalSecrets({ A: '1' });

    expect(path.endsWith(LOCAL_SECRETS_FILENAME)).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';

import { CHECKOUT_DIFF_FILE_STATUS } from './checkout-diff.enum.ts';
import {
  buildAddedFilePatch,
  candidateBaseRefs,
  capPatch,
  countTextLines,
  isSafeRelativePath,
  looksBinary,
  mergeDiffEntries,
  parseNameStatusZ,
  parseNulSeparated,
  parseNumstatZ,
  toFileStatus,
} from './checkout-diff.utils.ts';

describe('parseNumstatZ', () => {
  it('parses plain and binary records', () => {
    expect(parseNumstatZ('3\t1\ta.ts\0-\t-\timg.png\0')).toEqual([
      {
        additions: 3,
        binary: false,
        deletions: 1,
        path: 'a.ts',
        previousPath: null,
      },
      {
        additions: 0,
        binary: true,
        deletions: 0,
        path: 'img.png',
        previousPath: null,
      },
    ]);
  });

  it('parses a rename as old then new path', () => {
    expect(parseNumstatZ('2\t0\t\0old.ts\0new.ts\0')).toEqual([
      {
        additions: 2,
        binary: false,
        deletions: 0,
        path: 'new.ts',
        previousPath: 'old.ts',
      },
    ]);
  });

  it('keeps paths containing spaces and tabs intact', () => {
    expect(parseNumstatZ('1\t1\tdir/a b\tc.ts\0')[0]?.path).toBe(
      'dir/a b\tc.ts',
    );
  });

  it('returns nothing for empty output', () => {
    expect(parseNumstatZ('')).toEqual([]);
  });
});

describe('parseNameStatusZ', () => {
  it('parses each status letter', () => {
    expect(
      parseNameStatusZ('M\0a.ts\0A\0b.ts\0D\0c.ts\0R095\0old.ts\0new.ts\0'),
    ).toEqual([
      { path: 'a.ts', previousPath: null, status: 'modified' },
      { path: 'b.ts', previousPath: null, status: 'added' },
      { path: 'c.ts', previousPath: null, status: 'deleted' },
      { path: 'new.ts', previousPath: 'old.ts', status: 'renamed' },
    ]);
  });

  it('returns nothing for empty output', () => {
    expect(parseNameStatusZ('')).toEqual([]);
  });
});

describe('toFileStatus', () => {
  it('treats a type change as modified and a copy as added', () => {
    expect(toFileStatus('T')).toBe(CHECKOUT_DIFF_FILE_STATUS.MODIFIED);
    expect(toFileStatus('C100')).toBe(CHECKOUT_DIFF_FILE_STATUS.ADDED);
  });
});

describe('mergeDiffEntries', () => {
  it('joins counts onto statuses and sorts by path', () => {
    const files = mergeDiffEntries(
      parseNameStatusZ('M\0b.ts\0A\0a.ts\0'),
      parseNumstatZ('4\t2\tb.ts\0-\t-\ta.ts\0'),
    );

    expect(files.map((file) => file.path)).toEqual(['a.ts', 'b.ts']);
    expect(files[0]).toMatchObject({ binary: true });
    expect(files[1]).toMatchObject({ additions: 4, deletions: 2 });
  });

  it('defaults to zero counts when numstat lacks the path', () => {
    expect(
      mergeDiffEntries(parseNameStatusZ('D\0gone.ts\0'), [])[0],
    ).toMatchObject({ additions: 0, deletions: 0 });
  });
});

describe('parseNulSeparated', () => {
  it('drops empty entries', () => {
    expect(parseNulSeparated('a\0b\0')).toEqual(['a', 'b']);
  });
});

describe('countTextLines', () => {
  it('counts lines with and without a trailing newline', () => {
    expect(countTextLines('')).toBe(0);
    expect(countTextLines('a\nb\n')).toBe(2);
    expect(countTextLines('a\nb')).toBe(2);
  });
});

describe('looksBinary', () => {
  it('flags a NUL byte', () => {
    expect(looksBinary(new Uint8Array([104, 0, 105]))).toBe(true);
    expect(looksBinary(new Uint8Array([104, 105]))).toBe(false);
  });
});

describe('isSafeRelativePath', () => {
  it.each(['src/a.ts', 'a b/c.ts', '.hidden'])('accepts %s', (path) => {
    expect(isSafeRelativePath(path)).toBe(true);
  });

  it.each(['', '/etc/passwd', '../x', 'a/../../x', 'C:\\x', 'a\0b'])(
    'rejects %j',
    (path) => {
      expect(isSafeRelativePath(path)).toBe(false);
    },
  );
});

describe('buildAddedFilePatch', () => {
  it('shapes a new-file patch with a hunk header', () => {
    expect(buildAddedFilePatch('a.ts', 'x\ny\n')).toBe(
      [
        'diff --git a/a.ts b/a.ts',
        'new file mode 100644',
        '--- /dev/null',
        '+++ b/a.ts',
        '@@ -0,0 +1,2 @@',
        '+x',
        '+y',
        '',
      ].join('\n'),
    );
  });

  it('has no hunk for an empty file', () => {
    expect(buildAddedFilePatch('a.ts', '')).not.toContain('@@');
  });
});

describe('capPatch', () => {
  it('passes a short patch through', () => {
    expect(capPatch('a\n', 10)).toEqual({ patch: 'a\n', truncated: false });
  });

  it('cuts on a line boundary and flags it', () => {
    expect(capPatch('aaa\nbbb\nccc\n', 9)).toEqual({
      patch: 'aaa\nbbb\n',
      truncated: true,
    });
  });
});

describe('candidateBaseRefs', () => {
  it('puts origin/HEAD first and de-duplicates', () => {
    expect(candidateBaseRefs('origin/develop\n')).toEqual([
      'origin/develop',
      'origin/main',
      'origin/master',
      'main',
      'master',
    ]);
    expect(candidateBaseRefs('origin/main')[0]).toBe('origin/main');
    expect(candidateBaseRefs('origin/main')).toHaveLength(4);
  });

  it('falls back to the conventional names without origin/HEAD', () => {
    expect(candidateBaseRefs(null)[0]).toBe('origin/main');
  });
});

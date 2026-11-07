import { describe, expect, it } from 'vitest';

import {
  parseBashCommand,
  splitShellSegments,
  stripCommandPrefixes,
} from '../shell-words.ts';

describe('splitShellSegments', () => {
  it('splits at &&, ||, ;, | and newlines', () => {
    expect(splitShellSegments('a 1 && b 2 || c; d | e\nf')).toEqual([
      ['a', '1'],
      ['b', '2'],
      ['c'],
      ['d'],
      ['e'],
      ['f'],
    ]);
  });

  it('keeps operators inside quotes as text and removes the quotes', () => {
    expect(
      splitShellSegments(`gh pr comment 1 --body "a && b; c | d" 'e || f'`),
    ).toEqual([
      ['gh', 'pr', 'comment', '1', '--body', 'a && b; c | d', 'e || f'],
    ]);
  });

  it('honours backslash escapes inside double quotes and outside quotes', () => {
    expect(splitShellSegments('echo "say \\"hi\\"" a\\ b')).toEqual([
      ['echo', 'say "hi"', 'a b'],
    ]);
  });

  it('treats a backslash-newline as a line continuation', () => {
    expect(splitShellSegments('gh pr merge \\\n  12 --squash')).toEqual([
      ['gh', 'pr', 'merge', '12', '--squash'],
    ]);
  });

  it('drops redirections with an inline target without splitting at their &', () => {
    expect(splitShellSegments('a 2>&1 && b &>/dev/null; c <&- x')).toEqual([
      ['a'],
      ['b'],
      ['c', 'x'],
    ]);
  });

  it('drops redirections and the word that is their target', () => {
    expect(
      splitShellSegments('gh pr merge 12 > out.txt 2>> err.log --squash'),
    ).toEqual([['gh', 'pr', 'merge', '12', '--squash']]);
  });

  it('ends a word at a redirection glued to it', () => {
    expect(splitShellSegments('a b>c d')).toEqual([['a', 'b', 'd']]);
  });

  it('keeps a quoted > as text', () => {
    expect(splitShellSegments(`gh pr comment 1 -b ">"`)).toEqual([
      ['gh', 'pr', 'comment', '1', '-b', '>'],
    ]);
  });

  it('skips heredoc bodies, so a body line is never read as a command', () => {
    const command = [
      `gh pr comment 1 --body-file - <<'EOF'`,
      'gh pr merge 99',
      'EOF',
      'ls',
    ].join('\n');
    expect(splitShellSegments(command)).toEqual([
      ['gh', 'pr', 'comment', '1', '--body-file', '-'],
      ['ls'],
    ]);
  });

  it('skips a <<- heredoc whose delimiter is tab-indented', () => {
    expect(splitShellSegments('cat <<-END\n\tbody\n\tEND\nls')).toEqual([
      ['cat'],
      ['ls'],
    ]);
  });

  it('drops a here-string and its word', () => {
    expect(splitShellSegments(`gh pr comment 1 -F - <<< "hi"`)).toEqual([
      ['gh', 'pr', 'comment', '1', '-F', '-'],
    ]);
  });

  it('splits at a background & and at subshell parentheses', () => {
    expect(splitShellSegments('(cd x && y) & z')).toEqual([
      ['cd', 'x'],
      ['y'],
      ['z'],
    ]);
  });

  it('drops comments', () => {
    expect(splitShellSegments('a # b && c\nd')).toEqual([['a'], ['d']]);
  });

  it('keeps an empty quoted word', () => {
    expect(splitShellSegments(`a "" b`)).toEqual([['a', '', 'b']]);
  });
});

describe('stripCommandPrefixes', () => {
  it('removes leading assignments and pass-through prefixes', () => {
    const result = stripCommandPrefixes(['GH_REPO=o/r', 'env', 'gh', 'pr']);
    expect(result.words).toEqual(['gh', 'pr']);
    expect(result.assignments.get('GH_REPO')).toBe('o/r');
  });
});

describe('parseBashCommand', () => {
  it('follows a static cd into later segments', () => {
    const parsed = parseBashCommand('cd sub && gh pr view; cd ../x && y', '/r');
    expect(parsed.segments.map((segment) => segment.cwd)).toEqual([
      '/r',
      '/r/sub',
      '/r/sub',
      '/r/x',
    ]);
  });

  it('marks the directory unknown after a cd it cannot resolve', () => {
    const parsed = parseBashCommand('cd "$DIR" && gh pr merge', '/r');
    expect(parsed.segments.map((segment) => segment.cwd)).toEqual(['/r', null]);
  });

  it('marks the directory unknown after a bare cd', () => {
    const parsed = parseBashCommand('cd && y', '/r');
    expect(parsed.segments[1]?.cwd).toBeNull();
  });
});

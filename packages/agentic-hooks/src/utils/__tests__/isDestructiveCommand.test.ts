import { describe, expect, it } from 'vitest';

import { isDestructiveCommand } from '../isDestructiveCommand.ts';

describe('isDestructiveCommand', () => {
  it.each([
    'rm -rf build',
    'rm file.txt',
    'rmdir old',
    'git rm src/a.ts',
    'git clean -fd',
    'git reset --hard HEAD~1',
    'git rebase main',
    'git commit --amend --no-edit',
    'git push',
    'git push origin feature',
    'git -C /tmp push --force',
    'git branch -D old',
    'git branch --delete --force old',
    'gh pr create --title x',
    'pnpm run worktree:remove foo',
    'pnpm database:migrate',
    'cd x && rm -rf y',
    'ls | xargs rm -f',
    'sudo rm -rf /x',
  ])('matches %s', (command) => {
    expect(isDestructiveCommand(command)).toBe(true);
  });

  it.each([
    'ls',
    'grep rm file.txt',
    'echo form',
    'git status',
    'git commit -m "msg"',
    'git reset --soft HEAD~1',
    'git branch -d merged',
    'git diff && ls --hard',
    'pnpm nx run x:test',
  ])('does not match %s', (command) => {
    expect(isDestructiveCommand(command)).toBe(false);
  });
});

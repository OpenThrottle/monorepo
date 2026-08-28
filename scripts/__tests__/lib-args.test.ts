import { describe, expect, it } from 'vitest';

import { flagValue, hasFlag, positionals, scriptArgs } from '../lib/args.ts';

describe('scriptArgs', () => {
  it('drops the node binary and script path', () => {
    expect(scriptArgs(['node', 'script.ts', '--strict', 'x'])).toEqual([
      '--strict',
      'x',
    ]);
  });
});

describe('hasFlag', () => {
  it('detects bare boolean flags', () => {
    expect(hasFlag('strict', ['--strict'])).toBe(true);
    expect(hasFlag('json', ['--strict'])).toBe(false);
  });

  it('detects the --name=value form', () => {
    expect(hasFlag('mode', ['--mode=prod'])).toBe(true);
  });
});

describe('flagValue', () => {
  it('reads --name=value', () => {
    expect(flagValue('mode', ['--mode=prod'])).toBe('prod');
  });

  it('reads --name value', () => {
    expect(flagValue('mode', ['--mode', 'dev'])).toBe('dev');
  });

  it('returns undefined when absent or valueless', () => {
    expect(flagValue('mode', ['--strict'])).toBeUndefined();
    expect(flagValue('mode', ['--mode'])).toBeUndefined();
    expect(flagValue('mode', ['--mode', '--strict'])).toBeUndefined();
  });
});

describe('positionals', () => {
  it('excludes flags, and values consumed by declared value flags', () => {
    expect(
      positionals(
        ['alpha', '--mode', 'prod', '--strict', 'beta', '--k=v'],
        ['mode'],
      ),
    ).toEqual(['alpha', 'beta']);
  });

  it('treats the token after an undeclared flag as positional', () => {
    expect(positionals(['--strict', 'kept'])).toEqual(['kept']);
  });

  it('keeps a value following an inline --k=v flag', () => {
    expect(positionals(['--k=v', 'kept'])).toEqual(['kept']);
  });
});

import { describe, expect, it } from 'vitest';

import { splitPath } from '../path';

describe('splitPath', () => {
  describe('with a nested path', () => {
    it('splits the name from the directory, which keeps its trailing slash', () => {
      expect(splitPath('src/utils/json.ts')).toEqual({
        directory: 'src/utils/',
        name: 'json.ts',
      });
    });
  });

  describe('with a bare file name', () => {
    it('has an empty directory', () => {
      expect(splitPath('README.md')).toEqual({
        directory: '',
        name: 'README.md',
      });
    });
  });

  describe('with an absolute path', () => {
    it('keeps the leading slash in the directory', () => {
      expect(splitPath('/a.ts')).toEqual({ directory: '/', name: 'a.ts' });
    });
  });
});

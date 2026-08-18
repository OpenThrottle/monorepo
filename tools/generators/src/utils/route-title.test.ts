import { describe, expect, test } from 'vitest';
import { getRouteTitleVariables } from './route-title';

describe('getRouteTitleVariables', () => {
  test.each([
    ['settings.appearance', 'Appearance | Settings', 'Appearance'],
    ['notifications._index', 'Notifications', 'Notifications'],
    ['personas.create', 'Create persona | Personas', 'Create persona'],
    ['plans.$planId._index', 'Plan | Plans', 'Plan'],
    [
      'settings.repositories.$repositoryId.edit',
      'Edit repository | Repositories',
      'Edit repository',
    ],
    ['pull-requests._index', 'Pull requests', 'Pull requests'],
    ['settings.mcp._index', 'MCP | Settings', 'MCP'],
    ['ide.files', 'Files | IDE', 'Files'],
  ])('%s -> %s', (name, nameTitle, nameTitleLeaf) => {
    expect(getRouteTitleVariables(name)).toStrictEqual({
      nameTitle,
      nameTitleLeaf,
    });
  });

  test('never emits a PascalCase scaffold identifier', () => {
    const { nameTitle } = getRouteTitleVariables('settings.appearance');

    expect(nameTitle).not.toMatch(/^[A-Z][a-z]+(?:[A-Z][a-z]+)+/);
  });

  test('falls back to a placeholder when every segment is ignored', () => {
    expect(getRouteTitleVariables('_index')).toStrictEqual({
      nameTitle: 'Untitled',
      nameTitleLeaf: 'Untitled',
    });
  });
});

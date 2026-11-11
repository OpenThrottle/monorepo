import { describe, expect, test } from 'vitest';

import { <%= name %> } from '../<%= nameKebab %>';

describe('<%= name %>', () => {
  test('FIXME: should be defined', () => {
    expect(<%= name %>).toBeDefined();
  });
});

import { beforeEach, describe, expect, test } from 'vitest';
import type { <%= namePascal %>Options } from '../<%= name %>';
import { <%= name %> } from '../<%= name %>';

describe('<%= name %>', () => {
  let options: <%= namePascal %>Options;

  beforeEach(async () => {
    options = {};
  });

  test('FIXME: should be defined', () => {
    expect(<%= name %>).toBeDefined();
  });
});

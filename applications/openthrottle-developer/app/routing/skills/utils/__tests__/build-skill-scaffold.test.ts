import { validateAgentAssetFrontmatter } from '@openthrottle/openthrottle-skills';
import { describe, expect, test } from 'vitest';
import {
  SKILL_SCAFFOLD_DESCRIPTION_PLACEHOLDER,
  buildSkillScaffold,
} from '~/routing/skills/utils/build-skill-scaffold';

const errorsFor = (content: string, slug: string): readonly string[] =>
  validateAgentAssetFrontmatter({
    content,
    expectedSlug: slug,
    kind: 'skill',
    path: `skills/${slug}/SKILL.md`,
  }).errors.map((issue) => `${issue.field}: ${issue.message}`);

describe('buildSkillScaffold', () => {
  // The whole point of the scaffold: it must be savable the instant it is
  // generated, because the create action runs this exact validator.
  test('round-trips through the frontmatter validator with no errors', () => {
    const content = buildSkillScaffold({
      description: 'Does a thing. USE WHEN the thing is needed.',
      name: 'my-new-skill',
    });

    expect(errorsFor(content, 'my-new-skill')).toEqual([]);
  });

  test('validates with tags and disable-model-invocation set', () => {
    const content = buildSkillScaffold({
      description: 'Does a thing.',
      disableModelInvocation: true,
      name: 'my-new-skill',
      tags: ['backend', 'testing'],
    });

    expect(errorsFor(content, 'my-new-skill')).toEqual([]);
    expect(content).toContain('tags: [backend, testing]');
    expect(content).toContain('disable-model-invocation: true');
  });

  test('omits the optional keys entirely when they are not supplied', () => {
    const content = buildSkillScaffold({
      description: 'Does a thing.',
      name: 'my-new-skill',
    });

    expect(content).not.toContain('tags:');
    expect(content).not.toContain('disable-model-invocation');
  });

  test('drops blank tags rather than emitting an empty one', () => {
    const content = buildSkillScaffold({
      description: 'Does a thing.',
      name: 'my-new-skill',
      tags: ['backend', '   ', ''],
    });

    expect(content).toContain('tags: [backend]');
    expect(errorsFor(content, 'my-new-skill')).toEqual([]);
  });

  test('emits no tags key when every tag is blank', () => {
    const content = buildSkillScaffold({
      description: 'Does a thing.',
      name: 'my-new-skill',
      tags: ['  ', ''],
    });

    expect(content).not.toContain('tags:');
  });

  // An empty description would fail the strict schema's non-empty check, so a
  // blank field falls back rather than emitting an unsavable file.
  test('falls back to the placeholder for an empty description', () => {
    const content = buildSkillScaffold({
      description: '   ',
      name: 'my-new-skill',
    });

    expect(content).toContain(SKILL_SCAFFOLD_DESCRIPTION_PLACEHOLDER);
    expect(errorsFor(content, 'my-new-skill')).toEqual([]);
  });

  test('the bare placeholder scaffold itself validates', () => {
    const content = buildSkillScaffold({
      description: SKILL_SCAFFOLD_DESCRIPTION_PLACEHOLDER,
      name: 'my-new-skill',
    });

    expect(errorsFor(content, 'my-new-skill')).toEqual([]);
  });

  // A real YAML parser reads the frontmatter, so a `: ` in the description
  // would silently become a nested mapping if it were emitted as a plain scalar.
  test('quotes a description containing a colon so it stays one string', () => {
    const description = 'Reviews code: correctness, then style.';
    const content = buildSkillScaffold({
      description,
      name: 'my-new-skill',
    });

    expect(errorsFor(content, 'my-new-skill')).toEqual([]);
    expect(content).toContain(`description: ${JSON.stringify(description)}`);
  });

  test.each([
    ['a leading hash', '#not a comment, the whole description'],
    ['a trailing comment marker', 'Does a thing # not a comment'],
    ['a leading indicator', '- leading dash'],
    ['a double quote', 'Says "hello" a lot'],
    ['a backslash', 'Matches a\\b'],
  ])('quotes a description with %s', (_label, description) => {
    const content = buildSkillScaffold({ description, name: 'my-new-skill' });

    expect(errorsFor(content, 'my-new-skill')).toEqual([]);
  });

  // YAML 1.2 would resolve these to a boolean/number, which the string schema
  // then rejects — so they have to be quoted back into strings.
  test.each(['true', 'false', 'null', '42', '3.14'])(
    'keeps the YAML-typed value %s a string',
    (description) => {
      const content = buildSkillScaffold({ description, name: 'my-new-skill' });

      expect(errorsFor(content, 'my-new-skill')).toEqual([]);
    },
  );

  test('trims surrounding whitespace from the description', () => {
    const content = buildSkillScaffold({
      description: '  Does a thing.  ',
      name: 'my-new-skill',
    });

    expect(content).toContain('description: Does a thing.');
  });

  test('names the body heading after the slug', () => {
    const content = buildSkillScaffold({
      description: 'Does a thing.',
      name: 'my-new-skill',
    });

    expect(content).toContain('# my-new-skill');
  });
});

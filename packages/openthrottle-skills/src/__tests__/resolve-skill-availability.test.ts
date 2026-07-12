import { describe, expect, test } from 'vitest';

import {
  resolveSkillAvailability,
  SKILL_AVAILABILITY_ENVIRONMENTS,
} from '../resolve-skill-availability.ts';
import type {
  SkillAvailabilityContext,
  SkillAvailabilityInput,
  SkillAvailabilityRule,
  SkillAvailabilityRuleSet,
} from '../resolve-skill-availability.ts';

const VOCAB = ['commit', 'git', 'github', 'infra', 'terraform'] as const;

const skill = (
  overrides: Partial<SkillAvailabilityInput> & { slug: string },
): SkillAvailabilityInput => ({
  disableModelInvocation: undefined,
  tags: [],
  ...overrides,
});

const rule = (
  overrides: Partial<SkillAvailabilityRule> & { id: string },
): SkillAvailabilityRule => ({
  environment: null,
  slugAllow: [],
  slugDeny: [],
  tagAllow: [],
  tagDeny: [],
  ...overrides,
});

const ruleSet = (
  posture: 'allow' | 'deny',
  rules: readonly SkillAvailabilityRule[],
): SkillAvailabilityRuleSet => ({ posture, rules });

const resolveOne = (
  input: SkillAvailabilityInput,
  set: SkillAvailabilityRuleSet | undefined,
  context: SkillAvailabilityContext = {},
  vocabulary: readonly string[] = VOCAB,
) => {
  const result = resolveSkillAvailability(context, [input], set, vocabulary);
  const [only] = result.skills;
  if (only === undefined) {
    throw new Error('expected exactly one resolved skill');
  }
  return { result, skill: only };
};

describe('SKILL_AVAILABILITY_ENVIRONMENTS', () => {
  test('is the agreed as-const triple', () => {
    expect([...SKILL_AVAILABILITY_ENVIRONMENTS]).toEqual([
      'ci',
      'interactive',
      'ralph',
    ]);
  });
});

describe('resolveSkillAvailability — no rule set (passthrough, invariant 3)', () => {
  test('unset ⇒ effective === (static ?? false) === false, frontmatter:unset', () => {
    const { skill: resolved } = resolveOne(
      skill({ disableModelInvocation: undefined, slug: 'a' }),
      undefined,
    );

    // The exact expression the design contract mandates.
    expect(resolved.effectiveDisableModelInvocation).toBe(
      resolved.staticDisableModelInvocation ?? false,
    );
    expect(resolved.effectiveDisableModelInvocation).toBe(false);
    expect(resolved.staticDisableModelInvocation).toBeUndefined();
    expect(resolved.provenance).toBe('frontmatter:unset');
  });

  test('true ⇒ effective === (static ?? false) === true, frontmatter:true', () => {
    const { skill: resolved } = resolveOne(
      skill({ disableModelInvocation: true, slug: 'a' }),
      undefined,
    );

    expect(resolved.effectiveDisableModelInvocation).toBe(
      resolved.staticDisableModelInvocation ?? false,
    );
    expect(resolved.effectiveDisableModelInvocation).toBe(true);
    expect(resolved.provenance).toBe('frontmatter:true');
  });

  test('false ⇒ effective === (static ?? false) === false, frontmatter:false', () => {
    const { skill: resolved } = resolveOne(
      skill({ disableModelInvocation: false, slug: 'a' }),
      undefined,
    );

    expect(resolved.effectiveDisableModelInvocation).toBe(
      resolved.staticDisableModelInvocation ?? false,
    );
    expect(resolved.effectiveDisableModelInvocation).toBe(false);
    expect(resolved.staticDisableModelInvocation).toBe(false);
    expect(resolved.provenance).toBe('frontmatter:false');
  });

  test('emits no warnings even when tags are outside the vocabulary', () => {
    const { result } = resolveOne(
      skill({ slug: 'a', tags: ['not-a-tag'] }),
      undefined,
    );

    expect(result.warnings).toEqual([]);
  });
});

describe('resolveSkillAvailability — posture (rung 3)', () => {
  test('deny posture with no matching rules ⇒ off, posture:deny', () => {
    const { skill: resolved } = resolveOne(
      skill({ slug: 'a', tags: ['github'] }),
      ruleSet('deny', []),
    );

    expect(resolved.effectiveDisableModelInvocation).toBe(true);
    expect(resolved.provenance).toBe('posture:deny');
  });

  test('allow posture falls through to frontmatter (never decides)', () => {
    const { skill: resolved } = resolveOne(
      skill({ disableModelInvocation: true, slug: 'a' }),
      ruleSet('allow', []),
    );

    expect(resolved.effectiveDisableModelInvocation).toBe(true);
    expect(resolved.provenance).toBe('frontmatter:true');
  });

  test('allow posture, unset frontmatter ⇒ on, frontmatter:unset', () => {
    const { skill: resolved } = resolveOne(
      skill({ slug: 'a' }),
      ruleSet('allow', []),
    );

    expect(resolved.effectiveDisableModelInvocation).toBe(false);
    expect(resolved.provenance).toBe('frontmatter:unset');
  });
});

describe('resolveSkillAvailability — slug rung (rung 1)', () => {
  test('slug allow overrides tag deny AND posture deny', () => {
    const { skill: resolved } = resolveOne(
      skill({ slug: 'git-commit', tags: ['github'] }),
      ruleSet('deny', [
        rule({ id: 'r1', slugAllow: ['git-commit'], tagDeny: ['github'] }),
      ]),
    );

    expect(resolved.effectiveDisableModelInvocation).toBe(false);
    expect(resolved.provenance).toBe('slug-allow:git-commit@r1');
  });

  test('slug deny ⇒ off, slug-deny provenance', () => {
    const { skill: resolved } = resolveOne(
      skill({ slug: 'dangerous' }),
      ruleSet('allow', [rule({ id: 'r1', slugDeny: ['dangerous'] })]),
    );

    expect(resolved.effectiveDisableModelInvocation).toBe(true);
    expect(resolved.provenance).toBe('slug-deny:dangerous@r1');
  });

  test('deny wins over allow at the slug rung (same specificity)', () => {
    const { skill: resolved } = resolveOne(
      skill({ slug: 'x' }),
      ruleSet('allow', [
        rule({ id: 'allower', slugAllow: ['x'] }),
        rule({ id: 'denier', slugDeny: ['x'] }),
      ]),
    );

    expect(resolved.effectiveDisableModelInvocation).toBe(true);
    expect(resolved.provenance).toBe('slug-deny:x@denier');
  });

  test('alphabetically-first rule id names the provenance among same-polarity winners', () => {
    const { skill: resolved } = resolveOne(
      skill({ slug: 'x' }),
      ruleSet('allow', [
        rule({ id: 'zeta', slugDeny: ['x'] }),
        rule({ id: 'alpha', slugDeny: ['x'] }),
      ]),
    );

    expect(resolved.provenance).toBe('slug-deny:x@alpha');
  });
});

describe('resolveSkillAvailability — tag rung (rung 2)', () => {
  test('tag allow re-enables a frontmatter:true skill', () => {
    const { skill: resolved } = resolveOne(
      skill({ disableModelInvocation: true, slug: 'a', tags: ['github'] }),
      ruleSet('allow', [rule({ id: 'r1', tagAllow: ['github'] })]),
    );

    expect(resolved.effectiveDisableModelInvocation).toBe(false);
    expect(resolved.provenance).toBe('tag-allow:github@r1');
    // Static flag is preserved untouched.
    expect(resolved.staticDisableModelInvocation).toBe(true);
  });

  test('tag deny ⇒ off, tag-deny provenance', () => {
    const { skill: resolved } = resolveOne(
      skill({ slug: 'a', tags: ['infra'] }),
      ruleSet('allow', [rule({ id: 'r1', tagDeny: ['infra'] })]),
    );

    expect(resolved.effectiveDisableModelInvocation).toBe(true);
    expect(resolved.provenance).toBe('tag-deny:infra@r1');
  });

  test('deny wins over allow at the same rung and specificity', () => {
    const { skill: resolved } = resolveOne(
      skill({ slug: 'a', tags: ['github'] }),
      ruleSet('allow', [
        rule({ id: 'allower', tagAllow: ['github'] }),
        rule({ id: 'denier', tagDeny: ['github'] }),
      ]),
    );

    expect(resolved.effectiveDisableModelInvocation).toBe(true);
    expect(resolved.provenance).toBe('tag-deny:github@denier');
  });

  test('provenance tie-break sorts by tag then rule id among winners', () => {
    // Two allow matches survive; alphabetically first (tag, ruleId) wins.
    const { skill: resolved } = resolveOne(
      skill({ slug: 'a', tags: ['github', 'terraform'] }),
      ruleSet('deny', [
        rule({ id: 'r2', tagAllow: ['terraform'] }),
        rule({ id: 'r1', tagAllow: ['github'] }),
      ]),
    );

    expect(resolved.effectiveDisableModelInvocation).toBe(false);
    expect(resolved.provenance).toBe('tag-allow:github@r1');
  });

  test('tie-break by rule id when the winning tag is shared', () => {
    const { skill: resolved } = resolveOne(
      skill({ slug: 'a', tags: ['github'] }),
      ruleSet('deny', [
        rule({ id: 'r2', tagAllow: ['github'] }),
        rule({ id: 'r1', tagAllow: ['github'] }),
      ]),
    );

    expect(resolved.provenance).toBe('tag-allow:github@r1');
  });
});

describe('resolveSkillAvailability — environment (rung 0 + specificity)', () => {
  test('worked example: env-specific allow beats env-agnostic deny under ralph', () => {
    const ruleA = rule({
      environment: 'ralph',
      id: 'ruleA',
      tagAllow: ['github'],
    });
    const ruleB = rule({ environment: null, id: 'ruleB', tagDeny: ['github'] });

    const { skill: resolved } = resolveOne(
      skill({ slug: 'gh-skill', tags: ['github'] }),
      ruleSet('allow', [ruleA, ruleB]),
      { environment: 'ralph' },
    );

    expect(resolved.effectiveDisableModelInvocation).toBe(false);
    expect(resolved.provenance).toBe('tag-allow:github@ruleA');
  });

  test('env-specific rules for a different environment are pre-filtered out', () => {
    // The ci-scoped deny does not apply under ralph; only the agnostic allow
    // remains, which does not decide, so posture allow ⇒ frontmatter.
    const { skill: resolved } = resolveOne(
      skill({ slug: 'a', tags: ['github'] }),
      ruleSet('allow', [
        rule({ environment: 'ci', id: 'ciOnly', tagDeny: ['github'] }),
      ]),
      { environment: 'ralph' },
    );

    expect(resolved.effectiveDisableModelInvocation).toBe(false);
    expect(resolved.provenance).toBe('frontmatter:unset');
  });

  test('env-specific rule applies when the context environment matches', () => {
    const { skill: resolved } = resolveOne(
      skill({ slug: 'a', tags: ['github'] }),
      ruleSet('allow', [
        rule({ environment: 'ci', id: 'ciOnly', tagDeny: ['github'] }),
      ]),
      { environment: 'ci' },
    );

    expect(resolved.effectiveDisableModelInvocation).toBe(true);
    expect(resolved.provenance).toBe('tag-deny:github@ciOnly');
  });

  test('default environment is interactive when context omits it', () => {
    const denied = resolveOne(
      skill({ slug: 'a', tags: ['github'] }),
      ruleSet('allow', [
        rule({ environment: 'interactive', id: 'ix', tagDeny: ['github'] }),
      ]),
      {},
    );
    expect(denied.skill.provenance).toBe('tag-deny:github@ix');

    // A ralph-scoped rule does not apply under the default interactive env.
    const untouched = resolveOne(
      skill({ slug: 'a', tags: ['github'] }),
      ruleSet('allow', [
        rule({ environment: 'ralph', id: 'rx', tagDeny: ['github'] }),
      ]),
      {},
    );
    expect(untouched.skill.provenance).toBe('frontmatter:unset');
  });

  test('specificity discards agnostic deny before polarity, per the ladder', () => {
    // Both an env-specific allow and an agnostic deny match; specificity keeps
    // only the env-specific match, so allow wins (not deny).
    const { skill: resolved } = resolveOne(
      skill({ slug: 'a', tags: ['github'] }),
      ruleSet('deny', [
        rule({ environment: 'ci', id: 'specificAllow', tagAllow: ['github'] }),
        rule({ environment: null, id: 'agnosticDeny', tagDeny: ['github'] }),
      ]),
      { environment: 'ci' },
    );

    expect(resolved.effectiveDisableModelInvocation).toBe(false);
    expect(resolved.provenance).toBe('tag-allow:github@specificAllow');
  });
});

describe('resolveSkillAvailability — unknown tags (invariant 4)', () => {
  test('unknown tag warns, is skipped for matching, and known tag still resolves', () => {
    // 'mystery' is not in the vocabulary → warned + skipped; 'github' matches.
    const { result, skill: resolved } = resolveOne(
      skill({ slug: 'a', tags: ['mystery', 'github'] }),
      ruleSet('allow', [
        rule({ id: 'r1', tagDeny: ['mystery'] }),
        rule({ id: 'r2', tagDeny: ['github'] }),
      ]),
    );

    // The rule denying 'mystery' never matches because the tag was skipped.
    expect(resolved.provenance).toBe('tag-deny:github@r2');
    expect(result.warnings).toEqual(['unknown-tag:mystery@a']);
  });

  test('an unknown tag with no matching rule falls through, still warns', () => {
    const { result, skill: resolved } = resolveOne(
      skill({ slug: 'a', tags: ['mystery'] }),
      ruleSet('allow', [rule({ id: 'r1', tagDeny: ['mystery'] })]),
    );

    expect(resolved.provenance).toBe('frontmatter:unset');
    expect(result.warnings).toEqual(['unknown-tag:mystery@a']);
  });

  test('identical unknown-tag warnings are deduped across skills', () => {
    const result = resolveSkillAvailability(
      {},
      [
        skill({ slug: 'a', tags: ['mystery', 'mystery'] }),
        skill({ slug: 'b', tags: ['mystery'] }),
      ],
      ruleSet('allow', []),
      VOCAB,
    );

    // 'a' dedupes its two identical warnings; 'b' is a distinct slug.
    expect(result.warnings).toEqual([
      'unknown-tag:mystery@a',
      'unknown-tag:mystery@b',
    ]);
  });

  test('rule-side unknown tags simply never match — no warning', () => {
    // The rule references a tag not in the vocabulary; the skill carries only
    // known tags. Per the doc, no warning is emitted for rule-side tags.
    const { result, skill: resolved } = resolveOne(
      skill({ slug: 'a', tags: ['github'] }),
      ruleSet('allow', [rule({ id: 'r1', tagDeny: ['not-in-vocab'] })]),
    );

    expect(result.warnings).toEqual([]);
    expect(resolved.provenance).toBe('frontmatter:unset');
  });
});

describe('resolveSkillAvailability — reserved-inert axes + shape', () => {
  test('editor and role are ignored (do not change resolution)', () => {
    const withAxes = resolveOne(
      skill({ disableModelInvocation: true, slug: 'a' }),
      ruleSet('allow', [rule({ id: 'r1', tagAllow: ['github'] })]),
      { editor: 'vscode', environment: 'ralph', role: 'architect' },
    );
    const withoutAxes = resolveOne(
      skill({ disableModelInvocation: true, slug: 'a' }),
      ruleSet('allow', [rule({ id: 'r1', tagAllow: ['github'] })]),
      { environment: 'ralph' },
    );

    expect(withAxes.skill).toEqual(withoutAxes.skill);
  });

  test('empty rules arrays on a rule are inert', () => {
    const { skill: resolved } = resolveOne(
      skill({ slug: 'a', tags: ['github'] }),
      ruleSet('allow', [rule({ id: 'empty' })]),
    );

    expect(resolved.provenance).toBe('frontmatter:unset');
  });

  test('result preserves input order', () => {
    const result = resolveSkillAvailability(
      {},
      [
        skill({ slug: 'zebra' }),
        skill({ slug: 'apple' }),
        skill({ slug: 'mango' }),
      ],
      undefined,
      VOCAB,
    );

    expect(result.skills.map((s) => s.slug)).toEqual([
      'zebra',
      'apple',
      'mango',
    ]);
  });

  test('empty skills input yields empty skills + warnings', () => {
    const result = resolveSkillAvailability({}, [], ruleSet('deny', []), VOCAB);

    expect(result.skills).toEqual([]);
    expect(result.warnings).toEqual([]);
  });
});

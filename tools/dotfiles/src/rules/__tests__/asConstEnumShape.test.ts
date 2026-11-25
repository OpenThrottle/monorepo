import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, expect, it } from 'vitest';

import { asConstEnumShape, pascalNameOf } from '../asConstEnumShape.ts';

// Wire the framework hooks the RuleTester calls to Vitest's.
RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

const KIND_OBJECT = [
  'export const CODE_SEARCH_CASE_KIND = {',
  "  BODY: 'body',",
  "  INTENT: 'intent',",
  '} as const;',
].join('\n');

const CANONICAL = [
  KIND_OBJECT,
  '',
  'export type CodeSearchCaseKindKey = keyof typeof CODE_SEARCH_CASE_KIND;',
  'export type CodeSearchCaseKindValue = (typeof CODE_SEARCH_CASE_KIND)[CodeSearchCaseKindKey];',
].join('\n');

describe('pascalNameOf', () => {
  it('capitalizes each segment and lower-cases the rest', () => {
    expect(pascalNameOf('CODE_SEARCH_CASE_KIND')).toBe('CodeSearchCaseKind');
  });

  it('does not keep acronyms', () => {
    expect(pascalNameOf('MCP_TOOL_KIND')).toBe('McpToolKind');
  });

  it('does not singularize', () => {
    expect(pascalNameOf('PERMISSIONS')).toBe('Permissions');
  });

  it('keeps digits', () => {
    expect(pascalNameOf('HTTP2_MODE')).toBe('Http2Mode');
  });
});

describe('when the shape is canonical', () => {
  ruleTester.run('as-const-enum-shape', asConstEnumShape, {
    invalid: [],
    valid: [
      { code: CANONICAL },
      // `satisfies` after `as const` is still the canonical object.
      {
        code: [
          "export const MODE = { A: 'a' } as const satisfies Record<string, string>;",
          'export type ModeKey = keyof typeof MODE;',
          'export type ModeValue = (typeof MODE)[ModeKey];',
        ].join('\n'),
      },
      // Number values, an acronym name.
      {
        code: [
          'export const MCP_TOOL_KIND = { READ: 1, WRITE: -2 } as const;',
          'export type McpToolKindKey = keyof typeof MCP_TOOL_KIND;',
          'export type McpToolKindValue = (typeof MCP_TOOL_KIND)[McpToolKindKey];',
        ].join('\n'),
      },
    ],
  });
});

describe('when the object is not enum-like', () => {
  ruleTester.run('as-const-enum-shape', asConstEnumShape, {
    invalid: [],
    valid: [
      // A nested object is configuration.
      { code: "export const CONFIG = { db: { host: 'x' } } as const;" },
      // An array value, a call, an identifier.
      { code: "export const LISTS = { a: ['x'] } as const;" },
      { code: 'export const CALLS = { a: make() } as const;' },
      { code: 'export const REFS = { a: OTHER } as const;' },
      // An `as const` array has no key.
      { code: "export const DRIVERS = ['claude', 'codex'] as const;" },
      // No `as const`.
      { code: "export const PLAIN = { A: 'a' };" },
      // An empty object.
      { code: 'export const EMPTY = {} as const;' },
      // Copy: a value with whitespace, or a `_COPY` object.
      {
        code: "export const EMPTY_STATE = { title: 'No plans yet' } as const;",
      },
      {
        code: 'export const NOTICE = { body: `Run it again later.` } as const;',
      },
      { code: "export const PLANS_COPY = { title: 'Plans' } as const;" },
      // A template literal with an expression.
      { code: 'export const TPL = { A: `${prefix}-a` } as const;' },
    ],
  });
});

describe('when the object is not exported', () => {
  ruleTester.run('as-const-enum-shape', asConstEnumShape, {
    invalid: [],
    valid: [{ code: "const PRIVATE_KIND = { A: 'a' } as const;" }],
  });
});

describe('when the file is generated', () => {
  ruleTester.run('as-const-enum-shape', asConstEnumShape, {
    invalid: [],
    valid: [
      {
        code: "export const BlogPostState = { Live: 'LIVE' } as const;",
        filename: 'src/__generated__/graphql.ts',
      },
      {
        code: "export const BLOG_KIND = { A: 'a' } as const;",
        filename: 'src/__generated__/graphql.ts',
      },
    ],
  });
});

describe('when the types are missing', () => {
  ruleTester.run('as-const-enum-shape', asConstEnumShape, {
    invalid: [
      // Both missing: both inserted.
      {
        code: KIND_OBJECT,
        errors: [{ messageId: 'missingTypes' }],
        output: CANONICAL,
      },
      // Key present, Value missing.
      {
        code: [
          KIND_OBJECT,
          '',
          'export type CodeSearchCaseKindKey = keyof typeof CODE_SEARCH_CASE_KIND;',
        ].join('\n'),
        errors: [{ messageId: 'missingTypes' }],
        output: CANONICAL,
      },
      // Value present after a blank line, with a JSDoc: Key goes above both.
      {
        code: [
          KIND_OBJECT,
          '',
          '/** The case kind. */',
          'export type CodeSearchCaseKindValue = (typeof CODE_SEARCH_CASE_KIND)[CodeSearchCaseKindKey];',
        ].join('\n'),
        errors: [{ messageId: 'missingTypes' }],
        output: [
          KIND_OBJECT,
          '',
          'export type CodeSearchCaseKindKey = keyof typeof CODE_SEARCH_CASE_KIND;',
          '/** The case kind. */',
          'export type CodeSearchCaseKindValue = (typeof CODE_SEARCH_CASE_KIND)[CodeSearchCaseKindKey];',
        ].join('\n'),
      },
      // Value present, Key missing: Key goes above it, and the Value body
      // moves onto the Key.
      {
        code: [
          KIND_OBJECT,
          'export type CodeSearchCaseKindValue = (typeof CODE_SEARCH_CASE_KIND)[keyof typeof CODE_SEARCH_CASE_KIND];',
        ].join('\n'),
        errors: [{ messageId: 'missingTypes' }],
        output: CANONICAL.replace('} as const;\n\n', '} as const;\n'),
      },
      // An unrelated statement after the object is kept after the types.
      {
        code: [KIND_OBJECT, '', 'export const OTHER = 1;'].join('\n'),
        errors: [{ messageId: 'missingTypes' }],
        output: [CANONICAL, '', 'export const OTHER = 1;'].join('\n'),
      },
      // Number values and an acronym.
      {
        code: 'export const MCP_TOOL_KIND = { READ: 1 } as const;',
        errors: [{ messageId: 'missingTypes' }],
        output: [
          'export const MCP_TOOL_KIND = { READ: 1 } as const;',
          '',
          'export type McpToolKindKey = keyof typeof MCP_TOOL_KIND;',
          'export type McpToolKindValue = (typeof MCP_TOOL_KIND)[McpToolKindKey];',
        ].join('\n'),
      },
    ],
    valid: [],
  });
});

describe('when the types are not canonical', () => {
  ruleTester.run('as-const-enum-shape', asConstEnumShape, {
    invalid: [
      {
        code: [
          KIND_OBJECT,
          '',
          'export type CodeSearchCaseKindKey = keyof typeof CODE_SEARCH_CASE_KIND;',
          'export type CodeSearchCaseKindValue = (typeof CODE_SEARCH_CASE_KIND)[keyof typeof CODE_SEARCH_CASE_KIND];',
        ].join('\n'),
        errors: [{ messageId: 'nonCanonical' }],
        output: CANONICAL,
      },
    ],
    valid: [],
  });
});

describe('when the types are not exported', () => {
  ruleTester.run('as-const-enum-shape', asConstEnumShape, {
    invalid: [
      {
        code: [
          KIND_OBJECT,
          '',
          'type CodeSearchCaseKindKey = keyof typeof CODE_SEARCH_CASE_KIND;',
          'type CodeSearchCaseKindValue = (typeof CODE_SEARCH_CASE_KIND)[CodeSearchCaseKindKey];',
        ].join('\n'),
        errors: [{ messageId: 'exportMismatch' }],
        output: CANONICAL,
      },
      // A JSDoc tag on an alias survives the in-place fix.
      {
        code: [
          KIND_OBJECT,
          '',
          '/** @public */',
          'type CodeSearchCaseKindKey = keyof typeof CODE_SEARCH_CASE_KIND;',
          '/** @public */',
          'export type CodeSearchCaseKindValue = (typeof CODE_SEARCH_CASE_KIND)[keyof typeof CODE_SEARCH_CASE_KIND];',
        ].join('\n'),
        errors: [{ messageId: 'nonCanonical' }],
        output: [
          KIND_OBJECT,
          '',
          '/** @public */',
          'export type CodeSearchCaseKindKey = keyof typeof CODE_SEARCH_CASE_KIND;',
          '/** @public */',
          'export type CodeSearchCaseKindValue = (typeof CODE_SEARCH_CASE_KIND)[CodeSearchCaseKindKey];',
        ].join('\n'),
      },
    ],
    valid: [],
  });
});

describe('when the types do not follow the object', () => {
  ruleTester.run('as-const-enum-shape', asConstEnumShape, {
    invalid: [
      // Reversed order directly after the object: fixed.
      {
        code: [
          KIND_OBJECT,
          'export type CodeSearchCaseKindValue = (typeof CODE_SEARCH_CASE_KIND)[CodeSearchCaseKindKey];',
          'export type CodeSearchCaseKindKey = keyof typeof CODE_SEARCH_CASE_KIND;',
        ].join('\n'),
        errors: [{ messageId: 'notAdjacent' }],
        output: CANONICAL,
      },
      // Declared elsewhere in the module: reported, not moved.
      {
        code: [
          KIND_OBJECT,
          'export const OTHER = 1;',
          'export type CodeSearchCaseKindKey = keyof typeof CODE_SEARCH_CASE_KIND;',
          'export type CodeSearchCaseKindValue = (typeof CODE_SEARCH_CASE_KIND)[CodeSearchCaseKindKey];',
        ].join('\n'),
        errors: [{ messageId: 'notAdjacent' }],
        output: null,
      },
      // Reversed, with a comment the rewrite would drop: not fixed.
      {
        code: [
          KIND_OBJECT,
          '/** @public */',
          'export type CodeSearchCaseKindValue = (typeof CODE_SEARCH_CASE_KIND)[CodeSearchCaseKindKey];',
          'export type CodeSearchCaseKindKey = keyof typeof CODE_SEARCH_CASE_KIND;',
        ].join('\n'),
        errors: [{ messageId: 'notAdjacent' }],
        output: null,
      },
    ],
    valid: [],
  });
});

describe('when an alias is misnamed', () => {
  ruleTester.run('as-const-enum-shape', asConstEnumShape, {
    invalid: [
      // A bare value type: reported, not renamed, and nothing inserted.
      {
        code: [
          "export const SCHEDULE_KIND = { CRON: 'cron' } as const;",
          'export type ScheduleKind = (typeof SCHEDULE_KIND)[keyof typeof SCHEDULE_KIND];',
        ].join('\n'),
        errors: [
          {
            data: {
              alias: 'ScheduleKind',
              expected: 'ScheduleKindValue',
              name: 'SCHEDULE_KIND',
            },
            messageId: 'misnamedAlias',
          },
        ],
        output: null,
      },
      // A key type under another name.
      {
        code: [
          "export const SCHEDULE_KIND = { CRON: 'cron' } as const;",
          'export type ScheduleKindName = keyof typeof SCHEDULE_KIND;',
        ].join('\n'),
        errors: [
          {
            data: {
              alias: 'ScheduleKindName',
              expected: 'ScheduleKindKey',
              name: 'SCHEDULE_KIND',
            },
            messageId: 'misnamedAlias',
          },
        ],
        output: null,
      },
    ],
    valid: [],
  });
});

describe('when the object is PascalCase', () => {
  ruleTester.run('as-const-enum-shape', asConstEnumShape, {
    invalid: [
      {
        code: "export const WorkspaceEditorId = { Vscode: 'vscode' } as const;",
        errors: [
          {
            data: {
              expected: 'WORKSPACE_EDITOR_ID',
              name: 'WorkspaceEditorId',
            },
            messageId: 'pascalCaseName',
          },
        ],
        output: null,
      },
    ],
    valid: [
      // camelCase objects are out of scope.
      { code: "export const prStateClaim = { closed: 'CLOSED' } as const;" },
    ],
  });
});

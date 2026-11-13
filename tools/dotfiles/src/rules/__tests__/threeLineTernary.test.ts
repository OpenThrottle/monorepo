import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';

import { threeLineTernary } from '../threeLineTernary.ts';

// Wire the framework hooks the RuleTester calls to Vitest's.
RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

const jsx = {
  languageOptions: {
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
};

ruleTester.run('three-line-ternary', threeLineTernary, {
  invalid: [
    // The condition wrapped below `=`: Prettier's shape for a binary condition.
    {
      code: [
        'const label =',
        '  run.usageLimitResetsAt !== null',
        '    ? `${resetsPrefix} ${formatWhen(run.usageLimitResetsAt)}`',
        '    : resetUnknown;',
      ].join('\n'),
      errors: [{ line: 2, messageId: 'wrappedCondition' }],
    },
    // The same wrap under an object key.
    {
      code: [
        'const row = {',
        '  label:',
        '    run.usageLimitResetsAt !== null',
        '      ? knownResetLabel',
        '      : resetUnknown,',
        '};',
      ].join('\n'),
      errors: [{ line: 3, messageId: 'wrappedCondition' }],
    },
    // The same wrap under an assignment.
    {
      code: [
        'label =',
        '  run.usageLimitResetsAt !== null',
        '    ? knownResetLabel',
        '    : resetUnknown;',
      ].join('\n'),
      errors: [{ line: 2, messageId: 'wrappedCondition' }],
    },
    // The same wrap under an arrow.
    {
      code: [
        'const toLabel = () =>',
        '  run.usageLimitResetsAt !== null',
        '    ? knownResetLabel',
        '    : resetUnknown;',
      ].join('\n'),
      errors: [{ line: 2, messageId: 'wrappedCondition' }],
    },
    // A spread-ternary whose branch wraps runs past three lines.
    {
      code: [
        'const rows = [',
        '  ...baseRows,',
        "  ...(run.status === 'usage_limited'",
        '    ? [',
        '        { label: fields.usageLimitResetsAt, value: resetsAt },',
        '      ]',
        '    : []),',
        '];',
      ].join('\n'),
      errors: [{ line: 3, messageId: 'tooManyLines' }],
    },
    // A wrapped chain is reported once, on the outermost link.
    {
      code: [
        'const tone =',
        "  status === 'failed'",
        "    ? 'destructive'",
        "    : status === 'running'",
        "      ? 'info'",
        "      : 'muted';",
      ].join('\n'),
      errors: [{ line: 2, messageId: 'tooManyLines' }],
    },
    // JSX conditionals are in scope: wrapped subtree branches are reported.
    {
      code: [
        'const el = (',
        '  <div>',
        '    {hasResetTime ? (',
        '      <span>{knownResetLabel}</span>',
        '    ) : (',
        '      <span>{resetUnknown}</span>',
        '    )}',
        '  </div>',
        ');',
      ].join('\n'),
      errors: [{ line: 3, messageId: 'tooManyLines' }],
      ...jsx,
    },
  ],
  valid: [
    // A one-line value ternary.
    'const label = hasResetTime ? knownResetLabel : resetUnknown;',
    // A one-line chain.
    "const tone = failed ? 'destructive' : running ? 'info' : 'muted';",
    // A one-line ternary nested inside a multi-line expression is fine.
    ['const row = {', '  label: isLong ? long : short,', '};'].join('\n'),
    // A named condition keeps the wrapped ternary on the `=` line: 3 lines.
    [
      'const label = hasResetTime',
      '  ? `${resetsPrefix} ${formatWhen(run.usageLimitResetsAt)}`',
      '  : resetUnknown;',
    ].join('\n'),
    // Same under an object key.
    [
      'const row = {',
      '  label: hasResetTime',
      '    ? knownResetLabel',
      '    : resetUnknown,',
      '};',
    ].join('\n'),
    // `return` keeps even a binary condition on its line.
    [
      'function toLabel() {',
      '  return run.usageLimitResetsAt !== null',
      '    ? knownResetLabel',
      '    : resetUnknown;',
      '}',
    ].join('\n'),
    // A wrapped argument starts on its own line by argument layout, not a wrap.
    [
      'format(',
      '  run,',
      '  run.usageLimitResetsAt !== null',
      '    ? knownResetLabel',
      '    : resetUnknown,',
      ');',
    ].join('\n'),
    // A ternary statement after a `case` label is not introduced by its `:`.
    [
      'switch (kind) {',
      "  case 'run':",
      '    hasResetTime',
      '      ? scheduleResume(run)',
      '      : markUnknown(run);',
      '}',
    ].join('\n'),
    // JSX branches held in `// Markup` consts keep the ternary on one line.
    {
      code: 'const el = <div>{hasResetTime ? knownResetTime : unknownResetTime}</div>;',
      ...jsx,
    },
    // A JSX conditional with one-line branches may take three lines.
    {
      code: [
        'const el = (',
        '  <div>',
        '    {hasResetTime',
        "      ? 'some long string label here'",
        "      : 'another long string label'}",
        '  </div>',
        ');',
      ].join('\n'),
      ...jsx,
    },
    // `&&` is not a ternary and is out of scope.
    {
      code: [
        'const el = (',
        '  <div>',
        '    {isOpen && (',
        '      <span>{label}</span>',
        '    )}',
        '  </div>',
        ');',
      ].join('\n'),
      ...jsx,
    },
    // A conditional *type* is not a ConditionalExpression.
    ['type Unwrap<T> = T extends Promise<infer U>', '  ? U', '  : T;'].join(
      '\n',
    ),
  ],
});

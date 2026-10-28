import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';

import {
  analyzeComponentSource,
  analyzePrimitiveSource,
} from '../audit-component-shape.ts';
import { countLines } from '../utils/index.ts';

/** A conformant component padded with comment lines to exactly `lines` lines. */
const componentOfLines = (
  lines: number,
  header = '',
  newline = '\n',
): string => {
  const head = [
    ...(header === '' ? [] : [header]),
    'export const Card = (): React.ReactElement => <div />;',
  ];
  const padding = Array.from(
    { length: lines - head.length },
    (_, i) => `// padding ${i}`,
  );

  return [...head, ...padding].join(newline);
};

/** ESLint `max-lines` count for `code`, read back from the rule's report. */
const eslintLineCount = (code: string): number => {
  const [message] = new Linter().verify(code, [
    {
      rules: {
        'max-lines': [
          'error',
          { max: 1, skipBlankLines: false, skipComments: false },
        ],
      },
    },
  ]);
  const actual = message?.message.match(/too many lines \((\d+)\)/)?.[1];

  return actual === undefined ? 1 : Number(actual);
};

describe('countLines', () => {
  it('does not count the empty segment after a final newline', () => {
    expect(countLines('a\nb\n')).toBe(2);
  });

  it('counts a file with no trailing newline', () => {
    expect(countLines('a\nb')).toBe(2);
  });

  it('treats \\r\\n as one break', () => {
    expect(countLines('a\r\nb\r\n')).toBe(2);
  });

  it('agrees with ESLint max-lines', () => {
    const samples = [
      '',
      'a',
      'a\n',
      'a\n\n',
      'a\nb',
      'a\r\nb\r\n',
      'a\rb\r',
      `${componentOfLines(210).replace(/<div \/>/, 'null')}\n`,
      `${componentOfLines(211).replace(/<div \/>/, 'null')}\n`,
    ].map((code) => code.replace(/\): React\.ReactElement/, ')'));

    for (const code of samples) {
      expect(countLines(code), JSON.stringify(code.slice(0, 20))).toBe(
        eslintLineCount(code),
      );
    }
  });
});

describe('analyzeComponentSource — R6 line cap', () => {
  it('does not flag a 210-line file with a trailing newline', () => {
    const report = analyzeComponentSource(`${componentOfLines(210)}\n`);

    expect(report.lineCount).toBe(210);
    expect(report.overCap).toBe(false);
  });

  it('flags a 211-line file', () => {
    const report = analyzeComponentSource(`${componentOfLines(211)}\n`);

    expect(report.lineCount).toBe(211);
    expect(report.overCap).toBe(true);
  });

  it('counts a file with no trailing newline', () => {
    expect(analyzeComponentSource(componentOfLines(211)).lineCount).toBe(211);
  });

  it('counts \\r\\n line endings the same as \\n', () => {
    const report = analyzeComponentSource(
      `${componentOfLines(210, '', '\r\n')}\r\n`,
    );

    expect(report.lineCount).toBe(210);
    expect(report.overCap).toBe(false);
  });

  it('does not flag an opted-out 300-line file', () => {
    const report = analyzeComponentSource(
      `${componentOfLines(300, '/* component-shape: opt-out — test */')}\n`,
    );

    expect(report.optOut).toBe(true);
    expect(report.lineCount).toBe(300);
    expect(report.overCap).toBe(false);
  });
});

const forwardRefPart = (
  name: string,
): string => `export interface ${name}Props {}

export const ${name} = React.forwardRef<HTMLDivElement, ${name}Props>(
  (props, ref): React.ReactElement => <div ref={ref} {...props} />,
);

${name}.displayName = '${name}';`;

describe('analyzePrimitiveSource', () => {
  it('accepts a conformant forwardRef primitive', () => {
    const report = analyzePrimitiveSource(
      `import * as React from 'react';\n\n${forwardRefPart('Card')}\n`,
      'Card.tsx',
    );

    expect(report.parts).toEqual(['Card']);
    expect(report.forwardRefParts).toEqual(['Card']);
    expect(report.missingProps).toEqual([]);
    expect(report.missingDisplayName).toEqual([]);
    expect(report.reExportBlock).toBe(false);
  });

  it('discovers every part of a multi-export family', () => {
    const report = analyzePrimitiveSource(
      `import * as React from 'react';\n\n${forwardRefPart('Card')}\n\n${forwardRefPart(
        'CardHeader',
      )}\n`,
      'Card.tsx',
    );

    expect(report.parts).toEqual(['Card', 'CardHeader']);
    expect(report.missingProps).toEqual([]);
  });

  it('accepts an exported `type <Part>Props` alias (union-props primitive)', () => {
    const report = analyzePrimitiveSource(
      `import * as React from 'react';

export type ToggleGroupProps = React.ComponentProps<'div'> & { size?: 'sm' };

export const ToggleGroup = React.forwardRef<HTMLDivElement, ToggleGroupProps>(
  (props, ref): React.ReactElement => <div ref={ref} {...props} />,
);

ToggleGroup.displayName = 'ToggleGroup';
`,
      'ToggleGroup.tsx',
    );

    expect(report.parts).toEqual(['ToggleGroup']);
    expect(report.missingProps).toEqual([]);
  });

  it('does not treat a cva variant object as a part', () => {
    const report = analyzePrimitiveSource(
      `import * as React from 'react';
import { cva } from 'class-variance-authority';

const cardVariants = cva('base');

${forwardRefPart('Card')}
`,
      'Card.tsx',
    );

    expect(report.parts).toEqual(['Card']);
    expect(report.missingProps).toEqual([]);
  });

  it('flags a forwardRef part with no displayName (VR2)', () => {
    const report = analyzePrimitiveSource(
      `import * as React from 'react';

export interface CardProps {}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (props, ref): React.ReactElement => <div ref={ref} {...props} />,
);
`,
      'Card.tsx',
    );

    expect(report.missingDisplayName).toEqual(['Card']);
  });

  it('flags a part missing its <Part>Props (VR1)', () => {
    const report = analyzePrimitiveSource(
      `import * as React from 'react';

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (props, ref): React.ReactElement => <span ref={ref} {...props} />,
);

Badge.displayName = 'Badge';
`,
      'Badge.tsx',
    );

    expect(report.missingProps).toEqual(['Badge']);
  });

  it('flags the banned trailing export block (VR5)', () => {
    const report = analyzePrimitiveSource(
      `import * as React from 'react';

const Card = (): React.ReactElement => <div />;

export { Card };
`,
      'Card.tsx',
    );

    expect(report.reExportBlock).toBe(true);
  });

  it('suppresses every signal under an opt-out pragma', () => {
    const report = analyzePrimitiveSource(
      `/* component-shape: opt-out — vendored */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(() => null);

export { Card };
`,
      'Card.tsx',
    );

    expect(report.optOut).toBe(true);
    expect(report.missingProps).toEqual([]);
    expect(report.missingDisplayName).toEqual([]);
    expect(report.reExportBlock).toBe(false);
  });
});

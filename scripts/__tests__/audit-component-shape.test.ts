import { describe, expect, it } from 'vitest';
import { analyzePrimitiveSource } from '../audit-component-shape.ts';

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

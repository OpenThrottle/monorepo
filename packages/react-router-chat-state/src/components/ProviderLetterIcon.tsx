import * as React from 'react';
import type { ProviderIconProps } from './svg-base';

/** Props for the letter-avatar fallback glyph. @public */
export interface ProviderLetterIconProps extends ProviderIconProps {
  /** Source token the displayed letter is derived from (e.g. a group id). */
  readonly label: string;
}

/**
 * @description Letter-avatar fallback glyph for a provider with no bundled
 * brand icon. The letter is the first alphanumeric character of {@link label},
 * uppercased (or `?` when none).
 * @public
 */
export const ProviderLetterIcon = ({
  className,
  label,
}: ProviderLetterIconProps): React.ReactElement => {
  // Hooks

  // Setup
  const match = label.match(/[a-z0-9]/i);
  const letter = (match?.[0] ?? '?').toUpperCase();

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  return (
    <span
      aria-hidden={true}
      className={className}
      data-provider-letter={letter}
      style={{
        alignItems: 'center',
        display: 'inline-flex',
        fontSize: '0.7em',
        fontWeight: 600,
        height: '1em',
        justifyContent: 'center',
        width: '1em',
      }}
    >
      {letter}
    </span>
  );
};

import { Button as ShadcnButton, cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { BUTTON_SIZES, BUTTON_VARIANTS } from '../data/data.button';
import type { CmsComponentDebug } from '../types';

/**
 * @public
 * @description A call-to-action button built on the shadcn `Button`.
 */
export interface ButtonProps extends Pick<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'disabled' | 'name' | 'value'
> {
  /**
   * @default "uppercase"
   * @description Classes to be applied on the component.
   * @TJS-type className
   */
  readonly className?: string;

  /**
   * @default "Call to action"
   * @description The label shown on the button
   */
  readonly cta: string;

  /**
   * @default "md"
   * @description Controls the sizing of the button
   */
  readonly size?: 'lg' | 'md' | 'sm' | 'xl';

  /**
   * @default "primary"
   * @description "secondary" is the same button without the fill or outline.
   */
  readonly variant?: 'primary' | 'secondary';
}

/**
 * @public
 */
export const Button = (props: ButtonProps): React.ReactElement => {
  const {
    className,
    cta,
    disabled,
    name,
    size = 'md',
    value,
    variant = 'primary',
  } = props;

  // Hooks

  // Setup
  const sizing = BUTTON_SIZES[size];

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <ShadcnButton
      className={cn(sizing.className, className)}
      disabled={disabled}
      name={name}
      size={sizing.size}
      type="button"
      value={value}
      variant={BUTTON_VARIANTS[variant]}
    >
      {cta}
    </ShadcnButton>
  );
};

Button.debug = {
  className: undefined,
} satisfies CmsComponentDebug;

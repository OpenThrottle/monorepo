import { cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import type { CmsComponentDebug } from '../types';

/**
 * @public
 * @description The "Hero" component is a large headline with a smaller
 * subheading.
 */
export interface HeroProps {
  /**
   * @default "my-20"
   * @description Classes to be applied on the component.
   * @cmsWidget className
   */
  readonly className?: string;

  /**
   * @default "A custom CMS"
   * @description First part of the heading (non gradient)
   */
  readonly heading: string;

  /**
   * @default "using your code"
   * @description Highlighted part of the heading (gradient)
   */
  readonly highlight: string;

  /**
   * @default "Build, ship, and Iterate on your content with ease. "
   * @description Smaller but longer copy...
   */
  readonly subheading: string;
}

/**
 * @public
 */
export const Hero = (props: HeroProps): React.ReactElement => {
  const { className, heading, highlight, subheading } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={cn(className)}>
      <h1 className="text-center text-6xl leading-[1.1] font-extrabold tracking-tighter sm:text-7xl lg:text-8xl">
        {heading}
        <br />
        <span className="text-primary">{highlight}</span>
      </h1>
      <h2 className="text-muted-foreground mx-auto mt-6 max-w-lg text-center text-xl leading-tight font-medium sm:max-w-4xl sm:text-2xl md:text-3xl lg:text-4xl">
        {subheading}
      </h2>
    </div>
  );
};

Hero.debug = {
  className: undefined,
} satisfies CmsComponentDebug;

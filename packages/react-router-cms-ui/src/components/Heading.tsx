import { cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { DEFAULT_HEADING_TAG, HEADING_TAGS } from '../data/data.headings';
import type { CmsComponentDebug } from '../types';

/**
 * @public
 * @description A simple component that renders a heading and text that
 * can be styled with a class name(s).
 */
export interface HeadingProps {
  /**
   * @default "text-3xl text-highlight"
   * @description Classes to be applied on the component.
   * @cmsWidget className
   */
  readonly className?: string;

  /**
   * @default "Do not take life too seriously. You will never get out of it alive."
   * @description The copy displayed within the heading.
   */
  readonly copy: string;

  /**
   * @default "h2"
   * @description Select the correct heading tag to use.
   */
  readonly heading: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

/**
 * @public
 */
export const Heading = (props: HeadingProps): React.ReactElement => {
  const { className, copy, heading } = props;

  // Hooks

  // Setup
  const isHeading = HEADING_TAGS.includes(heading);
  const HeadingTag = isHeading ? heading : DEFAULT_HEADING_TAG;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return <HeadingTag className={cn('heading', className)}>{copy}</HeadingTag>;
};

Heading.debug = {
  className: undefined,
} satisfies CmsComponentDebug;

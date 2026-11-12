import { cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { WYSIWYG_CLASSES } from '../data/data.wysiwyg';
import type { CmsComponentDebug } from '../types';

/**
 * @public
 * @description Renders server-supplied rich text (HTML) with normalized
 * typography.
 */
export interface WysiwygProps {
  /**
   * @default "my-20"
   * @description Classes to be applied on the component.
   * @cmsWidget className
   */
  readonly className?: string;

  /**
   * @default <div>
      <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Explicabo porro debitis blanditiis corrupti dignissimos voluptate exercitationem quasi dolor, quisquam, voluptatum repellendus quidem labore maxime sapiente quis rerum deserunt nemo velit.</p>
      <p>Lorem ipsum dolor sit.</p>
      <p>Lorem ipsum, dolor sit amet consectetur adipisicing elit. Nihil, magnam aliquid. Deleniti cupiditate magni omnis maiores doloribus nihil, quis aspernatur accusamus molestiae quas maxime soluta quae, illo harum culpa. Sit.</p>
      <p>Lorem ipsum dolor sit, amet consectetur adipisicing elit. Aspernatur iure et, enim, nostrum blanditiis ipsa deleniti dignissimos esse iste voluptatem possimus ipsum officiis!</p>

      <div class="flex items-center space-x-4 py-4">
        <div class="h-24 w-24 overflow-hidden rounded-full">
          <img alt="" src="https://mattscholta.com/images/assets/matt-scaled.webp">
        </div>
        <div class="flex h-full flex-col space-y-1">
          <h4 class="heading inline-flex items-center text-2xl font-medium leading-tight">Matthew Scholta</h4>
          <p class="heading inline-flex items-center text-lg font-normal leading-tight text-current">Creator of RocketCMS</p>
        </div>
      </div>
    </div>
   * @description The HTML content to be displayed. Rendered as-is with no
   * client-side sanitization: it must be pre-sanitized by the server that
   * supplies it. Never pass user-typed input here directly.
   * @cmsWidget wysiwyg
   */
  readonly html: string;
}

/**
 * @public
 */
export const Wysiwyg = (props: WysiwygProps): React.ReactElement => {
  const { className, html } = props;

  // Hooks

  // Setup
  const markup = { __html: html };

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={cn('wysiwyg', WYSIWYG_CLASSES, className)}
      dangerouslySetInnerHTML={markup}
      data-testid="Wysiwyg"
    />
  );
};

Wysiwyg.debug = {
  className: undefined,
} satisfies CmsComponentDebug;

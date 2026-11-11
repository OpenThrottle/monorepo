import { cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import type { CmsComponentDebug } from '../types';

/**
 * @public
 * @description A responsive image block with a configurable aspect ratio.
 */
export interface ImageProps {
  /**
   * @default ""
   * @description Alt text should describe the imaage, or can be left
   * blank if the image is purely decorative.
   */
  readonly alt: HTMLImageElement['alt'];

  /**
   * @default "auto"
   * @description The aspect-ratio CSS property allows you to define
   * the desired width-to-height ratio of an element's box.
   * @link https://developer.mozilla.org/en-US/docs/Web/CSS/aspect-ratio
   */
  readonly aspectRatio: string;

  /**
   * @default "ui-border border indent-4"
   * @description Classes to be applied onto the wrapping div of the image
   * @cmsWidget className
   */
  readonly className?: string;

  /**
   * @default "https://picsum.photos/id/503/2500/800"
   * @description The image to be displayed
   */
  readonly src: HTMLImageElement['src'];
}

/**
 * @public
 */
export const Image = (props: ImageProps): React.ReactElement => {
  const { alt, aspectRatio, className, src } = props;

  // Hooks

  // Setup
  const style = { aspectRatio };

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={cn(className)}>
      <img
        alt={alt}
        className="bg-muted h-full w-full object-cover"
        src={src}
        style={style}
      />
    </div>
  );
};

Image.debug = {
  className: '!border-orange-500',
} satisfies CmsComponentDebug;

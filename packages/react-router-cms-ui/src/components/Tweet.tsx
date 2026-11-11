import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  cn,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { COPY } from '../data/data.copy';
import { X_PROFILE_BASE_URL } from '../data/data.links';
import type { CmsComponentDebug } from '../types';

/**
 * @public
 * @description A single post from X (formerly Twitter): avatar, author and
 * body.
 */
export interface TweetProps {
  /**
   * @default ""
   * @description Classes to be applied on the component.
   * @TJS-type className
   */
  readonly className?: string;

  /**
   * @default "visormatt"
   * @description The user who tweeted
   */
  readonly handle: string;

  /**
   * @default "https://picsum.photos/40/40"
   * @description The users profile photo on "X"
   */
  readonly image: string;

  /**
   * @default "The tweet goes <b>here</b>"
   * @description The tweet "content" to be displayed. Rendered as HTML with no
   * client-side sanitization: it must be pre-sanitized by the server that
   * supplies it. Never pass user-typed input here directly.
   */
  readonly tweet: string;

  /**
   * @default "Matthew Scholta"
   * @description The username to be displayed
   */
  readonly username: string;
}

/**
 * @public
 */
export const Tweet = (props: TweetProps): React.ReactElement => {
  const { className, handle, image, tweet, username } = props;

  // Hooks

  // Setup
  const { profileAltPrefix, profileAltSuffix } = COPY.tweet;
  const alt = `${profileAltPrefix} "${handle}" ${profileAltSuffix}`;
  const initial = username.charAt(0).toUpperCase();
  const markup = { __html: tweet };

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={cn('flex items-center gap-4 rounded-md p-4', className)}>
      <Avatar className="size-9">
        <AvatarImage alt={alt} src={image} />
        <AvatarFallback>{initial}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <h2>
          <span className="font-medium">{username}</span>{' '}
          <a
            className="text-primary truncate hover:underline"
            href={`${X_PROFILE_BASE_URL}${handle}`}
            rel="noopener noreferrer"
            target="_blank"
          >
            @{handle}
          </a>
        </h2>
        <div
          className="text-muted-foreground text-sm"
          dangerouslySetInnerHTML={markup}
          data-testid="TweetBody"
        />
      </div>
    </div>
  );
};

Tweet.debug = {
  className: undefined,
} satisfies CmsComponentDebug;

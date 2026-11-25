import type { SocialPost } from '../types/social-post.ts';

/** @description A poll attached to a tweet. */
export interface SequencedPoll {
  readonly durationMinutes: number;
  readonly options: readonly string[];
}

/** @description One tweet in posting order; each after the first replies to the one before. */
export interface SequencedTweet {
  readonly poll: SequencedPoll | undefined;
  readonly role: 'first-reply' | 'post' | 'thread';
  readonly text: string;
}

const getBody = (post: SocialPost): SequencedTweet[] => {
  if (post.kind === 'thread') {
    return post.tweets.map((text) => {
      return { poll: undefined, role: 'thread', text };
    });
  }

  if (post.kind === 'poll') {
    const poll = {
      durationMinutes: post.durationMinutes,
      options: post.options,
    };

    return [{ poll, role: 'post', text: post.text }];
  }

  return [{ poll: undefined, role: 'post', text: post.text }];
};

/**
 * @description The tweets a post sends, in order: the single or poll tweet, or each thread tweet,
 * then the first reply when there is one. `postedTweetIds[i]` is the id of the `i`th entry here,
 * which is what lets a re-run resume where it stopped.
 * @public
 */
export const buildTweetSequence = (
  post: SocialPost,
): readonly SequencedTweet[] => {
  const body = getBody(post);

  if (post.firstReply === undefined) {
    return body;
  }

  return [
    ...body,
    { poll: undefined, role: 'first-reply', text: post.firstReply },
  ];
};

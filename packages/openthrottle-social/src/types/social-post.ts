/**
 * @description The contract between a tweet task in the social plan and the
 * scripts that post it.
 *
 * A tweet is one OpenThrottle task. Its `requirementsJson` holds a one-element
 * array whose only item is a {@link SocialPost}. The server stores
 * `requirements` as a JSON array, so the payload is wrapped rather than
 * stored bare. The posting date lives in the payload (`postOn`), because tasks
 * have no date field, and `sortOrder` follows day order.
 *
 * The task's status is the approval gate:
 *
 * - `BACKLOG`: drafted, not yet approved. The weekly refill job only ever
 *   creates these.
 * - `PENDING`: approved by a human. Nothing else moves a task here.
 * - `IN_PROGRESS`: being posted. `postedTweetIds` records each tweet as it
 *   lands, so a re-run resumes instead of posting twice.
 * - `COMPLETED`: posted. The summary holds the tweet ids and URL.
 * - `SKIPPED`: killed by a human.
 * - `BLOCKED`: the post failed. The summary says why.
 *
 * The poster only sends a `PENDING` task whose `postOn` is today in
 * America/Los_Angeles.
 */

/** @description Engagement read back from X a day after posting. */
export interface SocialPostMetrics {
  readonly bookmarkCount: number;
  readonly impressionCount: number;
  readonly likeCount: number;
  readonly quoteCount: number;
  /** @description ISO timestamp of the read. */
  readonly recordedAt: string;
  readonly replyCount: number;
  readonly retweetCount: number;
}

/** @description The fields every kind of post carries. */
export interface SocialPostBase {
  /** @description Posted as a reply to the last tweet, usually to hold a link. */
  readonly firstReply: string | undefined;
  /**
   * @description A path or URL of an image or video. v1 does not upload media:
   * the poster leaves a task that has some for a human to post.
   */
  readonly media: string | undefined;
  /** @description Written by the metrics step; `undefined` until then. */
  readonly metrics: SocialPostMetrics | undefined;
  /** @description `YYYY-MM-DD`, read in America/Los_Angeles. */
  readonly postOn: string;
  /**
   * @description Ids of the tweets already posted, in posting order: the
   * thread's tweets, then the first reply. Empty until posting starts.
   */
  readonly postedTweetIds: ReadonlyArray<string>;
}

/** @description One tweet. */
export interface SingleSocialPost extends SocialPostBase {
  readonly kind: 'single';
  readonly text: string;
}

/** @description Two or more tweets, each a reply to the one before. */
export interface ThreadSocialPost extends SocialPostBase {
  readonly kind: 'thread';
  readonly tweets: ReadonlyArray<string>;
}

/** @description A tweet with a poll attached. */
export interface PollSocialPost extends SocialPostBase {
  readonly durationMinutes: number;
  readonly kind: 'poll';
  readonly options: ReadonlyArray<string>;
  readonly text: string;
}

/**
 * @description A tweet task's payload.
 * @public
 */
export type SocialPost = PollSocialPost | SingleSocialPost | ThreadSocialPost;

/**
 * @description Which kind of post a payload is.
 * @public
 */
export type SocialPostKind = SocialPost['kind'];

/** @description Where in a post a tweet that is too long sits. */
export type SocialPostTextField = 'firstReply' | 'text' | 'tweets';

/**
 * @description Why a payload failed to parse.
 * @public
 */
export type SocialPostParseError =
  | {
      readonly kind: 'invalid-json';
      readonly message: string;
    }
  | {
      readonly kind: 'invalid-shape';
      readonly message: string;
      readonly path: string;
    }
  | {
      readonly field: SocialPostTextField;
      /** @description Index within `tweets`; always 0 for `text` and `firstReply`. */
      readonly index: number;
      readonly kind: 'too-long';
      readonly length: number;
      readonly max: number;
    };

/**
 * @description Success or failure, without throwing.
 * @public
 */
export type Result<TValue, TError> =
  | { readonly error: TError; readonly ok: false }
  | { readonly ok: true; readonly value: TValue };

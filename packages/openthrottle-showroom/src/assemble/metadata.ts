/**
 * @description The upload payload.
 *
 * `publishing.md`'s rule is that metadata is never retyped — `metadata.json` is
 * produced from the episode so the title on YouTube cannot drift from the title
 * the video was built to demonstrate. The bar this file has to clear is therefore
 * concrete: **it could be pasted into an upload form with nothing left to fill in
 * by hand.** That is why the playlist, the chapter list and the thumbnail spec are
 * here rather than left as things someone remembers at upload time.
 *
 * Pulled out of `assemble.ts` so the shape can be tested without a capture on
 * disk. The assembler runs ffmpeg over hundreds of megabytes of frames; the
 * payload is a pure function of the episode plus a handful of render facts, and
 * it should be checkable on its own.
 */

import { composeDescription } from '../episodes/description';
import { spokenWords } from '../episodes/derived';
import type { Chapter, Variant, VideoEpisode } from '../episodes/types';

/** Facts only the render knows. */
export interface RenderFacts {
  readonly cues: number;
  readonly heldSeconds: number;
  readonly musicBed: string | null;
  readonly narrationBackend: string;
  readonly narrationVoice: string;
  readonly portraitSource: string;
}

export interface UploadMetadata {
  readonly captions: string;
  readonly chapters: readonly Chapter[];
  readonly cues: number;
  readonly description: string;
  readonly episode: string;
  readonly heldSeconds: number;
  readonly landscape: string;
  readonly musicBed: string | null;
  readonly narrationBackend: string;
  readonly narrationVoice: string;
  readonly playlist: string;
  readonly portrait: string;
  readonly portraitSource: string;
  /** What stands between this take and an upload. Empty means nothing does. */
  readonly publishBlockedBy: readonly string[];
  readonly publishable: boolean;
  readonly slug: string;
  readonly spokenWords: number;
  readonly status: string;
  readonly tags: readonly string[];
  readonly thumbnail: {
    readonly template: string;
    readonly words: readonly string[];
  } | null;
  readonly title: string;
  readonly variant: string;
}

/**
 * @public Everything an upload needs, from the episode and the render.
 *
 * Being blocked is a **field, not a hard failure** of the assemble step. Every
 * episode in Season 1 is a draft, and assembling a draft to watch it back is the
 * normal case — refusing would make the pipeline unusable for the thing it is
 * mostly used for. What must not happen is a draft being uploaded unnoticed, so
 * the payload says so out loud and the leak scan reads this file.
 */
export const buildMetadata = (
  episode: VideoEpisode,
  variant: Variant,
  facts: RenderFacts,
): UploadMetadata => {
  const shipping =
    episode.release.status === 'ready' ||
    episode.release.status === 'published';
  const publishBlockedBy = [
    ...episode.production.blockedOn,
    ...(shipping ? [] : [`status is '${episode.release.status}', not ready`]),
  ];

  return {
    captions: `${episode.id}.srt`,
    chapters: episode.youtube.chapters ?? [],
    cues: facts.cues,
    description: composeDescription(episode),
    episode: episode.id,
    heldSeconds: facts.heldSeconds,
    landscape: `${episode.id}-16x9.mp4`,
    musicBed: facts.musicBed,
    narrationBackend: facts.narrationBackend,
    narrationVoice: facts.narrationVoice,
    playlist: episode.release.playlist,
    portrait: `${episode.id}-9x16.mp4`,
    portraitSource: facts.portraitSource,
    publishBlockedBy,
    publishable: publishBlockedBy.length === 0,
    slug: episode.id,
    spokenWords: spokenWords(variant),
    status: episode.release.status,
    tags: episode.youtube.tags,
    thumbnail:
      episode.youtube.thumbnail === undefined
        ? null
        : {
            template: 'docs/marketing/assets/thumbnail-template.svg',
            words: episode.youtube.thumbnail.words,
          },
    title: episode.youtube.title,
    variant: variant.id,
  };
};

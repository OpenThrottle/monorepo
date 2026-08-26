/**
 * @description Compose the YouTube description from the episode.
 *
 * The rule in `docs/marketing/publishing.md` is that metadata is never retyped —
 * `metadata.json` is produced from the script's own fields so the title on
 * YouTube cannot drift from the title the video was built to demonstrate. The
 * standard block was inlined as a string literal in `assemble/assemble.ts`, which
 * honoured the letter of that rule and not its spirit: the block lived in the
 * assembler, so it could drift from `youtube-format.md` and nobody would know.
 *
 * It lives here now, once, and the assembler asks for it.
 */

import type { VideoEpisode } from './types';

/**
 * The standard block, verbatim from `docs/marketing/youtube-format.md`.
 *
 * Changing this changes the description of every future video. Change it there
 * and here together, or not at all.
 */
const STANDARD_BLOCK = [
  'OpenThrottle is an open-source planning and execution substrate for coding',
  'agents: plans and tasks as first-class data, agent runs you can watch, and every',
  'commit traced back to the task that caused it.',
  '',
  'Repo:    https://github.com/OpenThrottle/monorepo',
  'Docs:    https://github.com/OpenThrottle/monorepo/tree/main/docs',
  'License: Apache-2.0',
];

/**
 * @public The full description: the per-video paragraph, the standard block, and
 * the chapter list for long-form.
 *
 * URLs live here and on the outro card, never in narration — reading one aloud
 * wastes seconds of a 55-second budget and sounds like a robot.
 */
export const composeDescription = (episode: VideoEpisode): string => {
  const chapters = episode.youtube.chapters ?? [];
  // Falling back to the title reproduces what assemble.ts shipped before the
  // typed format existed: `${title}.` followed by the standard block.
  const opening = episode.youtube.summary ?? `${episode.youtube.title}.`;
  const lines = [opening, '', ...STANDARD_BLOCK];

  if (chapters.length > 0) {
    lines.push('', 'Chapters:');

    for (const chapter of chapters) {
      lines.push(`${chapter.t} ${chapter.label}`);
    }
  }

  return lines.join('\n');
};

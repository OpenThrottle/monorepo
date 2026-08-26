/**
 * @description Public entry point for the showroom package.
 *
 * The episode format and its derived values are the API; the pipeline stages are
 * CLIs invoked through their Nx targets, not imports. Consumers reach everything
 * through this file — no deep imports into `src/`.
 */

export { composeDescription } from './episodes/description';
export {
  budgetWords,
  estimatedSpokenSeconds,
  sentences,
  spokenWords,
  WORDS_PER_MINUTE,
} from './episodes/derived';
export {
  EPISODES,
  episodesInReleaseOrder,
  getEpisode,
  getVariant,
  resolveVariant,
} from './episodes/registry';
export {
  EPISODE_FORMATS,
  EPISODE_STATUSES,
  PLAYLISTS,
  RECORDING_MODES,
} from './episodes/types';
export type {
  Beat,
  Chapter,
  EpisodeFormat,
  EpisodeStatus,
  NarrationCue,
  Playlist,
  ProductionMetadata,
  RecordingMode,
  ReleaseMetadata,
  Variant,
  VideoEpisode,
  YouTubeMetadata,
} from './episodes/types';

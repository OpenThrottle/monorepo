/**
 * @description The typed episode format — one module per video, replacing the
 * YAML front matter plus markdown beats table under `docs/marketing/scripts/`.
 *
 * Three things this shape is trying to fix:
 *
 * 1. **Three parsers, three notions of a script.** The validator, the TTS stage
 *    and the assembler each read the same markdown with their own regexes, and
 *    one of them scraped tags with a pattern that matched any two-space bullet
 *    anywhere in the file. Now there is one type and one registry.
 *
 * 2. **A/B testing by copy-paste.** Episode 05 shipped as five near-identical
 *    files (`-v0` … `-v3` plus the canonical one) that shared a release number
 *    and drifted independently. Variants are an array here.
 *
 * 3. **Derived values stored as source.** The validator rewrote `spokenWords`
 *    back into the file it had just read. Nothing derived is a field on these
 *    types — word counts, spoken seconds and budget headroom are functions.
 *
 * The contract the markdown format got right is preserved exactly: the narration
 * text is the literal TTS input, and a beat's action is the literal flow step.
 */

/** Publishing status. `ready` and `published` require an empty `blockedOn`. */
export const EPISODE_STATUSES = {
  draft: 'draft',
  published: 'published',
  ready: 'ready',
  recorded: 'recorded',
} as const;

export type EpisodeStatus =
  (typeof EPISODE_STATUSES)[keyof typeof EPISODE_STATUSES];

export const EPISODE_FORMATS = {
  longform: 'longform',
  short: 'short',
} as const;

export type EpisodeFormat =
  (typeof EPISODE_FORMATS)[keyof typeof EPISODE_FORMATS];

/**
 * `replay` marks a video that depends on a live agent run — a real model call,
 * non-deterministic in content and duration. Those record against a pre-baked
 * run in the demo seed instead, so a take is reproducible.
 */
export const RECORDING_MODES = {
  live: 'live',
  replay: 'replay',
} as const;

export type RecordingMode =
  (typeof RECORDING_MODES)[keyof typeof RECORDING_MODES];

/**
 * The four playlists from `docs/marketing/publishing.md`. Long-form goes in the
 * playlist matching its subject rather than a separate "long videos" bin —
 * viewers sort by topic, not duration.
 */
export const PLAYLISTS = {
  execution: 'execution',
  gettingStarted: 'getting-started',
  interfacesAndDx: 'interfaces-and-dx',
  planningSubstrate: 'planning-substrate',
} as const;

export type Playlist = (typeof PLAYLISTS)[keyof typeof PLAYLISTS];

/**
 * One beat: a moment on screen.
 *
 * **A beat carries the picture, not the words.** That split is not a guess — all
 * five of episode 05's variant files have a byte-identical action column and
 * identical beat times, and differ only in narration. Modelling it this way makes
 * "same picture, different words" structural: one recording serves every variant,
 * which is the entire economic case for A/B testing a video at all.
 */
export interface Beat {
  /**
   * The literal flow step. "Click the New plan button" is a step; "show the
   * plans page" is not. If it cannot be written as a step, the beat is not yet
   * designed.
   */
  readonly action: string;
  /** Beat start as `mm:ss`, monotonic across the episode, first beat at `0:00`. */
  readonly t: string;
}

/**
 * One narration cue: when it starts, and the words.
 *
 * A tuple rather than a key into `beats`, because **a variant owns its own
 * timings**. Two takes on the same picture do not have to speak at the same
 * moments — a slower, payoff-first read may hold its opening line two seconds
 * longer than a problem-first one, and there is no reason the words must land
 * where the previous variant's words landed.
 *
 * The text is the literal TTS input.
 */
export type NarrationCue = readonly [t: string, text: string];

/**
 * One take on the words, over the shared picture.
 *
 * Ids are kebab slugs naming the *thesis* (`payoff-first`, `problem-first`), not
 * ordinals. `v0`/`v1` told a reader nothing about why four of them existed.
 */
export interface Variant {
  readonly id: string;
  /**
   * The narration track, in order. Monotonic `t`, and independent of `beats` —
   * a cue does not have to start with a beat, and a beat does not have to carry
   * a cue. Silence is normal: most shorts land 25–35 seconds of speech across 55
   * seconds of picture, and the gaps are where the viewer watches the action
   * instead of listening to someone describe it.
   */
  readonly narration: readonly NarrationCue[];
  /** How this take is meant to feel — pace, emphasis, where it breathes. */
  readonly pacingNotes?: string;
  /**
   * Why this variant exists and what it is testing. One paragraph.
   *
   * Optional because most episodes have exactly one take, and "why this one
   * rather than the others" is not a question a lone variant can answer. The
   * validator requires it once an episode has more than one — that is the point
   * at which an unexplained variant becomes a thing nobody can choose between.
   */
  readonly thesis?: string;
}

/** A long-form chapter marker. Shorts have none. */
export interface Chapter {
  readonly label: string;
  /** `mm:ss`; the first chapter is always `00:00`. */
  readonly t: string;
}

/** Upload metadata. Never retyped at upload time — this is the source. */
export interface YouTubeMetadata {
  /** Long-form only; the first entry must be at `00:00`. */
  readonly chapters?: readonly Chapter[];
  /**
   * The per-video paragraph that opens the description. The standard block
   * (repo, docs, licence) is appended by the composer, not stored per episode.
   *
   * Optional, and the composer falls back to the title. The markdown format had
   * nowhere to put this, and `assemble.ts` opened every description with
   * `${title}.` — so a migration that invented a paragraph per episode would be
   * writing new marketing copy under cover of a mechanical conversion. Absent
   * means "still just the title", which is exactly what shipped before.
   */
  readonly summary?: string;
  /** 6–10, including the five-tag baseline plus 1–5 specific to the video. */
  readonly tags: readonly string[];
  /**
   * Long-form only. Shorts use a frame from the video — a designed thumbnail on
   * a Short reads as an ad.
   */
  readonly thumbnail?: {
    /** At most four words, set large enough to survive the mobile sidebar. */
    readonly words: readonly string[];
  };
  /**
   * Plain, literal, and matching the demo exactly. The video must demonstrate
   * the claim in the title; that is a publish gate, not a preference.
   */
  readonly title: string;
}

/** How the episode gets made. */
export interface ProductionMetadata {
  /**
   * App features this episode needs that do not exist yet. Non-empty blocks
   * publishing: a video showing an aspirational feature is the one mistake the
   * publish checklist cannot catch after upload.
   */
  readonly blockedOn: readonly string[];
  readonly recording: RecordingMode;
  /** Two lines for the lower third. */
  readonly titleCard: readonly [string, string];
}

/** Where the episode sits in the season. */
export interface ReleaseMetadata {
  readonly order: number;
  readonly playlist: Playlist;
  readonly publishedAt?: string;
  readonly publishedUrl?: string;
  readonly status: EpisodeStatus;
}

/**
 * One video.
 *
 * The `id` is the slug and the single source of identity: it names the module
 * directory, the flow beside it, and the output directory the stages write to.
 */
/**
 * One thing an episode's flow needs to exist in the demo database before it can
 * be filmed honestly. A schema that loads is not the same as a workspace worth
 * recording: an episode that pans across the plans table needs plans in it, and
 * finding that out mid-take is the expensive way to learn it.
 *
 * `sql` must return exactly one row with one column named `value`; the
 * requirement passes when that value is at least `atLeast`. Keep the SQL
 * boring — this is a gate, not a query language.
 *
 * Prefer SHAPE assertions ("some plan with at least 3 tags and a completed
 * run") over pinning imported ids: an imported id couples the episode to one
 * snapshot refresh, and the next refresh silently breaks it. Pin ids for the
 * hand-authored hero rows, which are stable by construction, and for the rare
 * case where an episode genuinely depends on one specific row.
 */
export interface DataRequirement {
  /** Minimum acceptable value, inclusive. Booleans count as 0 or 1. */
  readonly atLeast: number;
  /** What must hold, in the words you would use to explain the failure. */
  readonly describe: string;
  /** Returns exactly one row with one column named `value`. */
  readonly sql: string;
}

export interface VideoEpisode {
  readonly beats: readonly Beat[];
  /**
   * What the demo database must contain for this episode's flow to render.
   * Asserted after seeding, so a missing row names the video it breaks.
   */
  readonly dataRequirements?: readonly DataRequirement[];
  readonly format: EpisodeFormat;
  readonly id: string;
  readonly production: ProductionMetadata;
  readonly release: ReleaseMetadata;
  /** Which variant ships. Must name one of `variants`. */
  readonly selectedVariant: string;
  readonly variants: readonly Variant[];
  readonly youtube: YouTubeMetadata;
}

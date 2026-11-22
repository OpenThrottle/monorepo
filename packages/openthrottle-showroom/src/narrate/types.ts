/**
 * @description Narration types and the TTS backend interface.
 *
 * The backend is an interface on purpose. The voice IS the channel's identity when
 * there is no presenter, and that decision had to be changeable without touching
 * parsing, segmentation, loudness or captions. It has since been made — hosted Fish
 * Audio ships, Piper renders on box, macOS `say` rehearses — and the interface is
 * what kept each switch to a couple of files. See ../NARRATION.md.
 */

export interface NarrationSentence {
  /** Beat label from the script's beats table, e.g. "0:07". */
  readonly beat: string;
  /** Index across the whole script, zero-padded in filenames. */
  readonly index: number;
  /** The literal text handed to the TTS backend, after lexicon substitution. */
  readonly spoken: string;
  /** The text as written in the script, for captions. */
  readonly written: string;
}

export interface ParsedScript {
  readonly format: 'longform' | 'short';
  readonly sentences: readonly NarrationSentence[];
  readonly slug: string;
  readonly title: string;
  /** Which take these words are. Recorded per render so a take traces to its script. */
  readonly variant: string;
}

export interface RenderRequest {
  /** Absolute path of the file to write. The backend chooses its own container. */
  readonly outputPath: string;
  readonly text: string;
  readonly voice: string;
}

/** @description One whole-take render: the full narration as a single request. */
export interface TakeRequest {
  /** Absolute path of the file to write. The backend chooses its own container. */
  readonly outputPath: string;
  readonly text: string;
  readonly voice: string;
}

/** @description One spoken word, timed absolute to the start of the take. */
export interface WordTiming {
  readonly endSeconds: number;
  readonly startSeconds: number;
  readonly text: string;
}

export interface RenderedTake {
  /** Path of the take audio actually written. */
  readonly audioPath: string;
  /** Spoken words in order, absolute to the take. */
  readonly words: readonly WordTiming[];
}

export const RENDER_MODE = {
  PER_SENTENCE: 'per-sentence',
  WHOLE_TAKE: 'whole-take',
} as const;

export type RenderMode = (typeof RENDER_MODE)[keyof typeof RENDER_MODE];

export interface TtsBackend {
  /** Identifier recorded in timings.json, so a take can be traced to its voice. */
  readonly id: string;
  /**
   * Hosted-provider model id (e.g. an ElevenLabs or OpenAudio model), recorded
   * per take because a voice id alone does not reproduce a hosted render.
   */
  readonly model?: string;
  /** Render one sentence. Returns the path actually written. */
  readonly render: (request: RenderRequest) => Promise<string>;
  /**
   * Render the whole take in one request, with word timings. Optional because only
   * some backends can; the rest keep the per-sentence `render` path.
   */
  readonly renderTake?: (request: TakeRequest) => Promise<RenderedTake>;
  /**
   * True when the backend sends text to a third party. Recorded per take, because
   * "nothing leaves your box" is a claim this project makes and narration is text
   * about unreleased work.
   */
  readonly sendsDataOffBox: boolean;
}

export interface SegmentTiming {
  readonly beat: string;
  readonly durationSeconds: number;
  readonly endSeconds: number;
  readonly file: string;
  readonly index: number;
  readonly startSeconds: number;
  readonly written: string;
}

export interface NarrationTimings {
  readonly backend: string;
  readonly integratedLufsTarget: number;
  /** Hosted-provider model id for the take, when the backend has one. */
  readonly model?: string;
  /**
   * Which render path produced this take. Optional only so timings written before
   * the field existed still type-check; narrate always writes it.
   */
  readonly renderMode?: RenderMode;
  readonly segments: readonly SegmentTiming[];
  readonly slug: string;
  readonly totalSeconds: number;
  /**
   * Which take's words these are.
   *
   * The backend, model and voice were already recorded per take so a rendered
   * take traces to what produced it. The words are as much a part of that as the
   * voice is — an unlabelled take of a four-variant episode is an unidentified
   * take.
   */
  readonly variant: string;
  readonly voice: string;
}

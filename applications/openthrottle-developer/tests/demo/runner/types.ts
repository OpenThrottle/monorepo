/**
 * @description The flow vocabulary. Every verb here exists because a script's
 * on-screen-action column already says it — `navigate`, `click`, `type`, `dwell`
 * and so on read the same in a flow as they do in
 * `docs/marketing/scripts/<slug>.md`, so porting a script is transcription rather
 * than interpretation.
 *
 * Deliberately absent: a generic `sleep`. Waits are on app state
 * (`waitFor`), so a slow machine stretches the recording instead of
 * desynchronising it. `dwell` is the one intentional pause — it is pacing for the
 * narration, not a wait for the app.
 */

export interface DemoStepBase {
  /** Beat label; matches the script's beat so the manifest lines up with narration. */
  readonly beat?: string;
}

export type DemoStep = DemoStepBase &
  (
    | { readonly kind: 'click'; readonly selector: string }
    | { readonly kind: 'dwell'; readonly ms: number }
    | {
        readonly kind: 'highlight';
        readonly ms?: number;
        readonly selector: string;
      }
    | { readonly kind: 'hover'; readonly selector: string }
    | { readonly kind: 'moveTo'; readonly selector: string }
    | { readonly kind: 'navigate'; readonly path: string }
    | { readonly key: string; readonly kind: 'press' }
    | { readonly kind: 'scrollTo'; readonly selector: string }
    | {
        readonly kind: 'select';
        readonly selector: string;
        readonly value: string;
      }
    | {
        readonly kind: 'type';
        readonly selector: string;
        readonly text: string;
      }
    | { readonly kind: 'waitFor'; readonly selector: string }
    | { readonly kind: 'waitForUrl'; readonly pattern: string }
    | {
        readonly kind: 'zoomTo';
        readonly scale?: number;
        readonly selector: string;
      }
  );

export interface DemoFlow {
  /** Matches the script id in docs/marketing/scripts, so one slug drives everything. */
  readonly id: string;
  /**
   * How the 9:16 export handles a 1920-wide capture.
   *
   * `crop` (default) follows the per-beat region of interest — right when the action
   * is a form field, a button or a single card, because the content is then legible
   * at full size.
   *
   * `fit` scales the whole frame to portrait width and letterboxes it. Right when
   * the content is WIDER than the crop window — a table, a full dashboard — because
   * cropping those clips text at both edges and no choice of centre saves it. The
   * cost is smaller text; the benefit is text that is whole.
   */
  readonly portraitStrategy?: 'crop' | 'fit';
  /**
   * Per-beat region of interest for the 9:16 crop. Keyed by beat label; the
   * assembly stage centres the portrait crop on this element while the beat runs.
   * A centre crop of a 1920-wide dashboard loses the sidebar and half the content.
   */
  readonly regionOfInterest?: Readonly<Record<string, string>>;
  readonly steps: readonly DemoStep[];
  readonly title: string;
}

export interface ManifestStep {
  readonly beat: string;
  readonly kind: string;
  readonly narrationCue: string;
  readonly tEnd: number;
  readonly tStart: number;
  readonly target?: string;
}

/**
 * Where the action actually was, in pixels, at a moment in the recording. The
 * assembly stage builds the 9:16 crop path from these — a selector alone is not
 * enough, because the crop needs coordinates, and a centre crop of a 1920-wide
 * dashboard loses the sidebar and half the content.
 */
export interface RegionSample {
  readonly atSeconds: number;
  readonly beat: string;
  readonly height: number;
  readonly width: number;
  readonly x: number;
  readonly y: number;
}

export interface RecordingManifest {
  readonly flowId: string;
  readonly fps: number;
  readonly frames: number;
  readonly height: number;
  readonly portraitStrategy: 'crop' | 'fit';
  readonly regionOfInterest: Readonly<Record<string, string>>;
  readonly regions: readonly RegionSample[];
  readonly steps: readonly ManifestStep[];
  readonly wallSeconds: number;
  readonly width: number;
}

export const navigate = (path: string, beat?: string): DemoStep => ({
  beat,
  kind: 'navigate',
  path,
});
export const click = (selector: string, beat?: string): DemoStep => ({
  beat,
  kind: 'click',
  selector,
});
export const type_ = (
  selector: string,
  text: string,
  beat?: string,
): DemoStep => ({ beat, kind: 'type', selector, text });
export const dwell = (ms: number, beat?: string): DemoStep => ({
  beat,
  kind: 'dwell',
  ms,
});
export const waitFor = (selector: string, beat?: string): DemoStep => ({
  beat,
  kind: 'waitFor',
  selector,
});
/**
 * @public Flow-vocabulary constructors below this line.
 *
 * Every verb here is implemented in `actions.ts` and documented in the demo README, so
 * they are the API a flow author writes against — including the ones no current flow
 * happens to use yet. Tagged `@public` so knip keeps them rather than reporting a
 * vocabulary as dead code.
 */
export const waitForUrl = (pattern: string, beat?: string): DemoStep => ({
  beat,
  kind: 'waitForUrl',
  pattern,
});
/** @public */
export const hover = (selector: string, beat?: string): DemoStep => ({
  beat,
  kind: 'hover',
  selector,
});
/** @public */
export const moveTo = (selector: string, beat?: string): DemoStep => ({
  beat,
  kind: 'moveTo',
  selector,
});
/** @public */
export const highlight = (
  selector: string,
  ms?: number,
  beat?: string,
): DemoStep => ({ beat, kind: 'highlight', ms, selector });
/** @public */
export const scrollTo = (selector: string, beat?: string): DemoStep => ({
  beat,
  kind: 'scrollTo',
  selector,
});
/** @public */
export const zoomTo = (
  selector: string,
  scale?: number,
  beat?: string,
): DemoStep => ({ beat, kind: 'zoomTo', scale, selector });
/** @public */
export const press = (key: string, beat?: string): DemoStep => ({
  beat,
  key,
  kind: 'press',
});
/** @public */
export const select = (
  selector: string,
  value: string,
  beat?: string,
): DemoStep => ({ beat, kind: 'select', selector, value });

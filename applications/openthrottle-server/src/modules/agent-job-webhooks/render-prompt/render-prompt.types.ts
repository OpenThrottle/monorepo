/** @description Inputs of the prompt renderer. */
export interface RenderWebhookPromptInput {
  readonly headers: Readonly<Record<string, string>>;
  readonly payload: unknown;
  readonly template: string;
}

/**
 * @description The prompt the run starts with, plus the (already redacted) rendering stored on the
 * delivery row. `renderedPrompt` is null while nothing was rendered.
 */
export interface RenderedWebhookPrompt {
  readonly prompt: string;
  readonly renderedPrompt: string | null;
}

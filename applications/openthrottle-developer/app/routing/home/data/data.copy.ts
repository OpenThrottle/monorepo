/**
 * @description Single-sourced user-facing copy for the home routing area. The
 * components render these and specs import the same constants, so a wording change
 * updates one place and no spec breaks on copy drift.
 */

/**
 * Empty state shown above the disabled composer when model discovery returns
 * nothing. The model list is local OpenAI-compatible endpoints ∪ available agent
 * CLIs, so the message names both sources. It renders as
 * `{lead}<link>{agentsLinkLabel}</link>{middle}{localServerHint}{trail}`; the link
 * targets {@link NO_MODELS_COPY.agentsHref}. The composer only receives the merged
 * model list (not the unavailable-but-known agents), so this stays copy-only.
 */
export const NO_MODELS_COPY = {
  agentsHref: `/settings/agents`,
  agentsLinkLabel: `Settings › Agents`,
  lead: `No models available. Install and authenticate an agent CLI (see `,
  localServerHint: `an OpenAI-compatible server such as Ollama`,
  middle: `), or start `,
  trail: ` locally, then reload.`,
} as const;

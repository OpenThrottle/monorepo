/**
 * The composed invocation the parent submits through the streamed-conversation
 * path. `message` is the `/<slug> <args>` command; `fields` are the
 * `StartConversationStreamInput`-shaped values derived from the picked option.
 */
export interface RunSkillPayload {
  readonly fields: Record<string, string>;
  readonly message: string;
}

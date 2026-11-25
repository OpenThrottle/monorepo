# @openthrottle/agentic-conversation-backend

A uniform async-iterable streaming seam over an OpenAI-compatible endpoint and spawned agentic CLIs
(claude, cursor-agent, codex, grok, opencode, antigravity, and an ACP path). Each backend maps its native output onto
one `ConversationStreamChunk` stream; `CONVERSATION_CLI_BACKENDS` is the routing registry. Also hosts agent CLI discovery,
agent setup, handoff and the HTTP `streamChatCompletion`.

Split out of `@openthrottle/openthrottle-agentic-utils`. Private workspace package, consumed source-first.

## Installation

This package is private to the monorepo; depend on it with `"@openthrottle/agentic-conversation-backend": "workspace:^"`.

## Usage

```ts
import { CONVERSATION_CLI_BACKENDS } from '@openthrottle/agentic-conversation-backend';

for await (const chunk of CONVERSATION_CLI_BACKENDS.claude.stream(run)) {
  // chunk.kind: text | thinking | tool_call | tool_result | usage | session
}
```

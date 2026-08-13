/**
 * The conversations-list hook is single-sourced in
 * `@openthrottle/react-router-chat`; re-exported here so existing importers
 * (`useHeaderChatController`, `_index`, `HomeComposer`, `useHomeComposer`) and
 * their mocks keep this import path.
 */
export {
  useConversationList,
  type UseConversationListResult,
} from '@openthrottle/react-router-chat';

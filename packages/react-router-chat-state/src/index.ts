// 🧩 React Components
export * from './components/ClaudeIcon';
export * from './components/CursorIcon';
export * from './components/GeminiIcon';
export * from './components/GrokIcon';
export * from './components/OpenAiIcon';
export * from './components/OpenCodeIcon';
export * from './components/ProviderLetterIcon';
export * from './components/svg-base';

// ⚙️ Configuration
export * from './config/chat-capabilities';
export * from './config/chat-session-permission-decay';

// 📦 Data / Atoms
export * from './data/atom.chat-toolbar';
export * from './data/chat-toolbar-seeds';

// 🪝 React Hooks
export * from './hooks/useHeaderChatController';
/**
 * Pre-split public names for the header chat controller's input and result.
 * @public
 */
export type {
  UseHeaderChatControllerResult as HeaderChatSurface,
  UseHeaderChatControllerOptions as UseHeaderChatControllerConfig,
} from './hooks/useHeaderChatController';
export * from './hooks/useSessionPermissionDecay';

// 🧾 Types
export * from './types';

// 🛠️ Utilities
export * from './utils/chat-discovery-options';
export * from './utils/chat-model-option';
export * from './utils/chat-toolbar-decay';
export * from './utils/chat-toolbar-reconcile';
export * from './utils/chat-turn-fields';
export * from './utils/resolve-provider-icon';

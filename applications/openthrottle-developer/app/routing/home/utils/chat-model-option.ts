import type { ChatModelOption } from '@openthrottle/react-router-chat';
import {
  cliGroupId,
  encodeCliOptionId,
  encodeModelOptionId,
  openaiGroupId,
} from '@openthrottle/react-router-chat-state';
import type {
  DiscoverAgentClisQuery,
  DiscoverLocalModelsQuery,
} from '~/__generated__/graphql';

/**
 * @description GraphQL discovery → composer toolbar options. The pure
 * encode/decode/group helpers (and the persisted-state atom, reconcile, and
 * capabilities) live in `@openthrottle/react-router-chat-state`; these two
 * mappers stay app-side because they consume the app's generated discovery
 * query types.
 */

/**
 * Flatten discovered endpoints × models into composer toolbar options, grouped
 * (for the model picker) by provider/endpoint.
 */
export function toChatModelOptions(
  discovery: DiscoverLocalModelsQuery['discoverLocalModels'],
): ChatModelOption[] {
  return discovery.endpoints.flatMap((endpoint) => {
    const providerOrHost = endpoint.provider ?? endpoint.host;
    return endpoint.models.map((model) => ({
      description: providerOrHost,
      groupId: openaiGroupId(providerOrHost),
      id: encodeModelOptionId(endpoint.baseUrl, model),
      label: model,
    }));
  });
}

/**
 * Map discovered agent CLIs into composer toolbar options. Only chat-capable
 * drivers are offered (plan-run-only drivers like codex/grok are discoverable
 * but have no streaming chat adapter). Each of a driver's models becomes its own
 * option (id `backend|model`, e.g. `cursor|gpt-5.2`); a driver with no listable
 * models falls back to a single bare-backend option at its default model. Each
 * driver gets its own picker rail group keyed on its backend ({@link cliGroupId}),
 * with the driver label as each row's sub-label to disambiguate same-named models.
 */
export function toAgentChatOptions(
  discovery: DiscoverAgentClisQuery['discoverAgentClis'],
): ChatModelOption[] {
  return discovery.agents
    .filter((agent) => agent.chatCapable)
    .flatMap((agent) => {
      if (agent.models.length === 0) {
        return [
          {
            description: agent.label,
            groupId: cliGroupId(agent.backend),
            id: agent.backend,
            label: agent.label,
            subLabel: agent.label,
          },
        ];
      }

      return agent.models.map((model) => ({
        description: agent.label,
        groupId: cliGroupId(agent.backend),
        id: encodeCliOptionId(agent.backend, model),
        label: model,
        subLabel: agent.label,
      }));
    });
}

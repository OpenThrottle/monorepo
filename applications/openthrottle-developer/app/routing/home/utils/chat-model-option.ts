import type { ChatModelOption } from '@openthrottle/react-router-chat';
import {
  CLI_MODEL_GROUP_ID,
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
 * Map discovered agent CLIs into composer toolbar options. The option id is the
 * bare backend discriminator (e.g. `cursor`) — no `::`, so it is distinguishable
 * from an openai endpoint::model id at submit time. All CLIs share one picker
 * group ({@link CLI_MODEL_GROUP_ID}).
 */
export function toAgentChatOptions(
  discovery: DiscoverAgentClisQuery['discoverAgentClis'],
): ChatModelOption[] {
  return discovery.agents.map((agent) => {
    const hasVersion = agent.version !== null;
    const description = !hasVersion
      ? 'Agent CLI'
      : `Agent CLI · ${agent.version}`;

    return {
      description,
      groupId: CLI_MODEL_GROUP_ID,
      id: agent.backend,
      label: agent.label,
      subLabel: description,
    };
  });
}

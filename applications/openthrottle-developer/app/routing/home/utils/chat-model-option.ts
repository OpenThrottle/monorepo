import type { ChatModelOption } from '@openthrottle/react-router-chat';
import {
  cliGroupId,
  encodeCliEndpointOptionId,
  encodeCliOptionId,
  encodeModelOptionId,
  openaiGroupId,
} from '@openthrottle/react-router-chat-state';
import type {
  DiscoverAgentClisQuery,
  DiscoverLocalModelsQuery,
} from '~/__generated__/graphql';

/** Docker-only host: reachable from a containerized server, not always from the driver process. */
const DOCKER_INTERNAL_HOST = 'host.docker.internal';

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

/**
 * Join discovered agent CLIs with discovered local endpoints into "driver ×
 * local endpoint/model" composer options. Only base-URL-capable, chat-capable
 * drivers are offered (claude/cursor can't consume a raw OpenAI-compatible
 * endpoint); each option pairs such a driver with every discovered endpoint ×
 * model. Grouped under the driver's own rail ({@link cliGroupId}); the endpoint's
 * provider/host is surfaced in the description so the network vantage is visible
 * (a `host.docker.internal` endpoint is flagged, since it may be unreachable from
 * a driver process running outside that Docker network).
 */
export function toDriverEndpointChatOptions(
  agents: DiscoverAgentClisQuery['discoverAgentClis'],
  localModels: DiscoverLocalModelsQuery['discoverLocalModels'],
): ChatModelOption[] {
  const capableDrivers = agents.agents.filter(
    (agent) => agent.chatCapable && agent.supportsCustomBaseUrl,
  );

  return capableDrivers.flatMap((agent) =>
    localModels.endpoints.flatMap((endpoint) => {
      const vantage = endpoint.provider ?? endpoint.host;
      const description =
        endpoint.host === DOCKER_INTERNAL_HOST
          ? `${agent.label} · ${vantage} (may be unreachable outside Docker)`
          : `${agent.label} · ${vantage} (local)`;

      return endpoint.models.map((model) => ({
        description,
        groupId: cliGroupId(agent.backend),
        id: encodeCliEndpointOptionId(agent.backend, endpoint.baseUrl, model),
        label: model,
        subLabel: agent.label,
      }));
    }),
  );
}

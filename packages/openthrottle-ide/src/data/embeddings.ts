/**
 * The embeddings seam for the semantic layer. The engine never embeds by itself: the caller
 * injects an {@link EmbeddingsProvider}. In OpenThrottle that is the server's single embedder
 * (`@openthrottle/node-client`, adapted by `@openthrottle/nestjs-vector-search`); tests pass a
 * mock so no live model is ever called.
 */

/**
 * Turns text into embedding vectors, one per input in the same order. An empty input yields an
 * empty array. A provider that cannot embed throws: the engine has no partial-result path.
 *
 * @public
 */
export interface EmbeddingsProvider {
  embed: (texts: string[]) => Promise<number[][]>;
}

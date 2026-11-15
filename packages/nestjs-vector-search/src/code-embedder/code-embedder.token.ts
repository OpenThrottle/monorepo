/**
 * @description DI token for the host-provided {@link CodeEmbedder}. Bound by
 * `NestjsVectorSearchModule.register({ embedder, imports })`.
 *
 * @public
 */
export const CODE_EMBEDDER: unique symbol = Symbol('CODE_EMBEDDER');

/**
 * Public surface of the cursor-agent backend: the backend itself and the
 * session minter. Parsing internals (argv, ndjson, events) stay module-private.
 */
export * from './cursor-agent.ts';
export * from './teardown.ts';

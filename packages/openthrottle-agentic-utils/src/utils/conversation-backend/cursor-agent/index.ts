/**
 * Public surface of the cursor-agent backend: the backend itself, the session
 * minter, and the failure classification the server needs to decide whether to
 * retry and what to tell the user. Parsing internals (argv, ndjson, events,
 * session-id) stay module-private.
 */
export * from './cursor-agent.ts';
export * from './errors.ts';
export * from './teardown.ts';

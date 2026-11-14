import { createStubOtServer } from './createStubOtServer.ts';

describe('createStubOtServer', () => {
  it('answers the serverHealth probe and counts it', async () => {
    const stub = await createStubOtServer();

    try {
      const response = await fetch(`${stub.origin}/graphql`, {
        body: '{"query":"{ serverHealth { api } }"}',
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        data: { serverHealth: { api: 'ok' } },
      });
      expect(stub.graphqlRequests()).toBe(1);
    } finally {
      await stub.close();
    }
  });

  it('404s anything else and does not count it', async () => {
    const stub = await createStubOtServer();

    try {
      const response = await fetch(`${stub.origin}/graphql`);

      expect(response.status).toBe(404);
      expect(stub.graphqlRequests()).toBe(0);
    } finally {
      await stub.close();
    }
  });

  it('binds a loopback origin', async () => {
    const stub = await createStubOtServer();

    await stub.close();

    expect(stub.origin).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/u);
  });
});

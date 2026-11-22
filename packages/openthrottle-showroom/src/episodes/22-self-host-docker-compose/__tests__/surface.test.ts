import { readFileSync } from 'node:fs';

import { describe, expect, test } from 'vitest';

import { scanText } from '../../../scan/scanText.ts';
import {
  COMPOSE_FILE_TEXT,
  COMPOSE_PROFILE,
  containerState,
  DEVELOPER_PORT,
  PROFILE_SERVICES,
  SELF_HOST_COMMANDS,
  SELF_HOST_SURFACES,
  serviceExcerpt,
  startOrder,
} from '../surface.ts';

const repositoryFile = (name: string): string => {
  return readFileSync(
    new URL(`../../../../../../${name}`, import.meta.url),
    'utf8',
  );
};

const names = PROFILE_SERVICES.map((service) => service.name);
const terminal = SELF_HOST_SURFACES.terminal ?? '';

/**
 * The compose text on camera is the repo's real file, not a retyped copy. The
 * surface reads `docker-compose.yml` at build time, so these tests pin that the
 * read found what the episode talks about and that nothing on screen is invented.
 */
describe('22-self-host-docker-compose compose excerpt', () => {
  test('the source is the repo-root compose file, byte for byte', () => {
    expect(COMPOSE_FILE_TEXT).toBe(repositoryFile('docker-compose.yml'));
  });

  test('the prod profile starts exactly the services the narration names', () => {
    // database, Redis, the API, the dashboard and the MCP server — plus the
    // one-shot migrations the 0:27 narration mentions.
    expect([...names].sort()).toStrictEqual([
      'developer',
      'mcp',
      'migrations',
      'postgres',
      'redis',
      'server',
    ]);
  });

  test('dev-only and opt-in services are not on camera', () => {
    for (const name of [
      'developer-dev',
      'server-dev',
      'mcp-dev',
      'whisper',
      'bootstrap',
    ]) {
      expect(terminal).not.toContain(`${name}:`);
    }
  });

  test('every excerpted line is a real line of the file, in order', () => {
    const fileLines = COMPOSE_FILE_TEXT.split('\n');

    for (const service of PROFILE_SERVICES) {
      let cursor = fileLines.indexOf(service.lines[0] ?? '');

      expect(cursor, service.name).toBeGreaterThan(-1);

      for (const line of serviceExcerpt(service).split('\n').slice(1)) {
        if (line.trim() === '…') {
          continue;
        }

        const found = fileLines.indexOf(line, cursor + 1);

        expect(found, `${service.name}: ${line}`).toBeGreaterThan(cursor);
        cursor = found;
      }
    }
  });

  test('the excerpt shows the published ports and the prod profile as written', () => {
    expect(terminal).toContain(
      "'${OPENTHROTTLE_DEVELOPER_PORT}:${OPENTHROTTLE_DEVELOPER_PORT}'",
    );
    expect(terminal).toContain(`profiles: [${COMPOSE_PROFILE}]`);
    expect(terminal).toContain('condition: service_completed_successfully');
  });
});

describe('22-self-host-docker-compose derived compose-up output', () => {
  test('only postgres and redis declare a compose healthcheck', () => {
    const checked = PROFILE_SERVICES.filter(
      (service) => service.hasHealthcheck,
    ).map((service) => service.name);

    expect(checked.sort()).toStrictEqual(['postgres', 'redis']);
  });

  test('server and mcp are Healthy because their image ships a HEALTHCHECK', () => {
    expect(repositoryFile('Dockerfile.NestJS')).toMatch(/^HEALTHCHECK /m);
    expect(repositoryFile('Dockerfile.ReactRouter')).not.toMatch(
      /^HEALTHCHECK /m,
    );

    const states = Object.fromEntries(
      PROFILE_SERVICES.map((service) => [
        service.name,
        containerState(service),
      ]),
    );

    expect(states).toStrictEqual({
      developer: 'Started',
      mcp: 'Healthy',
      migrations: 'Exited',
      postgres: 'Healthy',
      redis: 'Healthy',
      server: 'Healthy',
    });
  });

  test('the start order honours depends_on', () => {
    const order = startOrder(PROFILE_SERVICES).map((service) => service.name);

    expect(order.indexOf('postgres')).toBeLessThan(order.indexOf('migrations'));
    expect(order.indexOf('migrations')).toBeLessThan(order.indexOf('server'));
    expect(order.indexOf('server')).toBeLessThan(order.indexOf('developer'));
    expect(order.indexOf('server')).toBeLessThan(order.indexOf('mcp'));
  });

  test('every printed container is a service of the prod profile', () => {
    const printed = [
      ...terminal.matchAll(/Container openthrottle-([a-z-]+)-1/g),
    ].map((match) => match[1]);

    expect([...printed].sort()).toStrictEqual([...names].sort());
  });

  test('the port command asks for the port the developer service publishes', () => {
    expect(repositoryFile('.env.default')).toContain(
      `OPENTHROTTLE_DEVELOPER_PORT="${DEVELOPER_PORT}"`,
    );
    expect(SELF_HOST_COMMANDS.portCommand).toBe(
      `docker compose port developer ${DEVELOPER_PORT}`,
    );
    expect(terminal).toContain(`0.0.0.0:${DEVELOPER_PORT}`);
  });

  test('the up command names the production profile', () => {
    expect(SELF_HOST_COMMANDS.upCommand).toBe(
      'docker compose --profile prod up -d',
    );
  });
});

describe('22-self-host-docker-compose surface hygiene', () => {
  test('carries no leak-scan error', () => {
    const errors = scanText('terminal', terminal, 'frame').filter(
      (finding) => finding.severity === 'error',
    );

    expect(errors).toStrictEqual([]);
  });

  test('shows no home directory', () => {
    expect(terminal).not.toMatch(/\/(?:Users|home)\//i);
  });
});

/**
 * @description The typeset terminal video 22 puts on camera: the repo's real
 * `docker-compose.yml`, `docker compose --profile prod up`, and the containers
 * going healthy.
 *
 * ## What is captured and what is derived
 *
 * The recorder cannot run the stack (it would bind real ports and start real
 * containers), so nothing here is a recording of a run. Each piece of text is
 * either read from the committed files at build time or derived from them by a
 * rule stated below. Nothing is typed in by hand except the commands themselves.
 *
 * - **Captured, verbatim: the compose file.** `docker-compose.yml` at the repo root
 *   is read with `readFileSync`. The excerpt on camera is a SELECTION of its real
 *   lines (never rewritten): every service the `prod` profile starts, reduced to
 *   its name, `image`, `depends_on`, `healthcheck`, `ports` and `profiles` lines,
 *   with `…` marking where lines were skipped. The file is 600+ lines of build
 *   args and environment; the beat is about which services there are.
 * - **Derived: the `docker compose up` lines.** Compose v2 prints
 *   `✔ Container <project>-<service>-1  <state>` once per container. The service
 *   set is the services with no profile plus those in `prod` (the same set
 *   `docker compose --profile prod config --services` prints). The order is the
 *   `depends_on` order: a service is printed after everything it waits for. The
 *   project name is the file's own `name:` lowercased, which is how compose forms
 *   the network and container names. The state is `Healthy` for a service with a
 *   compose `healthcheck:` (postgres, redis) or whose image ships one (server and
 *   mcp: `HEALTHCHECK` in `Dockerfile.NestJS`, and the file's own comment on
 *   `server` says so), `Exited` for the one-shot `migrations` (it is depended on
 *   with `service_completed_successfully`), and `Started` for the rest
 *   (developer, which has no healthcheck anywhere). No timings, no image pulls.
 * - **Derived: the served port.** `docker compose port developer 6020` prints the
 *   published address. The port is `OPENTHROTTLE_DEVELOPER_PORT` from
 *   `.env.default`, the value the file's `ports:` line interpolates, and it is the
 *   one the recording base URL (`localhost:6020`) stands in for.
 *
 * The migration count is deliberately NOT shown: no committed file says how many
 * migrations a fresh volume applies, and `compose up` does not print it.
 *
 * Nothing here names a real machine: the cwd is `DEMO_MACHINE.shellPrompt`.
 */

import { readFileSync } from 'node:fs';

import { DEMO_MACHINE } from '../../fixtures/demo-content.ts';
import { shellSurface } from '../../surfaces/shell.ts';

const repositoryFile = (name: string): string => {
  return readFileSync(
    new URL(`../../../../../${name}`, import.meta.url),
    'utf8',
  );
};

/** The real production compose file, byte for byte. */
export const COMPOSE_FILE_TEXT = repositoryFile('docker-compose.yml');

const ENV_DEFAULT_TEXT = repositoryFile('.env.default');

/** The compose profile the episode brings up. */
export const COMPOSE_PROFILE = 'prod';

/**
 * Services whose image ships a `HEALTHCHECK` instead of the compose file
 * declaring one. The test pins both facts (`Dockerfile.NestJS` and the
 * `service_healthy` conditions) so this cannot drift quietly.
 */
const IMAGE_HEALTHCHECK_SERVICES: readonly string[] = ['mcp', 'server'];

export interface ComposeDependency {
  /** `service_healthy`, `service_completed_successfully`, ... */
  readonly condition: string;
  readonly name: string;
}

export interface ComposeService {
  readonly dependsOn: readonly ComposeDependency[];
  readonly hasHealthcheck: boolean;
  /** The service's lines in the file, from its `  name:` line to the last line before the next one. */
  readonly lines: readonly string[];
  readonly name: string;
  readonly profiles: readonly string[];
}

const describeService = (
  name: string,
  lines: readonly string[],
): ComposeService => {
  const dependsOn: ComposeDependency[] = [];
  const profiles: string[] = [];
  let inDependsOn = false;
  let pending: string | undefined;

  for (const line of lines) {
    if (/^ {4}depends_on:/.test(line)) {
      inDependsOn = true;
    } else if (/^ {4}\S/.test(line)) {
      inDependsOn = false;
    }

    const dependency = /^ {6}([a-z][a-z0-9-]*):\s*$/.exec(line);
    const condition = /^ {8}condition:\s*(\S+)/.exec(line);

    if (inDependsOn && dependency?.[1] !== undefined) {
      pending = dependency[1];
    } else if (inDependsOn && condition?.[1] !== undefined && pending) {
      dependsOn.push({ condition: condition[1], name: pending });
    }

    const profile = /^ {4}profiles:\s*\[(.*)\]/.exec(line);

    if (profile?.[1] !== undefined) {
      profiles.push(...profile[1].split(',').map((entry) => entry.trim()));
    }
  }

  return {
    dependsOn,
    hasHealthcheck: lines.some((line) => /^ {4}healthcheck:/.test(line)),
    lines,
    name,
    profiles,
  };
};

/**
 * Parse the compose file's `services:` block just far enough to answer the
 * questions the surface asks. A line parser, not a YAML parser: this package has
 * no YAML dependency, and the file's layout (two-space services, four-space keys)
 * is stable and checked by the test.
 */
export const parseComposeServices = (text: string): ComposeService[] => {
  const all = text.split('\n');
  const start = all.findIndex((line) => line === 'services:');
  const end = all.findIndex(
    (line, index) => index > start && line === 'volumes:',
  );
  const body = all.slice(start + 1, end === -1 ? all.length : end);
  const services: ComposeService[] = [];
  let name: string | undefined;
  let lines: string[] = [];

  const flush = (): void => {
    if (name !== undefined) {
      services.push(describeService(name, lines));
    }
  };

  for (const line of body) {
    const header = /^ {2}([a-z][a-z0-9-]*):\s*$/.exec(line);

    if (header?.[1] === undefined) {
      lines.push(line);
    } else {
      flush();
      name = header[1];
      lines = [line];
    }
  }

  flush();

  return services;
};

const allServices = parseComposeServices(COMPOSE_FILE_TEXT);

/** `docker compose --profile prod config --services`, in file order. */
export const PROFILE_SERVICES: readonly ComposeService[] = allServices.filter(
  (service) => {
    return (
      service.profiles.length === 0 ||
      service.profiles.includes(COMPOSE_PROFILE)
    );
  },
);

const PROJECT_DISPLAY_NAME =
  /^name:\s*'([^']+)'/m.exec(COMPOSE_FILE_TEXT)?.[1] ?? '';

/** Compose lowercases the project name to form network and container names. */
const projectName = PROJECT_DISPLAY_NAME.toLowerCase();

/**
 * Services in start order: a service comes after everything it depends on, waves in file
 * order. This is the order compose reports them in.
 */
export const startOrder = (
  services: readonly ComposeService[],
): ComposeService[] => {
  const ordered: ComposeService[] = [];
  const remaining = [...services];

  // Wave by wave: everything whose dependencies are already started, in file order.
  while (remaining.length > 0) {
    const wave = remaining.filter((service) => {
      return service.dependsOn.every((dependency) => {
        return ordered.some((done) => done.name === dependency.name);
      });
    });

    if (wave.length === 0) {
      throw new Error(
        `self-host-docker-compose: dependency cycle among ${remaining.map((service) => service.name).join(', ')}`,
      );
    }

    ordered.push(...wave);

    for (const service of wave) {
      remaining.splice(remaining.indexOf(service), 1);
    }
  }

  return ordered;
};

/**
 * The state `docker compose up -d` ends on for one container. See the file doc
 * for the rule; `Exited` is any service something waits on with
 * `service_completed_successfully`.
 */
export const containerState = (service: ComposeService): string => {
  const isOneShot = PROFILE_SERVICES.some((other) => {
    return other.dependsOn.some((dependency) => {
      return (
        dependency.name === service.name &&
        dependency.condition === 'service_completed_successfully'
      );
    });
  });

  if (isOneShot) {
    return 'Exited';
  }

  const hasCheck =
    service.hasHealthcheck || IMAGE_HEALTHCHECK_SERVICES.includes(service.name);

  return hasCheck ? 'Healthy' : 'Started';
};

const containerName = (service: ComposeService): string => {
  return `Container ${projectName}-${service.name}-1`;
};

const ordered = startOrder(PROFILE_SERVICES);
const nameWidth = Math.max(
  `Network ${projectName}_default`.length,
  ...ordered.map((service) => containerName(service).length),
);

const containerLine = (service: ComposeService): string => {
  return ` ✔ ${containerName(service).padEnd(nameWidth)}  ${containerState(service)}`;
};

/**
 * The two stretches of `up` output. The data stores and the one-shot migration go
 * first (nothing waits on anything but them), then the apps that wait on those.
 */
const upHeader = `[+] Running ${String(ordered.length + 1)}/${String(ordered.length + 1)}`;
const upNetwork = ` ✔ ${`Network ${projectName}_default`.padEnd(nameWidth)}  Created`;
const dataServices = ordered.filter((service) => {
  return (
    service.dependsOn.length === 0 ||
    service.dependsOn.every((dependency) => {
      return (
        PROFILE_SERVICES.find((other) => other.name === dependency.name)
          ?.dependsOn.length === 0
      );
    })
  );
});
const appServices = ordered.filter(
  (service) => !dataServices.includes(service),
);

const upData = [upHeader, upNetwork, ...dataServices.map(containerLine)].join(
  '\n',
);
const upApps = appServices.map(containerLine).join('\n');

const envValue = (key: string): string => {
  const match = new RegExp(`^${key}="([^"]*)"`, 'm').exec(ENV_DEFAULT_TEXT);

  return match?.[1] ?? '';
};

/** The port the `developer` service publishes (`.env.default`, interpolated by its `ports:` line). */
export const DEVELOPER_PORT = envValue('OPENTHROTTLE_DEVELOPER_PORT');

const EXCERPT_KEYS = /^ {4}(depends_on|healthcheck|image|ports|profiles):/;
const NESTED_KEYS = /^ {4}(depends_on|healthcheck|ports):/;

/**
 * One service's slice of the compose file, as the real lines for its name,
 * `image`, `depends_on` (with conditions), `healthcheck`, `ports` and `profiles`.
 * Lines are copied, never rewritten; `…` marks a skipped run.
 */
export const serviceExcerpt = (service: ComposeService): string => {
  const out: string[] = [service.lines[0] ?? ''];
  let nested = false;
  let skipped = false;

  for (const line of service.lines.slice(1)) {
    if (/^\s*(#.*)?$/.test(line)) {
      continue;
    }

    if (/^ {4}\S/.test(line)) {
      nested = NESTED_KEYS.test(line);
    }

    const isKept = EXCERPT_KEYS.test(line) || (nested && /^ {6,}\S/.test(line));

    if (!isKept) {
      skipped = true;
    } else {
      if (skipped) {
        out.push('    …');
        skipped = false;
      }

      out.push(line);
    }
  }

  return out.join('\n');
};

const composeParts = [
  { id: 'compose-head', text: `name: '${PROJECT_DISPLAY_NAME}'\n\nservices:` },
  ...PROFILE_SERVICES.map((service) => ({
    id: `compose-${service.name}`,
    text: serviceExcerpt(service),
  })),
];

export const SELF_HOST_COMMANDS = {
  composeCommand: 'cat docker-compose.yml',
  portCommand: `docker compose port developer ${DEVELOPER_PORT}`,
  upCommand: `docker compose --profile ${COMPOSE_PROFILE} up -d`,
} as const;

export const SELF_HOST_SURFACES: Readonly<Record<string, string>> = {
  /**
   * One scrollback, three commands. Each block is hidden until its beat, so the
   * window fills the way a real session does.
   */
  terminal: shellSurface({
    blocks: [
      {
        id: 'compose',
        output: composeParts,
        outputHidden: true,
      },
      {
        hidden: true,
        id: 'up',
        output: [
          { hidden: true, id: 'up-data', text: upData },
          { hidden: true, id: 'up-apps', text: upApps },
        ],
        outputHidden: true,
      },
      {
        hidden: true,
        id: 'served',
        output: `0.0.0.0:${DEVELOPER_PORT}`,
        outputHidden: true,
      },
    ],
    cwd: DEMO_MACHINE.shellPrompt,
    title: DEMO_MACHINE.shellPrompt,
  }),
};

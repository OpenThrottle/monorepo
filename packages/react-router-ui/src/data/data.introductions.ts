interface Introduction {
  readonly text: string;
}

export const INTRODUCTIONS: readonly Introduction[] = [
  {
    text: 'Clone the monorepo, run setup, and have a local OpenThrottle stack in minutes—Postgres, GraphQL API, developer UI, and MCP tooling included.',
  },
  {
    text: 'OpenThrottle turns ideas into plans and tasks your agents can execute. Start with the repo, wire up MCP in Cursor or VS Code, and let Ralph loops ship work with full traceability.',
  },
  {
    text: 'This isn’t a demo repo—it’s a battle-tested Nx monorepo with shared packages, agent skills, and workflows you can adopt as-is or extend for your own stack.',
  },
  {
    text: 'Plans, semantic search, and agent tooling—without vendor lock-in. Clone the repo, run it locally, and own your planning knowledge base from day one.',
  },
] as const;

/**
 * @description Returns one introduction at random from {@link INTRODUCTIONS}.
 */
export const getRandomIntroduction = (): string => {
  const index = Math.floor(Math.random() * INTRODUCTIONS.length);
  const introduction = INTRODUCTIONS[index];

  return introduction?.text ?? INTRODUCTIONS[0].text;
};

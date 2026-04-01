# openthrottle-email

Web-based email client (React Router v7, flat routes). Uses **@openthrottle/react-router-shadcn** for all UI. Routes and components are scaffolded via **@tools/generators** (see monorepo `docs/tools/templates/AGENT_USAGE.md`).

**Technology:**

- [React Router](https://reactrouter.com/) v7 (flat file-based routes)
- [React](https://reactjs.org)
- [TailwindCSS](https://tailwindcss.com)
- [Vercel](https://vercel.com)

## Documentation

- **Architecture and generators:** [docs/openthrottle-email/architecture.md](../../docs/openthrottle-email/architecture.md) (route tree, layout, @tools/generators usage)
- **Core UI design:** [docs/CORE_UI_DESIGN.md](./docs/CORE_UI_DESIGN.md) (inbox, reading pane, folders, search, shadcn-ui map)
- **Toolbar design:** [docs/TOOLBAR_DESIGN.md](./docs/TOOLBAR_DESIGN.md)
- **Integration and shadcn-ui conventions:** [docs/INTEGRATION_AND_SHADCN_GUIDE.md](./docs/INTEGRATION_AND_SHADCN_GUIDE.md) (component structure, code comments, backend wiring)

Do not remove code comments (markers) in components or routes; they guide future integration.

## Setup

From the monorepo root:

```bash
# 🔒 Create or update the environment variables
./scripts/environment.sh

# Run the application
pnpm nx run openthrottle-email:dev
```

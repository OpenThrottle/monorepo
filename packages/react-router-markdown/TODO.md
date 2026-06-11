# TODO: @openthrottle/react-router-markdown

Great stuff! You've successfully generated a new package 🎉 Now, lets quickly knock out the few manual tasks that remain.

> [!Important]
> 🚨 Do not start implementing the package just yet. It's much easier, faster, and less error prone to break the process up.
>
> 1. Scaffolding: we `generate` any new code and put it into a `PR`
> 2. Iterate: build, test, and improve over one or many `PR(s)`.

## Manual Steps

- [ ] Add this new package to the root `package.json`
  - We add it under the `dependencies`
  - `"@openthrottle/react-router-markdown": "workspace:*",`
- [ ] Now we install to update the PNPM workspace
  - `pnpm install --no-frozen-lockfile`
- [ ] And we need to update our NX workspace
  - `nx sync`
- [ ] Now this package should be ready to use
  - NX will tell us when we need to run `nx sync`
  - **Delete this file** and push up your `scaffolding PR`

> [!Note]
> 💡 All of these processes can be improved on, its really just an idea and a PR away.

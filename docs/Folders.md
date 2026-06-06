# 📂 Folders

Each of our `applications` and `packages` follow a consistent folder structure. This makes it easy to navigate and understand the code. It also makes it easy to generate new routes, components, etc using the generator(s) we have setup.

## 📂 Consistent Folders

We make use of `a handful` of folders that you will see **repeated** throughout the application. These are intentionally both **specific** and **broad** in scope. The idea is to provide a consistent structure that is easy to navigate and understand. Each folder has a specific purpose and should be used as intended. If you have questions, **please ask!**

> [!Important]
>
> 1. Do not make up new folders, use the folders available
> 2. Don't create a new file for each util, we can create buckets of similar functionality
> 3. Do not delete empty folders or the `.gitkeep` files, they are there to prepare for future functionality

### ./components

Our components are the building blocks of our application. They are the smallest unit of code that we can reuse throughout the application. They are easy to generate, allowing us to keep them simple, testable, and maintainable.

> Note: The components folder only applies to React Router Applications, React and React Router Packages.

### ./config

Configuration of various services, default values, and other things that are not functionality or data related.

### ./data

Data (mock or hard-coded) used is both easy to type and much easier to work with than directly embedding the same data directly within the component.

### ./hooks

Hooks are the modern way of composing logic and state in React. We use hooks to provide a consistent way of accessing data and logic throughout the application.

> Note: The components folder only applies to React Router Applications, React and React Router Packages.

### ./utils

Utilities should be preferred over embedding logic directly within components. This allows us to test the logic in isolation and reuse it throughout the application as needed. Functions that take params and do not rely on external state or other variables are typically perfect candidates to move to utils.

- Follow existing naming conventions and patterns
  - good: `parseXxxx(param1)`, `formatYyyy(param1, param2)`, `validateZzzzz({ ... })`
  - bad: `must_get_this_done(param1, param2, param3, param4)`
- Use a configuration object when the parameters exceed 3 in length

## 📂 Folder Structure

Each of our applications follow a consistent folder structure. This makes it easy to navigate and understand the code. It also makes it easy to generate new routes, components, etc using the generator.

```bash
│
├── assets                    # This directory is served statically from the root
├── tests                     # Testing code, including E2E, integration, and unit t
├── src                       # Our Expo Application code
│   ├── app                     # Expo Router uses file system routing
│   │   └── xxxxx               # Each "route" follows the same pattern
│   ├── global                # Highly re-used application code
│   │   ├── components          # - see details above
│   │   ├── config              # - see details above
│   │   ├── data                # - see details above
│   │   ├── hooks               # - see details above
│   │   └── utils               # - see details above
│   ├── i18n                  # Translation files
│   └── routes                # Routing mimics the "app" structure 1:1
│       └── xxxxx             # Each "route" follows the same pattern
│           ├── components      # - see details above
│           ├── config          # - see details above
│           ├── data            # - see details above
│           ├── hooks           # - see details above
│           └── utils           # - see details above
│
```

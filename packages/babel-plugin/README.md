<a href="https://github.com/thetarnav/solid-devtools/tree/main/packages/babel-plugin#readme" target="_blank">
  <p>
    <img width="100%" src="https://assets.solidjs.com/banner?type=Devtools&background=tiles&project=Babel Plugin" alt="Solid Devtools Babel Plugin">
  </p>
</a>

# @solid-devtools/babel-plugin

Babel plugin for transforming SolidJS code in development to enchance solid-devtools usage.

## Getting Started

### Installation

```bash
npm i @solid-devtools/babel-plugin
# or
yarn add @solid-devtools/babel-plugin
# or
pnpm i @solid-devtools/babel-plugin
```

### Setup

```ts
// vite.config.ts

import { defineConfig } from "vite"
import solidPlugin from "vite-plugin-solid"
import { devtoolsPlugin } from "@solid-devtools/babel-plugin"

export default defineConfig({
  plugins: [devtoolsPlugin(), solidPlugin()],
})
```

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

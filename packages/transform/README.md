<a href="https://github.com/thetarnav/solid-devtools/tree/main/packages/transform#readme" target="_blank">
  <p>
    <img width="100%" src="https://assets.solidjs.com/banner?type=Devtools&background=tiles&project=Transform" alt="Solid Devtools Transform">
  </p>
</a>

# @solid-devtools/transform

Vite plugin for transforming SolidJS code in development to enchance solid-devtools usage.

## Getting Started

### Installation

```bash
npm i @solid-devtools/transform
# or
yarn add @solid-devtools/transform
# or
pnpm i @solid-devtools/transform
```

### Setup

```ts
// vite.config.ts

import { defineConfig } from "vite"
import solidPlugin from "vite-plugin-solid"
import devtoolsPlugin from "@solid-devtools/transform"

export default defineConfig({
  plugins: [devtoolsPlugin(), solidPlugin()],
})
```

### Options

All of the transforms are disabled by default—you need to pick what you want by enabling correlated option.

```ts
interface DevtoolsPluginOptions {
  /** Wrap store creation to observe changes */
  wrapStores?: boolean
  /** Inject location attributes to jsx templates */
  jsxLocation?: boolean
}

// in vite.config.ts plugins array:
devtoolsPlugin({
  wrapStores: true,
  jsxLocation: true,
})
```

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

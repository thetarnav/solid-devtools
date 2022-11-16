<a href="https://github.com/thetarnav/solid-devtools/tree/main/packages/transform#readme" target="_blank">
  <p>
    <img width="100%" src="https://assets.solidjs.com/banner?type=Devtools&background=tiles&project=Transform" alt="Solid Devtools Transform">
  </p>
</a>

# @solid-devtools/transform

[![pnpm](https://img.shields.io/badge/maintained%20with-pnpm-cc00ff.svg?style=for-the-badge&logo=pnpm)](https://pnpm.io/)
[![version](https://img.shields.io/npm/v/@solid-devtools/transform?style=for-the-badge)](https://www.npmjs.com/package/@solid-devtools/transform)
[![npm](https://img.shields.io/npm/dw/@solid-devtools/transform?style=for-the-badge)](https://www.npmjs.com/package/@solid-devtools/transform)

A babel transform plugin for vite for transforming Solid code. For development — debugging purposes only.

It can do very useful things for you: Wrap stores to let the debugger observe them. Automatically name signals, memos and stroes. It's also required by the [Locator](https://github.com/thetarnav/solid-devtools/tree/main/packages/locator#readme) package to allow for going to the source code of the components.

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

import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'
import devtoolsPlugin from '@solid-devtools/transform'

export default defineConfig({
  plugins: [devtoolsPlugin(), solidPlugin()],
})
```

### Options

All of the transforms are disabled by default—you need to pick what you want by enabling correlated option.

- `name` - This option adds automatic name to signals, memos, stores, and mutables. Those names will be visible in the devtools when inspecting.

- `jsxLocation` - Inject location attributes to jsx templates. This is required for the debugger's [locator](https://github.com/thetarnav/solid-devtools/tree/main/packages/debugger#Using-component-locator) feature.

- `componentLocation` - Inject location information to component functions. This will add a button in the devtools inspector panel, allowing you to go to the source code of the component.

```ts
interface DevtoolsPluginOptions {
  name?: boolean
  jsxLocation?: boolean
  componentLocation?: boolean
}

// in vite.config.ts plugins array:
devtoolsPlugin({
  name: true,
  jsxLocation: true,
  componentLocation: true,
})
```

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

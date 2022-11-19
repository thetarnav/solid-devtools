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

```ts
interface DevtoolsPluginOptions {
  name?: boolean
  componentLocation?: boolean
  jsxLocation?: boolean
}

// in vite.config.ts plugins array:
devtoolsPlugin({
  name: true,
  componentLocation: true,
  jsxLocation: true,
})
```

#### `name`

This option adds automatic name to signals, memos, stores, and mutables. Those names will be visible in the devtools when inspecting.

![name-transform-example](https://user-images.githubusercontent.com/24491503/202861594-a18f34c0-bc30-4762-957a-9eb76a6b526c.png)

#### `componentLocation`

Inject location information to component functions. This will add a button in the devtools inspector panel, allowing you to go to the source code of the component.

![component-location-ui](https://user-images.githubusercontent.com/24491503/202861187-647b5792-fd8b-4fd2-9d26-2e6dee905fa9.png)

#### `jsxLocation`

Inject location attributes to jsx templates. This is required for the debugger's [locator](https://github.com/thetarnav/solid-devtools/tree/main/packages/debugger#Using-component-locator) feature.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

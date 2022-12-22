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
npm i -D @solid-devtools/transform
# or
yarn add -D @solid-devtools/transform
# or
pnpm i -D @solid-devtools/transform
```

### Setup

```ts
// vite.config.ts

import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import devtools from '@solid-devtools/transform'

export default defineConfig({
  plugins: [devtools(), solid()],
})
```

### Options

By default the plugin will only inject the debugger and extension client script to the page. (If installed)

All of the other transforms are disabled by default—you need to pick what you want by enabling correlated option.

```ts
interface DevtoolsPluginOptions {
  /** Add automatic name when creating signals, memos, stores, or mutables */
  autoname?: boolean
  locator?:
    | boolean
    | {
        /** Choose in which IDE the component source code should be revealed. */
        targetIDE?: Exclude<LocatorOptions['targetIDE'], TargetURLFunction>
        /**
         * Holding which key should enable the locator overlay?
         * @default 'Alt'
         */
        key?: LocatorOptions['key']
        /** Inject location attributes to jsx templates */
        jsxLocation?: boolean
        /** Inject location information to component declarations */
        componentLocation?: boolean
      }
}

// in vite.config.ts plugins array:
devtools({
  autoname: true,
  locator: {
    targetIDE: 'vscode',
    key: 'Ctrl',
    jsxLocation: true,
    componentLocation: true,
  },
})
```

#### `autoname`

This option adds automatic name to signals, memos, stores, and mutables. Those names will be visible in the devtools when inspecting.

![name-transform-example](https://user-images.githubusercontent.com/24491503/202861594-a18f34c0-bc30-4762-957a-9eb76a6b526c.png)

#### `locator`

This option enables the [locator](../debugger#Using-component-locator) feature. The `key` and `targetIDE` are going to pe passed to `useLocator` function call.

#### `locator.componentLocation`

Inject location information to component functions. This will add a button in the devtools inspector panel, allowing you to go to the source code of the component.

![component-location-ui](https://user-images.githubusercontent.com/24491503/202861187-647b5792-fd8b-4fd2-9d26-2e6dee905fa9.png)

#### `locator.jsxLocation`

Inject location attributes to jsx templates. This is required for the debugger's [locator](https://github.com/thetarnav/solid-devtools/tree/main/packages/debugger#Using-component-locator) feature.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

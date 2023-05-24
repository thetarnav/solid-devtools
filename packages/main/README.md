<a href="https://github.com/thetarnav/solid-devtools/tree/main/packages/main#readme" target="_blank">
  <p>
    <img width="100%" src="https://assets.solidjs.com/banner?type=Devtools&background=tiles&project=Library" alt="Solid Devtools">
  </p>
</a>

# solid-devtools

[![pnpm](https://img.shields.io/badge/maintained%20with-pnpm-cc00ff.svg?style=for-the-badge&logo=pnpm)](https://pnpm.io/)
[![version](https://img.shields.io/npm/v/solid-devtools?style=for-the-badge)](https://www.npmjs.com/package/solid-devtools)
[![npm](https://img.shields.io/npm/dw/solid-devtools?style=for-the-badge)](https://www.npmjs.com/package/solid-devtools)

The main client library. It reexports the most [important tools](<(https://github.com/thetarnav/solid-devtools#available-devtools)>) and connects the client application to the [chrome extension](https://github.com/thetarnav/solid-devtools/tree/main/packages/extension#readme).

## Installation

```bash
npm i -D solid-devtools
# or
yarn add -D solid-devtools
# or
pnpm add -D solid-devtools
```

## Using the browser extension

For the usage guide of the Solid Devtools chrome extension, please refer to the [extension documentation](../extension#Getting-started).

## Type Module

The vite plugin is exported as an **ESM** module, so you need to make sure that you have the `"type": "module"` field in your `package.json`.

```json
{
  "type": "module"
}
```

## Vite plugin

The vite plugin is the easiest way to get started with the devtools. It will automatically inject the extension client script to the page and connect the application to the extension.

It will also transform the code to make it easier to debug. For development — debugging purposes only.

### Setup

```ts
// vite.config.ts

import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid' // or solid-start/vite
import devtools from 'solid-devtools/vite'

export default defineConfig({
  plugins: [
    devtools({
      /* features options - all disabled by default */
      autoname: true, // e.g. enable autoname
    }),
    solid(),
  ],
})
```

To be able to open the source code of your components in your IDE, you need to enable the component locator. Here is how to do it:

```ts
// vite.config.ts

devtools({
  // pass `true` or an object with options
  locator: {
    targetIDE: 'vscode',
    componentLocation: true,
    jsxLocation: true,
  },
})
```

[**>> Follow this locator guide to know more**](../debugger#using-component-locator)

### Import the devtools runtime

The plugin doesn't automatically import the devtools runtime. You need to import it manually in your application's client-side entry point.

The runtime is important for exposing the devtools API to the extension.

```ts
// src/index.tsx or src/client-entry.tsx

import 'solid-devtools'
// or from 'solid-devtools/setup' if you're not using the vite plugin
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

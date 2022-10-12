<a href="https://github.com/thetarnav/solid-devtools/tree/main/packages/locator#readme" target="_blank">
  <p>
    <img width="100%" src="https://assets.solidjs.com/banner?type=Devtools&background=tiles&project=Locator" alt="Solid Devtools Locator">
  </p>
</a>

# @solid-devtools/locator

[![pnpm](https://img.shields.io/badge/maintained%20with-pnpm-cc00ff.svg?style=for-the-badge&logo=pnpm)](https://pnpm.io/)
[![version](https://img.shields.io/npm/v/@solid-devtools/locator?style=for-the-badge)](https://www.npmjs.com/package/@solid-devtools/locator)
[![npm](https://img.shields.io/npm/dw/@solid-devtools/locator?style=for-the-badge)](https://www.npmjs.com/package/@solid-devtools/locator)

A runtime library for locating components on the page, and going to their source code in your IDE.

## Getting Started

### Installation

This module is built-in with [`solid-devtools`](https://github.com/thetarnav/solid-devtools/tree/main/packages/main#readme) package and integrated with the [chrome extension](https://github.com/thetarnav/solid-devtools/tree/main/packages/extension#readme).

```bash
npm i solid-devtools
# or
yarn add solid-devtools
# or
pnpm i solid-devtools
```

### Babel Plugin

To be able to use the _"open source code in IDE"_ feature, you need to add vite plugin to your `.vite.config.js` file:

```ts
// vite.config.ts

import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'
import devtoolsPlugin from 'solid-devtools/vite'

export default defineConfig({
  plugins: [
    devtoolsPlugin({
      // enabling this option is required for the plugin to work
      jsxLocation: true,
    }),
    solidPlugin(),
  ],
})
```

### Enable the Locator plugin

The [`solid-devtools`](https://github.com/thetarnav/solid-devtools/tree/main/packages/main#readme) package comes together with the locator installed. All you need to do is configure it by calling `useLocator` with some options.

```ts
import { useLocator } from 'solid-devtools'

useLocator()
```

Locator will not allow you to highlight hovered components on the page and reveal them in the IDE or the Chrome Extension. _(depending of if the extension panel is open or not)_

### Locator Options

Not passing any options will enable the locator with <kbd>Alt</kbd> as the trigger key and no `targetIDE` selected.

Currently Locator allows for specifying these props:

#### `targetIDE`

Choose in which IDE the component source code should be revealed.

Out-of-the-box options: `vscode`, `atom`, `webstorm` and `vscode-insiders`

```ts
useLocator({
  targetIDE: 'vscode',
})
```

**Target URL Function:**

To target custom URLs (e.g. Github files) the `targetIDE` option accepts an function returning a `string` or `false`.

```ts
useLocator({
  targetIDE: ({ filePath, line }) =>
    // will navigate to this link when clicking
    `https://github.com/thetarnav/solid-devtools/blob/main/playgrounds/sandbox/${filePath}#L${line}`,
})
```

Returning `false` will prevent calling `window.open` to navigate to URL, and let you handle the click yourself.

```ts
useLocator({
  targetIDE({ projectPath, filePath, line, column, element }) {
    console.log({ projectPath, filePath, line, column, element })
    return false
  },
})
```

#### `key`

Holding which key should enable the locator overlay? It's `"Alt"` by default — <kbd>Alt</kbd> on Windows, and <kbd>Option</kbd> or <kbd>⌥</kbd> on macOS.

Key options: `"Alt"`, `"Control"`, `"Mete"`, `"Shift"` or `string` to be compared with `e.key` property.

```tsx
useLocator({
  key: 'Control',
})
```

### Using the Locator on the page

To activate the Locator module — you have to hold down the <kbd>Alt</kbd>/<kbd>Option</kbd> key and move your mouse around the page to highlight components and their different HTML Elements.

Clicking the component should take you to the component source code, given that you specified the [`targetIDE`](#targetIDE) option.

https://user-images.githubusercontent.com/24491503/174093606-a0d80331-021f-4d43-b0bb-e9a4041e1a26.mp4

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

<a href="https://github.com/thetarnav/solid-devtools/tree/main/packages/debugger#readme" target="_blank">
  <p>
    <img width="100%" src="https://assets.solidjs.com/banner?type=Devtools&background=tiles&project=Debugger" alt="Solid Devtools Debugger">
  </p>
</a>

# @solid-devtools/debugger

[![pnpm](https://img.shields.io/badge/maintained%20with-pnpm-cc00ff.svg?style=for-the-badge&logo=pnpm)](https://pnpm.io/)
[![version](https://img.shields.io/npm/v/@solid-devtools/debugger?style=for-the-badge)](https://www.npmjs.com/package/@solid-devtools/debugger)
[![npm](https://img.shields.io/npm/dw/@solid-devtools/debugger?style=for-the-badge)](https://www.npmjs.com/package/@solid-devtools/debugger)

A runtime package, used to get information and track changes of the Solid's reactivity graph. It's a cornerstone of the rest of the packages.

## Installation

If you're not using the main [`solid-devtools`](https://github.com/thetarnav/solid-devtools/tree/main/packages/main) package, and want to use the debugger directly, you can install it as a standalone package:

```bash
npm i @solid-devtools/debugger
# or
yarn add @solid-devtools/debugger
# or
pnpm add @solid-devtools/debugger
```

> **Warning**
> This package changes extremely often, and is not meant to be used directly. Unless you know what you're doing, use the main package instead.

### Module overview

The debugger is split into four submodules:

- `.` - The main debugger runtime. It exposes hooks like `useDebugger`, or `useLocator` which are used to directly interact with the debugger.

  The debugger module doesn't import from `solid-js` directly, DEV API it provided to it by the `./setup` module.

- `./setup` - As the name suggests, it's used to setup the debugger. It needs to be imported before the debugger is used, as it provides the DEV API to the debugger.

- `./bundled` - A bundled version of the main debugger module. Use this instead of the main module to prevent the debugger from importing from the local `solid-js` package to keep the development and debugger runtimes separate.

- `./types` - Exports all "pure" resources of the debugger, such as types, enums and constants. Use this if you don't want to import the debugger runtime or `solid-js` by accident.

### Import the debugger

The debugger needs to be setup before it can be used. To do that, import the `./setup` module before the debugger is used.

```ts
import '@solid-devtools/debugger/setup'

import { useDebugger } from '@solid-devtools/debugger/bundled' // or from '@solid-devtools/debugger'

const debug = useDebugger()
```

### Using component locator

_Debugger feature inspired by [LocatorJS](https://www.locatorjs.com)_

Locator let's you locate components on the page, and go to their source code in your IDE. All you need to do is configure it by calling `useLocator` with some options.

```ts
import { useLocator } from '@solid-devtools/debugger' // or 'solid-devtools/setup'

useLocator()
```

It will not allow you to highlight hovered components on the page and reveal them in the IDE or the Chrome Extension. _(depending of if the extension panel is open or not)_

#### Locator Options

Not passing any options will enable the locator with <kbd>Alt</kbd> as the trigger key and no `targetIDE` selected.

Currently Locator allows for specifying these props:

##### `targetIDE`

Choose in which IDE the component source code should be revealed.

Out-of-the-box options: `vscode`, `atom`, `webstorm` and `vscode-insiders`

```ts
useLocator({
  targetIDE: 'vscode',
})
```

To be able to go the source code, the code location needs to be inlined during build. This is done by the `@solid-devtools/transform` package. [See how to set it up here.](../transform#getting-started)

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

##### `key`

Holding which key should enable the locator overlay? It's `"Alt"` by default — <kbd>Alt</kbd> on Windows, and <kbd>Option</kbd> or <kbd>⌥</kbd> on macOS.

Key options: `"Alt"`, `"Control"`, `"Mete"`, `"Shift"` or `string` to be compared with `e.key` property.

```tsx
useLocator({
  key: 'Control',
})
```

#### Using the Locator on the page

To activate the Locator module — you have to hold down the <kbd>Alt</kbd>/<kbd>Option</kbd> key and move your mouse around the page to highlight components and their different HTML Elements.

Clicking the component should take you to the component source code, given that you specified the [`targetIDE`](#targetIDE) option.

https://user-images.githubusercontent.com/24491503/174093606-a0d80331-021f-4d43-b0bb-e9a4041e1a26.mp4

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

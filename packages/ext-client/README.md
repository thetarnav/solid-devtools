<a href="https://github.com/thetarnav/solid-devtools/tree/main/packages/ext-client#readme" target="_blank">
  <p>
    <img width="100%" src="https://assets.solidjs.com/banner?type=Devtools&background=tiles&project=Library" alt="Solid Devtools">
  </p>
</a>

# solid-devtools

[![pnpm](https://img.shields.io/badge/maintained%20with-pnpm-cc00ff.svg?style=for-the-badge&logo=pnpm)](https://pnpm.io/)
[![version](https://img.shields.io/npm/v/solid-devtools?style=for-the-badge)](https://www.npmjs.com/package/solid-devtools)
[![npm](https://img.shields.io/npm/dw/solid-devtools?style=for-the-badge)](https://www.npmjs.com/package/solid-devtools)

The main client library. It reexports the most [important tools](<(https://github.com/thetarnav/solid-devtools#available-devtools)>) and connects the client application to the [chrome extension](https://github.com/thetarnav/solid-devtools/tree/main/packages/extension#readme).

## Getting started

### Installation

```bash
npm i solid-devtools
# or
yarn add solid-devtools
# or
pnpm add solid-devtools
```

### Import the script

All you need to do is import the devtools script in your app entry file, and the debugger will automatically find roots in your app and track them.

```ts
import 'solid-devtools'
// and that's it!
```

### Using the chrome extension

Importing the `solid-devtools` package will connect your Solid application to the [chrome extension](../extension#readme).

[**Follow this guide to use the extension**](../extension#getting-started)

### Using the locator package

The `solid-devtools` package comes with the locator feature included. It's not neccessary to use it, but you can.

```ts
import { useLocator } from 'solid-devtools'

useLocator({
  targetIDE: 'vscode',
})
```

[**Follow this locator guide to know more**](../debugger#Using-Locator)

### Enabling the Babel plugin

`solid-devtools` reexports the [babel plugin](../transform#readme) as a vite plugin.

To enable it you need to add it to plugins array in your `.vite.config.js` file:

```ts
// vite.config.ts

import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import devtools from 'solid-devtools/vite'

export default defineConfig({
  plugins: [devtools(), solid()],
})
```

[**See transform options**](https://github.com/thetarnav/solid-devtools/tree/main/packages/transform#Options)

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

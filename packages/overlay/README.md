<a href="https://github.com/thetarnav/solid-devtools/tree/main/packages/overlay#readme" target="_blank">
  <p>
    <img width="100%" src="https://assets.solidjs.com/banner?type=Devtools&background=tiles&project=Devtools%20Overlay" alt="Solid Devtools Overlay">
  </p>
</a>

# @solid-devtools/overlay

[![pnpm](https://img.shields.io/badge/maintained%20with-pnpm-cc00ff.svg?style=for-the-badge&logo=pnpm)](https://pnpm.io/)
[![version](https://img.shields.io/npm/v/@solid-devtools/overlay?style=for-the-badge)](https://www.npmjs.com/package/@solid-devtools/overlay)
[![npm](https://img.shields.io/npm/dw/@solid-devtools/overlay?style=for-the-badge)](https://www.npmjs.com/package/@solid-devtools/overlay)

An on-page devtools overlay for debugging SolidJS Applications without a chrome extension.

Simply add the Overlay component to your app and get access to a powerful, in-browser devtools experience during development. _(It will be removed in production)_

## Try it online!

A couple of deployed demo websites where you can see the Overlay in action:

- [Sandbox Website](https://thetarnav.github.io/solid-devtools) - [Source code](https://github.com/thetarnav/solid-devtools/tree/main/examples/sandbox)

## Getting started

### Installation

```bash
npm i @solid-devtools/overlay
# or
yarn add @solid-devtools/overlay
# or
pnpm add @solid-devtools/overlay
```

### Attach the overlay

Simply place the overlay component in the client entry file.

```tsx
import { attachDevtoolsOverlay } from '@solid-devtools/overlay'

attachDevtoolsOverlay()

// or with some options

attachDevtoolsOverlay({
  defaultOpen: true, // or alwaysOpen
  noPadding: true,
})
```

Don't worry about wrapping it with a `isDev` guard, the Overlay takes care of that for you. It should be excluded from production builds automatically.

### Enabling the Babel plugin

Enabling the [babel plugin](https://github.com/thetarnav/solid-devtools/tree/main/packages/transform#readme) is optional, but can offer some extra improvements.

To enable it you need to add it to plugins array in your `.vite.config.ts` file:

```ts
// vite.config.ts

import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import devtools from '@solid-devtools/transform'

export default defineConfig({
  plugins: [
    devtools({
      name: true,
    }),
    solid(),
  ],
})
```

[**See transform options**](https://github.com/thetarnav/solid-devtools/tree/main/packages/transform#options)

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

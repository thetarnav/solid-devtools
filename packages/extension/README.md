<a href="https://github.com/thetarnav/solid-devtools/tree/main/packages/extension#readme" target="_blank">
  <p>
    <img width="100%" src="https://assets.solidjs.com/banner?type=Devtools&background=tiles&project=Chrome%20Extension" alt="Solid Devtools Extension">
  </p>
</a>

# Chrome Extension

[![version](https://img.shields.io/chrome-web-store/v/kmcfjchnmmaeeagadbhoofajiopoceel?label=version&style=for-the-badge)](https://chrome.google.com/webstore/detail/solid-devtools/kmcfjchnmmaeeagadbhoofajiopoceel)
[![users](https://img.shields.io/chrome-web-store/users/kmcfjchnmmaeeagadbhoofajiopoceel?label=users&style=for-the-badge)](https://chrome.google.com/webstore/detail/solid-devtools/kmcfjchnmmaeeagadbhoofajiopoceel)

🚧 In early development. 🚧

Chrome devtools extension for debugging Solid applications.
It allows for visualizing and interacting with Solid's reactivity graph, as well as inspecting component state and hierarchy.

Should work in any application using SolidJS, including SolidStart and Astro.

![screenshot](https://user-images.githubusercontent.com/24491503/193428963-f19d4da7-940d-4c8b-8aa8-88af3e705cc1.png)

## Getting started

### 1. Install the extension

The extension is now available on the Chrome Web Store. You can install it when using a chromium-based browser by clicking the "Install" button.

[**Solid Devtools Chrome Extension**](https://chrome.google.com/webstore/detail/solid-devtools/kmcfjchnmmaeeagadbhoofajiopoceel)

### 2. Install the npm library

If you think about the Chrome Extension as a **Frontend**, then the [**"solid-devtools"**](<(https://github.com/thetarnav/solid-devtools/blob/main/packages/ext-client#readme)>) package is its **Backend**. It debugs the Solid's reactivity and communicates the updates to the Chrome Extension.

Install the following package:

```bash
npm i solid-devtools
# or
yarn add solid-devtools
# or
pnpm add solid-devtools
```

_(you can install is as a dev dependency too, but it has a runtime—which is removed in production build)_

As the extension requires both the extension and the library to work, you need to watchout for version mismatches. The extension will warn you if the library version is different than the one expected by the extension.

### 3. Import the script

Import `"solid-devtools"` package in your app entry file. (It's best if the script runs before any application code is executed)

```ts
// will automatically find and track all roots in your application
// also setups the extension adapter
import 'solid-devtools'
```

You can also use the Locator pacage here. It now is integrated with the extension. More on that [here](https://github.com/thetarnav/solid-devtools/tree/main/packages/locator#readme).

```ts
import { useLocator } from 'solid-devtools'
useLocator()
```

### 4. Add vite plugin _(Optional)_

The vite plugin is not necessary for the devtools to work, but enabling some of the options, such as `"name"` will improve the debugging experience.

[**More about the available transforms.**](https://github.com/thetarnav/solid-devtools/tree/main/packages/transform#options)

```ts
// vite.config.ts

import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import devtools from 'solid-devtools/vite'

export default defineConfig({
  plugins: [
    devtools({
      // Will automatically add names when creating signals, memos, stores, or mutables
      name: true,
    }),
    solid(),
  ],
})
```

![name-transform-example](https://user-images.githubusercontent.com/24491503/185811011-c2031ba3-c9b7-44f7-b924-2a5e28a86230.jpg)

### 5. Run the app and play with the devtools!

That's it! A new **"Solid"** panel should appear in your Chrome Devtools.

Thank You for trying out the extension in it's early development stages. We are constantly working on it to make it better, add new features and improve the user experience. We appreciate your feedback and suggestions.

If you run to any issues, or have any suggestions, please [open an issue](https://github.com/thetarnav/solid-devtools/issues).

If you are interested in the extension's development, see the [Plans for Devtools](https://github.com/thetarnav/solid-devtools/discussions/67) discussion.

## DEMO

This Stackblitz demo is setup to work with the extension.

[**See this Stackblitz demo.**](https://stackblitz.com/edit/solid-devtools-demo?file=src%2Fmain.tsx)

## Acknowledgements

The content and examples of extension docs are inspired by following articles:

- [**Taking SolidJS Dev-Tools for a Spin**](https://dev.to/mbarzeev/taking-solidjs-dev-tools-for-a-spin-44m2)
- [**Using SolidJS Dev-Tools Locator Feature**](https://dev.to/mbarzeev/using-solidjs-dev-tools-locator-feature-1445)

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

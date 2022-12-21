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

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://user-images.githubusercontent.com/24491503/203095796-4ca411d9-e377-4c2e-896e-f152172270cc.png">
  <img alt="Screenshot of the chrome extension" src="https://user-images.githubusercontent.com/24491503/203095712-1c4f904a-5a63-47ef-84e1-fc50e9e1c4d4.png">
</picture>

## Getting started

### 1. Install the extension

The extension is now available on the Chrome Web Store. You can install it when using a chromium-based browser by clicking the "Install" button.

[**Solid Devtools Chrome Extension**](https://chrome.google.com/webstore/detail/solid-devtools/kmcfjchnmmaeeagadbhoofajiopoceel)

### 2. Install the npm library

If you think about the Chrome Extension as a **Frontend**, then the [**"solid-devtools"**](<(https://github.com/thetarnav/solid-devtools/blob/main/packages/ext-client#readme)>) package is its **Backend**. It debugs the Solid's reactivity and communicates the updates to the Chrome Extension.

Install the following package:

```bash
npm i -D solid-devtools
# or
yarn add -D solid-devtools
# or
pnpm add -D solid-devtools
```

_(you can install is as a dev dependency too, but it has a runtime—which is removed in production build)_

As the extension requires both the extension and the library to work, you need to watchout for version mismatches. The extension will warn you if the library version is different than the one expected by the extension.

### 3. Add devtools vite plugin

The [vite plugin](../transform#readme) is a way to configure the transform options and add debugger script to the page. Enabling transforms are not necessary for the devtools to work, but the debugger script needs to be present to analyse you solid application. Enabling some of the options, such as `"name"`, will improve the debugging experience or enable additional features.

```ts
// vite.config.ts

import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import devtools from 'solid-devtools/vite'

export default defineConfig({
  plugins: [
    devtools({
      // required:
      injectDebugger: true,
      // optional options:
      name: true,
      componentLocation: true,
      jsxLocation: true,
    }),
    solid(),
  ],
})
```

[**>> More about transform options**](https://github.com/thetarnav/solid-devtools/tree/main/packages/transform#options)

### 4. Run the app and play with the devtools!

That's it! A new **"Solid"** panel should appear in your Chrome Devtools.

Thank You for trying out the extension in it's early development stages. We are constantly working on it to make it better, add new features and improve the user experience. We appreciate your feedback and suggestions.

If you run to any issues, or have any suggestions, please [open an issue](https://github.com/thetarnav/solid-devtools/issues).

If you are interested in the extension's development, see the [Plans for Devtools](https://github.com/thetarnav/solid-devtools/discussions/67) discussion.

## DEMO

This Stackblitz demo is setup to work with the extension.

[**See this Stackblitz demo.**](https://stackblitz.com/edit/solid-devtools-demo?file=src%2Fmain.tsx)

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

<a href="https://github.com/thetarnav/solid-devtools/tree/main/packages/frontend#readme" target="_blank">
  <p>
    <img width="100%" src="https://assets.solidjs.com/banner?type=Devtools&background=tiles&project=Frontend" alt="Solid Devtools Frontend">
  </p>
</a>

# @solid-devtools/frontend

[![pnpm](https://img.shields.io/badge/maintained%20with-pnpm-cc00ff.svg?style=for-the-badge&logo=pnpm)](https://pnpm.io/)
[![version](https://img.shields.io/npm/v/@solid-devtools/frontend?style=for-the-badge)](https://www.npmjs.com/package/@solid-devtools/frontend)
[![npm](https://img.shields.io/npm/dw/@solid-devtools/frontend?style=for-the-badge)](https://www.npmjs.com/package/@solid-devtools/frontend)

The frontend of the devtools extension as a npm package, so it can be embedded in different projects.

## Getting started

### Installation

```bash
npm i @solid-devtools/frontend
# or
yarn add @solid-devtools/frontend
# or
pnpm add @solid-devtools/frontend
```

### The debugger

The [debugger](https://github.com/thetarnav/solid-devtools/tree/main/packages/debugger#readme) package is what you should use to get information out of the reactivity graph of an app you want to debug and display on the devtools.

You can communicate with it using it's plugin API. For reference, see the [main](https://github.com/thetarnav/solid-devtools/tree/main/packages/main/src) package, which contains the code to communicate with the debugger from the devtools extension through a chrome postMessage API.

### The controller

The devtools frontend is controlled with a `Controller` API. It provides a set of methods to trigger actions, and a way to get events from the devtools frontend.

```ts
const controller = new Controller({
  onDevtoolsLocatorStateChange(enabled) {
    console.log(enabled)
  },
  onHighlightElementChange(data) {
    console.log(data)
  },
  onInspectNode(data) {
    console.log(data)
  },
  onInspectValue(data) {
    console.log(data)
  },
})
```

This package is continuously under development, so the API is still not well defined. So instead of focusing on the API, the usage examples should show how you can embed this package in different context.

- [Chrome Extension](https://github.com/thetarnav/solid-devtools/blob/main/extension/src/App.tsx) - The extension is communicating with the [debugger](https://github.com/thetarnav/solid-devtools/tree/main/packages/debugger#readme) using the [main](https://github.com/thetarnav/solid-devtools/tree/main/packages/main/src) npm package.

- [Overlay component](https://github.com/thetarnav/solid-devtools/blob/main/packages/overlay/src/controller.ts)

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

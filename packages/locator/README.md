<a href="https://github.com/thetarnav/solid-devtools/tree/main/packages/locator#readme" target="_blank">
  <p>
    <img width="100%" src="https://assets.solidjs.com/banner?type=Devtools&background=tiles&project=Locator" alt="Solid Devtools Locator">
  </p>
</a>

# @solid-devtools/locator

A runtime library for locating components on the page, and going to their source code in your IDE.

## Getting Started

### Installation

This module is built-in with [`solid-devtools`](https://github.com/thetarnav/solid-devtools/tree/main/packages/debugger#readme) package.

To be able to use the _"open source code in IDE"_ feature, you need to install [`@solid-devtools/babel-plugin`](https://github.com/thetarnav/solid-devtools/tree/main/packages/babel-plugin#readme) additionally.

```bash
# @solid-devtools/babel-plugin is optional

npm i solid-devtools @solid-devtools/babel-plugin
# or
yarn add solid-devtools @solid-devtools/babel-plugin
# or
pnpm i solid-devtools @solid-devtools/babel-plugin
```

### Babel Plugin

To be able to use the _"open source code in IDE"_ feature, you need to install and add [`@solid-devtools/babel-plugin`](https://github.com/thetarnav/solid-devtools/tree/main/packages/babel-plugin#readme) to vite plugins.

[**Follow the setup guide on it here**](https://github.com/thetarnav/solid-devtools/tree/main/packages/babel-plugin#Setup)

### Debugger

Wrap your application with the [`<Debugger>`](https://github.com/thetarnav/solid-devtools/tree/main/packages/debugger#debugger) component. And enable the Locator module with passing `true` or an options object to the `locator` prop.

```tsx
import { render } from "solid-js/web"
import { Debugger } from "solid-devtools"

render(
  () => (
    <Debugger locator>
      <App />
    </Debugger>
  ),
  document.getElementById("root")!,
)
```

#### Locator Options

Currently Locator allows for specifying these props:

##### `targetIDE`

Choose in which IDE the component source code should be revealed.

Out-of-the-box options: `vscode`, `atom`, `webstorm` and `vscode-insiders`

```tsx
<Debugger locator={{ targetIDE: "vscode" }}>
  <App />
</Debugger>
```

##### `key`

Holding which key should enable the locator overlay? It's `"altKey"` by default — <kbd>Alt</kbd> on Windows, and <kbd>Option</kbd> or <kbd>⌥</kbd> on macOS.

Key options: `"altKey"`, `"ctrlKey"`, `"metaKey"`, `"shiftKey"` or `string` to be compared with `e.key` property.

```tsx
<Debugger locator={{ key: "ctrlKey" }}>
  <App />
</Debugger>
```

### Using the Locator on the page

To activate the Locator module — you have to hold down the <kbd>Alt</kbd>/<kbd>Option</kbd> key and move your mouse around the page to highlight components and their different HTML Elements.

Clicking the component should take you to the component source code, given that you specified the [`targetIDE`](#targetIDE) option.

https://user-images.githubusercontent.com/24491503/174093606-a0d80331-021f-4d43-b0bb-e9a4041e1a26.mp4

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

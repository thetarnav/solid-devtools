<a href="https://github.com/thetarnav/solid-devtools/tree/main/packages/locator#readme" target="_blank">
  <p>
    <img width="100%" src="https://assets.solidjs.com/banner?type=Devtools&background=tiles&project=Locator" alt="Solid Devtools Locator">
  </p>
</a>

# @solid-devtools/locator

A runtime library for locating components on the page, and their source code in your IDE.

## Usage

This module is built-in with [`solid-devtools`](https://github.com/thetarnav/solid-devtools/tree/main/packages/debugger#readme) package.

Usage guide below is for using it with `solid-devtools`.

### Installation

```bash
npm i solid-devtools
# or
yarn add solid-devtools
# or
pnpm i solid-devtools
```

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

Out-of-the-box options: `vscode`, `atom`, `webstorm`

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

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

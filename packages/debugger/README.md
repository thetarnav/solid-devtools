<a href="https://github.com/thetarnav/solid-devtools/tree/main/packages/debugger#readme" target="_blank">
  <p>
    <img width="100%" src="https://assets.solidjs.com/banner?type=Devtools&background=tiles&project=Debugger" alt="Solid Devtools Debugger">
  </p>
</a>

# solid-devtools

A runtime package, used to get information and track changes of the Solid's reactivity graph. It's a cornerstone of the rest of the packages.

It comes with [Extension Adapter](https://github.com/thetarnav/solid-devtools/tree/main/packages/extension-adapter#readme) and [Locator](https://github.com/thetarnav/solid-devtools/tree/main/packages/locator#readme) packages included.

## Usage Guide

### Installation

```bash
npm i solid-devtools
# or
yarn add solid-devtools
# or
pnpm i solid-devtools
```

### Debugger

The most important piece of `solid-devtools` is the `<Debugger>` component. Debugger is a cornerstone of all solid-devtools. It analyses and tracks changes of Solid's reactive graph.

Wrap your application with it to use compatable devtools.

```tsx
import { render } from "solid-js/web"
import { Debugger } from "solid-devtools"

render(
	() => (
		// Debugger will observe application passed to it as children.
		<Debugger>
			<App />
		</Debugger>
	),
	document.getElementById("root")!,
)
```

#### Debugger props

Debugger accepts props for controlling it's behavior.

- `locator` Options for the [Locator](https://github.com/thetarnav/solid-devtools/tree/main/packages/locator#readme) module.

The Locator module will be disabled by default. To enable it pass `true` or an [options object](https://github.com/thetarnav/solid-devtools/tree/main/packages/locator#locator-options) to the `locator` prop.

```tsx
<Debugger locator>
	<App />
</Debugger>
```

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

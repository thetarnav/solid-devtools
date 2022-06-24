<a href="https://github.com/thetarnav/solid-devtools/tree/main/packages/main#readme" target="_blank">
  <p>
    <img width="100%" src="https://assets.solidjs.com/banner?type=Devtools&background=tiles&project=Library" alt="Solid Devtools">
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

### Attaching Debugger to your application

Currently you have to manually attach the debugger to the reactive graph of your application logic. You can do that with one of the two primitives:

#### `attachDebugger`

This is a hook that will attach the debugger to the reactive owner of the scope it was used under. For example you might want to use it in you `<App>` component, or directly in the `render` function. It can be used in many places at once without any issues.

```tsx
import { render } from "solid-js/web"
import { attachDebugger } from "solid-devtools"

render(() => {
  attachDebugger()
  return <App />
}, document.getElementById("root")!)

// or inside the App component:
function App() {
  attachDebugger()
  return <>...</>
}
```

#### `Debugger`

The debugger component works exactly like [`attachDebugger`](#attachDebugger), but it may be more convenient to use at times.

```tsx
import { render } from "solid-js/web"
import { Debugger } from "solid-devtools"

render(
  () => (
    <Debugger>
      <App />
    </Debugger>
  ),
  document.getElementById("root")!,
)
```

### Reattaching sub roots back to the tree

Solid doesn't attach roots created with `createRoot` to it's detached parent, so the debugger has no way of reaching it. To reattach this root back to the tree tracked by the debugger — simply put another `attachDebugger` call inside it.

[More in this issue](https://github.com/thetarnav/solid-devtools/issues/15)

This also will be necessary when using components that use `createRoot` internally, like `<For>`, `<Index>` or `<Suspense>`.

```tsx
<For each={list()}>
	{item => (
		<Debugger>
			<ItemComponent title={item} />
		</Debugger>
	)}
<For>

// or call attachDebugger inside ItemComponent
function ItemComponent(props){
	attachDebugger()
	return <li>props.title</li>
}
```

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

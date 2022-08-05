<a href="https://github.com/thetarnav/solid-devtools/tree/main/packages/debugger#readme" target="_blank">
  <p>
    <img width="100%" src="https://assets.solidjs.com/banner?type=Devtools&background=tiles&project=Debugger" alt="Solid Devtools Debugger">
  </p>
</a>

# @solid-devtools/debugger

A runtime package, used to get information and track changes of the Solid's reactivity graph. It's a cornerstone of the rest of the packages.

## Usage Guide

### Installation

```bash
npm i -D @solid-devtools/debugger
# or
yarn add -D @solid-devtools/debugger
# or
pnpm add -D @solid-devtools/debugger
```

### Automatically Attaching Debugger

[In Solid version `1.4.5`, a `_$afterCreateRoot` dev hook was added](https://github.com/solidjs/solid/pull/1067) to allow for automatic attaching of the debugger.

That means that you can use the debugger in your Solid apps without having to manually attach it to every root or the reactive graph in your application. To enable automatic attaching, you need to add the following code to the entry point of your app:

[**If you use `solid-devtools` package, this is already handled for you!**](https://github.com/thetarnav/solid-devtools/tree/main/packages/main)

```ts
import { attachDebugger, makeCreateRootListener } from "@solid-devtools/debugger"

makeCreateRootListener(root => attachDebugger(root))
```

### Manually Attaching Debugger

If you don't want to automatically attach debugger, it can be done manually. It will give you the freedom to attach debugger to any root you choose.

To do so you need to import the debugger package and use one of the two primitives:

#### `attachDebugger`

This is a hook that will attach the debugger to the reactive owner of the scope it was used under. For example you might want to use it in you `<App>` component, or directly in the `render` function. It can be used in many places at once without any issues.

```tsx
import { render } from "solid-js/web"
import { attachDebugger } from "@solid-devtools/debugger"

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
import { Debugger } from "@solid-devtools/debugger"

render(
  () => (
    <Debugger>
      <App />
    </Debugger>
  ),
  document.getElementById("root")!,
)
```

#### Reattaching sub roots back to the tree

If you choose to attach debugger manually, you have to do that with every sub root, even if it is theoretically a part of existing and attached tree. This is because Solid doesn't attach roots created with `createRoot` to it's detached parent, so the debugger has no way of reaching it. To reattach this root back to the tree tracked by the debugger — simply put another `attachDebugger` call inside it.

[More in this issue](https://github.com/thetarnav/solid-devtools/issues/15)

This also will be necessary when using components that use `createRoot` internally, like `<For>`, `<Index>` or `<Suspense>`.

> **Note**
> This applies only when you are attaching roots manually.
> For automatic attaching, this is already handled.

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

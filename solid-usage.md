# Usage of Solid internals and dev-apis in solid-devtools

## Current usage

### Detecting Solid

- This one cannot use internals nor dev-only apis because the goal is to detect solid on any page. — [source code](https://github.com/thetarnav/solid-devtools/blob/main/packages/shared/src/detect.ts)

#### Issues

- The test is complicated, brittle, might have false-positives and doesn't tell you the solid version.

### Node types

By node I mean any solid internal object, like owners, signals, roots, store-nodes, and anything user registers with `solid.DEV.registerGraph()`.

- There are many internal owner properties that are inspected to determine kind of node. — [source code](https://github.com/thetarnav/solid-devtools/blob/main/packages/debugger/src/main/utils.ts#L5-L86)

#### Issues

- This is super brittle, some properties are set some time after the owner is created, most of the properties accessed are not used for anything else.

### Node names

- `owner.name` or `signal.name` or `owner.component.name` or `owner.component.displayName`

#### Issues

- No one good way to give custom names to components.

  This works but it's a side-effect.

  ```js
  Bar.displayName = "Foo.Bar"
  ```
  
  While this is ugly
  
  ```ts
  if (isDev) {
      getOwner()!.name = "Foo.Bar"
  }
  ```

### Roots

- `solid.DEV.hooks.afterCreateOwner()` for attaching the debugger to roots
    - to gather top-level roots like `render()`
    - but also to "re-attach roots back to the owner tree" when `createRoot` is used under owners, like in `mapArray`
    - [source code](https://github.com/thetarnav/solid-devtools/blob/main/packages/debugger/src/main/roots.ts#L147-L163)
    - access to `owner.owner` and `owner.cleanups` to listen to parent's *(root's detached owner)* cleanup
        - so that if the root's parent disposes before the root, the root will need to be "reattached" to first found "alive" owner
        - this is rather uncommon

#### Issues

- Any root created before `solid.DEV.hooks.afterCreateOwner` is set will be missed.\
  This is annoying because the extension's content-script isn't garanteed to run before user scripts. Making the `solid-devtools` npm package and `import "solid-devtools"` required to capture all the roots.\
  If there was access to any unowned root, the extension would work with any solid app with no setup.

### Owners tree

- Reads `owner.owner` and `owner.owned` to walk the tree in both directions

### Components

- Component functions are wrapped with `devComponent` when called.
- To get component elements, I read `owner.value` of a component and walk the recieved arrays or functions to get to the elements. This is the only way to map elements to components, which is important for the [locator feature](https://github.com/thetarnav/solid-devtools/tree/main/packages/debugger#using-component-locator).
    - [source code](https://github.com/thetarnav/solid-devtools/blob/508bc73783c049478a629960ee353219a4b9a953/packages/debugger/src/main/utils.ts#L154-L172)

#### Issues

- Calling signals to get to the elements is bad. I might call it before it's supposed to be read causing side effects. And there is no way of knowing when the elements might have changed without subscribing to the read signals, or invalidating the results on every reactive update.

### Owner disposing

- Writing to `owner.cleanups` to listen to cleanup of any owner — [source code](https://github.com/thetarnav/solid-devtools/blob/main/packages/debugger/src/main/utils.ts#L205-L227)

#### Issues

- The cleanups are executed depth first—if I try to walk the tree on child's cleanup, I cannot tell if the parent is getting cleaned up as well or not. There is no `isDisposed` property.

- There is no difference between disposing and rerunning—I have to listen to parents cleanup to when targetting disposal.

### Computation updates

- `owner.fn` is patched to observe when the computation reruns — [source code](https://github.com/thetarnav/solid-devtools/blob/main/packages/debugger/src/main/observe.ts#L50-L88)

- `owner.value` is read to get the current owner value and patched to listen to changes — [source code](https://github.com/thetarnav/solid-devtools/blob/main/packages/debugger/src/main/observe.ts#L98-L123)
    - signals are being observed the same way
    - this is also separate from observing `owner.fn` because not every rerun will cause the value to update *(thanks to `equals` option)*

- `owner.sources` — by listening to each of the sources, I'm able to tell which source caused the computation to rerun. — [source code](https://github.com/thetarnav/solid-devtools/blob/main/packages/logger/src/index.ts#L117-L180)

### Dependency graph

- `owner.sources` and `owner.observers` to crawl the graph

- `sourceValue.graph` — for signals to know to which owner they "belong to"

- `solid.DEV.hooks.afterUpdate()` is used as a trigger to update the dependency graph

### Props

- `solid.$PROXY` is used to check if the props object is a proxy

- If it's not a proxy, I can patch it with `Object.defineProperty(props, key, {get})` to intercept accessing props—since accessing props might cause side-effects I have to wait for the user.
	- [source code](https://github.com/thetarnav/solid-devtools/blob/main/packages/debugger/src/inspector/inspector.ts#L98-L113)
	- `solid.getListener() + solid.onCleanup()` is useful there to know when the prop is no longer being listened to—I might not have the latest value anymore.

- For proxy props I can only get keys with `Object.keys(props)`

#### Issues

- I cannot intercept proxy props—users just see `foo: unknown` without the value

- props object cannot be changed, just monkeypatched—replacing it would probably let me intercept reads to proxy props

- `solid.DEV.hooks.afterCreateOwner()` gets called before `props` are attached to the owner, so I cannot get to them then.

    - so currently I cannot intercept the initial reads from props—which are the most common
    - I would have to do `Object.defineProperty(owner, "props", {set})` to be able to patch props before component function executes probably
    - [source code](https://github.com/solidjs/solid/blob/main/packages/solid/src/reactive/signal.ts#L1115-L1133)

### Store

- `store.unwrap()` with type reflection when serializing and reading stores

- `store.isWrappable()`

- `store.DEV.hooks.onStoreNodeUpdate()` for observing changes to stores — [source code](https://github.com/thetarnav/solid-devtools/blob/main/packages/debugger/src/inspector/store.ts#L27-L49)

#### Issues

- There is no connection between signals and the store-nodes they are being used in.\
So if there is an effect that listens to some store property *(e.g. `createEffect(() => store.foo)`)*, from devtools perspective this is just some random signal being observed in `owner.sources`.

### Signals and other values

- `owner.sourceMap` for getting which signals, stores or custom values belong to an owner.

- `solid.DEV.hooks.afterCreateSignal()` is useful for getting unowned signals
    - which is important for the `export const [state, setState] = solid.createSignal({...})` style of state management — [source code](https://github.com/thetarnav/solid-devtools/blob/main/packages/debugger/src/setup.ts#L123-L136)

#### Issues

- The two issues with `afterCreateSignal` are addressed by https://github.com/solidjs/solid/pull/2396 and https://github.com/solidjs/solid/pull/2393

- The other is similar to `afterCreateOwner` — signals created before the hook callback is set will be missed. This one is trickier to solve because signals don't have a clear lifecycle unlike roots.

### Additional issues

- There is no way to connect a render effect to the dom property it updates, so I cannot give any meaningfull info about them, or to which element they even belong.

- There is no connection between a signal accessor and the signal object it belongs to.

  This is an usually an issue with jsx and components returning signals. I cannot show what the value is without calling the accessor which might have side effects.

- No tools to mark "custom primitives" for devtools. For example `createResource` doesn't have a single instance that I can inspect—it's made up from multiple separate signals, computations and other values.

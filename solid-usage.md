# Current usage

## Node types

By node I mean any solid internal object, like owners, signals, roots, store-nodes, and anything user registers with `solid.DEV.registerGraph()`.

There are many internal owner properties that are inspected to determine kind of node. — [source code](https://github.com/thetarnav/solid-devtools/blob/main/packages/debugger/src/main/utils.ts#L5-L86)

### Issues

This is super brittle, some properties are set some time after the owner is created, most of the properties accessed are not used for anything else.

## Node names

- `owner.name` or `signal.name` or `owner.component.name` or `owner.component.displayName`

### Issues

No one good way to give custom names to components.

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

## Roots

- `solid.DEV.hooks.afterCreateOwner()` for attaching the debugger to roots
    - to gather top-level roots like `render()`
    - but also to "re-attach roots back to the owner tree" when `createRoot` is used under owners, like in `mapArray`
    - [source code](https://github.com/thetarnav/solid-devtools/blob/main/packages/debugger/src/main/roots.ts#L147-L163)
    - access to `owner.owner` and `owner.cleanups` to listen to parent's *(root's detached owner)* cleanup
        - so that if the root's parent disposes before the root, the root will need to be "reattached" to first found "alive" owner
        - this is rather uncommon

### Issues

Any root created before `solid.DEV.hooks.afterCreateOwner` is set will be missed.\
This is annoying because the extension's content-script isn't garanteed to run before user scripts. Making the `solid-devtools` npm package and `import "solid-devtools"` required to capture all the roots.\
If there was access to any unowned root, the extension would work with any solid app with no setup.

## Computation updates

- `owner.fn` is patched to observe when the computration reruns — [source code](https://github.com/thetarnav/solid-devtools/blob/main/packages/debugger/src/main/observe.ts#L50-L88)

- `owner.value` is read to get the current owner value and patched to listen to changes — [source code](https://github.com/thetarnav/solid-devtools/blob/main/packages/debugger/src/main/observe.ts#L98-L123)
    - signals are being observed the same way
    - this is also separate from observing `owner.fn` because not every rerun will cause the value to update *(thanks to `equals` option)*

- `owner.sources` — by listening to each of the sources, I'm able to tell which source caused the computation to rerun. — [source code](https://github.com/thetarnav/solid-devtools/blob/main/packages/logger/src/index.ts#L117-L180)

## Owners tree

Reads `owner.owner` and `owner.owned` to walk the tree in both directions

## Owner disposing

Patching `owner.cleanups` to listen to cleanup of any owner — [source code](https://github.com/thetarnav/solid-devtools/blob/main/packages/debugger/src/main/utils.ts#L205-L227)

### Issues

The cleanups are executed depth first—if I try to walk the tree on child's cleanup, I cannot tell if the parent is getting cleaned up as well or not. There is no `isDisposed` property.

## Dependency graph

- `owner.sources` and `owner.observers`

- `sourceValue.graph` — for signals to know to which owner they "belong to"

## Props

- `solid.$PROXY` is used to check if the props object is a proxy

- If it's not a proxy, I can patch it with `Object.defineProperty(props, key, {get})` to intercept accessing props—since accessing props might cause side-effects I have to wait for the user.
	- [source code](https://github.com/thetarnav/solid-devtools/blob/main/packages/debugger/src/inspector/inspector.ts#L98-L113)
	- `solid.getListener() + solid.onCleanup()` is useful there to know when the prop is no longer being listened to—I might not have the latest value anymore.

- For proxy props I can only get keys with `Object.keys(props)`

### Issues

- I cannot intercept proxy props—users just see `foo: unknown` without the value

- props object cannot be changed, just monkeypatched—replacing it would probably let me intercept reads to proxy props

- `solid.DEV.hooks.afterCreateOwner()` gets called before `props` are attached to the owner, so I cannot get to them then.

    - so currently I cannot intercept the initial reads from props—which are the most common
    - I would have to do `Object.defineProperty(owner, "props", {set})` to be able to patch props before component function executes probably
    - [source code](https://github.com/solidjs/solid/blob/main/packages/solid/src/reactive/signal.ts#L1115-L1133)

## Store

- `store.unwrap()` with type reflection when serializing and reading stores

- `store.isWrappable()`

- `store.DEV.hooks.onStoreNodeUpdate()` for observing changes to stores — [source code](https://github.com/thetarnav/solid-devtools/blob/main/packages/debugger/src/inspector/store.ts#L27-L49)

### Issues

There is no connection between signals and the store-nodes they are being used in.\
So if there is an effect that listens to some store property *(e.g. `createEffect(() => store.foo)`)*, from devtools perspective this is just some random signal being observed in `owner.sources`.

## Source Map

- `owner.sourceMap`

## Source Map

- `solid.DEV.hooks.afterCreateSignal()`
- `solid.DEV.registerGraph()`
- `owner.sourceMap`

## List

- `solid.$PROXY` in [props](#props)
- `Object.defineProperty(props, key, {get})` in [props](#props)
- `solid.getListener() + solid.onCleanup()` in [props](#props)
- `store.unwrap()` in [store](#store)
- `store.isWrappable()` in [store](#store)
- `store.DEV.hooks.onStoreNodeUpdate()` in [store](#store)
- `solid.DEV.hooks.afterCreateOwner()` in [owners](#owners)
- `owner.owner` in [owners](#owners)
- `owner.cleanups` in [owners](#owners)

# Future
- `onOwnerCleanup` - to not patch `owner.cleanups`
    - it probably would be useful to have both `onBeforeOwnerCleanup` and `onAfterOwnerCleanup`
    as the cleanups are executed depth first—if I try to walk the tree on child's cleanup, I cannot tell if the parent is getting cleaned up as well or not.

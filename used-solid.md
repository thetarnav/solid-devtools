# Current usage

## Props

- `solid.$PROXY` is used to check if the props object is a proxy

- If it's not a proxy, I can patch it with `Object.defineProperty(props, key, {get})` to intercept accessing props—since accessing props might cause side-effects I have to wait for the user.
	- https://github.com/thetarnav/solid-devtools/blob/main/packages/debugger/src/inspector/inspector.ts#L98-L113
	- `solid.getListener() + solid.onCleanup()` is useful there to know when the prop is no longer being listened to—I might not have the latest value anymore.

- For proxy props I can only get keys with `Object.keys(props)`

### Issues

- I cannot intercept proxy props—users just see `foo: unknown` without the value

- props object cannot be changed, just monkeypatched—replacing it would probably let me intercept reads to proxy props

- `solid.DEV.hooks.afterCreateOwner()` gets called before `props` are attached to the owner, so I cannot get to them then.

    - so currently I cannot intercept the initial reads from props—which are the most common
    - I would have to do `Object.defineProperty(owner, "props", {set})` to be able to patch props before component function executes probably
    - https://github.com/solidjs/solid/blob/main/packages/solid/src/reactive/signal.ts#L1115-L1133

## Store

- `store.unwrap()` with type reflection when serializing and reading stores

- `store.isWrappable()`

- `store.DEV.hooks.onStoreNodeUpdate()` for observing changes to stores
    - https://github.com/thetarnav/solid-devtools/blob/main/packages/debugger/src/inspector/store.ts#L27-L49

### Issues

- There is no connection between signals and the store-nodes they are being used in.
  So if there is an effect that listens to some store property *(e.g. `createEffect(() => store.foo)`)*, from devtools perspective this is just some random signal being observed in `owner.sources`

## Owner tree

- `solid.DEV.hooks.afterCreateOwner()` for attaching the debugger to roots
    - to gather top-level roots like `render()`
    - but also to "re-attach roots back to the owner tree" when `createRoot` is used under owners, like in `mapArray`
    - https://github.com/thetarnav/solid-devtools/blob/main/packages/debugger/src/main/roots.ts#L147-L163
    - access to `owner.owner` and `owner.cleanups` to listen to parent's *(root's detached owner)* cleanup
        - so that if the root's parent disposes before the root, the root will need to be "reattached" to first found "alive" owner
        - this is rather uncommon

- patching `owner.cleanups` to listen to cleanup of any owner
    - https://github.com/thetarnav/solid-devtools/blob/main/packages/debugger/src/main/utils.ts#L205-L227

- `owner.owned`

## Computations

- `owner.value` + patching the value
- `owner.sources`
- `owner.observers`

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

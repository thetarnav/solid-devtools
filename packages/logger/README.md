<a href="https://github.com/thetarnav/solid-devtools/tree/main/packages/logger#readme" target="_blank">
  <p>
    <img width="100%" src="https://assets.solidjs.com/banner?type=Devtools&background=tiles&project=Logger" alt="Solid Devtools Logger">
  </p>
</a>

# @solid-devtools/logger

For debugging only the pinpoint places parts of the Solid's reactivity graph you are concerned with, right in the console you use all the time.

Provides a variaty of debugging utilities for logging the state and lifecycle of the nodes of reactivity graph to the browser console.

## Installation

The `Logger` package is currently not a part of the main `solid-devtools` library — it has to be installed on it's own.

```bash
npm i @solid-devtools/logger
# or
yarn add @solid-devtools/logger
# or
pnpm add @solid-devtools/logger
```

## Usage guide

This package provides multiple different hooks to be used depending on the situation, and the information that you currently need.

> **Warning**
> The hooks aren't being designed to be placed and forgotten about. They will actively spam your console. But I guess I cannot stop you.

Most of the hooks don't require any arguments to work and are very easy to use.

### `debugComputation`

Debug the current computation owner by logging it's lifecycle state to the browser console.

Accepts following arguments:

- `owner` - The owner to debug. If not provided, the current owner will be used.
- `options` - Options for the debug. _(optional)_

Following information will be tracked and displayed in the console:

- The computation's initial state. (value, name, dependencies, execution time, etc.)
- The computation's state after each rerun. (value, previous value, dependencies, sources that have caused the rerun, execution time, etc.)
- The computation disposal.

```ts
import { debugComputation } from "@solid-devtools/logger"

createEffect(() => {
  debugComputation()
  // ...
})
```

### `debugOwnerComputations`

Debug the computations owned by the provided {@link owner} by logging their lifecycle state to the browser console.

Accepts following arguments:

- `owner` - The owner to debug. If not provided, the current owner will be used.
- `options` - Options for the debug. _(optional)_

Following information will be tracked and displayed in the console:

- The computations initial state. (value, name, dependencies, execution time, etc.)
- The computations state after each rerun. (value, previous value, dependencies, sources that have caused the rerun, execution time, etc.)
- The computations disposal.

```tsx
import { debugOwnerComputations } from "@solid-devtools/logger"

const Button = props => {
	debugOwnerComputations()
	createEffect(() => {...})
	return <button {...props} />
}
```

### `debugSignal`

Debug the provided {@link source} by logging its lifecycle state to the browser console.

Accepts following arguments:

- `source` - The signal to debug. _(a function that will be executed to get the signal node)_
- `options` - Options for the debug. _(optional)_

Following information will be tracked and displayed in the console:

- The signal's initial state. (value, name, observers, etc.)
- The signal's state after each value update. (value, previous value, observers, caused reruns, etc.)

```ts
import { debugSignal } from "@solid-devtools/logger"

const [count, setCount] = createSignal(0)

debugSignal(count)
```

### `debugSignals`

Same as [`debugSignal`](#debugsignal) but for multiple signals.

The `source` argument can be an array of signals or a function that calls multiple signals. _(Similar to Solid's `on` helper)_

```ts
import { debugSignals } from "@solid-devtools/logger"

const [count, setCount] = createSignal(0)
const double = createMemo(() => count * 2)

debugSignals([count, double])
// or
debugSignals(() => {
  count()
  double()
})
```

### `debugOwnerSignals`

Debug the signals created under given reactive owner by logging their lifecycle state to the browser console.

Accepts following arguments:

- `owner` - owner to get the signals from.
- `options` - Options for the debug. _(optional)_

Following information will be tracked and displayed in the console:

- The signals initial state. (value, name, observers, etc.)
- The signals state after each value update. (value, previous value, observers, caused reruns, etc.)

```tsx
import { debugOwnerSignals } from "@solid-devtools/logger"

const Button = props => {
  const [count, setCount] = createSignal(0)
  const double = createMemo(() => count * 2)
  debugOwnerSignals()
  return <button onClick={() => setCount(count + 1)}>{count}</button>
}
```

## Demo video

https://user-images.githubusercontent.com/24491503/176549151-c06a1d14-2d99-4211-9f9e-74392be8890a.mp4

## More hook ideas

There is still a lot of places this package
could be extended or improved.
I'm still planning on doing a hook for debugging
component props for example.

If you have any ideas or needs for features that
might be helpful, let me know! :)

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

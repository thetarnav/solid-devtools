# @solid-devtools/debugger

## 0.15.2

### Patch Changes

- ba185c3: Add top-level "development" export condidtion.

## 0.15.1

### Patch Changes

- a01f839: Name Show component memos

## 0.15.0

### Minor Changes

- bd8f0b4: Handle new `componentLocation` transform by adding a button to the inspector panel for opening component source code.

  Improve inspector panel styles. Improve Splitter component styles and ovarall usability.

### Patch Changes

- a9f8e62: Move transform-related variables to transform package.
- a9f8e62: Improve managing debugger enabled state.
- Updated dependencies [a9f8e62]
- Updated dependencies [a9f8e62]
  - @solid-devtools/shared@0.10.1
  - @solid-devtools/transform@0.9.0

## 0.14.0

### Minor Changes

- a6b55b0: Move value serialization logic to debugger
- 1990be5: Move graph types from `@solid-devtools/shared` to `@solid-devtools/debugger`
- 1990be5: Track and show fine-grain updates to stores in inspected values.

### Patch Changes

- d7e98da: Move some debugger related types from @solid-devtools/shared to @solid-devtools/debugger
- Updated dependencies [a6b55b0]
- Updated dependencies [d7e98da]
- Updated dependencies [1990be5]
  - @solid-devtools/shared@0.10.0

## 0.13.1

### Patch Changes

- a01db71: 1.6 Improvements
- Updated dependencies [a01db71]
  - @solid-devtools/shared@0.9.2

## 0.13.0

### Minor Changes

- 772de45: Simplify debugger plugin-devtools controller usage and communication.

  The locator package gets removed, and the logic moved directly to @solid-devtools/debugger

## 0.12.0

### Minor Changes

- 94178ba: Export a function for automatically attaching new roots, that also prevents from setting it up more times than one.

### Patch Changes

- 94178ba: Rename `setInspectedOwner` to `setInspectedNode`
- Updated dependencies [8eb3fcb]
  - @solid-devtools/shared@0.9.0

## 0.11.1

### Patch Changes

- b0e3453: Omit internal memos of Context node while mapping the structure.

## 0.11.0

### Minor Changes

- 74effef: Display computation values in the side panel just as signals and props.
- fb8b3c4: Improve displaying the context node on the structure graph and it's value on the inspector.

### Patch Changes

- 7419067: Prevent executing non-signal functions during resolving component elements.
- aa7fde4: Identify solid-refresh memos without checking the function string. (#128)
- Updated dependencies [74effef]
- Updated dependencies [fb8b3c4]
  - @solid-devtools/shared@0.8.4

## 0.10.0

### Minor Changes

- d7b35e4: Indicate "frozen" computations — stroke out the computation nodes that do not have any sources.

### Patch Changes

- Updated dependencies [7794a85]
- Updated dependencies [d7b35e4]
- Updated dependencies [a5b60ba]
  - @solid-devtools/shared@0.8.3

## 0.9.2

### Patch Changes

- 0415e39: Rewrite the structure reconciler and virtualizer to reduce complexity.

  Add the ability to collapse structure nodes.

- Updated dependencies [0415e39]
  - @solid-devtools/shared@0.8.2

## 0.9.1

### Patch Changes

- 04fce35: Hide refresh memo nodes (MHR) from the Structure view and combine their details in the inspector panel.
- 92c8fda: Don't include children property in the mapped owner object, if the children are missing.
- Updated dependencies [04fce35]
- Updated dependencies [92c8fda]
  - @solid-devtools/shared@0.8.1

## 0.9.0

### Minor Changes

- 089331d: Changes to the way roots and sub roots are handled.
  Now every sub root will track their own graph independently, instead of being attached to parent tree.

  Additionally the roots() and serializedRoots() signals were replaced with event emitter. (#108)

### Patch Changes

- 5e913ac: Add virtualization of the structure tree.
- Updated dependencies [089331d]
- Updated dependencies [5e913ac]
  - @solid-devtools/shared@0.8.0

## 0.8.1

### Patch Changes

- a78d2e0: Bump solid-js peer dependency to 1.5.5

## 0.8.0

### Minor Changes

- db7edcf: Track component props and display their values in the details of a inspected component.

### Patch Changes

- bf579bb: Restructure debugger plugin api.
- Updated dependencies [db7edcf]
  - @solid-devtools/shared@0.7.4

## 0.7.2

### Patch Changes

- f32598e: Remove rootId from mapped components.
- Updated dependencies [f32598e]
  - @solid-devtools/shared@0.7.2

## 0.7.1

### Patch Changes

- a4d099f: Solid 1.5
- Updated dependencies [a4d099f]
  - @solid-devtools/shared@0.7.1

## 0.7.0

### Minor Changes

- 27ffdb1: Highlight components hovered on the extension.
- fae3ec0: Highlight hovered signal value elements on the page.
- 15c958b: Highlight components hovered with locator on the extension.

### Patch Changes

- 15c958b: Stop reexporting types from the shared library, as the shared lisbrary is published under `@solid-devtools/shared`
- 27b98fa: Select components by clicking on them on the page—with the locator enabled.
- Updated dependencies [27ffdb1]
- Updated dependencies [33e2c17]
- Updated dependencies [27b98fa]
- Updated dependencies [fae3ec0]
- Updated dependencies [15c958b]
  - @solid-devtools/shared@0.7.0

## 0.6.1

### Patch Changes

- 3b5da1b: Refactor types to use namespaces to avoid name conflicts.
- Updated dependencies [3b5da1b]
  - @solid-devtools/shared@0.6.1

## 0.6.0

### Minor Changes

- b5e9776: Select signals and send encoded nested values of objects and arrays.

### Patch Changes

- 78b06a6: Rename types and function for encodung values. Add option to encode nested structures. (Arrays and objects for now).
- Updated dependencies [78b06a6]
- Updated dependencies [b5e9776]
  - @solid-devtools/shared@0.6.0

## 0.5.1

### Patch Changes

- f49854b: Add UI components for displaying signal value previews. Display signalvalue previews in the owener details panel.
- Updated dependencies [f49854b]
- Updated dependencies [bde03b4]
  - @solid-devtools/shared@0.5.1

## 0.5.0

### Minor Changes

- 41b4b7b: This one will be a major rewrite of the debugger, API available in plugins and the reconciliation on the extension.
  Now the walked tree will now include information about computation observers, value, signals, sources. All this will be available only for the "focused" owner—new API for getting details about a specific owner.

### Patch Changes

- Updated dependencies [41b4b7b]
  - @solid-devtools/shared@0.5.0

## 0.4.1

## 0.4.0

### Minor Changes

- 2beeb22: Publish a shared library: @solid-primitives/shared

### Patch Changes

- Updated dependencies [2beeb22]
  - @solid-devtools/shared@0.4.0

## 0.3.0

### Minor Changes

- 3c140cc: Add basic API for observing store updates — `makeStoreObserver`.

## 0.2.3

### Patch Changes

- fdb09bc: Various minor changes.

## 0.2.2

### Patch Changes

- a8d0354: Correct "homepage" filed in package.json, to lead to individual package readme.

## 0.2.1

### Patch Changes

- aa992fd: Fix walker issue, not resolving component elements sometimes

## 0.2.0

### Minor Changes

- 24ccd14: Use Solid's new dev hook (`_$afterCreateRoot`) to automatically attach roots and subroots to the debugger.

### Patch Changes

- 892d87e: Cleanup getName utils

## 0.1.0

### Minor Changes

- 2bb429a: Add the `locator` package.

  Separate `debugger` into `debugger` and `main` packages.

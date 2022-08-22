# @solid-devtools/debugger

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

# solid-devtools-extension

## 0.7.2

### Patch Changes

- 3b5da1b: Refactor types to use namespaces to avoid name conflicts.
- Updated dependencies [3b5da1b]
  - @solid-devtools/shared@0.6.1
  - @solid-devtools/ui@0.9.1

## 0.7.1

### Patch Changes

- 7f69ca4: Add warning about adapter-extension version mismatches.

## 0.7.0

### Minor Changes

- 7b6ac08: Display nested signal values as a collapsable tree.
- b5e9776: Select signals and send encoded nested values of objects and arrays.

### Patch Changes

- 756d0f7: Selecting Signals
- Updated dependencies [756d0f7]
- Updated dependencies [7b6ac08]
- Updated dependencies [78b06a6]
- Updated dependencies [b5e9776]
  - @solid-devtools/ui@0.9.0
  - @solid-devtools/shared@0.6.0

## 0.6.2

### Patch Changes

- c408963: Add memo icon and listing decorations for signals.
- Updated dependencies [c408963]
  - @solid-devtools/ui@0.8.2

## 0.6.1

### Patch Changes

- 9bad4dd: Sort signals (memos last)
- Updated dependencies [9bad4dd]
  - @solid-devtools/ui@0.8.1

## 0.6.0

### Minor Changes

- f49854b: Add UI components for displaying signal value previews. Display signalvalue previews in the owener details panel.

### Patch Changes

- 1503a23: Fix missing graph after reopening devtools.
- Updated dependencies [f49854b]
- Updated dependencies [bde03b4]
  - @solid-devtools/ui@0.8.0
  - @solid-devtools/shared@0.5.1

## 0.5.0

### Minor Changes

- 41b4b7b: This one will be a major rewrite of the debugger, API available in plugins and the reconciliation on the extension.
  Now the walked tree will now include information about computation observers, value, signals, sources. All this will be available only for the "focused" owner—new API for getting details about a specific owner.

### Patch Changes

- Updated dependencies [41b4b7b]
  - @solid-devtools/shared@0.5.0
  - @solid-devtools/ui@0.7.0

## 0.4.0

### Minor Changes

- 2beeb22: Publish a shared library: @solid-primitives/shared

### Patch Changes

- Updated dependencies [2beeb22]
  - @solid-devtools/shared@0.4.0
  - @solid-devtools/ui@0.6.0

## 0.3.1

### Patch Changes

- 443604b: Add Scrollable component to ui library.
- 9e5acf4: Add Splitter component to the UI lib
- Updated dependencies [443604b]
- Updated dependencies [9e5acf4]
- Updated dependencies [6f620e1]
  - @solid-devtools/ui@0.5.0

## 0.3.0

### Minor Changes

- d15e9b0: Refactor styling in packages. Move to vanilla extract for the chrome extension and the ui package. Locator now manages it's styles separately.

### Patch Changes

- Updated dependencies [d15e9b0]
  - @solid-devtools/ui@0.4.0

## 0.2.3

### Patch Changes

- fdb09bc: Various minor changes.
- Updated dependencies [fdb09bc]
  - @solid-devtools/ui@0.3.3

## 0.2.2

### Patch Changes

- Updated dependencies [a8d0354]
  - @solid-devtools/ui@0.3.2

## 0.2.1

### Patch Changes

- 24ccd14: Use Solid's new dev hook (`_$afterCreateRoot`) to automatically attach roots and subroots to the debugger.
- Updated dependencies [24ccd14]
  - @solid-devtools/ui@0.3.1

## 0.2.0

### Minor Changes

- 2bb429a: Add the `locator` package.

  Separate `debugger` into `debugger` and `main` packages.

### Patch Changes

- Updated dependencies [2bb429a]
  - @solid-devtools/ui@0.3.0

## 0.1.1

### Patch Changes

- 5f83694: Improve types and listening to signal/computation updates.

## 0.1.0

### Minor Changes

- e9847ec: Support for reattaching subroots to the tree.
  Support for multiple independent trees.
  Minor API changes.
  Realted issue: [#15](https://github.com/thetarnav/solid-devtools/issues/15)

### Patch Changes

- Updated dependencies [e9847ec]
  - @solid-devtools/ui@0.2.0

## 0.0.5

### Patch Changes

- Updated dependencies
  - @solid-devtools/ui@0.1.2

## 0.0.4

### Patch Changes

- Updated dependencies [ad72903]
  - @solid-devtools/ui@0.1.1

## 0.0.2

### Patch Changes

- Updated dependencies [8e17085]
  - @solid-devtools/ui@0.1.0

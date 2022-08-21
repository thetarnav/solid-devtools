# @solid-devtools/ui

## 0.9.0

### Minor Changes

- 7b6ac08: Display nested signal values as a collapsable tree.
- b5e9776: Select signals and send encoded nested values of objects and arrays.

### Patch Changes

- 756d0f7: Selecting Signals
- 78b06a6: Rename types and function for encodung values. Add option to encode nested structures. (Arrays and objects for now).
- Updated dependencies [78b06a6]
- Updated dependencies [b5e9776]
  - @solid-devtools/shared@0.6.0

## 0.8.2

### Patch Changes

- c408963: Add memo icon and listing decorations for signals.

## 0.8.1

### Patch Changes

- 9bad4dd: Sort signals (memos last)

## 0.8.0

### Minor Changes

- f49854b: Add UI components for displaying signal value previews. Display signalvalue previews in the owener details panel.

### Patch Changes

- Updated dependencies [f49854b]
- Updated dependencies [bde03b4]
  - @solid-devtools/shared@0.5.1

## 0.7.0

### Minor Changes

- 41b4b7b: This one will be a major rewrite of the debugger, API available in plugins and the reconciliation on the extension.
  Now the walked tree will now include information about computation observers, value, signals, sources. All this will be available only for the "focused" owner—new API for getting details about a specific owner.

### Patch Changes

- Updated dependencies [41b4b7b]
  - @solid-devtools/shared@0.5.0

## 0.6.0

### Minor Changes

- 2beeb22: Publish a shared library: @solid-primitives/shared

### Patch Changes

- Updated dependencies [2beeb22]
  - @solid-devtools/shared@0.4.0

## 0.5.0

### Minor Changes

- 443604b: Add Scrollable component to ui library.
- 9e5acf4: Add Splitter component to the UI lib

### Patch Changes

- 6f620e1: Move the cursor utilities to shared lib.

## 0.4.0

### Minor Changes

- d15e9b0: Refactor styling in packages. Move to vanilla extract for the chrome extension and the ui package. Locator now manages it's styles separately.

## 0.3.3

### Patch Changes

- fdb09bc: Various minor changes.

## 0.3.2

### Patch Changes

- a8d0354: Correct "homepage" filed in package.json, to lead to individual package readme.

## 0.3.1

### Patch Changes

- 24ccd14: Use Solid's new dev hook (`_$afterCreateRoot`) to automatically attach roots and subroots to the debugger.

## 0.3.0

### Minor Changes

- 2bb429a: Add the `locator` package.

  Separate `debugger` into `debugger` and `main` packages.

## 0.2.0

### Minor Changes

- e9847ec: Support for reattaching subroots to the tree.
  Support for multiple independent trees.
  Minor API changes.
  Realted issue: [#15](https://github.com/thetarnav/solid-devtools/issues/15)

## 0.1.2

### Patch Changes

- clear dependencies

## 0.1.1

### Patch Changes

- ad72903: Improve element-overlay styles

## 0.1.0

### Minor Changes

- 8e17085: Add locator package. Initial pre-release.

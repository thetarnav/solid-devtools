# solid-devtools-shared

## 0.7.3

### Patch Changes

- 623aca6: Add toggle button to the extension that will allow for additional way of toggling the "locator mode". Besides holding "Alt".

## 0.7.2

### Patch Changes

- f32598e: Remove rootId from mapped components.

## 0.7.1

### Patch Changes

- a4d099f: Solid 1.5

## 0.7.0

### Minor Changes

- 27ffdb1: Highlight components hovered on the extension.
- fae3ec0: Highlight hovered signal value elements on the page.
- 15c958b: Highlight components hovered with locator on the extension.

### Patch Changes

- 33e2c17: Disable the extension adapter when the devtools are closed. (#92)
- 27b98fa: Select components by clicking on them on the page—with the locator enabled.

## 0.6.2

### Patch Changes

- 787f505: Move signal "selected" state to the signal object. Fixes a bug with signals staying selected after reopening the same owner details.

## 0.6.1

### Patch Changes

- 3b5da1b: Refactor types to use namespaces to avoid name conflicts.

## 0.6.0

### Minor Changes

- b5e9776: Select signals and send encoded nested values of objects and arrays.

### Patch Changes

- 78b06a6: Rename types and function for encodung values. Add option to encode nested structures. (Arrays and objects for now).

## 0.5.1

### Patch Changes

- f49854b: Add UI components for displaying signal value previews. Display signalvalue previews in the owener details panel.
- bde03b4: Add encodePreview for encoding preview values of signals.

## 0.5.0

### Minor Changes

- 41b4b7b: This one will be a major rewrite of the debugger, API available in plugins and the reconciliation on the extension.
  Now the walked tree will now include information about computation observers, value, signals, sources. All this will be available only for the "focused" owner—new API for getting details about a specific owner.

## 0.4.0

### Minor Changes

- 2beeb22: Publish a shared library: @solid-primitives/shared

## 0.3.3

### Patch Changes

- 6f620e1: Move the cursor utilities to shared lib.

## 0.3.2

### Patch Changes

- fdb09bc: Various minor changes.

## 0.3.1

### Patch Changes

- 24ccd14: Use Solid's new dev hook (`_$afterCreateRoot`) to automatically attach roots and subroots to the debugger.

## 0.3.0

### Minor Changes

- 2bb429a: Add the `locator` package.

  Separate `debugger` into `debugger` and `main` packages.

## 0.2.1

### Patch Changes

- 5f83694: Improve types and listening to signal/computation updates.

## 0.2.0

### Minor Changes

- e9847ec: Support for reattaching subroots to the tree.
  Support for multiple independent trees.
  Minor API changes.
  Realted issue: [#15](https://github.com/thetarnav/solid-devtools/issues/15)

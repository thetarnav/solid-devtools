# solid-devtools-extension

## 0.15.2

### Patch Changes

- Updated dependencies [95aaad9]
  - @solid-devtools/frontend@0.0.4

## 0.15.1

### Patch Changes

- Updated dependencies [f3f2ca1]
  - @solid-devtools/frontend@0.0.3

## 0.15.0

### Minor Changes

- 8eb3fcb: Improve message names.

### Patch Changes

- 94178ba: Move CSS reset to frontend package. Fix controller not sending devtools locator state
- Updated dependencies [8eb3fcb]
- Updated dependencies [94178ba]
  - @solid-devtools/shared@0.9.0
  - @solid-devtools/frontend@0.0.2

## 0.14.1

### Patch Changes

- d3122f3: Improve the ErrorOverlay by displaying client/extension versions.
- 0f850f6: Improve version mismatch message.
- 9e7ab6c: Add ErrorBoundary to display cought errors to the users. (#121)
- Updated dependencies [d3122f3]
  - @solid-devtools/shared@0.8.5

## 0.14.0

### Minor Changes

- 74effef: Display computation values in the side panel just as signals and props.

### Patch Changes

- fb8b3c4: Improve displaying the context node on the structure graph and it's value on the inspector.
- e11e3ad: Improve triggering highlights of updated computation nodes — now the highlight will alvays last 400ms.
- Updated dependencies [74effef]
- Updated dependencies [fb8b3c4]
  - @solid-devtools/shared@0.8.4

## 0.13.0

### Minor Changes

- d7b35e4: Indicate "frozen" computations — stroke out the computation nodes that do not have any sources.

### Patch Changes

- 7794a85: Selecting nodes with the structure path.
- 0e06d89: Improve structure path styles. (fixes #126)
- 3272462: Fix locator not exiting the highlighting if the extension was open. (fixes #127)
- a5b60ba: Scrolls the structure view to the selected node if it's outside of the view. (#117)
- Updated dependencies [7794a85]
- Updated dependencies [d7b35e4]
- Updated dependencies [a5b60ba]
  - @solid-devtools/shared@0.8.3

## 0.12.1

### Patch Changes

- 4ef8606: Add one row margin to virtual list. (fixes it being clipped at hte bottom)
- cd36816: Improve Splitter styles
- bf9d78b: Improve display styles of tree nodes. Adds icons for different types of nodes.

## 0.12.0

### Minor Changes

- 0415e39: Rewrite the structure reconciler and virtualizer to reduce complexity.

  Add the ability to collapse structure nodes.

### Patch Changes

- Updated dependencies [0415e39]
  - @solid-devtools/shared@0.8.2

## 0.11.0

### Minor Changes

- 04fce35: Hide refresh memo nodes (MHR) from the Structure view and combine their details in the inspector panel.

### Patch Changes

- 92c8fda: Don't include children property in the mapped owner object, if the children are missing.
- Updated dependencies [04fce35]
- Updated dependencies [92c8fda]
  - @solid-devtools/shared@0.8.1

## 0.10.0

### Minor Changes

- 5e913ac: Add virtualization of the structure tree.

### Patch Changes

- Updated dependencies [089331d]
- Updated dependencies [5e913ac]
  - @solid-devtools/shared@0.8.0

## 0.9.0

### Minor Changes

- db7edcf: Track component props and display their values in the details of a inspected component.

### Patch Changes

- Updated dependencies [db7edcf]
  - @solid-devtools/shared@0.7.4
  - @solid-devtools/ui@0.10.3

## 0.8.3

### Patch Changes

- dca9f9d: Fix some locator realted bugs.

## 0.8.2

### Patch Changes

- 623aca6: Add toggle button to the extension that will allow for additional way of toggling the "locator mode". Besides holding "Alt".
- Updated dependencies [623aca6]
  - @solid-devtools/shared@0.7.3
  - @solid-devtools/ui@0.10.2

## 0.8.1

### Patch Changes

- a4d099f: Solid 1.5
- Updated dependencies [a4d099f]
  - @solid-devtools/shared@0.7.1
  - @solid-devtools/ui@0.10.1

## 0.8.0

### Minor Changes

- 27ffdb1: Highlight components hovered on the extension.
- fae3ec0: Highlight hovered signal value elements on the page.
- 15c958b: Highlight components hovered with locator on the extension.

### Patch Changes

- 33e2c17: Disable the extension adapter when the devtools are closed. (#92)
- 27b98fa: Select components by clicking on them on the page—with the locator enabled.
- c5cd272: Add support for highlighting Fragments by the Locator package. (#89)
- Updated dependencies [27ffdb1]
- Updated dependencies [33e2c17]
- Updated dependencies [27b98fa]
- Updated dependencies [fae3ec0]
- Updated dependencies [15c958b]
  - @solid-devtools/shared@0.7.0
  - @solid-devtools/ui@0.10.0

## 0.7.3

### Patch Changes

- 1d1729a: Move the path component under the structure graph. Improve the path component styles.
- 787f505: Move signal "selected" state to the signal object. Fixes a bug with signals staying selected after reopening the same owner details.
- b5f2e4a: Include selected owner in the displayed path.
- Updated dependencies [1d1729a]
- Updated dependencies [787f505]
  - @solid-devtools/ui@0.9.2
  - @solid-devtools/shared@0.6.2

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

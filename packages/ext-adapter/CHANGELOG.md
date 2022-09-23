# @solid-devtools/ext-adapter

## 0.16.3

### Patch Changes

- 04fce35: Hide refresh memo nodes (MHR) from the Structure view and combine their details in the inspector panel.
- Updated dependencies [04fce35]
- Updated dependencies [92c8fda]
  - @solid-devtools/debugger@0.9.1
  - @solid-devtools/locator@0.16.3
  - @solid-devtools/shared@0.8.1

## 0.16.2

### Patch Changes

- 089331d: Changes to the way roots and sub roots are handled.
  Now every sub root will track their own graph independently, instead of being attached to parent tree.

  Additionally the roots() and serializedRoots() signals were replaced with event emitter. (#108)

- 5e913ac: Add virtualization of the structure tree.
- Updated dependencies [089331d]
- Updated dependencies [5e913ac]
  - @solid-devtools/debugger@0.9.0
  - @solid-devtools/shared@0.8.0
  - @solid-devtools/locator@0.16.2

## 0.16.1

### Patch Changes

- a78d2e0: Bump solid-js peer dependency to 1.5.5
- Updated dependencies [a78d2e0]
  - @solid-devtools/debugger@0.8.1

## 0.16.0

### Minor Changes

- db7edcf: Track component props and display their values in the details of a inspected component.

### Patch Changes

- bf579bb: Restructure debugger plugin api.
- Updated dependencies [db7edcf]
- Updated dependencies [bf579bb]
  - @solid-devtools/debugger@0.8.0
  - @solid-devtools/shared@0.7.4
  - @solid-devtools/locator@0.16.0

## 0.15.1

### Patch Changes

- dca9f9d: Fix some locator realted bugs.
- Updated dependencies [dca9f9d]
  - @solid-devtools/locator@0.15.1

## 0.15.0

### Minor Changes

- 623aca6: Add toggle button to the extension that will allow for additional way of toggling the "locator mode". Besides holding "Alt".

### Patch Changes

- Updated dependencies [623aca6]
  - @solid-devtools/locator@0.15.0
  - @solid-devtools/shared@0.7.3

## 0.14.2

### Patch Changes

- f32598e: Remove rootId from mapped components.
- Updated dependencies [f32598e]
  - @solid-devtools/debugger@0.7.2
  - @solid-devtools/locator@0.14.2
  - @solid-devtools/shared@0.7.2

## 0.14.1

### Patch Changes

- a4d099f: Solid 1.5
- Updated dependencies [a4d099f]
  - @solid-devtools/debugger@0.7.1
  - @solid-devtools/locator@0.14.1
  - @solid-devtools/shared@0.7.1

## 0.14.0

### Minor Changes

- 27ffdb1: Highlight components hovered on the extension.
- fae3ec0: Highlight hovered signal value elements on the page.
- 15c958b: Highlight components hovered with locator on the extension.

### Patch Changes

- 27b98fa: Select components by clicking on them on the page—with the locator enabled.
- c5cd272: Add support for highlighting Fragments by the Locator package. (#89)
- Updated dependencies [15c958b]
- Updated dependencies [27ffdb1]
- Updated dependencies [33e2c17]
- Updated dependencies [27b98fa]
- Updated dependencies [fae3ec0]
- Updated dependencies [c5cd272]
- Updated dependencies [d38a555]
- Updated dependencies [15c958b]
  - @solid-devtools/debugger@0.7.0
  - @solid-devtools/locator@0.14.0
  - @solid-devtools/shared@0.7.0

## 0.12.1

### Patch Changes

- 7f69ca4: Add warning about adapter-extension version mismatches.

## 0.12.0

### Minor Changes

- b5e9776: Select signals and send encoded nested values of objects and arrays.

### Patch Changes

- Updated dependencies [78b06a6]
- Updated dependencies [b5e9776]
  - @solid-devtools/debugger@0.6.0
  - @solid-devtools/shared@0.6.0

## 0.11.1

### Patch Changes

- 1503a23: Fix missing graph after reopening devtools.
- Updated dependencies [f49854b]
- Updated dependencies [bde03b4]
  - @solid-devtools/debugger@0.5.1
  - @solid-devtools/shared@0.5.1

## 0.11.0

### Minor Changes

- 41b4b7b: This one will be a major rewrite of the debugger, API available in plugins and the reconciliation on the extension.
  Now the walked tree will now include information about computation observers, value, signals, sources. All this will be available only for the "focused" owner—new API for getting details about a specific owner.

### Patch Changes

- Updated dependencies [41b4b7b]
  - @solid-devtools/debugger@0.5.0
  - @solid-devtools/shared@0.5.0

## 0.10.0

### Minor Changes

- 2beeb22: Publish a shared library: @solid-primitives/shared

### Patch Changes

- Updated dependencies [2beeb22]
  - @solid-devtools/debugger@0.4.0
  - @solid-devtools/shared@0.4.0

## 0.8.2

### Patch Changes

- Updated dependencies [3c140cc]
  - @solid-devtools/debugger@0.3.0

## 0.8.1

### Patch Changes

- fdb09bc: Various minor changes.
- Updated dependencies [fdb09bc]
  - @solid-devtools/debugger@0.2.3

## 0.7.2

### Patch Changes

- a8d0354: Correct "homepage" filed in package.json, to lead to individual package readme.
- Updated dependencies [a8d0354]
  - @solid-devtools/debugger@0.2.2

## 0.6.0

### Patch Changes

- 24ccd14: Use Solid's new dev hook (`_$afterCreateRoot`) to automatically attach roots and subroots to the debugger.
- Updated dependencies [24ccd14]
- Updated dependencies [892d87e]
  - @solid-devtools/debugger@0.2.0

## 0.5.0

### Minor Changes

- 2bb429a: Add the `locator` package.

  Separate `debugger` into `debugger` and `main` packages.

### Patch Changes

- Updated dependencies [2bb429a]
  - @solid-devtools/debugger@0.1.0

## 0.4.0

### Minor Changes

- e9847ec: Support for reattaching subroots to the tree.
  Support for multiple independent trees.
  Minor API changes.
  Realted issue: [#15](https://github.com/thetarnav/solid-devtools/issues/15)

## 0.2.9

### Patch Changes

- 7f0a2ca: Remove dev console log

## 0.1.0

### Minor Changes

- 8e17085: Add locator package. Initial pre-release.

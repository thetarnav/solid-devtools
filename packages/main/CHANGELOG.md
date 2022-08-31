# solid-devtools

## 0.15.0

### Patch Changes

- Updated dependencies [623aca6]
  - @solid-devtools/ext-adapter@0.15.0
  - @solid-devtools/locator@0.15.0

## 0.14.1

### Patch Changes

- a4d099f: Solid 1.5
- Updated dependencies [a4d099f]
  - @solid-devtools/debugger@0.7.1
  - @solid-devtools/ext-adapter@0.14.1
  - @solid-devtools/locator@0.14.1
  - @solid-devtools/transform@0.7.1

## 0.14.0

### Minor Changes

- 27ffdb1: Highlight components hovered on the extension.

### Patch Changes

- Updated dependencies [15c958b]
- Updated dependencies [27ffdb1]
- Updated dependencies [27b98fa]
- Updated dependencies [fae3ec0]
- Updated dependencies [c5cd272]
- Updated dependencies [d38a555]
- Updated dependencies [15c958b]
  - @solid-devtools/debugger@0.7.0
  - @solid-devtools/ext-adapter@0.14.0
  - @solid-devtools/locator@0.14.0
  - @solid-devtools/transform@0.7.0

## 0.13.0

### Patch Changes

- Updated dependencies [ff85d4c]
  - @solid-devtools/locator@0.13.0

## 0.12.0

### Patch Changes

- Updated dependencies [78b06a6]
- Updated dependencies [b5e9776]
  - @solid-devtools/debugger@0.6.0
  - @solid-devtools/ext-adapter@0.12.0
  - @solid-devtools/locator@0.12.0
  - @solid-devtools/transform@0.6.2

## 0.11.0

### Minor Changes

- 41b4b7b: This one will be a major rewrite of the debugger, API available in plugins and the reconciliation on the extension.
  Now the walked tree will now include information about computation observers, value, signals, sources. All this will be available only for the "focused" owner—new API for getting details about a specific owner.

### Patch Changes

- Updated dependencies [41b4b7b]
  - @solid-devtools/debugger@0.5.0
  - @solid-devtools/ext-adapter@0.11.0
  - @solid-devtools/locator@0.11.0
  - @solid-devtools/transform@0.6.1

## 0.10.1

### Patch Changes

- Updated dependencies [4258a33]
  - @solid-devtools/transform@0.6.0
  - @solid-devtools/debugger@0.4.1
  - @solid-devtools/locator@0.10.1

## 0.10.0

### Patch Changes

- Updated dependencies [2beeb22]
  - @solid-devtools/debugger@0.4.0
  - @solid-devtools/ext-adapter@0.10.0
  - @solid-devtools/locator@0.10.0
  - @solid-devtools/transform@0.5.0

## 0.9.0

### Patch Changes

- Updated dependencies [d15e9b0]
  - @solid-devtools/locator@0.9.0

## 0.8.2

### Patch Changes

- Updated dependencies [7721110]
- Updated dependencies [3c140cc]
  - @solid-devtools/transform@0.4.0
  - @solid-devtools/debugger@0.3.0
  - @solid-devtools/locator@0.8.2
  - @solid-devtools/ext-adapter@0.8.2

## 0.8.1

### Patch Changes

- fdb09bc: Various minor changes.
- Updated dependencies [fdb09bc]
  - @solid-devtools/transform@0.3.1
  - @solid-devtools/debugger@0.2.3
  - @solid-devtools/ext-adapter@0.8.1
  - @solid-devtools/locator@0.8.1

## 0.8.0

### Minor Changes

- 4c79a90: Bump vite peerDepenedency to version 3.0.0 (#34)

### Patch Changes

- Updated dependencies [4c79a90]
  - @solid-devtools/transform@0.3.0
  - @solid-devtools/locator@0.8.0

## 0.7.2

### Patch Changes

- a8d0354: Correct "homepage" filed in package.json, to lead to individual package readme.
- Updated dependencies [a8d0354]
  - @solid-devtools/transform@0.2.1
  - @solid-devtools/debugger@0.2.2
  - @solid-devtools/ext-adapter@0.7.2
  - @solid-devtools/locator@0.7.2

## 0.7.1

### Patch Changes

- aa992fd: Fix walker issue, not resolving component elements sometimes
- Updated dependencies [aa992fd]
  - @solid-devtools/debugger@0.2.1
  - @solid-devtools/locator@0.7.1

## 0.7.0

### Minor Changes

- 092b850: Export vite plugin from the main package.

### Patch Changes

- Updated dependencies [092b850]
  - @solid-devtools/locator@0.7.0

## 0.6.0

### Minor Changes

- 24ccd14: Use Solid's new dev hook (`_$afterCreateRoot`) to automatically attach roots and subroots to the debugger.

### Patch Changes

- Updated dependencies [24ccd14]
- Updated dependencies [892d87e]
  - @solid-devtools/debugger@0.2.0
  - @solid-devtools/ext-adapter@0.6.0
  - @solid-devtools/locator@0.6.0

## 0.5.0

### Minor Changes

- 2bb429a: Add the `locator` package.

  Separate `debugger` into `debugger` and `main` packages.

### Patch Changes

- Updated dependencies [2bb429a]
  - @solid-devtools/debugger@0.1.0
  - @solid-devtools/ext-adapter@0.5.0
  - @solid-devtools/locator@0.5.0

## 0.4.3

### Patch Changes

- fd5f408: Improve isComputation check
- 7611271: Move resolveElements to solid-primitives/refs

## 0.4.2

### Patch Changes

- 5f83694: Improve types and listening to signal/computation updates.
- Updated dependencies [5f83694]
  - @solid-devtools/locator@0.4.2

## 0.4.0

### Minor Changes

- e9847ec: Support for reattaching subroots to the tree.
  Support for multiple independent trees.
  Minor API changes.
  Realted issue: [#15](https://github.com/thetarnav/solid-devtools/issues/15)

### Patch Changes

- Updated dependencies [e9847ec]
  - @solid-devtools/ext-adapter@0.4.0
  - @solid-devtools/locator@0.4.0

## 0.3.0

### Patch Changes

- 1f14b6d: Locator & BabelPlugin:
  Split absolute filepath into projectPath and relative filePath.
  Returning `false` from the URL builder function won't execute `window.open`
- Updated dependencies [1f14b6d]
  - @solid-devtools/locator@0.3.0

## 0.2.9

### Patch Changes

- 7f0a2ca: Remove dev console log
- 8f5f6e5: Change package export map to avoid shipping code to production
- Updated dependencies [7f0a2ca]
- Updated dependencies [8f5f6e5]
  - @solid-devtools/ext-adapter@0.2.9
  - solid-devtools@0.2.9

## 0.2.8

### Patch Changes

- update locator version

## 0.2.7

### Patch Changes

- update locator version

## 0.2.4

### Patch Changes

- Prevent motionone componentName error

## 0.2.1

### Patch Changes

- Locator module now has to be explicitely enabled with Debugger props
  Support for different source code targets (vscode, atom, webstorm and a custom function)
- Updated dependencies
  - @solid-devtools/locator@0.2.1

## 0.2.0

### Minor Changes

- Support for Components returning JSX Fragments for Locator package. (issue #16)

### Patch Changes

- Updated dependencies
  - @solid-devtools/locator@0.2.0

## 0.1.0

### Minor Changes

- 8e17085: Add locator package. Initial pre-release.

### Patch Changes

- Updated dependencies [8e17085]
  - @solid-devtools/ext-adapter@0.1.0
  - @solid-devtools/locator@0.1.0

# solid-devtools

## 0.7.2

### Patch Changes

- a8d0354: Correct "homepage" filed in package.json, to lead to individual package readme.
- Updated dependencies [a8d0354]
  - @solid-devtools/babel-plugin@0.2.1
  - @solid-devtools/debugger@0.2.2
  - @solid-devtools/extension-adapter@0.7.2
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
  - @solid-devtools/extension-adapter@0.6.0
  - @solid-devtools/locator@0.6.0

## 0.5.0

### Minor Changes

- 2bb429a: Add the `locator` package.

  Separate `debugger` into `debugger` and `main` packages.

### Patch Changes

- Updated dependencies [2bb429a]
  - @solid-devtools/debugger@0.1.0
  - @solid-devtools/extension-adapter@0.5.0
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
  - @solid-devtools/extension-adapter@0.4.0
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
  - @solid-devtools/extension-adapter@0.2.9
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
  - @solid-devtools/extension-adapter@0.1.0
  - @solid-devtools/locator@0.1.0

# @solid-devtools/locator

## 0.14.2

### Patch Changes

- f32598e: Remove rootId from mapped components.
- Updated dependencies [f32598e]
  - @solid-devtools/debugger@0.7.2
  - @solid-devtools/shared@0.7.2

## 0.14.1

### Patch Changes

- a4d099f: Solid 1.5
- Updated dependencies [a4d099f]
  - @solid-devtools/debugger@0.7.1
  - @solid-devtools/shared@0.7.1

## 0.14.0

### Minor Changes

- 27ffdb1: Highlight components hovered on the extension.
- c5cd272: Add support for highlighting Fragments by the Locator package. (#89)
- 15c958b: Highlight components hovered with locator on the extension.

### Patch Changes

- 27b98fa: Select components by clicking on them on the page—with the locator enabled.
- d38a555: Improve code structure for derivating selected components.
- Updated dependencies [15c958b]
- Updated dependencies [27ffdb1]
- Updated dependencies [33e2c17]
- Updated dependencies [27b98fa]
- Updated dependencies [fae3ec0]
- Updated dependencies [15c958b]
  - @solid-devtools/debugger@0.7.0
  - @solid-devtools/shared@0.7.0

## 0.13.0

### Minor Changes

- ff85d4c: Remove twind in favour of raw <style> tag. Fixes #33 and #51

## 0.12.2

### Patch Changes

- 3b5da1b: Refactor types to use namespaces to avoid name conflicts.
- Updated dependencies [3b5da1b]
  - @solid-devtools/debugger@0.6.1
  - @solid-devtools/shared@0.6.1

## 0.12.0

### Patch Changes

- Updated dependencies [78b06a6]
- Updated dependencies [b5e9776]
  - @solid-devtools/debugger@0.6.0
  - @solid-devtools/shared@0.6.0

## 0.11.2

### Patch Changes

- 0c1892f: Use windows path regex only for windows. (Related #66)

## 0.11.0

### Minor Changes

- 41b4b7b: This one will be a major rewrite of the debugger, API available in plugins and the reconciliation on the extension.
  Now the walked tree will now include information about computation observers, value, signals, sources. All this will be available only for the "focused" owner—new API for getting details about a specific owner.

### Patch Changes

- Updated dependencies [41b4b7b]
  - @solid-devtools/debugger@0.5.0
  - @solid-devtools/shared@0.5.0

## 0.10.1

### Patch Changes

- @solid-devtools/debugger@0.4.1

## 0.10.0

### Minor Changes

- 2beeb22: Publish a shared library: @solid-primitives/shared

### Patch Changes

- Updated dependencies [2beeb22]
  - @solid-devtools/debugger@0.4.0
  - @solid-devtools/shared@0.4.0

## 0.9.1

### Patch Changes

- 6f620e1: Move the cursor utilities to shared lib.

## 0.9.0

### Minor Changes

- d15e9b0: Refactor styling in packages. Move to vanilla extract for the chrome extension and the ui package. Locator now manages it's styles separately.

## 0.8.2

### Patch Changes

- Updated dependencies [3c140cc]
  - @solid-devtools/debugger@0.3.0

## 0.8.1

### Patch Changes

- fdb09bc: Various minor changes.
- Updated dependencies [fdb09bc]
  - @solid-devtools/debugger@0.2.3
  - @solid-devtools/ui@0.3.3

## 0.8.0

## 0.7.2

### Patch Changes

- a8d0354: Correct "homepage" filed in package.json, to lead to individual package readme.
- Updated dependencies [a8d0354]
  - @solid-devtools/debugger@0.2.2
  - @solid-devtools/ui@0.3.2

## 0.7.1

### Patch Changes

- aa992fd: Fix walker issue, not resolving component elements sometimes
- Updated dependencies [aa992fd]
  - @solid-devtools/debugger@0.2.1

## 0.7.0

### Patch Changes

- 092b850: Export vite plugin from the main package.

## 0.6.0

### Patch Changes

- 24ccd14: Use Solid's new dev hook (`_$afterCreateRoot`) to automatically attach roots and subroots to the debugger.
- Updated dependencies [24ccd14]
- Updated dependencies [892d87e]
  - @solid-devtools/debugger@0.2.0
  - @solid-devtools/ui@0.3.1

## 0.5.0

### Minor Changes

- 2bb429a: Add the `locator` package.

  Separate `debugger` into `debugger` and `main` packages.

### Patch Changes

- Updated dependencies [2bb429a]
  - @solid-devtools/debugger@0.1.0
  - @solid-devtools/ui@0.3.0

## 0.4.2

### Patch Changes

- 5f83694: Improve types and listening to signal/computation updates.

## 0.4.1

### Patch Changes

- Use makeKeyHoldListener from solid-primitives. Add separate server/prod noop entry.

## 0.4.0

### Minor Changes

- e9847ec: Support for reattaching subroots to the tree.
  Support for multiple independent trees.
  Minor API changes.
  Realted issue: [#15](https://github.com/thetarnav/solid-devtools/issues/15)

### Patch Changes

- Updated dependencies [e9847ec]
  - @solid-devtools/ui@0.2.0

## 0.3.0

### Minor Changes

- 1f14b6d: Locator & BabelPlugin:
  Split absolute filepath into projectPath and relative filePath.
  Returning `false` from the URL builder function won't execute `window.open`

## 0.2.6

### Patch Changes

- Add "vscode-insiders" target and fix loc pattern matching for Mac
- ac1e6a5: Use event handler wrappers from event-listener package

## 0.2.5

### Patch Changes

- Remove Motionone/solid dependency to just using just motion animations.
  Display component name on top of the element overlay if the highlighted element is at the bottom oh the screen.
- Updated dependencies
  - @solid-devtools/ui@0.1.2

## 0.2.3

### Patch Changes

- ad72903: Improve element-overlay styles
- Updated dependencies [ad72903]
  - @solid-devtools/ui@0.1.1

## 0.2.2

### Patch Changes

- ae43b00: Add option to change locator mode key.

## 0.2.1

### Patch Changes

- Locator module now has to be explicitely enabled with Debugger props
  Support for different source code targets (vscode, atom, webstorm and a custom function)

## 0.2.0

### Minor Changes

- Support for Components returning JSX Fragments for Locator package. (issue #16)

## 0.1.0

### Minor Changes

- 8e17085: Add locator package. Initial pre-release.

### Patch Changes

- Updated dependencies [8e17085]
  - @solid-devtools/ui@0.1.0

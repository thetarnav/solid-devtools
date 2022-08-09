# @solid-devtools/locator

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

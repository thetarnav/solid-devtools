# @solid-devtools/logger

## 0.4.3

### Patch Changes

- 3b5da1b: Refactor types to use namespaces to avoid name conflicts.
- Updated dependencies [3b5da1b]
  - @solid-devtools/debugger@0.6.1
  - @solid-devtools/shared@0.6.1

## 0.4.2

### Patch Changes

- Updated dependencies [78b06a6]
- Updated dependencies [b5e9776]
  - @solid-devtools/debugger@0.6.0
  - @solid-devtools/shared@0.6.0

## 0.4.1

### Patch Changes

- e904193: Test patch.

## 0.4.0

### Minor Changes

- 41b4b7b: This one will be a major rewrite of the debugger, API available in plugins and the reconciliation on the extension.
  Now the walked tree will now include information about computation observers, value, signals, sources. All this will be available only for the "focused" owner—new API for getting details about a specific owner.

### Patch Changes

- Updated dependencies [41b4b7b]
  - @solid-devtools/debugger@0.5.0
  - @solid-devtools/shared@0.5.0

## 0.3.0

### Minor Changes

- 2beeb22: Publish a shared library: @solid-primitives/shared

### Patch Changes

- Updated dependencies [2beeb22]
  - @solid-devtools/debugger@0.4.0
  - @solid-devtools/shared@0.4.0

## 0.2.2

### Patch Changes

- Updated dependencies [3c140cc]
  - @solid-devtools/debugger@0.3.0

## 0.2.1

### Patch Changes

- 5e793bd: debugProps group collapsed (fixes #40)

## 0.2.0

### Minor Changes

- fdb09bc: Add `debugProps` hook

### Patch Changes

- fdb09bc: Various minor changes.
- Updated dependencies [fdb09bc]
  - @solid-devtools/debugger@0.2.3

## 0.1.4

### Patch Changes

- a8d0354: Correct "homepage" filed in package.json, to lead to individual package readme.
- Updated dependencies [a8d0354]
  - @solid-devtools/debugger@0.2.2

## 0.1.3

### Patch Changes

- 24ccd14: Use Solid's new dev hook (`_$afterCreateRoot`) to automatically attach roots and subroots to the debugger.
- 892d87e: Cleanup getName utils
- Updated dependencies [24ccd14]
- Updated dependencies [892d87e]
  - @solid-devtools/debugger@0.2.0

## 0.1.2

### Patch Changes

- c1e512e: Trim long owner names. Fixes #23

## 0.1.1

### Patch Changes

- 9b8e9bf: Fix showing `Caused by` field when using debugOwnerComputations.

## 0.1.0

### Minor Changes

- 2bb429a: Add the `locator` package.

  Separate `debugger` into `debugger` and `main` packages.

### Patch Changes

- Updated dependencies [2bb429a]
  - @solid-devtools/debugger@0.1.0

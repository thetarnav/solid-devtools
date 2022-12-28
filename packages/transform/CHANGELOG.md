# @solid-devtools/transform

## 0.10.4

### Patch Changes

- Updated dependencies [84435c1]
- Updated dependencies [84435c1]
  - @solid-devtools/debugger@0.18.0
  - @solid-devtools/shared@0.10.5

## 0.10.3

### Patch Changes

- 1005f66: Add missing export to client package. Fix vite transform.

## 0.10.2

### Patch Changes

- 5306ffa: Fix used runtime package

## 0.10.1

### Patch Changes

- 42df66b: Minor improvements.
- Updated dependencies [42df66b]
  - @solid-devtools/debugger@0.17.2
  - @solid-devtools/shared@0.10.4

## 0.10.0

### Minor Changes

- ba8bd72: Add ability to inject and configure debugger with vite plugin. (now the default way to setup devtools)

### Patch Changes

- Updated dependencies [ba8bd72]
  - @solid-devtools/debugger@0.17.1

## 0.9.0

### Minor Changes

- a9f8e62: Add additional transform option: `componentLocation` for injecting code location information to component's code.

### Patch Changes

- a9f8e62: Move transform-related variables to transform package.
- Updated dependencies [a9f8e62]
  - @solid-devtools/shared@0.10.1

## 0.8.0

### Minor Changes

- 1990be5: Remove `wrapStores` transform — tracking stores is handled by the debugger.

### Patch Changes

- Updated dependencies [a6b55b0]
- Updated dependencies [d7e98da]
- Updated dependencies [1990be5]
  - @solid-devtools/shared@0.10.0

## 0.7.5

### Patch Changes

- Updated dependencies [8eb3fcb]
  - @solid-devtools/shared@0.9.0

## 0.7.4

### Patch Changes

- 71fec9a: Correct reexporting vite plugin for cjs resolvers.
- Updated dependencies [d3122f3]
  - @solid-devtools/shared@0.8.5

## 0.7.3

### Patch Changes

- Updated dependencies [089331d]
- Updated dependencies [5e913ac]
  - @solid-devtools/shared@0.8.0

## 0.7.2

### Patch Changes

- bb08df4: Fix export resolution

## 0.7.1

### Patch Changes

- a4d099f: Solid 1.5
- Updated dependencies [a4d099f]
  - @solid-devtools/shared@0.7.1

## 0.7.0

### Minor Changes

- 27ffdb1: Highlight components hovered on the extension.

### Patch Changes

- Updated dependencies [27ffdb1]
- Updated dependencies [33e2c17]
- Updated dependencies [27b98fa]
- Updated dependencies [fae3ec0]
- Updated dependencies [15c958b]
  - @solid-devtools/shared@0.7.0

## 0.6.2

### Patch Changes

- Updated dependencies [78b06a6]
- Updated dependencies [b5e9776]
  - @solid-devtools/shared@0.6.0

## 0.6.1

### Patch Changes

- Updated dependencies [41b4b7b]
  - @solid-devtools/shared@0.5.0

## 0.6.0

### Minor Changes

- 4258a33: Add `name` transform to automatically name signals, memos and stores based on the variable name. (#63 Thanks to [@edemaine](https://github.com/edemaine) ❤️)

## 0.5.0

### Minor Changes

- 2beeb22: Publish a shared library: @solid-primitives/shared

### Patch Changes

- Updated dependencies [2beeb22]
  - @solid-devtools/shared@0.4.0

## 0.4.0

### Minor Changes

- 7721110: Add wrapStores transform.

## 0.3.1

### Patch Changes

- fdb09bc: Various minor changes.

## 0.3.0

### Minor Changes

- 4c79a90: Bump vite peerDependency to version 3.0.0 (#34)

## 0.2.1

### Patch Changes

- a8d0354: Correct "homepage" filed in package.json, to lead to individual package readme.

## 0.2.0

### Minor Changes

- 1f14b6d: Locator & BabelPlugin:
  Split absolute filepath into projectPath and relative filePath.
  Returning `false` from the URL builder function won't execute `window.open`

## 0.1.0

### Minor Changes

- 8e17085: Add locator package. Initial pre-release.

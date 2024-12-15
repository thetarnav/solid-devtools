# @solid-devtools/logger

## 0.9.2

### Patch Changes

- Updated dependencies [d41c4a7]
  - @solid-devtools/shared@0.16.0
  - @solid-devtools/debugger@0.24.2

## 0.9.1

### Patch Changes

- Updated dependencies [f40cfa2]
  - @solid-devtools/shared@0.15.0
  - @solid-devtools/debugger@0.24.1

## 0.9.0

### Minor Changes

- 89fcdc4: Update to vite 6, remove solid-start dep (was unused anyway)

### Patch Changes

- Updated dependencies [89fcdc4]
  - @solid-devtools/debugger@0.24.0
  - @solid-devtools/shared@0.14.0

## 0.8.4

### Patch Changes

- Updated dependencies [d909b584]
  - @solid-devtools/shared@0.13.2
  - @solid-devtools/debugger@0.23.4

## 0.8.3

### Patch Changes

- Updated dependencies [4772a364]
  - @solid-devtools/debugger@0.23.3

## 0.8.2

### Patch Changes

- d558e37b: Update dependencies. Fixes #276
- Updated dependencies [d558e37b]
  - @solid-devtools/debugger@0.23.2

## 0.8.1

### Patch Changes

- 778774f2: Correct solid-js peer dep version
- Updated dependencies [778774f2]
- Updated dependencies [778774f2]
  - @solid-devtools/debugger@0.23.1
  - @solid-devtools/shared@0.13.1

## 0.8.0

### Minor Changes

- 86f74ea9: Update to Solid 1.8

### Patch Changes

- Updated dependencies [86f74ea9]
  - @solid-devtools/debugger@0.23.0
  - @solid-devtools/shared@0.13.0

## 0.7.4

### Patch Changes

- 7409af5: Move solid-js out of dependencies (to peer)
- Updated dependencies [7409af5]
  - @solid-devtools/debugger@0.22.4
  - @solid-devtools/shared@0.12.3

## 0.7.3

### Patch Changes

- 39dfd62: Use @nothing-but/utils for some common utilities
- Updated dependencies [39dfd62]
- Updated dependencies [36bb6bf]
  - @solid-devtools/debugger@0.22.3
  - @solid-devtools/shared@0.12.2

## 0.7.2

### Patch Changes

- Updated dependencies [e8ae734]
  - @solid-devtools/shared@0.12.1
  - @solid-devtools/debugger@0.22.2

## 0.7.1

### Patch Changes

- Updated dependencies [91e34e6]
- Updated dependencies [74f0614]
  - @solid-devtools/debugger@0.22.1

## 0.7.0

### Minor Changes

- d4a35d7: Breaking Changes!

  Extension will now inject the debugger via content script, insted of loading it from installed node modules. This will allow the extension and debugger to updated without having to update the node modules.

  The debugger needs to be initialized by importing `@solid-devtools/debugger/setup`.

### Patch Changes

- Updated dependencies [d4a35d7]
  - @solid-devtools/debugger@0.22.0
  - @solid-devtools/shared@0.12.0

## 0.6.2

### Patch Changes

- Bump
- Updated dependencies
  - @solid-devtools/debugger@0.21.1
  - @solid-devtools/shared@0.11.1

## 0.6.1

### Patch Changes

- Updated dependencies [a99d42b]
- Updated dependencies [811b4bb]
- Updated dependencies [cbe62bd]
- Updated dependencies [b7514c5]
  - @solid-devtools/debugger@0.21.0

## 0.6.0

### Minor Changes

- de40800: #### Dependency graph

  Adds a dependency graph to the debugger. It collcts observers and sources of currently inspected computation or signal.

  Breaking changes to the debugger emitter API - instead of events being emitted and listened to individually, now they all can be listened to at once which makes it easier to add new events in the future and maintaining the debugger - devtools bridge implementation in packages that use it.

  Closes #113
  Closes #208
  Closes #213
  Fixes #210

### Patch Changes

- Updated dependencies [de40800]
  - @solid-devtools/debugger@0.20.0
  - @solid-devtools/shared@0.11.0

## 0.5.6

### Patch Changes

- Updated dependencies [c4e9af3]
- Updated dependencies [c4e9af3]
  - @solid-devtools/shared@0.10.6
  - @solid-devtools/debugger@0.19.0

## 0.5.5

### Patch Changes

- Updated dependencies [84435c1]
- Updated dependencies [84435c1]
  - @solid-devtools/debugger@0.18.0
  - @solid-devtools/shared@0.10.5

## 0.5.4

### Patch Changes

- Updated dependencies [006fc83]
- Updated dependencies [fd6dcae]
- Updated dependencies [fd6dcae]
  - @solid-devtools/debugger@0.17.0
  - @solid-devtools/shared@0.10.3

## 0.5.3

### Patch Changes

- Updated dependencies [5743522]
- Updated dependencies [5743522]
  - @solid-devtools/shared@0.10.2
  - @solid-devtools/debugger@0.16.0

## 0.5.2

### Patch Changes

- ba185c3: Add top-level "development" export condidtion.
- Updated dependencies [ba185c3]
  - @solid-devtools/debugger@0.15.2

## 0.5.1

### Patch Changes

- Updated dependencies [a9f8e62]
- Updated dependencies [bd8f0b4]
- Updated dependencies [a9f8e62]
  - @solid-devtools/debugger@0.15.0
  - @solid-devtools/shared@0.10.1

## 0.5.0

### Minor Changes

- 1990be5: Move graph types from `@solid-devtools/shared` to `@solid-devtools/debugger`

### Patch Changes

- d7e98da: Move some debugger related types from @solid-devtools/shared to @solid-devtools/debugger
- Updated dependencies [a6b55b0]
- Updated dependencies [d7e98da]
- Updated dependencies [1990be5]
- Updated dependencies [1990be5]
  - @solid-devtools/debugger@0.14.0
  - @solid-devtools/shared@0.10.0

## 0.4.12

### Patch Changes

- a01db71: 1.6 Improvements
- Updated dependencies [a01db71]
  - @solid-devtools/debugger@0.13.1
  - @solid-devtools/shared@0.9.2

## 0.4.11

### Patch Changes

- Updated dependencies [772de45]
  - @solid-devtools/debugger@0.13.0

## 0.4.10

### Patch Changes

- Updated dependencies [8eb3fcb]
- Updated dependencies [94178ba]
- Updated dependencies [94178ba]
  - @solid-devtools/shared@0.9.0
  - @solid-devtools/debugger@0.12.0

## 0.4.9

### Patch Changes

- Updated dependencies [74effef]
- Updated dependencies [fb8b3c4]
- Updated dependencies [7419067]
- Updated dependencies [aa7fde4]
  - @solid-devtools/debugger@0.11.0
  - @solid-devtools/shared@0.8.4

## 0.4.8

### Patch Changes

- Updated dependencies [7794a85]
- Updated dependencies [d7b35e4]
- Updated dependencies [a5b60ba]
  - @solid-devtools/shared@0.8.3
  - @solid-devtools/debugger@0.10.0

## 0.4.7

### Patch Changes

- Updated dependencies [089331d]
- Updated dependencies [5e913ac]
  - @solid-devtools/debugger@0.9.0
  - @solid-devtools/shared@0.8.0

## 0.4.6

### Patch Changes

- Updated dependencies [db7edcf]
- Updated dependencies [bf579bb]
  - @solid-devtools/debugger@0.8.0
  - @solid-devtools/shared@0.7.4

## 0.4.5

### Patch Changes

- a4d099f: Solid 1.5
- Updated dependencies [a4d099f]
  - @solid-devtools/debugger@0.7.1
  - @solid-devtools/shared@0.7.1

## 0.4.4

### Patch Changes

- Updated dependencies [15c958b]
- Updated dependencies [27ffdb1]
- Updated dependencies [33e2c17]
- Updated dependencies [27b98fa]
- Updated dependencies [fae3ec0]
- Updated dependencies [15c958b]
  - @solid-devtools/debugger@0.7.0
  - @solid-devtools/shared@0.7.0

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

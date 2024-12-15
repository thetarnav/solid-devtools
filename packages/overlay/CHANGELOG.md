# @solid-devtools/overlay

## 0.31.2

### Patch Changes

- Updated dependencies [d41c4a7]
  - @solid-devtools/shared@0.16.0
  - @solid-devtools/frontend@0.12.2
  - @solid-devtools/debugger@0.24.2

## 0.31.1

### Patch Changes

- Updated dependencies [f40cfa2]
  - @solid-devtools/shared@0.15.0
  - @solid-devtools/debugger@0.24.1
  - @solid-devtools/frontend@0.12.1

## 0.31.0

### Minor Changes

- 89fcdc4: Update to vite 6, remove solid-start dep (was unused anyway)

### Patch Changes

- Updated dependencies [89fcdc4]
  - @solid-devtools/debugger@0.24.0
  - @solid-devtools/frontend@0.12.0
  - @solid-devtools/shared@0.14.0

## 0.30.1

## 0.30.0

### Patch Changes

- Updated dependencies [d909b584]
  - @solid-devtools/shared@0.13.2
  - @solid-devtools/debugger@0.23.4
  - @solid-devtools/frontend@0.11.5

## 0.29.3

## 0.29.2

### Patch Changes

- Updated dependencies [4772a364]
  - @solid-devtools/debugger@0.23.3
  - @solid-devtools/frontend@0.11.4

## 0.29.1

### Patch Changes

- d558e37b: Update dependencies. Fixes #276
- Updated dependencies [d558e37b]
  - @solid-devtools/debugger@0.23.2
  - @solid-devtools/frontend@0.11.3

## 0.29.0

### Patch Changes

- b3ab38e8: Add missing dependencies
- Updated dependencies [b3ab38e8]
  - @solid-devtools/frontend@0.11.2

## 0.28.1

### Patch Changes

- 778774f2: Correct solid-js peer dep version
- Updated dependencies [778774f2]
- Updated dependencies [778774f2]
  - @solid-devtools/debugger@0.23.1
  - @solid-devtools/frontend@0.11.1
  - @solid-devtools/shared@0.13.1

## 0.28.0

### Minor Changes

- 86f74ea9: Update to Solid 1.8

### Patch Changes

- Updated dependencies [86f74ea9]
  - @solid-devtools/frontend@0.11.0
  - @solid-devtools/debugger@0.23.0
  - @solid-devtools/shared@0.13.0

## 0.27.9

### Patch Changes

- Updated dependencies [2dcde04e]
  - @solid-devtools/frontend@0.10.3

## 0.27.8

## 0.27.7

### Patch Changes

- ea07d49: Correct overlay module exports
- e478a3c: Fix type exports
- Updated dependencies [51f1b5a]
  - @solid-devtools/frontend@0.10.2

## 0.27.6

### Patch Changes

- 7409af5: Move solid-js out of dependencies (to peer)
- Updated dependencies [7409af5]
  - @solid-devtools/debugger@0.22.4
  - @solid-devtools/frontend@0.10.1
  - @solid-devtools/shared@0.12.3

## 0.27.5

### Patch Changes

- 39dfd62: Use @nothing-but/utils for some common utilities
- Updated dependencies [430c447]
- Updated dependencies [39dfd62]
- Updated dependencies [36bb6bf]
  - @solid-devtools/frontend@0.10.0
  - @solid-devtools/debugger@0.22.3
  - @solid-devtools/shared@0.12.2

## 0.27.4

### Patch Changes

- Updated dependencies [e8ae734]
- Updated dependencies [e8ae734]
  - @solid-devtools/frontend@0.9.3
  - @solid-devtools/shared@0.12.1
  - @solid-devtools/debugger@0.22.2

## 0.27.3

### Patch Changes

- Updated dependencies [91e34e6]
- Updated dependencies [74f0614]
  - @solid-devtools/debugger@0.22.1
  - @solid-devtools/frontend@0.9.2

## 0.27.2

## 0.27.1

### Patch Changes

- Updated dependencies [fd7efbe]
  - @solid-devtools/frontend@0.9.1

## 0.27.0

### Minor Changes

- d4a35d7: Breaking Changes!

  Extension will now inject the debugger via content script, insted of loading it from installed node modules. This will allow the extension and debugger to updated without having to update the node modules.

  The debugger needs to be initialized by importing `@solid-devtools/debugger/setup`.

### Patch Changes

- Updated dependencies [d4a35d7]
  - @solid-devtools/debugger@0.22.0
  - @solid-devtools/frontend@0.9.0
  - @solid-devtools/shared@0.12.0

## 0.6.1

### Patch Changes

- Bump
- Updated dependencies
  - @solid-devtools/debugger@0.21.1
  - @solid-devtools/frontend@0.8.1
  - @solid-devtools/shared@0.11.1

## 0.6.0

### Minor Changes

- 811b4bb: Improve management of inspected state. When inspecting nodes that are omitted from the structure view (if displaying only components) the closest node will be highlighted instead.
- b7514c5: Fix treeview mode not resetting when the devtools get closed. Rename the `ForceUpdate` event to `ResetState`.
- f1b90ba: Change the API of using the frontend package.

### Patch Changes

- a99d42b: Fix opening component location with the overlay.
- Updated dependencies [a99d42b]
- Updated dependencies [811b4bb]
- Updated dependencies [cbe62bd]
- Updated dependencies [b7514c5]
- Updated dependencies [f1b90ba]
- Updated dependencies [a99d42b]
  - @solid-devtools/debugger@0.21.0
  - @solid-devtools/frontend@0.8.0

## 0.5.1

### Patch Changes

- a37f73d: fix: Don't open overlay when using locator.
- Updated dependencies [a37f73d]
  - @solid-devtools/debugger@0.20.1

## 0.5.0

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
  - @solid-devtools/frontend@0.7.0
  - @solid-devtools/shared@0.11.0

## 0.4.3

### Patch Changes

- Updated dependencies [c4e9af3]
- Updated dependencies [c4e9af3]
  - @solid-devtools/shared@0.10.6
  - @solid-devtools/debugger@0.19.0
  - @solid-devtools/frontend@0.6.0

## 0.4.2

### Patch Changes

- Updated dependencies [84435c1]
- Updated dependencies [84435c1]
  - @solid-devtools/debugger@0.18.0
  - @solid-devtools/frontend@0.5.0
  - @solid-devtools/shared@0.10.5

## 0.4.1

### Patch Changes

- Updated dependencies [006fc83]
- Updated dependencies [fd6dcae]
- Updated dependencies [fd6dcae]
  - @solid-devtools/debugger@0.17.0
  - @solid-devtools/frontend@0.4.0
  - @solid-devtools/shared@0.10.3

## 0.4.0

### Minor Changes

- 5743522: Adds an ability to switch between different tree-view modes:

  - Components (only components and context nodes)
  - Ownership (structure of solids reactivity graph)
  - DOM (components + html elements)

### Patch Changes

- Updated dependencies [5743522]
- Updated dependencies [5743522]
  - @solid-devtools/shared@0.10.2
  - @solid-devtools/debugger@0.16.0
  - @solid-devtools/frontend@0.3.0

## 0.3.1

### Patch Changes

- e0e812b: Correct ErrorOverlay: Don't listen to window errors by default
- Updated dependencies [e0e812b]
  - @solid-devtools/frontend@0.2.4

## 0.3.0

### Minor Changes

- 8e208b0: Change overlay API, to be a normal function instead of a component. It's now called `attachDevtoolsOverlay`.
  Preventing from attaching multiple overlays at the same time.

## 0.2.4

### Patch Changes

- bd5a22d: Add alwaysOpen and noPadding props.
- Updated dependencies [b750aae]
  - @solid-devtools/debugger@0.15.3

## 0.2.3

### Patch Changes

- ba185c3: Add top-level "development" export condidtion.
- Updated dependencies [ba185c3]
  - @solid-devtools/debugger@0.15.2

## 0.2.2

### Patch Changes

- b7b50bf: Adapt for new way of mounting frontend icons.
- Updated dependencies [6ef3c67]
- Updated dependencies [dc04d35]
  - @solid-devtools/frontend@0.2.3

## 0.2.1

### Patch Changes

- 8483fe9: Bump to update frontend package.
- Updated dependencies [7c3586f]
  - @solid-devtools/frontend@0.2.2

## 0.2.0

### Minor Changes

- bd8f0b4: Handle new `componentLocation` transform by adding a button to the inspector panel for opening component source code.

  Improve inspector panel styles. Improve Splitter component styles and ovarall usability.

### Patch Changes

- a9f8e62: Improve managing debugger enabled state.
- Updated dependencies [a9f8e62]
- Updated dependencies [bd8f0b4]
- Updated dependencies [a9f8e62]
  - @solid-devtools/debugger@0.15.0
  - @solid-devtools/shared@0.10.1
  - @solid-devtools/frontend@0.2.0

## 0.1.0

### Minor Changes

- 1990be5: Move graph types from `@solid-devtools/shared` to `@solid-devtools/debugger`

### Patch Changes

- Updated dependencies [a6b55b0]
- Updated dependencies [d7e98da]
- Updated dependencies [1990be5]
- Updated dependencies [1990be5]
  - @solid-devtools/debugger@0.14.0
  - @solid-devtools/shared@0.10.0
  - @solid-devtools/frontend@0.1.0

## 0.0.7

### Patch Changes

- a01db71: 1.6 Improvements
- Updated dependencies [a01db71]
  - @solid-devtools/debugger@0.13.1
  - @solid-devtools/frontend@0.0.7
  - @solid-devtools/shared@0.9.2

## 0.0.6

### Patch Changes

- 772de45: Simplify debugger plugin-devtools controller usage and communication.

  The locator package gets removed, and the logic moved directly to @solid-devtools/debugger

- Updated dependencies [a1ebe32]
- Updated dependencies [772de45]
  - @solid-devtools/frontend@0.0.6
  - @solid-devtools/debugger@0.13.0

## 0.0.5

### Patch Changes

- Updated dependencies [aa9f0bb]
  - @solid-devtools/frontend@0.0.5

## 0.0.4

### Patch Changes

- 95aaad9: Make mobile work and add dark mode

  Add `defaultOpen` prop to overlay

  Recalculate the tree view on container resize

- Updated dependencies [95aaad9]
  - @solid-devtools/frontend@0.0.4

## 0.0.3

### Patch Changes

- 12e4f5b: Add html body padding, while the overlay is open, to have more room for scrolling. This should allow to see elements hidden behind the overlay.
- f3f2ca1: Disable overlay on mobile screens
- Updated dependencies [f3f2ca1]
  - @solid-devtools/frontend@0.0.3

## 0.0.2

### Patch Changes

- Updated dependencies [8eb3fcb]
- Updated dependencies [94178ba]
- Updated dependencies [94178ba]
- Updated dependencies [94178ba]
  - @solid-devtools/shared@0.9.0
  - @solid-devtools/debugger@0.12.0
  - @solid-devtools/frontend@0.0.2
  - @solid-devtools/locator@0.16.7

# @solid-devtools/frontend

## 0.15.4

### Patch Changes

- Updated dependencies [dddf24f]
  - @solid-devtools/debugger@0.28.1

## 0.15.3

### Patch Changes

- Updated dependencies [ea6c1c2]
- Updated dependencies [fa0a2c8]
  - @solid-devtools/debugger@0.28.0

## 0.15.2

### Patch Changes

- Updated dependencies [add003f]
- Updated dependencies [e8fe39e]
  - @solid-devtools/shared@0.20.0
  - @solid-devtools/debugger@0.27.1

## 0.15.1

### Patch Changes

- Updated dependencies [370c545]
- Updated dependencies [95b348b]
- Updated dependencies [a72919e]
  - @solid-devtools/debugger@0.27.0
  - @solid-devtools/shared@0.19.1

## 0.15.0

### Minor Changes

- 4e32e04: Display custom values added with `registerGraph()` in the inspector
- ce98e83: Add UNOWNED Root with top-level signals
  -> Show signals created outside of reactive context (Closes #209)

### Patch Changes

- Updated dependencies [ed4215b]
- Updated dependencies [4e32e04]
- Updated dependencies [ce98e83]
  - @solid-devtools/debugger@0.26.0
  - @solid-devtools/shared@0.19.0

## 0.14.0

### Minor Changes

- eef06c4: Simplify createDevtools interface
- c7f699f: Change the message structure from {name, details} to {kind, data}
- ba5b62a: New feature: inspecting values in the console. (Closes #166)

### Patch Changes

- 6b1b16d: Refactor `useDebugger`.
  `useLocator` is removed, instead use `useDebugger().setLocatorOptions()`.
  `debugger.meta.versions` moved to `debugger.versions`
- Updated dependencies [c7f699f]
- Updated dependencies [ba5b62a]
- Updated dependencies [6b1b16d]
  - @solid-devtools/debugger@0.25.0
  - @solid-devtools/shared@0.18.0

## 0.13.0

### Minor Changes

- 5afa738: Replace bridge.input event hub abstraction with a simple event bus (to be removed later)

### Patch Changes

- 54e3ec7: Fix html elements in inspector not highlighting on hover and not having "<>" characters
- d354b6c: Show HMR badge in the inspector
- 5b43034: Update scroll data in timeout, after the ResizeObserver callback
  To prevent this error:
  > ResizeObserver loop completed with undelivered notifications
  > As changing scroll data can then change el.scrollTop
  > Fixes #307
- f910bc9: Display owner "value" as a signal only if it can change.
- f910bc9: Add "hmr" field to OwnerDetails.
- Updated dependencies [4f31c75]
- Updated dependencies [f910bc9]
- Updated dependencies [1610d19]
- Updated dependencies [5afa738]
  - @solid-devtools/debugger@0.24.5
  - @solid-devtools/shared@0.17.0

## 0.12.5

### Patch Changes

- 66c6cbb: Improve top-right menu (add sponsor link and nicer styles)

## 0.12.4

### Patch Changes

- Updated dependencies [7ee9f7f]
- Updated dependencies [0af688e]
- Updated dependencies [5931162]
  - @solid-devtools/debugger@0.24.4
  - @solid-devtools/shared@0.16.1

## 0.12.3

### Patch Changes

- dca83c0: Fix usage of theme package
- Updated dependencies [40ace37]
  - @solid-devtools/debugger@0.24.3

## 0.12.2

### Patch Changes

- d41c4a7: Move theme to shared package
- Updated dependencies [d41c4a7]
  - @solid-devtools/shared@0.16.0
  - @solid-devtools/debugger@0.24.2

## 0.12.1

### Patch Changes

- Updated dependencies [f40cfa2]
  - @solid-devtools/shared@0.15.0
  - @solid-devtools/debugger@0.24.1

## 0.12.0

### Minor Changes

- 89fcdc4: Update to vite 6, remove solid-start dep (was unused anyway)

### Patch Changes

- Updated dependencies [89fcdc4]
  - @solid-devtools/debugger@0.24.0
  - @solid-devtools/shared@0.14.0
  - @solid-devtools/theme@0.1.0

## 0.11.5

### Patch Changes

- Updated dependencies [d909b584]
  - @solid-devtools/shared@0.13.2
  - @solid-devtools/debugger@0.23.4

## 0.11.4

### Patch Changes

- Updated dependencies [4772a364]
  - @solid-devtools/debugger@0.23.3

## 0.11.3

### Patch Changes

- d558e37b: Update dependencies. Fixes #276
- Updated dependencies [d558e37b]
  - @solid-devtools/debugger@0.23.2
  - @solid-devtools/theme@0.0.1

## 0.11.2

### Patch Changes

- b3ab38e8: Add missing dependencies

## 0.11.1

### Patch Changes

- 778774f2: Correct solid-js peer dep version
- Updated dependencies [778774f2]
- Updated dependencies [778774f2]
  - @solid-devtools/debugger@0.23.1
  - @solid-devtools/shared@0.13.1

## 0.11.0

### Minor Changes

- 86f74ea9: Update to Solid 1.8

### Patch Changes

- Updated dependencies [86f74ea9]
  - @solid-devtools/debugger@0.23.0
  - @solid-devtools/shared@0.13.0

## 0.10.3

### Patch Changes

- 2dcde04e: Add missing aria-label attributes (#261)

## 0.10.2

### Patch Changes

- 51f1b5a: Update jsx-tokenizer package

## 0.10.1

### Patch Changes

- 7409af5: Move solid-js out of dependencies (to peer)
- Updated dependencies [7409af5]
  - @solid-devtools/debugger@0.22.4
  - @solid-devtools/shared@0.12.3

## 0.10.0

### Minor Changes

- 430c447: Change styling library from vanilla extract to unocss. Simplify the styles in the process.

  **Important**

  This changes the styles path from `@solid-devtools/frontend/dist/index.css` to `@solid-devtools/frontend/dist/styles.css`

### Patch Changes

- 39dfd62: Use @nothing-but/utils for some common utilities
- 36bb6bf: Updated the `atom` helper primitive
- Updated dependencies [39dfd62]
- Updated dependencies [36bb6bf]
  - @solid-devtools/debugger@0.22.3
  - @solid-devtools/shared@0.12.2

## 0.9.3

### Patch Changes

- e8ae734: Add keyboard navigation to the structure view. (#248)
- Updated dependencies [e8ae734]
  - @solid-devtools/shared@0.12.1
  - @solid-devtools/debugger@0.22.2

## 0.9.2

### Patch Changes

- Updated dependencies [91e34e6]
- Updated dependencies [74f0614]
  - @solid-devtools/debugger@0.22.1

## 0.9.1

### Patch Changes

- fd7efbe: Add light-mode styles for the dependency graph view. Closes #242

## 0.9.0

### Minor Changes

- d4a35d7: Breaking Changes!

  Extension will now inject the debugger via content script, insted of loading it from installed node modules. This will allow the extension and debugger to updated without having to update the node modules.

  The debugger needs to be initialized by importing `@solid-devtools/debugger/setup`.

### Patch Changes

- Updated dependencies [d4a35d7]
  - @solid-devtools/debugger@0.22.0
  - @solid-devtools/shared@0.12.0

## 0.8.1

### Patch Changes

- Bump
- Updated dependencies
  - @solid-devtools/debugger@0.21.1
  - @solid-devtools/shared@0.11.1

## 0.8.0

### Minor Changes

- 811b4bb: Improve management of inspected state. When inspecting nodes that are omitted from the structure view (if displaying only components) the closest node will be highlighted instead.
- f1b90ba: Change the API of using the frontend package.

### Patch Changes

- a99d42b: Improve displaying location of inspected components.
- Updated dependencies [a99d42b]
- Updated dependencies [811b4bb]
- Updated dependencies [cbe62bd]
- Updated dependencies [b7514c5]
  - @solid-devtools/debugger@0.21.0

## 0.7.1

### Patch Changes

- 0c98076: Switch back the default structure view mode to Components.
- Updated dependencies [0c98076]
  - @solid-devtools/debugger@0.20.2

## 0.7.0

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

## 0.6.0

### Minor Changes

- c4e9af3: Improve value encoding, decoding and tracking store references.

### Patch Changes

- Updated dependencies [c4e9af3]
- Updated dependencies [c4e9af3]
  - @solid-devtools/shared@0.10.6
  - @solid-devtools/debugger@0.19.0

## 0.5.1

### Patch Changes

- 41ab0c1: Move transform pacakge to `solid-devtools` lib. Fix vite plugin for solid-start.
- Updated dependencies [41ab0c1]
  - @solid-devtools/debugger@0.18.1

## 0.5.0

### Minor Changes

- 84435c1: Intercept getter props of inspected component to display their latest values.

### Patch Changes

- Updated dependencies [84435c1]
- Updated dependencies [84435c1]
  - @solid-devtools/debugger@0.18.0
  - @solid-devtools/shared@0.10.5

## 0.4.0

### Minor Changes

- fd6dcae: Change value serialization and deserialization algorithms to support circular references.

### Patch Changes

- 006fc83: Use `el.localName` to get the name of HTML elements instead of using `el.tagName`
- Updated dependencies [006fc83]
- Updated dependencies [fd6dcae]
- Updated dependencies [fd6dcae]
  - @solid-devtools/debugger@0.17.0
  - @solid-devtools/shared@0.10.3

## 0.3.1

### Patch Changes

- 9a053af: Fix inspector values styles in dark mode.

## 0.3.0

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

## 0.2.4

### Patch Changes

- e0e812b: Correct ErrorOverlay: Don't listen to window errors by default

## 0.2.3

### Patch Changes

- 6ef3c67: Focus search component when pressing `/` and blur on `Escape`. For the extension exclusively. (Fixes #176)
- dc04d35: Improve scroll to inspected node triggering near the top edge. Disable locator after inspecting a component. (fixes #177)

## 0.2.2

### Patch Changes

- 7c3586f: Add a Search component for searching for nodes with provided name in the Structure view.

## 0.2.1

### Patch Changes

- 9d3cb57: Improve scrolling to selected node. (Un-collapsing parents; Broken when using the structure path)
- 7ef99be: Keep the height of the Path component fixed unless the the component is being hovered.
- 41a60c2: Remove common left padding of structure nodes to keep them centered on the screen.
- Updated dependencies [a01f839]
  - @solid-devtools/debugger@0.15.1

## 0.2.0

### Minor Changes

- bd8f0b4: Handle new `componentLocation` transform by adding a button to the inspector panel for opening component source code.

  Improve inspector panel styles. Improve Splitter component styles and ovarall usability.

### Patch Changes

- Updated dependencies [a9f8e62]
- Updated dependencies [bd8f0b4]
- Updated dependencies [a9f8e62]
  - @solid-devtools/debugger@0.15.0
  - @solid-devtools/shared@0.10.1

## 0.1.1

### Patch Changes

- 55543c1: Reset panel state if navigated out of the page.

## 0.1.0

### Minor Changes

- 1990be5: Move graph types from `@solid-devtools/shared` to `@solid-devtools/debugger`
- 1990be5: Track and show fine-grain updates to stores in inspected values.

### Patch Changes

- Updated dependencies [a6b55b0]
- Updated dependencies [d7e98da]
- Updated dependencies [1990be5]
- Updated dependencies [1990be5]
  - @solid-devtools/debugger@0.14.0
  - @solid-devtools/shared@0.10.0

## 0.0.7

### Patch Changes

- a01db71: 1.6 Improvements
- Updated dependencies [a01db71]
  - @solid-devtools/shared@0.9.2

## 0.0.6

### Patch Changes

- a1ebe32: Improve dark theme styles.
- 772de45: Simplify debugger plugin-devtools controller usage and communication.

  The locator package gets removed, and the logic moved directly to @solid-devtools/debugger

## 0.0.5

### Patch Changes

- aa9f0bb: Correct styes for collapse toggle on mobile.

## 0.0.4

### Patch Changes

- 95aaad9: Make mobile work and add dark mode

  Add `defaultOpen` prop to overlay

  Recalculate the tree view on container resize

## 0.0.3

### Patch Changes

- f3f2ca1: Fix esbuild ignoring global css import.

## 0.0.2

### Patch Changes

- 94178ba: Move CSS reset to frontend package. Fix controller not sending devtools locator state
- Updated dependencies [8eb3fcb]
  - @solid-devtools/shared@0.9.0

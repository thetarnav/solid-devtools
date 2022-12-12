# @solid-devtools/frontend

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

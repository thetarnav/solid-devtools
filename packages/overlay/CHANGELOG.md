# @solid-devtools/overlay

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

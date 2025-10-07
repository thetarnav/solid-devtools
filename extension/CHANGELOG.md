# @solid-devtools/extension

## 0.33.6

### Patch Changes

- Updated dependencies [d8263e1]
  - solid-devtools@0.34.4

## 0.33.5

### Patch Changes

- Updated dependencies [dddf24f]
  - @solid-devtools/debugger@0.28.1
  - @solid-devtools/frontend@0.15.4
  - solid-devtools@0.34.3

## 0.33.4

### Patch Changes

- Updated dependencies [ea6c1c2]
- Updated dependencies [fa0a2c8]
  - @solid-devtools/debugger@0.28.0
  - @solid-devtools/frontend@0.15.3
  - solid-devtools@0.34.2

## 0.33.3

### Patch Changes

- 5e250b0: Display place connection status in popup
- add003f: Improve logging by adding place names to all messages.
- 4bc6abb: Reconnect to the port when disconnected in devtools panel. (#337)
- 83fc768: Add reconnecting logic to content script (#337)
- Updated dependencies [add003f]
- Updated dependencies [e8fe39e]
  - @solid-devtools/shared@0.20.0
  - @solid-devtools/debugger@0.27.1
  - @solid-devtools/frontend@0.15.2
  - solid-devtools@0.34.1

## 0.33.2

### Patch Changes

- a72919e: Move assert to shared/utils
- Updated dependencies [05163c3]
- Updated dependencies [370c545]
- Updated dependencies [95b348b]
- Updated dependencies [a72919e]
  - solid-devtools@0.34.0
  - @solid-devtools/debugger@0.27.0
  - @solid-devtools/shared@0.19.1
  - @solid-devtools/frontend@0.15.1

## 0.33.1

### Patch Changes

- 4f67e44: Disable module preload (fixes #332)

## 0.33.0

### Patch Changes

- Updated dependencies [ed4215b]
- Updated dependencies [4e32e04]
- Updated dependencies [ce98e83]
  - @solid-devtools/debugger@0.26.0
  - solid-devtools@0.33.0
  - @solid-devtools/frontend@0.15.0
  - @solid-devtools/shared@0.19.0

## 0.32.0

### Minor Changes

- c7f699f: Change the message structure from {name, details} to {kind, data}
- ba5b62a: New feature: inspecting values in the console. (Closes #166)

### Patch Changes

- eef06c4: Simplify createDevtools interface
- 6b1b16d: Refactor `useDebugger`.
  `useLocator` is removed, instead use `useDebugger().setLocatorOptions()`.
  `debugger.meta.versions` moved to `debugger.versions`
- Updated dependencies [eef06c4]
- Updated dependencies [c7f699f]
- Updated dependencies [ba5b62a]
- Updated dependencies [6b1b16d]
  - @solid-devtools/frontend@0.14.0
  - @solid-devtools/debugger@0.25.0
  - @solid-devtools/shared@0.18.0
  - solid-devtools@0.32.0

## 0.31.7

### Patch Changes

- 5afa738: Replace bridge.input event hub abstraction with a simple event bus (to be removed later)
- Updated dependencies [54e3ec7]
- Updated dependencies [d1657b4]
- Updated dependencies [d354b6c]
- Updated dependencies [5b43034]
- Updated dependencies [4f31c75]
- Updated dependencies [f910bc9]
- Updated dependencies [f910bc9]
- Updated dependencies [1610d19]
- Updated dependencies [5afa738]
  - @solid-devtools/frontend@0.13.0
  - solid-devtools@0.31.7
  - @solid-devtools/debugger@0.24.5
  - @solid-devtools/shared@0.17.0

## 0.31.6

### Patch Changes

- 063ff4d: Remove all event-bus abstractions from extension pkg
- e82fd85: Rewrite and simplify the background script.
  The devtools should be more reliable when switching tabs, closing, reloading etc.
  The icon of the extension on the actions bar should light up when on site with solid detected.
- Updated dependencies [66c6cbb]
  - @solid-devtools/frontend@0.12.5
  - solid-devtools@0.31.6

## 0.31.5

### Patch Changes

- 5931162: Log messages recieved.
- 0b6ec6d: Remove version event bus from tab data (internal)
- 76276ec: Improve handling page reload in background script
- Updated dependencies [7ee9f7f]
- Updated dependencies [0af688e]
- Updated dependencies [5931162]
  - @solid-devtools/debugger@0.24.4
  - @solid-devtools/shared@0.16.1
  - solid-devtools@0.31.5
  - @solid-devtools/frontend@0.12.4

## 0.31.4

### Patch Changes

- 0cb47bb: Change panel icon style to outline
- 99329a2: Load real-world scripts as soon as possible. Use documentElement when head is not present
- d88ced2: Fix devtools panel path for firefox
  - solid-devtools@0.31.4

## 0.31.3

### Patch Changes

- Updated dependencies [dca83c0]
- Updated dependencies [40ace37]
  - @solid-devtools/frontend@0.12.3
  - @solid-devtools/debugger@0.24.3
  - solid-devtools@0.31.3

## 0.31.2

### Patch Changes

- Updated dependencies [d41c4a7]
  - @solid-devtools/shared@0.16.0
  - @solid-devtools/frontend@0.12.2
  - @solid-devtools/debugger@0.24.2
  - solid-devtools@0.31.2

## 0.31.1

### Patch Changes

- b918981: Add more logs and improve popup interface to not hide information
- Updated dependencies [f40cfa2]
  - @solid-devtools/shared@0.15.0
  - @solid-devtools/debugger@0.24.1
  - @solid-devtools/frontend@0.12.1
  - solid-devtools@0.31.1

## 0.31.0

### Minor Changes

- 89fcdc4: Update to vite 6, remove solid-start dep (was unused anyway)

### Patch Changes

- Updated dependencies [89fcdc4]
  - @solid-devtools/debugger@0.24.0
  - @solid-devtools/frontend@0.12.0
  - solid-devtools@0.31.0
  - @solid-devtools/shared@0.14.0

## 0.30.1

### Patch Changes

- Updated dependencies [3e93dba8]
  - solid-devtools@0.30.1

## 0.30.0

### Patch Changes

- Updated dependencies [9ff0993d]
- Updated dependencies [d909b584]
- Updated dependencies [6da4cb6e]
  - solid-devtools@0.30.0
  - @solid-devtools/shared@0.13.2
  - @solid-devtools/debugger@0.23.4
  - @solid-devtools/frontend@0.11.5

## 0.29.3

### Patch Changes

- Updated dependencies [d6ec5bda]
  - solid-devtools@0.29.3

## 0.29.2

### Patch Changes

- Updated dependencies [4772a364]
  - @solid-devtools/debugger@0.23.3
  - @solid-devtools/frontend@0.11.4
  - solid-devtools@0.29.2

## 0.29.1

### Patch Changes

- d558e37b: Update dependencies. Fixes #276
- Updated dependencies [d558e37b]
  - @solid-devtools/debugger@0.23.2
  - @solid-devtools/frontend@0.11.3
  - solid-devtools@0.29.1

## 0.29.0

### Minor Changes

- b3ab38e8: Support firefox (minor changes to background script)

### Patch Changes

- Updated dependencies [b3ab38e8]
  - @solid-devtools/frontend@0.11.2
  - solid-devtools@0.29.0

## 0.28.1

### Patch Changes

- Updated dependencies [778774f2]
- Updated dependencies [778774f2]
  - @solid-devtools/debugger@0.23.1
  - @solid-devtools/frontend@0.11.1
  - @solid-devtools/shared@0.13.1
  - solid-devtools@0.28.1

## 0.28.0

### Minor Changes

- 86f74ea9: Update to Solid 1.8

### Patch Changes

- Updated dependencies [86f74ea9]
  - @solid-devtools/frontend@0.11.0
  - @solid-devtools/debugger@0.23.0
  - solid-devtools@0.28.0
  - @solid-devtools/shared@0.13.0

## 0.27.9

### Patch Changes

- Updated dependencies [2dcde04e]
  - @solid-devtools/frontend@0.10.3
  - solid-devtools@0.27.9

## 0.27.8

### Patch Changes

- Updated dependencies [0bc8d67]
  - solid-devtools@0.27.8

## 0.27.7

### Patch Changes

- Updated dependencies [51f1b5a]
  - @solid-devtools/frontend@0.10.2
  - solid-devtools@0.27.7

## 0.27.6

### Patch Changes

- Updated dependencies [7409af5]
  - @solid-devtools/debugger@0.22.4
  - @solid-devtools/frontend@0.10.1
  - @solid-devtools/shared@0.12.3
  - solid-devtools@0.27.6

## 0.27.5

### Patch Changes

- 39dfd62: Use @nothing-but/utils for some common utilities
- Updated dependencies [430c447]
- Updated dependencies [39dfd62]
- Updated dependencies [36bb6bf]
  - @solid-devtools/frontend@0.10.0
  - @solid-devtools/debugger@0.22.3
  - @solid-devtools/shared@0.12.2
  - solid-devtools@0.27.5

## 0.27.4

### Patch Changes

- Updated dependencies [e8ae734]
- Updated dependencies [e8ae734]
  - @solid-devtools/frontend@0.9.3
  - @solid-devtools/shared@0.12.1
  - @solid-devtools/debugger@0.22.2
  - solid-devtools@0.27.4

## 0.27.3

### Patch Changes

- Updated dependencies [91e34e6]
- Updated dependencies [74f0614]
  - @solid-devtools/debugger@0.22.1
  - @solid-devtools/frontend@0.9.2
  - solid-devtools@0.27.3

## 0.27.2

### Patch Changes

- 55f5e3c: Import the debugger using a script tag, instead of a dynamic import,
  to prevent showing "Failed to load resource: the server responded with a status of 404" errors.
  Fixes #241
  - solid-devtools@0.27.2

## 0.27.1

### Patch Changes

- Updated dependencies [fd7efbe]
  - @solid-devtools/frontend@0.9.1
  - solid-devtools@0.27.1

## 0.27.0

### Minor Changes

- d4a35d7: Breaking Changes!

  Extension will now inject the debugger via content script, insted of loading it from installed node modules. This will allow the extension and debugger to updated without having to update the node modules.

  The debugger needs to be initialized by importing `@solid-devtools/debugger/setup`.

### Patch Changes

- 6836778: Fix extension not showing structure when opened for the first time.
- Updated dependencies [eafea66]
- Updated dependencies [2c7353a]
- Updated dependencies [d4a35d7]
- Updated dependencies [6836778]
  - solid-devtools@0.27.0
  - @solid-devtools/debugger@0.22.0
  - @solid-devtools/frontend@0.9.0
  - @solid-devtools/shared@0.12.0

## 0.22.0

### Minor Changes

- 811b4bb: Improve management of inspected state. When inspecting nodes that are omitted from the structure view (if displaying only components) the closest node will be highlighted instead.
- b7514c5: Fix treeview mode not resetting when the devtools get closed. Rename the `ForceUpdate` event to `ResetState`.
- f1b90ba: Change the API of using the frontend package.

### Patch Changes

- Updated dependencies [811b4bb]
- Updated dependencies [b7514c5]
- Updated dependencies [f1b90ba]
- Updated dependencies [a99d42b]
  - @solid-devtools/frontend@0.8.0
  - solid-devtools@0.26.0

## 0.21.1

### Patch Changes

- 0c98076: Switch back the default structure view mode to Components.
- Updated dependencies [0c98076]
  - @solid-devtools/frontend@0.7.1

## 0.21.0

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
  - @solid-devtools/frontend@0.7.0
  - @solid-devtools/shared@0.11.0
  - solid-devtools@0.25.0

## 0.20.4

### Patch Changes

- Updated dependencies [c4e9af3]
- Updated dependencies [c4e9af3]
  - @solid-devtools/shared@0.10.6
  - @solid-devtools/frontend@0.6.0
  - solid-devtools@0.24.7

## 0.20.3

### Patch Changes

- 41ab0c1: Move transform pacakge to `solid-devtools` lib. Fix vite plugin for solid-start.
- Updated dependencies [41ab0c1]
  - @solid-devtools/frontend@0.5.1
  - solid-devtools@0.24.6

## 0.20.2

### Patch Changes

- Updated dependencies [84435c1]
- Updated dependencies [84435c1]
  - @solid-devtools/frontend@0.5.0
  - @solid-devtools/shared@0.10.5
  - solid-devtools@0.24.5

## 0.20.1

### Patch Changes

- Updated dependencies [006fc83]
- Updated dependencies [fd6dcae]
- Updated dependencies [fd6dcae]
  - @solid-devtools/frontend@0.4.0
  - @solid-devtools/shared@0.10.3
  - solid-devtools@0.24.1

## 0.20.0

### Minor Changes

- 5743522: Adds an ability to switch between different tree-view modes:

  - Components (only components and context nodes)
  - Ownership (structure of solids reactivity graph)
  - DOM (components + html elements)

### Patch Changes

- Updated dependencies [5743522]
- Updated dependencies [5743522]
  - @solid-devtools/shared@0.10.2
  - solid-devtools@0.24.0
  - @solid-devtools/frontend@0.3.0

## 0.19.4

### Patch Changes

- 3cfabf2: Reconnect the extension after page refresh. (#181)

## 0.19.3

### Patch Changes

- b7b50bf: Adapt for new way of mounting frontend icons.
- 6ef3c67: Focus search component when pressing `/` and blur on `Escape`. For the extension exclusively. (Fixes #176)
- Updated dependencies [6ef3c67]
- Updated dependencies [dc04d35]
  - @solid-devtools/frontend@0.2.3

## 0.19.2

### Patch Changes

- 8483fe9: Bump to update frontend package.
- Updated dependencies [7c3586f]
  - @solid-devtools/frontend@0.2.2

## 0.19.1

### Patch Changes

- a01f839: Improve dark theme styles
- Updated dependencies [9d3cb57]
- Updated dependencies [7ef99be]
- Updated dependencies [41a60c2]
  - @solid-devtools/frontend@0.2.1

## 0.19.0

### Minor Changes

- bd8f0b4: Handle new `componentLocation` transform by adding a button to the inspector panel for opening component source code.

  Improve inspector panel styles. Improve Splitter component styles and ovarall usability.

- bd8f0b4: Rework communication by forwarding in bulk all the message exchange that happen only between client and the extension panel.

### Patch Changes

- Updated dependencies [a9f8e62]
- Updated dependencies [bd8f0b4]
- Updated dependencies [bd8f0b4]
- Updated dependencies [a9f8e62]
  - @solid-devtools/shared@0.10.1
  - solid-devtools@0.23.0
  - @solid-devtools/frontend@0.2.0

## 0.18.0

### Minor Changes

- 965cda1: Better organize message communication. Add a popup window with the information about solid and devtools client detection.
- 642b517: Fixes background script not scoping messaging and data to a single page (cross-tab state leaking)

### Patch Changes

- 2ca645d: Improve version missmatch warning message
- 55543c1: Reset panel state if navigated out of the page.
- 67fdcac: Change extension action icon to blue one (not-disabled) when solid and devtools client are present on the page.
- 965cda1: Don't disable debugger when devtools tab gets switched. Clear highlighted elements if devtools gets closed.
- Updated dependencies [965cda1]
- Updated dependencies [55543c1]
- Updated dependencies [965cda1]
  - solid-devtools@0.22.0
  - @solid-devtools/frontend@0.1.1

## 0.17.0

### Minor Changes

- 1990be5: Move graph types from `@solid-devtools/shared` to `@solid-devtools/debugger`

### Patch Changes

- Updated dependencies [a6b55b0]
- Updated dependencies [d7e98da]
- Updated dependencies [1990be5]
- Updated dependencies [1990be5]
  - @solid-devtools/shared@0.10.0
  - solid-devtools@0.21.0
  - @solid-devtools/frontend@0.1.0

## 0.16.1

### Patch Changes

- Updated dependencies [a01db71]
  - @solid-devtools/frontend@0.0.7
  - @solid-devtools/shared@0.9.2

## 0.16.0

### Minor Changes

- 772de45: Simplify debugger plugin-devtools controller usage and communication.

  The locator package gets removed, and the logic moved directly to @solid-devtools/debugger

### Patch Changes

- Updated dependencies [a1ebe32]
- Updated dependencies [772de45]
  - @solid-devtools/frontend@0.0.6

## 0.15.3

### Patch Changes

- Updated dependencies [aa9f0bb]
  - @solid-devtools/frontend@0.0.5

## 0.15.2

### Patch Changes

- Updated dependencies [95aaad9]
  - @solid-devtools/frontend@0.0.4

## 0.15.1

### Patch Changes

- Updated dependencies [f3f2ca1]
  - @solid-devtools/frontend@0.0.3

## 0.15.0

### Minor Changes

- 8eb3fcb: Improve message names.

### Patch Changes

- 94178ba: Move CSS reset to frontend package. Fix controller not sending devtools locator state
- Updated dependencies [8eb3fcb]
- Updated dependencies [94178ba]
  - @solid-devtools/shared@0.9.0
  - @solid-devtools/frontend@0.0.2

## 0.14.1

### Patch Changes

- d3122f3: Improve the ErrorOverlay by displaying client/extension versions.
- 0f850f6: Improve version mismatch message.
- 9e7ab6c: Add ErrorBoundary to display cought errors to the users. (#121)
- Updated dependencies [d3122f3]
  - @solid-devtools/shared@0.8.5

## 0.14.0

### Minor Changes

- 74effef: Display computation values in the side panel just as signals and props.

### Patch Changes

- fb8b3c4: Improve displaying the context node on the structure graph and it's value on the inspector.
- e11e3ad: Improve triggering highlights of updated computation nodes — now the highlight will alvays last 400ms.
- Updated dependencies [74effef]
- Updated dependencies [fb8b3c4]
  - @solid-devtools/shared@0.8.4

## 0.13.0

### Minor Changes

- d7b35e4: Indicate "frozen" computations — stroke out the computation nodes that do not have any sources.

### Patch Changes

- 7794a85: Selecting nodes with the structure path.
- 0e06d89: Improve structure path styles. (fixes #126)
- 3272462: Fix locator not exiting the highlighting if the extension was open. (fixes #127)
- a5b60ba: Scrolls the structure view to the selected node if it's outside of the view. (#117)
- Updated dependencies [7794a85]
- Updated dependencies [d7b35e4]
- Updated dependencies [a5b60ba]
  - @solid-devtools/shared@0.8.3

## 0.12.1

### Patch Changes

- 4ef8606: Add one row margin to virtual list. (fixes it being clipped at hte bottom)
- cd36816: Improve Splitter styles
- bf9d78b: Improve display styles of tree nodes. Adds icons for different types of nodes.

## 0.12.0

### Minor Changes

- 0415e39: Rewrite the structure reconciler and virtualizer to reduce complexity.

  Add the ability to collapse structure nodes.

### Patch Changes

- Updated dependencies [0415e39]
  - @solid-devtools/shared@0.8.2

## 0.11.0

### Minor Changes

- 04fce35: Hide refresh memo nodes (MHR) from the Structure view and combine their details in the inspector panel.

### Patch Changes

- 92c8fda: Don't include children property in the mapped owner object, if the children are missing.
- Updated dependencies [04fce35]
- Updated dependencies [92c8fda]
  - @solid-devtools/shared@0.8.1

## 0.10.0

### Minor Changes

- 5e913ac: Add virtualization of the structure tree.

### Patch Changes

- Updated dependencies [089331d]
- Updated dependencies [5e913ac]
  - @solid-devtools/shared@0.8.0

## 0.9.0

### Minor Changes

- db7edcf: Track component props and display their values in the details of a inspected component.

### Patch Changes

- Updated dependencies [db7edcf]
  - @solid-devtools/shared@0.7.4
  - @solid-devtools/ui@0.10.3

## 0.8.3

### Patch Changes

- dca9f9d: Fix some locator realted bugs.

## 0.8.2

### Patch Changes

- 623aca6: Add toggle button to the extension that will allow for additional way of toggling the "locator mode". Besides holding "Alt".
- Updated dependencies [623aca6]
  - @solid-devtools/shared@0.7.3
  - @solid-devtools/ui@0.10.2

## 0.8.1

### Patch Changes

- a4d099f: Solid 1.5
- Updated dependencies [a4d099f]
  - @solid-devtools/shared@0.7.1
  - @solid-devtools/ui@0.10.1

## 0.8.0

### Minor Changes

- 27ffdb1: Highlight components hovered on the extension.
- fae3ec0: Highlight hovered signal value elements on the page.
- 15c958b: Highlight components hovered with locator on the extension.

### Patch Changes

- 33e2c17: Disable the extension adapter when the devtools are closed. (#92)
- 27b98fa: Select components by clicking on them on the page—with the locator enabled.
- c5cd272: Add support for highlighting Fragments by the Locator package. (#89)
- Updated dependencies [27ffdb1]
- Updated dependencies [33e2c17]
- Updated dependencies [27b98fa]
- Updated dependencies [fae3ec0]
- Updated dependencies [15c958b]
  - @solid-devtools/shared@0.7.0
  - @solid-devtools/ui@0.10.0

## 0.7.3

### Patch Changes

- 1d1729a: Move the path component under the structure graph. Improve the path component styles.
- 787f505: Move signal "selected" state to the signal object. Fixes a bug with signals staying selected after reopening the same owner details.
- b5f2e4a: Include selected owner in the displayed path.
- Updated dependencies [1d1729a]
- Updated dependencies [787f505]
  - @solid-devtools/ui@0.9.2
  - @solid-devtools/shared@0.6.2

## 0.7.2

### Patch Changes

- 3b5da1b: Refactor types to use namespaces to avoid name conflicts.
- Updated dependencies [3b5da1b]
  - @solid-devtools/shared@0.6.1
  - @solid-devtools/ui@0.9.1

## 0.7.1

### Patch Changes

- 7f69ca4: Add warning about adapter-extension version mismatches.

## 0.7.0

### Minor Changes

- 7b6ac08: Display nested signal values as a collapsable tree.
- b5e9776: Select signals and send encoded nested values of objects and arrays.

### Patch Changes

- 756d0f7: Selecting Signals
- Updated dependencies [756d0f7]
- Updated dependencies [7b6ac08]
- Updated dependencies [78b06a6]
- Updated dependencies [b5e9776]
  - @solid-devtools/ui@0.9.0
  - @solid-devtools/shared@0.6.0

## 0.6.2

### Patch Changes

- c408963: Add memo icon and listing decorations for signals.
- Updated dependencies [c408963]
  - @solid-devtools/ui@0.8.2

## 0.6.1

### Patch Changes

- 9bad4dd: Sort signals (memos last)
- Updated dependencies [9bad4dd]
  - @solid-devtools/ui@0.8.1

## 0.6.0

### Minor Changes

- f49854b: Add UI components for displaying signal value previews. Display signalvalue previews in the owener details panel.

### Patch Changes

- 1503a23: Fix missing graph after reopening devtools.
- Updated dependencies [f49854b]
- Updated dependencies [bde03b4]
  - @solid-devtools/ui@0.8.0
  - @solid-devtools/shared@0.5.1

## 0.5.0

### Minor Changes

- 41b4b7b: This one will be a major rewrite of the debugger, API available in plugins and the reconciliation on the extension.
  Now the walked tree will now include information about computation observers, value, signals, sources. All this will be available only for the "focused" owner—new API for getting details about a specific owner.

### Patch Changes

- Updated dependencies [41b4b7b]
  - @solid-devtools/shared@0.5.0
  - @solid-devtools/ui@0.7.0

## 0.4.0

### Minor Changes

- 2beeb22: Publish a shared library: @solid-primitives/shared

### Patch Changes

- Updated dependencies [2beeb22]
  - @solid-devtools/shared@0.4.0
  - @solid-devtools/ui@0.6.0

## 0.3.1

### Patch Changes

- 443604b: Add Scrollable component to ui library.
- 9e5acf4: Add Splitter component to the UI lib
- Updated dependencies [443604b]
- Updated dependencies [9e5acf4]
- Updated dependencies [6f620e1]
  - @solid-devtools/ui@0.5.0

## 0.3.0

### Minor Changes

- d15e9b0: Refactor styling in packages. Move to vanilla extract for the chrome extension and the ui package. Locator now manages it's styles separately.

### Patch Changes

- Updated dependencies [d15e9b0]
  - @solid-devtools/ui@0.4.0

## 0.2.3

### Patch Changes

- fdb09bc: Various minor changes.
- Updated dependencies [fdb09bc]
  - @solid-devtools/ui@0.3.3

## 0.2.2

### Patch Changes

- Updated dependencies [a8d0354]
  - @solid-devtools/ui@0.3.2

## 0.2.1

### Patch Changes

- 24ccd14: Use Solid's new dev hook (`_$afterCreateRoot`) to automatically attach roots and subroots to the debugger.
- Updated dependencies [24ccd14]
  - @solid-devtools/ui@0.3.1

## 0.2.0

### Minor Changes

- 2bb429a: Add the `locator` package.

  Separate `debugger` into `debugger` and `main` packages.

### Patch Changes

- Updated dependencies [2bb429a]
  - @solid-devtools/ui@0.3.0

## 0.1.1

### Patch Changes

- 5f83694: Improve types and listening to signal/computation updates.

## 0.1.0

### Minor Changes

- e9847ec: Support for reattaching subroots to the tree.
  Support for multiple independent trees.
  Minor API changes.
  Realted issue: [#15](https://github.com/thetarnav/solid-devtools/issues/15)

### Patch Changes

- Updated dependencies [e9847ec]
  - @solid-devtools/ui@0.2.0

## 0.0.5

### Patch Changes

- Updated dependencies
  - @solid-devtools/ui@0.1.2

## 0.0.4

### Patch Changes

- Updated dependencies [ad72903]
  - @solid-devtools/ui@0.1.1

## 0.0.2

### Patch Changes

- Updated dependencies [8e17085]
  - @solid-devtools/ui@0.1.0

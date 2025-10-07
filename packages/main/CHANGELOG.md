# solid-devtools

## 0.34.4

### Patch Changes

- d8263e1: Add vite 7 to supported dependencies.

## 0.34.3

### Patch Changes

- Updated dependencies [dddf24f]
  - @solid-devtools/debugger@0.28.1

## 0.34.2

### Patch Changes

- Updated dependencies [ea6c1c2]
- Updated dependencies [fa0a2c8]
  - @solid-devtools/debugger@0.28.0

## 0.34.1

### Patch Changes

- Updated dependencies [add003f]
- Updated dependencies [e8fe39e]
  - @solid-devtools/shared@0.20.0
  - @solid-devtools/debugger@0.27.1

## 0.34.0

### Minor Changes

- 95b348b: Add setElementInterface funtion to setup to support custom renderers (closes #343)

### Patch Changes

- 05163c3: fix: babel plugin resolution by importing @babel/plugin-syntax-typescript instead of passing it as a string
- Updated dependencies [370c545]
- Updated dependencies [95b348b]
- Updated dependencies [a72919e]
  - @solid-devtools/debugger@0.27.0
  - @solid-devtools/shared@0.19.1

## 0.33.0

### Minor Changes

- ed4215b: Assign component location directly to the owner
  Instead of importing setComponentLocation from solid-devtools/setup
  Fixes (#299)

### Patch Changes

- Updated dependencies [ed4215b]
- Updated dependencies [4e32e04]
- Updated dependencies [ce98e83]
  - @solid-devtools/debugger@0.26.0
  - @solid-devtools/shared@0.19.0

## 0.32.0

### Patch Changes

- 6b1b16d: Refactor `useDebugger`.
  `useLocator` is removed, instead use `useDebugger().setLocatorOptions()`.
  `debugger.meta.versions` moved to `debugger.versions`
- Updated dependencies [c7f699f]
- Updated dependencies [ba5b62a]
- Updated dependencies [6b1b16d]
  - @solid-devtools/debugger@0.25.0
  - @solid-devtools/shared@0.18.0

## 0.31.7

### Patch Changes

- d1657b4: Add typesVersions field back to package.json
  Related: https://github.com/solidjs/templates/pull/156
- Updated dependencies [4f31c75]
- Updated dependencies [f910bc9]
- Updated dependencies [1610d19]
- Updated dependencies [5afa738]
  - @solid-devtools/debugger@0.24.5
  - @solid-devtools/shared@0.17.0

## 0.31.6

## 0.31.5

### Patch Changes

- 5931162: Log messages recieved.
- Updated dependencies [7ee9f7f]
- Updated dependencies [0af688e]
- Updated dependencies [5931162]
  - @solid-devtools/debugger@0.24.4
  - @solid-devtools/shared@0.16.1

## 0.31.4

## 0.31.3

### Patch Changes

- Updated dependencies [40ace37]
  - @solid-devtools/debugger@0.24.3

## 0.31.2

### Patch Changes

- Updated dependencies [d41c4a7]
  - @solid-devtools/shared@0.16.0
  - @solid-devtools/debugger@0.24.2

## 0.31.1

### Patch Changes

- Updated dependencies [f40cfa2]
  - @solid-devtools/shared@0.15.0
  - @solid-devtools/debugger@0.24.1

## 0.31.0

### Minor Changes

- 89fcdc4: Update to vite 6, remove solid-start dep (was unused anyway)

### Patch Changes

- Updated dependencies [89fcdc4]
  - @solid-devtools/debugger@0.24.0
  - @solid-devtools/shared@0.14.0

## 0.30.1

### Patch Changes

- 3e93dba8: Add a noop index file to the main package exports

## 0.30.0

### Minor Changes

- 9ff0993d: Expose the babel plugins currently used by vite: `devtoolsJsxLocationPlugin` and `devtoolsNamePlugin`
- 6da4cb6e: exposed babel plugins

### Patch Changes

- Updated dependencies [d909b584]
  - @solid-devtools/shared@0.13.2
  - @solid-devtools/debugger@0.23.4

## 0.29.3

### Patch Changes

- d6ec5bda: Allow usage with Vite 5

## 0.29.2

### Patch Changes

- Updated dependencies [4772a364]
  - @solid-devtools/debugger@0.23.3

## 0.29.1

### Patch Changes

- d558e37b: Update dependencies. Fixes #276
- Updated dependencies [d558e37b]
  - @solid-devtools/debugger@0.23.2

## 0.29.0

## 0.28.1

### Patch Changes

- 778774f2: Correct solid-js peer dep version
- Updated dependencies [778774f2]
- Updated dependencies [778774f2]
  - @solid-devtools/debugger@0.23.1
  - @solid-devtools/shared@0.13.1

## 0.28.0

### Minor Changes

- 86f74ea9: Update to Solid 1.8

### Patch Changes

- Updated dependencies [86f74ea9]
  - @solid-devtools/debugger@0.23.0
  - @solid-devtools/shared@0.13.0

## 0.27.9

## 0.27.8

### Patch Changes

- 0bc8d67: Output source map from vite plugin

## 0.27.7

## 0.27.6

### Patch Changes

- Updated dependencies [7409af5]
  - @solid-devtools/debugger@0.22.4
  - @solid-devtools/shared@0.12.3

## 0.27.5

### Patch Changes

- 39dfd62: Use @nothing-but/utils for some common utilities
- Updated dependencies [39dfd62]
- Updated dependencies [36bb6bf]
  - @solid-devtools/debugger@0.22.3
  - @solid-devtools/shared@0.12.2

## 0.27.4

### Patch Changes

- Updated dependencies [e8ae734]
  - @solid-devtools/shared@0.12.1
  - @solid-devtools/debugger@0.22.2

## 0.27.3

### Patch Changes

- Updated dependencies [91e34e6]
- Updated dependencies [74f0614]
  - @solid-devtools/debugger@0.22.1

## 0.27.2

## 0.27.1

## 0.27.0

### Minor Changes

- eafea66: Improves autoname plugin option: names will be also added to effects based on the name of function calls / declarations. (#216)
- 2c7353a: Vite plugin doesn't inject the debugger anymore, it needs to be imported manually. Fixes #233
- d4a35d7: Breaking Changes!

  Extension will now inject the debugger via content script, insted of loading it from installed node modules. This will allow the extension and debugger to updated without having to update the node modules.

  The debugger needs to be initialized by importing `@solid-devtools/debugger/setup`.

### Patch Changes

- 6836778: Fix extension not showing structure when opened for the first time.
- Updated dependencies [d4a35d7]
  - @solid-devtools/debugger@0.22.0
  - @solid-devtools/shared@0.12.0

## 0.26.1

### Patch Changes

- Bump
- Updated dependencies
  - @solid-devtools/debugger@0.21.1
  - @solid-devtools/shared@0.11.1

## 0.26.0

### Minor Changes

- 811b4bb: Improve management of inspected state. When inspecting nodes that are omitted from the structure view (if displaying only components) the closest node will be highlighted instead.
- b7514c5: Fix treeview mode not resetting when the devtools get closed. Rename the `ForceUpdate` event to `ResetState`.
- f1b90ba: Change the API of using the frontend package.

### Patch Changes

- Updated dependencies [a99d42b]
- Updated dependencies [811b4bb]
- Updated dependencies [cbe62bd]
- Updated dependencies [b7514c5]
  - @solid-devtools/debugger@0.21.0

## 0.25.0

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

## 0.24.7

### Patch Changes

- Updated dependencies [c4e9af3]
- Updated dependencies [c4e9af3]
  - @solid-devtools/shared@0.10.6
  - @solid-devtools/debugger@0.19.0

## 0.24.6

### Patch Changes

- 41ab0c1: Move transform pacakge to `solid-devtools` lib. Fix vite plugin for solid-start.
- Updated dependencies [41ab0c1]
  - @solid-devtools/debugger@0.18.1

## 0.24.5

### Patch Changes

- Updated dependencies [84435c1]
- Updated dependencies [84435c1]
  - @solid-devtools/debugger@0.18.0
  - @solid-devtools/shared@0.10.5
  - @solid-devtools/transform@0.10.4

## 0.24.4

### Patch Changes

- 1005f66: Add missing export to client package. Fix vite transform.
- Updated dependencies [1005f66]
  - @solid-devtools/transform@0.10.3

## 0.24.3

### Patch Changes

- 42df66b: Minor improvements.
- Updated dependencies [42df66b]
  - @solid-devtools/transform@0.10.1
  - @solid-devtools/debugger@0.17.2
  - @solid-devtools/shared@0.10.4

## 0.24.2

### Patch Changes

- ba8bd72: Add ability to inject and configure debugger with vite plugin. (now the default way to setup devtools)
- Updated dependencies [ba8bd72]
  - @solid-devtools/transform@0.10.0
  - @solid-devtools/debugger@0.17.1

## 0.24.1

### Patch Changes

- Updated dependencies [006fc83]
- Updated dependencies [fd6dcae]
- Updated dependencies [fd6dcae]
  - @solid-devtools/debugger@0.17.0
  - @solid-devtools/shared@0.10.3

## 0.24.0

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

## 0.23.1

### Patch Changes

- ba185c3: Add top-level "development" export condidtion.
- Updated dependencies [ba185c3]
  - @solid-devtools/debugger@0.15.2

## 0.23.0

### Minor Changes

- bd8f0b4: Handle new `componentLocation` transform by adding a button to the inspector panel for opening component source code.

  Improve inspector panel styles. Improve Splitter component styles and ovarall usability.

- bd8f0b4: Rework communication by forwarding in bulk all the message exchange that happen only between client and the extension panel.

### Patch Changes

- a9f8e62: Improve managing debugger enabled state.
- Updated dependencies [a9f8e62]
- Updated dependencies [bd8f0b4]
- Updated dependencies [a9f8e62]
- Updated dependencies [a9f8e62]
  - @solid-devtools/debugger@0.15.0
  - @solid-devtools/shared@0.10.1
  - @solid-devtools/transform@0.9.0

## 0.22.0

### Minor Changes

- 965cda1: Better organize message communication. Add a popup window with the information about solid and devtools client detection.

### Patch Changes

- 965cda1: Don't disable debugger when devtools tab gets switched. Clear highlighted elements if devtools gets closed.

## 0.21.0

### Minor Changes

- 1990be5: Move graph types from `@solid-devtools/shared` to `@solid-devtools/debugger`

### Patch Changes

- Updated dependencies [1990be5]
- Updated dependencies [a6b55b0]
- Updated dependencies [d7e98da]
- Updated dependencies [1990be5]
- Updated dependencies [1990be5]
  - @solid-devtools/transform@0.8.0
  - @solid-devtools/debugger@0.14.0
  - @solid-devtools/shared@0.10.0

## 0.20.1

### Patch Changes

- a01db71: 1.6 Improvements
- Updated dependencies [a01db71]
  - @solid-devtools/debugger@0.13.1
  - @solid-devtools/shared@0.9.2

## 0.20.0

### Minor Changes

- 772de45: Simplify debugger plugin-devtools controller usage and communication.

  The locator package gets removed, and the logic moved directly to @solid-devtools/debugger

### Patch Changes

- Updated dependencies [772de45]
  - @solid-devtools/debugger@0.13.0

## 0.19.0

### Minor Changes

- 8eb3fcb: Improve message names.

### Patch Changes

- 94178ba: Rename `setInspectedOwner` to `setInspectedNode`
- Updated dependencies [8eb3fcb]
- Updated dependencies [94178ba]
- Updated dependencies [94178ba]
  - @solid-devtools/shared@0.9.0
  - @solid-devtools/debugger@0.12.0
  - @solid-devtools/locator@0.16.7
  - @solid-devtools/transform@0.7.5

## 0.18.2

### Patch Changes

- ca39745: Mark type export

## 0.18.1

### Patch Changes

- 71fec9a: Correct reexporting vite plugin for cjs resolvers.
- Updated dependencies [d3122f3]
- Updated dependencies [71fec9a]
  - @solid-devtools/shared@0.8.5
  - @solid-devtools/transform@0.7.4

## 0.18.0

### Minor Changes

- 74effef: Display computation values in the side panel just as signals and props.

### Patch Changes

- fb8b3c4: Improve displaying the context node on the structure graph and it's value on the inspector.
- Updated dependencies [74effef]
- Updated dependencies [fb8b3c4]
- Updated dependencies [7419067]
- Updated dependencies [aa7fde4]
  - @solid-devtools/debugger@0.11.0
  - @solid-devtools/shared@0.8.4
  - @solid-devtools/locator@0.16.5

## 0.17.1

### Patch Changes

- Updated dependencies [7794a85]
- Updated dependencies [d7b35e4]
- Updated dependencies [a5b60ba]
  - @solid-devtools/shared@0.8.3
  - @solid-devtools/debugger@0.10.0
  - @solid-devtools/locator@0.16.4

## 0.17.0

### Patch Changes

- Updated dependencies [0415e39]
  - @solid-devtools/ext-adapter@0.17.0
  - @solid-devtools/debugger@0.9.2

## 0.16.2

### Patch Changes

- Updated dependencies [089331d]
- Updated dependencies [5e913ac]
  - @solid-devtools/debugger@0.9.0
  - @solid-devtools/ext-adapter@0.16.2
  - @solid-devtools/locator@0.16.2
  - @solid-devtools/transform@0.7.3

## 0.16.0

### Patch Changes

- bf579bb: Restructure debugger plugin api.
- Updated dependencies [db7edcf]
- Updated dependencies [bf579bb]
  - @solid-devtools/debugger@0.8.0
  - @solid-devtools/ext-adapter@0.16.0
  - @solid-devtools/locator@0.16.0

## 0.15.0

### Patch Changes

- Updated dependencies [623aca6]
  - @solid-devtools/ext-adapter@0.15.0
  - @solid-devtools/locator@0.15.0

## 0.14.1

### Patch Changes

- a4d099f: Solid 1.5
- Updated dependencies [a4d099f]
  - @solid-devtools/debugger@0.7.1
  - @solid-devtools/ext-adapter@0.14.1
  - @solid-devtools/locator@0.14.1
  - @solid-devtools/transform@0.7.1

## 0.14.0

### Minor Changes

- 27ffdb1: Highlight components hovered on the extension.

### Patch Changes

- Updated dependencies [15c958b]
- Updated dependencies [27ffdb1]
- Updated dependencies [27b98fa]
- Updated dependencies [fae3ec0]
- Updated dependencies [c5cd272]
- Updated dependencies [d38a555]
- Updated dependencies [15c958b]
  - @solid-devtools/debugger@0.7.0
  - @solid-devtools/ext-adapter@0.14.0
  - @solid-devtools/locator@0.14.0
  - @solid-devtools/transform@0.7.0

## 0.13.0

### Patch Changes

- Updated dependencies [ff85d4c]
  - @solid-devtools/locator@0.13.0

## 0.12.0

### Patch Changes

- Updated dependencies [78b06a6]
- Updated dependencies [b5e9776]
  - @solid-devtools/debugger@0.6.0
  - @solid-devtools/ext-adapter@0.12.0
  - @solid-devtools/locator@0.12.0
  - @solid-devtools/transform@0.6.2

## 0.11.0

### Minor Changes

- 41b4b7b: This one will be a major rewrite of the debugger, API available in plugins and the reconciliation on the extension.
  Now the walked tree will now include information about computation observers, value, signals, sources. All this will be available only for the "focused" owner—new API for getting details about a specific owner.

### Patch Changes

- Updated dependencies [41b4b7b]
  - @solid-devtools/debugger@0.5.0
  - @solid-devtools/ext-adapter@0.11.0
  - @solid-devtools/locator@0.11.0
  - @solid-devtools/transform@0.6.1

## 0.10.1

### Patch Changes

- Updated dependencies [4258a33]
  - @solid-devtools/transform@0.6.0
  - @solid-devtools/debugger@0.4.1
  - @solid-devtools/locator@0.10.1

## 0.10.0

### Patch Changes

- Updated dependencies [2beeb22]
  - @solid-devtools/debugger@0.4.0
  - @solid-devtools/ext-adapter@0.10.0
  - @solid-devtools/locator@0.10.0
  - @solid-devtools/transform@0.5.0

## 0.9.0

### Patch Changes

- Updated dependencies [d15e9b0]
  - @solid-devtools/locator@0.9.0

## 0.8.2

### Patch Changes

- Updated dependencies [7721110]
- Updated dependencies [3c140cc]
  - @solid-devtools/transform@0.4.0
  - @solid-devtools/debugger@0.3.0
  - @solid-devtools/locator@0.8.2
  - @solid-devtools/ext-adapter@0.8.2

## 0.8.1

### Patch Changes

- fdb09bc: Various minor changes.
- Updated dependencies [fdb09bc]
  - @solid-devtools/transform@0.3.1
  - @solid-devtools/debugger@0.2.3
  - @solid-devtools/ext-adapter@0.8.1
  - @solid-devtools/locator@0.8.1

## 0.8.0

### Minor Changes

- 4c79a90: Bump vite peerDepenedency to version 3.0.0 (#34)

### Patch Changes

- Updated dependencies [4c79a90]
  - @solid-devtools/transform@0.3.0
  - @solid-devtools/locator@0.8.0

## 0.7.2

### Patch Changes

- a8d0354: Correct "homepage" filed in package.json, to lead to individual package readme.
- Updated dependencies [a8d0354]
  - @solid-devtools/transform@0.2.1
  - @solid-devtools/debugger@0.2.2
  - @solid-devtools/ext-adapter@0.7.2
  - @solid-devtools/locator@0.7.2

## 0.7.1

### Patch Changes

- aa992fd: Fix walker issue, not resolving component elements sometimes
- Updated dependencies [aa992fd]
  - @solid-devtools/debugger@0.2.1
  - @solid-devtools/locator@0.7.1

## 0.7.0

### Minor Changes

- 092b850: Export vite plugin from the main package.

### Patch Changes

- Updated dependencies [092b850]
  - @solid-devtools/locator@0.7.0

## 0.6.0

### Minor Changes

- 24ccd14: Use Solid's new dev hook (`_$afterCreateRoot`) to automatically attach roots and subroots to the debugger.

### Patch Changes

- Updated dependencies [24ccd14]
- Updated dependencies [892d87e]
  - @solid-devtools/debugger@0.2.0
  - @solid-devtools/ext-adapter@0.6.0
  - @solid-devtools/locator@0.6.0

## 0.5.0

### Minor Changes

- 2bb429a: Add the `locator` package.

  Separate `debugger` into `debugger` and `main` packages.

### Patch Changes

- Updated dependencies [2bb429a]
  - @solid-devtools/debugger@0.1.0
  - @solid-devtools/ext-adapter@0.5.0
  - @solid-devtools/locator@0.5.0

## 0.4.3

### Patch Changes

- fd5f408: Improve isComputation check
- 7611271: Move resolveElements to solid-primitives/refs

## 0.4.2

### Patch Changes

- 5f83694: Improve types and listening to signal/computation updates.
- Updated dependencies [5f83694]
  - @solid-devtools/locator@0.4.2

## 0.4.0

### Minor Changes

- e9847ec: Support for reattaching subroots to the tree.
  Support for multiple independent trees.
  Minor API changes.
  Realted issue: [#15](https://github.com/thetarnav/solid-devtools/issues/15)

### Patch Changes

- Updated dependencies [e9847ec]
  - @solid-devtools/ext-adapter@0.4.0
  - @solid-devtools/locator@0.4.0

## 0.3.0

### Patch Changes

- 1f14b6d: Locator & BabelPlugin:
  Split absolute filepath into projectPath and relative filePath.
  Returning `false` from the URL builder function won't execute `window.open`
- Updated dependencies [1f14b6d]
  - @solid-devtools/locator@0.3.0

## 0.2.9

### Patch Changes

- 7f0a2ca: Remove dev console log
- 8f5f6e5: Change package export map to avoid shipping code to production
- Updated dependencies [7f0a2ca]
- Updated dependencies [8f5f6e5]
  - @solid-devtools/ext-adapter@0.2.9
  - solid-devtools@0.2.9

## 0.2.8

### Patch Changes

- update locator version

## 0.2.7

### Patch Changes

- update locator version

## 0.2.4

### Patch Changes

- Prevent motionone componentName error

## 0.2.1

### Patch Changes

- Locator module now has to be explicitely enabled with Debugger props
  Support for different source code targets (vscode, atom, webstorm and a custom function)
- Updated dependencies
  - @solid-devtools/locator@0.2.1

## 0.2.0

### Minor Changes

- Support for Components returning JSX Fragments for Locator package. (issue #16)

### Patch Changes

- Updated dependencies
  - @solid-devtools/locator@0.2.0

## 0.1.0

### Minor Changes

- 8e17085: Add locator package. Initial pre-release.

### Patch Changes

- Updated dependencies [8e17085]
  - @solid-devtools/ext-adapter@0.1.0
  - @solid-devtools/locator@0.1.0

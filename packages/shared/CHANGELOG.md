# solid-devtools-shared

## 0.13.2

### Patch Changes

-   d909b584: Improve solid detector to work with solid-start 1

## 0.13.1

### Patch Changes

-   778774f2: Correct solid-js peer dep version

## 0.13.0

### Minor Changes

-   86f74ea9: Update to Solid 1.8

## 0.12.3

### Patch Changes

-   7409af5: Move solid-js out of dependencies (to peer)

## 0.12.2

### Patch Changes

-   39dfd62: Use @nothing-but/utils for some common utilities
-   36bb6bf: Updated the `atom` helper primitive

## 0.12.1

### Patch Changes

-   e8ae734: Add two utility functions

## 0.12.0

### Minor Changes

-   d4a35d7: Breaking Changes!

    Extension will now inject the debugger via content script, insted of loading it from installed node modules. This will allow the extension and debugger to updated without having to update the node modules.

    The debugger needs to be initialized by importing `@solid-devtools/debugger/setup`.

## 0.11.1

### Patch Changes

-   Bump

## 0.11.0

### Minor Changes

-   de40800: #### Dependency graph

    Adds a dependency graph to the debugger. It collcts observers and sources of currently inspected computation or signal.

    Breaking changes to the debugger emitter API - instead of events being emitted and listened to individually, now they all can be listened to at once which makes it easier to add new events in the future and maintaining the debugger - devtools bridge implementation in packages that use it.

    Closes #113
    Closes #208
    Closes #213
    Fixes #210

## 0.10.6

### Patch Changes

-   c4e9af3: Add more utils

## 0.10.5

### Patch Changes

-   84435c1: Add `isRecord` utility

## 0.10.4

### Patch Changes

-   42df66b: Minor improvements.

## 0.10.3

### Patch Changes

-   fd6dcae: Change `createPingedSignal` to return a `ping` function, instead of reacting to provided accessor.

## 0.10.2

### Patch Changes

-   5743522: Add `asArray` and `whileArray` helpers

## 0.10.1

### Patch Changes

-   a9f8e62: Move transform-related variables to transform package.

## 0.10.0

### Minor Changes

-   a6b55b0: Move value serialization logic to debugger
-   1990be5: Move graph types from `@solid-devtools/shared` to `@solid-devtools/debugger`

### Patch Changes

-   d7e98da: Move some debugger related types from @solid-devtools/shared to @solid-devtools/debugger

## 0.9.2

### Patch Changes

-   a01db71: 1.6 Improvements

## 0.9.1

### Patch Changes

-   e400eb6: Improve createHover primitive for mobile.

## 0.9.0

### Minor Changes

-   8eb3fcb: Improve message names.

## 0.8.6

### Patch Changes

-   74d49e1: Getter object properties won't be read during value encoding. (#136)

## 0.8.5

### Patch Changes

-   d3122f3: Improve the ErrorOverlay by displaying client/extension versions.

## 0.8.4

### Patch Changes

-   74effef: Display computation values in the side panel just as signals and props.
-   fb8b3c4: Improve displaying the context node on the structure graph and it's value on the inspector.

## 0.8.3

### Patch Changes

-   7794a85: Selecting nodes with the structure path.
-   d7b35e4: Indicate "frozen" computations — stroke out the computation nodes that do not have any sources.
-   a5b60ba: Scrolls the structure view to the selected node if it's outside of the view. (#117)

## 0.8.2

### Patch Changes

-   0415e39: Rewrite the structure reconciler and virtualizer to reduce complexity.

    Add the ability to collapse structure nodes.

## 0.8.1

### Patch Changes

-   04fce35: Hide refresh memo nodes (MHR) from the Structure view and combine their details in the inspector panel.
-   92c8fda: Don't include children property in the mapped owner object, if the children are missing.

## 0.8.0

### Minor Changes

-   5e913ac: Add virtualization of the structure tree.

### Patch Changes

-   089331d: Changes to the way roots and sub roots are handled.
    Now every sub root will track their own graph independently, instead of being attached to parent tree.

    Additionally the roots() and serializedRoots() signals were replaced with event emitter. (#108)

## 0.7.4

### Patch Changes

-   db7edcf: Track component props and display their values in the details of a inspected component.

## 0.7.3

### Patch Changes

-   623aca6: Add toggle button to the extension that will allow for additional way of toggling the "locator mode". Besides holding "Alt".

## 0.7.2

### Patch Changes

-   f32598e: Remove rootId from mapped components.

## 0.7.1

### Patch Changes

-   a4d099f: Solid 1.5

## 0.7.0

### Minor Changes

-   27ffdb1: Highlight components hovered on the extension.
-   fae3ec0: Highlight hovered signal value elements on the page.
-   15c958b: Highlight components hovered with locator on the extension.

### Patch Changes

-   33e2c17: Disable the extension adapter when the devtools are closed. (#92)
-   27b98fa: Select components by clicking on them on the page—with the locator enabled.

## 0.6.2

### Patch Changes

-   787f505: Move signal "selected" state to the signal object. Fixes a bug with signals staying selected after reopening the same owner details.

## 0.6.1

### Patch Changes

-   3b5da1b: Refactor types to use namespaces to avoid name conflicts.

## 0.6.0

### Minor Changes

-   b5e9776: Select signals and send encoded nested values of objects and arrays.

### Patch Changes

-   78b06a6: Rename types and function for encodung values. Add option to encode nested structures. (Arrays and objects for now).

## 0.5.1

### Patch Changes

-   f49854b: Add UI components for displaying signal value previews. Display signalvalue previews in the owener details panel.
-   bde03b4: Add encodePreview for encoding preview values of signals.

## 0.5.0

### Minor Changes

-   41b4b7b: This one will be a major rewrite of the debugger, API available in plugins and the reconciliation on the extension.
    Now the walked tree will now include information about computation observers, value, signals, sources. All this will be available only for the "focused" owner—new API for getting details about a specific owner.

## 0.4.0

### Minor Changes

-   2beeb22: Publish a shared library: @solid-primitives/shared

## 0.3.3

### Patch Changes

-   6f620e1: Move the cursor utilities to shared lib.

## 0.3.2

### Patch Changes

-   fdb09bc: Various minor changes.

## 0.3.1

### Patch Changes

-   24ccd14: Use Solid's new dev hook (`_$afterCreateRoot`) to automatically attach roots and subroots to the debugger.

## 0.3.0

### Minor Changes

-   2bb429a: Add the `locator` package.

    Separate `debugger` into `debugger` and `main` packages.

## 0.2.1

### Patch Changes

-   5f83694: Improve types and listening to signal/computation updates.

## 0.2.0

### Minor Changes

-   e9847ec: Support for reattaching subroots to the tree.
    Support for multiple independent trees.
    Minor API changes.
    Realted issue: [#15](https://github.com/thetarnav/solid-devtools/issues/15)

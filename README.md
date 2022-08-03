<p>
  <img width="100%" src="https://assets.solidjs.com/banner?type=Devtools&background=tiles&project=%20" alt="Solid Devtools">
</p>

# Solid Devtools

Reactivity Debugger & Devtools Chrome Extension for SolidJS.

## Why?

To change the way you write, debug and understand your SolidJS applications and reactivity within.

And also to experiment with ways of visualizing
and interacting with Solid's reactivity graph.

## Main Devtools package

###### `solid-devtools`

The main library is re-exporting and connecting
the rest of packages together to provide a
common experience for users.
It is a recommended and easy way to get started.

See [README](./packages/main#readme) for more information.

## Available Devtools

Most of the present packages are not much more then just ideas and experiments. Some in progress, and some very much in progress.
But few of them can help you in your work already, and a man can dream, so this is what's out there waiting:

### [Debugger](./packages/debugger#readme)

###### `@solid-devtools/debugger`

A runtime library, used to get information and track changes of the Solid's reactivity graph.
It's a cornerstone of the rest of the packages.

### [Locator](./packages/locator#readme)

###### `@solid-devtools/locator`

A runtime library for locating components on the page, and going to their source code in your IDE.

### [Logger](./packages/logger#readme)

###### `@solid-devtools/logger`

For debugging only the pinpoint places parts of the Solid's reactivity graph you are concerned with, right in the console you use all the time.

Provides a variaty of debugging utilities for logging the state and lifecycle of the nodes of reactivity graph to the browser console.

### [Transform](./packages/transform/)

###### `@solid-devtools/transform`

A babel transform plugin for vite for transforming Solid code. For development — debugging purposes only.

### [Chrome Extension](./packages/extension#readme)

Not-yet-public Chrome extension for visualizing and interacting with Solid's reactivity graph.

### [Extension Adapter](./packages/extension-adapter#readme)

###### `@solid-devtools/extension-adapter`

A runtime library connecting the [Debugger](./packages/debugger#readme) with [Chrome Extension](./packages/extension#readme).

### [UI](./packages/ui#readme)

###### `@solid-devtools/ui`

A collection of UI components for visualizing and interacting with Solid's reactivity graph. Used by the [Chrome Extension](./packages/extension#readme).

## Resources

From of the lack of proper README, here are a couple of resources and similar projects that inspire this one:

- [about devtools](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Extending_the_developer_tools)
- [Content-script <-> background-script communication](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/Port)
- [Article about vue devtools](https://dev.to/voluntadpear/how-a-devtools-extension-is-made-1em7#bridge)
- [Manifest.json anatomy](https://developer.chrome.com/docs/extensions/mv3/manifest/)
- [setting up vite plugin](https://dev.to/jacksteamdev/create-a-vite-react-chrome-extension-in-90-seconds-3df7)
- [example react project](https://github.com/jacksteamdev/crx-react-devtools):
  - [injecting real-world scripts](https://github.com/jacksteamdev/crx-react-devtools/blob/main/src/content-script.ts) _(for accessing the real window object)_
- [Plugin architecture of Vue Devtools](https://devtools.vuejs.org/plugin/plugins-guide.html#architecture)

Previous attempts/experiments that inspire this project:

- [Compendium devtools](https://github.com/CompendiumDevTools) (universal)
- [Slugger](https://github.com/thetarnav/slugger/tree/main/packages/slugger/src) (my original proof of concept)
- fictitious/[solid-devtools](https://github.com/fictitious/solid-devtools)
- CM-Tech/[solid-debugger](https://github.com/CM-Tech/solid-debugger)
- [Go to Component Devtools](https://gist.github.com/nksaraf/def81fada4ac8d5a3c2e7cad0cd4933a)

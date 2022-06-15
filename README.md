<p>
  <img width="100%" src="https://assets.solidjs.com/banner?type=Devtools&background=tiles&project=%20" alt="Solid Devtools">
</p>

# Solid Devtools

Reactivity Debugger & Devtools Chrome Extension for SolidJS.

## Why?

To change the way you write, debug and understand your SolidJS applications and reactivity within.

## Available Devtools

All of the packages are currently nothing more then just ideas. Some in progress, and some very much in progress. But a man can dream, and this is what's out there waiting:

### [Babel Plugin](./packages/babel-plugin/)

###### `@solid-devtools/babel-plugin`

A babel plugin for vite for transforming Solid code. For development — debugging purposes only.

Currently only transforms JSX, adding code location to it. Necessary for the [Locator](./packages/locator#readme) package.

### [Debugger](./packages/debugger#readme)

###### `solid-devtools`

A runtime package, used to get information and track changes of the Solid's reactivity graph. It's a cornerstone of the rest of the packages.

It comes with [Extension Adapter](./packages/extension-adapter#readme) and [Locator](./packages/locator#readme) packages included.

### [Chrome Extension](./packages/extension#readme)

Not-yet-public Chrome extension for visualizing and interacting with Solid's reactivity graph.

### [Extension Adapter](./packages/extension-adapter#readme)

###### `@solid-devtools/extension-adapter`

A runtime library connecting the [Debugger](./packages/debugger#readme) with [Chrome Extension](./packages/extension#readme).

### [Locator](./packages/locator#readme)

###### `@solid-devtools/locator`

A runtime library for locating components on the page, and their source code in your IDE.

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

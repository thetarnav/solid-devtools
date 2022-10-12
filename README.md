<p>
  <img width="100%" src="https://assets.solidjs.com/banner?type=Developer%20Tools&background=tiles&project=%20" alt="Solid Developer Tools">
</p>

# Solid Developer Tools

[![pnpm](https://img.shields.io/badge/maintained%20with-pnpm-cc00ff.svg?style=for-the-badge&logo=pnpm)](https://pnpm.io/)
[![turborepo](https://img.shields.io/badge/built%20with-turborepo-cc00ff.svg?style=for-the-badge&logo=turborepo)](https://turborepo.org/)
[![npm](https://img.shields.io/npm/dw/@solid-devtools/shared?color=blue&style=for-the-badge)](https://www.npmjs.com/package/solid-devtools)

Library of developer tools, reactivity debugger & Devtools Chrome extension for visualizing SolidJS reactivity graph.

## Why?

To change the way you write, debug and understand your SolidJS applications and reactivity within.

And also to experiment with ways of visualizing
and interacting with Solid's reactivity graph.

[![screenshot](https://user-images.githubusercontent.com/24491503/193428963-f19d4da7-940d-4c8b-8aa8-88af3e705cc1.png)](https://chrome.google.com/webstore/detail/solid-devtools/kmcfjchnmmaeeagadbhoofajiopoceel)

## [The Chrome Extension](./packages/extension#readme)

🚧 In early development. 🚧

Chrome Developer Tools extension for debugging SolidJS applications. It allows for visualizing and interacting with Solid's reactivity graph, as well as inspecting component state and hierarchy.

[**See the guide on setting started**](https://github.com/thetarnav/solid-devtools/tree/main/packages/extension#getting-started)

## All devtools packages

Most of the present packages are not much more then just ideas and experiments. Some in progress, and some very much in progress.
But few of them can help you in your work already, and a man can dream, so this is what's out there waiting:

### [`solid-devtools`](./packages/ext-client#readme)

The main client library. It reexports the most important tools and connects the client application to the chrome extension.

[**See README for more information.**](./packages/ext-client#readme)

### [`@solid-devtools/overlay`](./packages/overlay#readme)

An on-page devtools overlay for debugging SolidJS Applications without a chrome extension.

[**See guide on setting up**](./packages/overlay#getting-started)

### [Locator](./packages/locator#readme)

###### `@solid-devtools/locator`

A runtime library for locating components on the page, and going to their source code in your IDE.

### [Transform](./packages/transform/)

###### `@solid-devtools/transform`

A babel transform plugin for vite for transforming Solid code. For development — debugging purposes only.

It can do very useful things for you: Wrap stores to let the debugger observe them. Automatically name signals, memos and stroes. It's also required by the [Locator](./packages/locator#readme) package to allow for going to the source code of the components.

### [Logger](./packages/logger#readme)

###### `@solid-devtools/logger`

For debugging only the pinpoint places parts of the Solid's reactivity graph you are concerned with, right in the console you use all the time.

Provides a variaty of debugging utilities for logging the state and lifecycle of the nodes of reactivity graph to the browser console.

### [Debugger](./packages/debugger#readme)

###### `@solid-devtools/debugger`

A runtime library, used to get information and track changes of the Solid's reactivity graph.
It's a cornerstone of the rest of the packages.

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

Similar projects from other frameworks:

- [Svelte Devtools](https://github.com/sveltejs/svelte-devtools)
- [Vue Devtools](https://github.com/vuejs/devtools)
- [MobX Devtools](https://github.com/mobxjs/mobx-devtools)
- [React Devtools](https://react-devtools-experimental.vercel.app)

# Contributing to Solid Developer Tools

:+1::tada: Thank you for checking out the project and wanting to contribute! :tada::+1:

The following document is a _(work in progress)_ guide for contributing to Solid Developer Tools. It is a work in progress, so please feel free to suggest changes and improvements. If you have any questions, please feel free to ask on the [Solid Discord](https://discord.com/invite/solidjs). (We have a #solid-devtools channel there)

## Tooling

`pnpm` and `prettier` — that's it.

This project uses [pnpm](https://pnpm.io/) for package management. If you don't have it installed, you can install it with `npm install -g pnpm` and then run `pnpm install` to install all the dependencies.

The code if formatted with prettier. You can use it if you want, or not, it's up to you because the code get's formatted automatically by a github action. If you want to use it, you can run `pnpm format` to format the code.

## CLI Commands

Here is a list of the commands you can run in the project:

### DEV

#### `pnpm dev:ext` — Run the [extension](https://github.com/thetarnav/solid-devtools/tree/main/packages/extension#readme) in development mode.

Important if you want to work on the chrome extension. _(The script may fail sometimes after changes, so keep an eye on the console, and restart it if neccessary)_

#### `pnpm dev:client`

**Builds all of the client packages in the watch mode.** Those are the packages that run in the users browser.

#### `pnpm dev:sandbox` — Opens the [sandbox](https://github.com/thetarnav/solid-devtools/tree/main/playgrounds/sandbox) playground

### TEST

#### `pnpm build` — Builds all packages

#### `pnpm test` — Runs all the tests

#### `pnpm typecheck` — Runs the typecheck

#### `pnpm build-test` — Runs both the build and the tests

Watchout, `build-test` may freeze your computer a bit :)

When you make a PR, the CI will run all of these commands, so you don't have to worry about it.

### Changeset

This project uses [changesets](https://github.com/changesets/changesets) to manage package versions. If you want to make a change to a package, you can run `pnpm changeset` and it will guide you through the process.

## Developing the extension

1. Run `pnpm dev:ext` to start the extension in development mode

2. Open the [chrome://extensions](chrome://extensions) page

3. Enable the developer mode

![image](https://user-images.githubusercontent.com/24491503/191084587-e53b1743-39ac-40e0-b3a6-cf6bcaca9d5d.png)

4. Click on the "Load unpacked" button and select the `packages/extension/dist` folder

![image](https://user-images.githubusercontent.com/24491503/191084770-84577eb0-1c90-44a7-afa2-a2d03f728a66.png)

5. The extendion is now loaded and ready to go! Now run open any page with Solid and you should be able to open the devtools.

import { defineConfig } from 'tsup-preset-solid'

export default defineConfig(
  [
    {
      name: 'index',
      entry: 'src/server.ts',
      devEntry: 'src/index.ts',
    },
    {
      entry: 'src/setup.ts',
    },
    {
      entry: 'src/vite.ts',
    },
  ],
  {
    // writePackageJson: true,
    tsupOptions(o) {
      // TODO: this should be configurable in tsup preset
      delete o.platform
      return o
    },
  },
)

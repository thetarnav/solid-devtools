import { defineConfig } from 'tsup-preset-solid'

export default defineConfig(
  [
    {
      entry: 'src/setup.ts',
    },
    {
      entry: 'src/vite.ts',
    },
  ],
  {
    writePackageJson: true,
    tsupOptions(o) {
      // TODO: this should be configurable in tsup preset
      delete o.platform
      return o
    },
  },
)

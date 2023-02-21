import { defineConfig } from 'tsup-preset-solid'
import { version as solidVersion } from './node_modules/solid-js/package.json'
import { peerDependencies, version as clientVersion } from './package.json'

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
    // writePackageJson: true,
    tsupOptions(o) {
      // TODO: this should be configurable in tsup preset
      delete o.platform
      o.env = {
        ...o.env,
        CLIENT_VERSION: clientVersion,
        SOLID_VERSION: solidVersion,
        EXPECTED_SOLID_VERSION: peerDependencies['solid-js'].match(/\d+.\d+.\d+/)![0],
      }
      return o
    },
  },
)

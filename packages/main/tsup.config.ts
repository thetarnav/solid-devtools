import solidPkg from 'solid-js/package.json' assert { type: 'json' }
import { defineConfig } from 'tsup'
import { version as clientVersion, peerDependencies } from './package.json'

const solidVersion = solidPkg.version

export default defineConfig([
  {
    entryPoints: ['src/index.ts', 'src/setup-noop.ts', 'src/setup.ts'],
    dts: { entry: ['src/index.ts', 'src/setup.ts'] },
    format: 'esm',
    target: 'esnext',
    platform: 'browser',
    env: {
      CLIENT_VERSION: clientVersion,
      SOLID_VERSION: solidVersion,
      EXPECTED_SOLID_VERSION: peerDependencies['solid-js'].match(/\d+.\d+.\d+/)![0],
    },
  },
  {
    entryPoints: ['src/vite.ts'],
    format: 'esm',
    dts: true,
  },
])

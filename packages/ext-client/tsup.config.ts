import defineConfig from '../../configs/tsup.config'

import { version } from './package.json'

export default defineConfig({
  server: true,
  additionalEntries: ['vite'],
  overwrite: config => {
    config.env = {
      ...config.env,
      VERSION: version,
    }
    return config
  },
})

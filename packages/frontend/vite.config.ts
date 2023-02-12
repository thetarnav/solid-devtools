import { vitestFullConfig } from '../../configs/vitest.config'

export default vitestFullConfig(config => {
  config.resolve!.alias = {
    ...config.resolve!.alias,
    '@/': `${__dirname}/src/`,
  }
})

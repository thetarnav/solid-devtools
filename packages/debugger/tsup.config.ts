import defineConfig from '../../configs/tsup.config'

export default defineConfig({
  server: true,
  jsx: true,
  additionalEntries: ['types'],
})

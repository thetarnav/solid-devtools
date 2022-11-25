import defineConfig from '../../configs/tsup.config'

export default defineConfig({
  server: true,
  extension: 'tsx',
  additionalPlugins: [],
  overwrite: config => {
    return {
      ...config,
      loader: { '.css': 'text' },
      noExternal: [/^@solid-devtools\/frontend/],
    }
  },
})

import { defineConfig, Options } from 'tsup'
import { Plugin } from 'esbuild'
import { solidPlugin } from 'esbuild-plugin-solid'

export default ({
  extension = 'ts',
  server = false,
  additionalEntries = [],
  additionalPlugins = [],
  overwrite,
  jsx,
  external = [],
}: {
  extension?: 'tsx' | 'ts'
  server?: boolean
  additionalEntries?: string[]
  additionalPlugins?: Plugin[]
  overwrite?: (overrideOptions: Options) => Options | Options[]
  jsx?: boolean
  external?: (string | RegExp)[]
} = {}) => {
  const entry = `src/index.${extension}`
  const baseEntries = server ? [entry, `src/server.${extension}`] : [entry]
  const mappedAdditionalEntries = additionalEntries.map(entry => {
    if (entry.includes('.')) return `src/${entry}`
    return `src/${entry}.${extension}`
  })
  return defineConfig(config => {
    const options: Options = {
      clean: config.watch ? false : true,
      minify: config.watch ? false : true,
      dts: {
        entry: [entry, ...mappedAdditionalEntries],
      },
      target: 'esnext',
      format: config.watch ? 'esm' : ['cjs', 'esm'],
      entry: [...baseEntries, ...mappedAdditionalEntries],
      esbuildPlugins:
        extension === 'tsx' || jsx ? [solidPlugin(), ...additionalPlugins] : additionalPlugins,
      external: [
        'solid-js',
        /^solid-js\/[\w-]+$/,
        /^@solid-devtools\/shared\/[\w-]+$/,
        ...external,
      ],
    }
    return overwrite ? overwrite(options) : options
  })
}

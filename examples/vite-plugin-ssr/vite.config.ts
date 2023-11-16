import devtools from 'solid-devtools/vite'
import {defineConfig} from 'vite'
import inspect from 'vite-plugin-inspect'
import solid from 'vite-plugin-solid'
import ssr from 'vite-plugin-ssr/plugin'

export default defineConfig({
    plugins: [
        devtools({
            autoname: true,
        }),
        solid({ssr: true}),
        ssr(),
        inspect(),
    ],
})
